// Talk builder capsules: scripture, thought, section heading, and link, in the order the
// owner arranged them. No AI is involved anywhere here (SPEC principle 8).
// Every query checks, in the SQL itself, that the talk belongs to the caller.
// Relative imports only, so tests can load this outside Next.js.
import { pool } from "./db";
import { getPassage } from "./scriptures";

export type TalkItemKind = "scripture" | "thought" | "heading" | "link";

export const MAX_ITEMS_PER_TALK = 300;
const MAX_BODY: Record<TalkItemKind, number> = { scripture: 2000, thought: 10000, heading: 200, link: 200 };

export type TalkItemPassage = { reference: string; href: string; verses: { verse: number; text: string }[] };

export type TalkItem = {
  id: string;
  kind: TalkItemKind;
  position: number;
  verseId: string | null;
  endVerseId: string | null;
  body: string; // thought or heading text, a note on a scripture, or a link label
  url: string | null;
  passage: TalkItemPassage | null; // scripture text, from our own data
};

type Row = {
  id: string;
  kind: TalkItemKind;
  position: number;
  verse_id: string | null;
  end_verse_id: string | null;
  body: string;
  url: string | null;
};

const COLUMNS = "id, kind, position, verse_id, end_verse_id, body, url";

async function toItem(r: Row): Promise<TalkItem> {
  const p = r.kind === "scripture" && r.verse_id ? await getPassage(r.verse_id, r.end_verse_id) : undefined;
  return {
    id: r.id,
    kind: r.kind,
    position: r.position,
    verseId: r.verse_id,
    endVerseId: r.end_verse_id,
    body: r.body,
    url: r.url,
    passage: p ? { reference: p.reference, href: p.href, verses: p.verses } : null,
  };
}

export function isHttpsUrl(url: string) {
  if (url.length > 500 || !/^https:\/\//i.test(url)) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function ownsTalk(ownerId: string, talkId: string) {
  const { rowCount } = await pool.query("SELECT 1 FROM talks WHERE id = $1::bigint AND owner_id = $2::text", [talkId, ownerId]);
  return rowCount === 1;
}

const touchTalk = (talkId: string) => pool.query("UPDATE talks SET updated_at = now() WHERE id = $1::bigint", [talkId]);

// null if the talk doesn't exist or isn't the caller's.
export async function listItems(ownerId: string, talkId: string): Promise<TalkItem[] | null> {
  if (!(await ownsTalk(ownerId, talkId))) return null;
  const { rows } = await pool.query<Row>(`SELECT ${COLUMNS} FROM talk_items WHERE talk_id = $1::bigint ORDER BY position, id`, [talkId]);
  return Promise.all(rows.map(toItem));
}

export type NewItem =
  | { kind: "scripture"; verseId: string; endVerseId?: string | null; body?: string }
  | { kind: "thought" | "heading"; body?: string }
  | { kind: "link"; url: string; body?: string };

export type AddResult =
  | { ok: true; item: TalkItem }
  | { ok: false; reason: "not-owner" | "not-found" | "invalid" | "full" };

// Appends a capsule at the end of the talk.
export async function addItem(ownerId: string, talkId: string, input: NewItem): Promise<AddResult> {
  const body = (input.body ?? "").slice(0, MAX_BODY[input.kind]);
  let verseId: string | null = null;
  let endVerseId: string | null = null;
  let url: string | null = null;

  if (input.kind === "scripture") {
    const passage = await getPassage(input.verseId, input.endVerseId);
    if (!passage) return { ok: false, reason: "not-found" };
    verseId = passage.id;
    endVerseId = passage.endId ?? null;
  } else if (input.kind === "link") {
    if (!isHttpsUrl(input.url)) return { ok: false, reason: "invalid" };
    url = input.url;
  }

  const { rows } = await pool.query<Row>(
    `INSERT INTO talk_items (talk_id, position, kind, verse_id, end_verse_id, body, url)
     SELECT t.id, COALESCE(MAX(i.position) + 1, 0), $3, $4, $5, $6, $7
     FROM talks t LEFT JOIN talk_items i ON i.talk_id = t.id
     WHERE t.id = $1::bigint AND t.owner_id = $2::text
     GROUP BY t.id
     HAVING COUNT(i.id) < $8
     RETURNING ${COLUMNS}`,
    [talkId, ownerId, input.kind, verseId, endVerseId, body, url, MAX_ITEMS_PER_TALK],
  );
  if (!rows[0]) return { ok: false, reason: (await ownsTalk(ownerId, talkId)) ? "full" : "not-owner" };
  await touchTalk(talkId);
  return { ok: true, item: await toItem(rows[0]) };
}

export type ItemPatch = { body?: string; url?: string };

export async function updateItem(
  ownerId: string,
  talkId: string,
  itemId: string,
  patch: ItemPatch,
): Promise<{ ok: true } | { ok: false; reason: "not-found" | "invalid" }> {
  if (patch.url !== undefined && !isHttpsUrl(patch.url)) return { ok: false, reason: "invalid" };
  const { rowCount } = await pool.query(
    `UPDATE talk_items i SET
       body = CASE WHEN $4::text IS NULL THEN i.body
                   ELSE left($4::text, CASE i.kind WHEN 'thought' THEN 10000 WHEN 'scripture' THEN 2000 ELSE 200 END) END,
       url = CASE WHEN i.kind = 'link' AND $5::text IS NOT NULL THEN $5::text ELSE i.url END,
       updated_at = now()
     FROM talks t
     WHERE i.id = $3::bigint AND i.talk_id = $1::bigint AND t.id = i.talk_id AND t.owner_id = $2::text`,
    [talkId, ownerId, itemId, patch.body ?? null, patch.url ?? null],
  );
  if (rowCount !== 1) return { ok: false, reason: "not-found" };
  await touchTalk(talkId);
  return { ok: true };
}

export async function deleteItem(ownerId: string, talkId: string, itemId: string) {
  const { rowCount } = await pool.query(
    `DELETE FROM talk_items i USING talks t
     WHERE i.id = $3::bigint AND i.talk_id = $1::bigint AND t.id = i.talk_id AND t.owner_id = $2::text`,
    [talkId, ownerId, itemId],
  );
  if (rowCount === 1) await touchTalk(talkId);
  return rowCount === 1;
}

// orderedIds must be exactly the talk's current capsules, each once. Anything else (a stale
// page, a forged or foreign id) changes nothing and returns false.
export async function reorderItems(ownerId: string, talkId: string, orderedIds: string[]) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const owned = await client.query("SELECT 1 FROM talks WHERE id = $1::bigint AND owner_id = $2::text FOR UPDATE", [talkId, ownerId]);
    const { rows } = await client.query<{ id: string }>("SELECT id FROM talk_items WHERE talk_id = $1::bigint", [talkId]);
    const current = new Set(rows.map((r) => r.id));
    const requested = new Set(orderedIds);
    const exactSet =
      requested.size === orderedIds.length && requested.size === current.size && orderedIds.every((id) => current.has(id));
    if (owned.rowCount !== 1 || !exactSet) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `UPDATE talk_items i SET position = (o.ord - 1)::int
       FROM unnest($2::bigint[]) WITH ORDINALITY AS o(id, ord)
       WHERE i.id = o.id AND i.talk_id = $1::bigint`,
      [talkId, orderedIds],
    );
    await client.query("UPDATE talks SET updated_at = now() WHERE id = $1::bigint", [talkId]);
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
