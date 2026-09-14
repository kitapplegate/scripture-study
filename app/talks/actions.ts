"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPassage, resolveReference } from "@/lib/scriptures";
import { requireUser } from "@/lib/session";
import * as items from "@/lib/talk-items";
import * as talks from "@/lib/talks";

const dbId = z.string().regex(/^\d{1,18}$/);

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const BAD_REQUEST = "That didn't look right. Reload the page and try again.";

export async function createBlankTalkAction() {
  const user = await requireUser();
  const id = await talks.createTalk(user.id, { title: "Untitled talk", kind: "talk", minutes: 10, audience: null, body: "" });
  redirect(`/talks/${id}`);
}

export async function deleteTalkAction(formData: FormData) {
  const user = await requireUser();
  await talks.deleteTalk(user.id, dbId.parse(formData.get("id")));
  revalidatePath("/talks");
  redirect("/talks");
}

const detailsSchema = z.object({
  title: z.string().trim().min(1, "Give the talk a title.").max(200, "Keep the title under 200 characters."),
  kind: z.enum(["talk", "lesson"]),
  minutes: z.number().int().min(1).max(120).nullable(),
  audience: z.string().trim().max(200, "Keep the audience under 200 characters."),
});

export async function updateTalkDetailsAction(talkId: string, details: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  const id = dbId.safeParse(talkId);
  const parsed = detailsSchema.safeParse(details);
  if (!id.success) return fail(BAD_REQUEST);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? BAD_REQUEST);
  const saved = await talks.updateTalkDetails(user.id, id.data, { ...parsed.data, audience: parsed.data.audience || null });
  if (!saved) return fail("That talk no longer exists.");
  revalidatePath("/talks");
  return { ok: true };
}

// --- Capsules ----------------------------------------------------------------------------

const newItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("scripture"),
    reference: z.string().trim().min(1).max(80).optional(), // typed in the builder
    verseId: z.string().max(40).optional(), // from "Add to talk" elsewhere
    endVerseId: z.string().max(40).nullable().optional(),
    body: z.string().max(2000).optional(),
  }),
  z.object({ kind: z.literal("thought"), body: z.string().max(10000).optional() }),
  z.object({ kind: z.literal("heading"), body: z.string().max(200).optional() }),
  z.object({ kind: z.literal("link"), url: z.string().trim().max(500), body: z.string().max(200).optional() }),
]);

const ADD_ERRORS = {
  "not-owner": "That talk no longer exists.",
  "not-found": "That scripture wasn't found.",
  invalid: "Links must be a full address starting with https://",
  full: `A talk can hold up to ${items.MAX_ITEMS_PER_TALK} capsules.`,
} as const;

export async function addTalkItemAction(talkId: string, input: unknown): Promise<{ ok: true; item: items.TalkItem } | Fail> {
  const user = await requireUser();
  const id = dbId.safeParse(talkId);
  const parsed = newItemSchema.safeParse(input);
  if (!id.success || !parsed.success) return fail(BAD_REQUEST);
  const data = parsed.data;

  let result: items.AddResult;
  if (data.kind === "scripture") {
    let verseId = data.verseId;
    let endVerseId = data.endVerseId ?? null;
    if (data.reference) {
      const passage = await resolveReference(data.reference);
      if (!passage) return fail(`Couldn't find “${data.reference}”. Try a reference with a verse, like Alma 32:21 or Moroni 10:4-5.`);
      verseId = passage.id;
      endVerseId = passage.endId ?? null;
    }
    if (!verseId) return fail("Enter a scripture reference.");
    result = await items.addItem(user.id, id.data, { kind: "scripture", verseId, endVerseId, body: data.body });
  } else if (data.kind === "link") {
    result = await items.addItem(user.id, id.data, { kind: "link", url: data.url, body: data.body });
  } else {
    result = await items.addItem(user.id, id.data, { kind: data.kind, body: data.body });
  }

  if (!result.ok) return fail(ADD_ERRORS[result.reason]);
  revalidatePath("/talks");
  return result;
}

const patchSchema = z.object({ body: z.string().max(10000).optional(), url: z.string().trim().max(500).optional() });

export async function updateTalkItemAction(talkId: string, itemId: string, patch: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  const t = dbId.safeParse(talkId);
  const i = dbId.safeParse(itemId);
  const p = patchSchema.safeParse(patch);
  if (!t.success || !i.success || !p.success) return fail(BAD_REQUEST);
  const result = await items.updateItem(user.id, t.data, i.data, p.data);
  if (result.ok) return result;
  return fail(result.reason === "invalid" ? ADD_ERRORS.invalid : "That capsule no longer exists. Reload the page.");
}

export async function deleteTalkItemAction(talkId: string, itemId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const t = dbId.safeParse(talkId);
  const i = dbId.safeParse(itemId);
  if (!t.success || !i.success) return { ok: false };
  return { ok: await items.deleteItem(user.id, t.data, i.data) };
}

// --- "Add to talk" from the reader, search results, and the study assistant -----------------

export async function listMyTalksAction(): Promise<{ id: string; title: string }[]> {
  const user = await requireUser();
  return (await talks.listTalks(user.id)).slice(0, 50).map((t) => ({ id: t.id, title: t.title }));
}

const addScriptureSchema = z.object({
  talkId: dbId.nullable(), // null: start a new talk with this scripture
  verseId: z.string().max(40),
  endVerseId: z.string().max(40).nullable().optional(),
});

export async function addScriptureToTalkAction(input: unknown): Promise<{ ok: true; talkId: string; title: string } | Fail> {
  const user = await requireUser();
  const parsed = addScriptureSchema.safeParse(input);
  if (!parsed.success) return fail(BAD_REQUEST);
  const { verseId, endVerseId } = parsed.data;

  // Check the scripture first, so a bad reference never leaves an empty new talk behind.
  if (!(await getPassage(verseId, endVerseId))) return fail("That scripture wasn't found.");

  let talkId = parsed.data.talkId;
  let title = "Untitled talk";
  if (talkId) {
    const talk = await talks.getTalk(user.id, talkId);
    if (!talk) return fail("That talk no longer exists.");
    title = talk.title;
  } else {
    talkId = await talks.createTalk(user.id, { title, kind: "talk", minutes: 10, audience: null, body: "" });
  }

  const result = await items.addItem(user.id, talkId, { kind: "scripture", verseId, endVerseId });
  if (!result.ok) return fail(ADD_ERRORS[result.reason]);
  revalidatePath("/talks");
  revalidatePath(`/talks/${talkId}`);
  return { ok: true, talkId, title };
}

export async function reorderTalkItemsAction(talkId: string, orderedIds: unknown): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const t = dbId.safeParse(talkId);
  const ids = z.array(dbId).max(items.MAX_ITEMS_PER_TALK).safeParse(orderedIds);
  if (!t.success || !ids.success) return { ok: false };
  return { ok: await items.reorderItems(user.id, t.data, ids.data) };
}
