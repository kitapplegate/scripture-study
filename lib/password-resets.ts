// Admin-made password reset links, for a member who forgot their password. No email is
// ever sent: the admin hands over the link. Same shape as invites (only a sha256 of the
// token is stored, a link works once, it expires), and better-auth itself hashes and
// saves the new password.
// Relative imports only, so tests can load this outside Next.js.
import crypto from "node:crypto";
import { auth } from "./auth";
import { pool } from "./db";
import { hashToken } from "./invites";

export const RESET_HOURS = 24;

export type Member = { id: string; name: string; email: string };

export async function listMembers() {
  const { rows } = await pool.query<Member>(`SELECT id, name, email FROM "user" ORDER BY lower(name), email`);
  return rows;
}

// Returns the link token, or null unless adminId is an admin according to the database
// (never a role the caller claims) and the member exists. A new link cancels any earlier
// open link for the same member.
export async function createPasswordReset(adminId: string, userId: string): Promise<string | null> {
  const token = crypto.randomBytes(24).toString("base64url");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE password_resets SET expires_at = now() WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()",
      [userId],
    );
    const { rowCount } = await client.query(
      `INSERT INTO password_resets (token_hash, user_id, created_by, expires_at)
       SELECT $1, u.id, a.id, now() + make_interval(hours => $4)
       FROM "user" u, "user" a
       WHERE u.id = $2 AND a.id = $3 AND a.role = 'admin'`,
      [hashToken(token), userId, adminId, RESET_HOURS],
    );
    if (rowCount !== 1) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query("COMMIT");
    return token;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// The member's name if the link is still usable, else null.
export async function resetLinkName(token: string) {
  const { rows } = await pool.query<{ name: string }>(
    `SELECT u.name FROM password_resets r JOIN "user" u ON u.id = r.user_id
     WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0]?.name ?? null;
}

export type ResetResult = { ok: true } | { ok: false; reason: "invalid-link" | "too-short" | "too-long" };

export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  const ctx = await auth.$context;
  const { minPasswordLength, maxPasswordLength } = ctx.password.config;
  // Checked before claiming, so a too-short password doesn't use up the link.
  if (newPassword.length < minPasswordLength) return { ok: false, reason: "too-short" };
  if (newPassword.length > maxPasswordLength) return { ok: false, reason: "too-long" };

  // Atomic: two submits of the same link can't both succeed.
  const { rows } = await pool.query<{ id: string; user_id: string }>(
    `UPDATE password_resets SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING id, user_id`,
    [hashToken(token)],
  );
  const claim = rows[0];
  if (!claim) return { ok: false, reason: "invalid-link" };

  let saved = false;
  try {
    const hashed = await ctx.password.hash(newPassword);
    if (await ctx.internalAdapter.findCredentialAccount(claim.user_id)) {
      await ctx.internalAdapter.updatePassword(claim.user_id, hashed);
    } else {
      await ctx.internalAdapter.createAccount({ userId: claim.user_id, providerId: "credential", accountId: claim.user_id, password: hashed });
    }
    saved = true;
    // Sign the member out everywhere, in case someone else knew the old password.
    await ctx.internalAdapter.deleteUserSessions(claim.user_id);
  } catch (err) {
    // Only give the link back if the password wasn't changed with it.
    if (!saved) await pool.query("UPDATE password_resets SET used_at = NULL WHERE id = $1", [claim.id]);
    throw err;
  }
  return { ok: true };
}
