// Talk and lesson drafts. Private to their owner: every query is scoped by owner_id in
// the SQL itself. Relative imports only, so tests can load this outside Next.js.
import { pool } from "./db";

export type TalkKind = "talk" | "lesson";

export type Talk = {
  id: string;
  owner_id: string;
  title: string;
  kind: TalkKind;
  minutes: number | null;
  audience: string | null;
  body: string;
  created_at: Date;
  updated_at: Date;
};

export type TalkFields = { title: string; kind: TalkKind; minutes: number | null; audience: string | null; body: string };

export async function listTalks(ownerId: string) {
  const { rows } = await pool.query<Pick<Talk, "id" | "title" | "kind" | "minutes" | "updated_at">>(
    `SELECT id, title, kind, minutes, updated_at FROM talks WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT 200`,
    [ownerId],
  );
  return rows;
}

export async function getTalk(ownerId: string, id: string) {
  const { rows } = await pool.query<Talk>(`SELECT * FROM talks WHERE id = $1::bigint AND owner_id = $2`, [id, ownerId]);
  return rows[0] ?? null;
}

export async function createTalk(ownerId: string, fields: TalkFields) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO talks (owner_id, title, kind, minutes, audience, body)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [ownerId, fields.title, fields.kind, fields.minutes, fields.audience, fields.body],
  );
  return rows[0].id;
}

// Returns true only if the talk exists and belongs to ownerId.
export async function updateTalk(ownerId: string, id: string, fields: TalkFields) {
  const { rowCount } = await pool.query(
    `UPDATE talks SET title = $3, kind = $4, minutes = $5, audience = $6, body = $7, updated_at = now()
     WHERE id = $1::bigint AND owner_id = $2`,
    [id, ownerId, fields.title, fields.kind, fields.minutes, fields.audience, fields.body],
  );
  return rowCount === 1;
}

export async function deleteTalk(ownerId: string, id: string) {
  const { rowCount } = await pool.query(`DELETE FROM talks WHERE id = $1::bigint AND owner_id = $2`, [id, ownerId]);
  return rowCount === 1;
}

export type TalkDetails = Omit<TalkFields, "body">;

// Title, type, length, audience. Capsules live in talk_items (lib/talk-items.ts).
export async function updateTalkDetails(ownerId: string, id: string, d: TalkDetails) {
  const { rowCount } = await pool.query(
    `UPDATE talks SET title = $3, kind = $4, minutes = $5, audience = $6, updated_at = now()
     WHERE id = $1::bigint AND owner_id = $2`,
    [id, ownerId, d.title, d.kind, d.minutes, d.audience],
  );
  return rowCount === 1;
}
