// Checks what a member typed into the post composer. Posts are free-form: text, an optional
// scripture typed as a reference ("Alma 32:21", "Moroni 10:4-5"), and an optional link. A
// post needs text or a scripture. The verse text itself always comes from our own data, so
// only the verse ids are kept. Separate from the server action so tests can run it.
// Relative imports only, so tests can load this outside Next.js.
import { resolveReference } from "./scriptures";

export const MAX_POST_BODY = 5000;
const MAX_LINK = 500;

export type PostInput = { body?: string; reference?: string; linkUrl?: string };
export type PreparedPost = { body: string; verseId: string | null; endVerseId: string | null; linkUrl: string | null };
export type PrepareResult = { ok: true; post: PreparedPost } | { ok: false; error: string };

function isHttpsUrl(url: string) {
  if (url.length > MAX_LINK) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export async function preparePost(input: PostInput): Promise<PrepareResult> {
  const body = (input.body ?? "").trim();
  if (body.length > MAX_POST_BODY) return { ok: false, error: "Keep it under 5,000 characters." };

  const linkUrl = (input.linkUrl ?? "").trim();
  if (linkUrl && !isHttpsUrl(linkUrl)) return { ok: false, error: "Links must be a full https:// address." };

  const reference = (input.reference ?? "").trim().slice(0, 80);
  const passage = reference ? await resolveReference(reference) : undefined;
  if (reference && !passage) {
    return { ok: false, error: `Couldn't find “${reference}”. Try a reference with a verse, like Alma 32:21 or Moroni 10:4–5.` };
  }

  if (!body && !passage) return { ok: false, error: "Write something, or add a scripture." };
  return { ok: true, post: { body, verseId: passage?.id ?? null, endVerseId: passage?.endId ?? null, linkUrl: linkUrl || null } };
}
