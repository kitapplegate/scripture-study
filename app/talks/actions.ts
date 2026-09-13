"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeCitations } from "@/lib/citations-server";
import { requireUser } from "@/lib/session";
import * as talks from "@/lib/talks";

const dbId = z.string().regex(/^\d{1,18}$/);

export async function createBlankTalkAction() {
  const user = await requireUser();
  const id = await talks.createTalk(user.id, { title: "Untitled talk", kind: "talk", minutes: 10, audience: null, body: "" });
  redirect(`/talks/${id}`);
}

const saveSchema = z.object({
  id: dbId,
  title: z.string().trim().min(1, "Give it a title.").max(200, "Keep the title under 200 characters."),
  kind: z.enum(["talk", "lesson"]),
  minutes: z.union([z.literal(""), z.coerce.number().int().min(1, "Minutes must be 1–120.").max(120, "Minutes must be 1–120.")]),
  audience: z.string().trim().max(200, "Keep the audience under 200 characters."),
  body: z.string().max(50000, "The draft is too long (50,000 characters max)."),
});

export type SaveTalkState = { error?: string; savedAt?: number; removed?: number; body?: string };

export async function saveTalkAction(_prev: SaveTalkState, formData: FormData): Promise<SaveTalkState> {
  const user = await requireUser();
  const parsed = saveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const { id, title, kind, minutes, audience, body } = parsed.data;

  const { text, removed } = await normalizeCitations(body);
  const ok = await talks.updateTalk(user.id, id, {
    title,
    kind,
    minutes: minutes === "" ? null : minutes,
    audience: audience || null,
    body: text,
  });
  if (!ok) return { error: "That talk no longer exists." };
  revalidatePath("/talks");
  return { savedAt: Date.now(), removed, body: text };
}

export async function deleteTalkAction(formData: FormData) {
  const user = await requireUser();
  await talks.deleteTalk(user.id, dbId.parse(formData.get("id")));
  revalidatePath("/talks");
  redirect("/talks");
}
