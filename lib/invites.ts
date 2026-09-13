// Invite links. Only a sha256 of the token is stored, so a database leak doesn't hand
// out working links. scripts/create-invite.mjs mirrors createInvite for the first admin.
import crypto from "node:crypto";
import { pool } from "./db";

export const INVITE_DAYS = 7;

export type InviteRole = "member" | "admin";

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function createInvite(opts: { role: InviteRole; note?: string; createdBy?: string }) {
  const token = crypto.randomBytes(24).toString("base64url");
  await pool.query(
    `INSERT INTO invites (token_hash, role, note, created_by, expires_at)
     VALUES ($1, $2, $3, $4, now() + make_interval(days => $5))`,
    [hashToken(token), opts.role, opts.note || null, opts.createdBy ?? null, INVITE_DAYS],
  );
  return token;
}

export async function inviteIsUsable(token: string) {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM invites WHERE token_hash = $1 AND claimed_at IS NULL AND expires_at > now()",
    [hashToken(token)],
  );
  return rowCount === 1;
}

// Atomic: two people opening the same link at once can't both claim it.
export async function claimInvite(token: string) {
  const { rows } = await pool.query<{ id: string; role: InviteRole }>(
    `UPDATE invites SET claimed_at = now()
     WHERE token_hash = $1 AND claimed_at IS NULL AND expires_at > now()
     RETURNING id, role`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

// Undo a claim when account creation fails (e.g. the email is already registered).
export async function releaseInvite(id: string) {
  await pool.query("UPDATE invites SET claimed_at = NULL WHERE id = $1 AND used_by IS NULL", [id]);
}

export async function completeInvite(id: string, userId: string, role: InviteRole) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE invites SET used_by = $1 WHERE id = $2", [userId, id]);
    await client.query(`UPDATE "user" SET role = $1 WHERE id = $2`, [role, userId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export type InviteRow = {
  id: string;
  role: InviteRole;
  note: string | null;
  created_at: Date;
  expires_at: Date;
  claimed_at: Date | null;
  used_by_name: string | null;
};

export async function listInvites() {
  const { rows } = await pool.query<InviteRow>(
    `SELECT i.id, i.role, i.note, i.created_at, i.expires_at, i.claimed_at, u.name AS used_by_name
     FROM invites i LEFT JOIN "user" u ON u.id = i.used_by
     ORDER BY i.created_at DESC LIMIT 100`,
  );
  return rows;
}
