// Admin-made password reset links: only an admin (according to the database) can make
// one, a link works once and expires, the new password works and the old one doesn't,
// and the member is signed out everywhere. Needs the database (npm run db:migrate).
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, describe, test } from "node:test";
import { betterAuth } from "better-auth";
import { pool } from "../lib/db";
import { hashToken } from "../lib/invites";
import { createPasswordReset, resetLinkName, resetPassword } from "../lib/password-resets";

// A bare auth instance (no Next.js cookie plugin) to create users and try signing in.
const bare = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  user: { additionalFields: { role: { type: "string", defaultValue: "member", input: false } } },
});

const run = crypto.randomBytes(4).toString("hex");
const OLD_PASSWORD = "correct-horse-battery";
const emailFor = (who: string) => `test-${run}-${who}@example.test`;

async function makeUser(who: string, role: "member" | "admin" = "member") {
  const { user } = await bare.api.signUpEmail({ body: { name: `Test ${who}`, email: emailFor(who), password: OLD_PASSWORD } });
  if (role === "admin") await pool.query(`UPDATE "user" SET role = 'admin' WHERE id = $1`, [user.id]);
  return user.id;
}

async function canSignIn(who: string, password: string) {
  try {
    await bare.api.signInEmail({ body: { email: emailFor(who), password } });
    return true;
  } catch {
    return false;
  }
}

after(async () => {
  await pool.query(`DELETE FROM "user" WHERE email LIKE $1`, [`test-${run}-%`]);
  await pool.end();
});

describe("password reset links", () => {
  test("an admin's link sets the new password once, and the old password stops working", async () => {
    const admin = await makeUser("admin1", "admin");
    const member = await makeUser("forgetful");
    const token = await createPasswordReset(admin, member);
    assert.ok(token);
    assert.equal(await resetLinkName(token), "Test forgetful");

    assert.deepEqual(await resetPassword(token, "brand-new-password"), { ok: true });
    assert.equal(await canSignIn("forgetful", "brand-new-password"), true);
    assert.equal(await canSignIn("forgetful", OLD_PASSWORD), false);

    assert.deepEqual(await resetPassword(token, "another-new-password"), { ok: false, reason: "invalid-link" });
    assert.equal(await resetLinkName(token), null);
    assert.equal(await canSignIn("forgetful", "brand-new-password"), true, "a reused link changes nothing");
  });

  test("two simultaneous submits of one link: exactly one succeeds", async () => {
    const admin = await makeUser("admin2", "admin");
    const member = await makeUser("racer");
    const token = (await createPasswordReset(admin, member))!;
    const results = await Promise.all([1, 2, 3].map((i) => resetPassword(token, `racing-password-${i}`)));
    assert.equal(results.filter((r) => r.ok).length, 1);
  });

  test("a member can't make a link for anyone, including an admin", async () => {
    const admin = await makeUser("admin3", "admin");
    const member = await makeUser("sneaky");
    assert.equal(await createPasswordReset(member, admin), null);
    assert.equal(await createPasswordReset(member, member), null);
    assert.equal(await createPasswordReset("made-up-user-id", member), null);
    const { rowCount } = await pool.query("SELECT 1 FROM password_resets WHERE user_id IN ($1, $2)", [admin, member]);
    assert.equal(rowCount, 0);
  });

  test("a link for a member who doesn't exist isn't created", async () => {
    const admin = await makeUser("admin4", "admin");
    assert.equal(await createPasswordReset(admin, "made-up-user-id"), null);
  });

  test("an expired link is refused and changes nothing", async () => {
    const admin = await makeUser("admin5", "admin");
    const member = await makeUser("late");
    const token = (await createPasswordReset(admin, member))!;
    await pool.query("UPDATE password_resets SET expires_at = now() - interval '1 minute' WHERE token_hash = $1", [hashToken(token)]);
    assert.deepEqual(await resetPassword(token, "brand-new-password"), { ok: false, reason: "invalid-link" });
    assert.equal(await canSignIn("late", OLD_PASSWORD), true);
  });

  test("a too-short password is refused without using up the link", async () => {
    const admin = await makeUser("admin6", "admin");
    const member = await makeUser("short");
    const token = (await createPasswordReset(admin, member))!;
    assert.deepEqual(await resetPassword(token, "short"), { ok: false, reason: "too-short" });
    assert.equal(await resetLinkName(token), "Test short");
    assert.deepEqual(await resetPassword(token, "long-enough-now"), { ok: true });
  });

  test("resetting signs the member out everywhere", async () => {
    const admin = await makeUser("admin7", "admin");
    const member = await makeUser("signedin");
    await canSignIn("signedin", OLD_PASSWORD);
    const sessions = () => pool.query('SELECT 1 FROM "session" WHERE "userId" = $1', [member]).then((r) => r.rowCount);
    assert.ok((await sessions())! > 0);
    const token = (await createPasswordReset(admin, member))!;
    assert.deepEqual(await resetPassword(token, "brand-new-password"), { ok: true });
    assert.equal(await sessions(), 0);
  });

  test("a new link cancels the member's earlier open link", async () => {
    const admin = await makeUser("admin8", "admin");
    const member = await makeUser("twice");
    const first = (await createPasswordReset(admin, member))!;
    const second = (await createPasswordReset(admin, member))!;
    assert.deepEqual(await resetPassword(first, "brand-new-password"), { ok: false, reason: "invalid-link" });
    assert.deepEqual(await resetPassword(second, "brand-new-password"), { ok: true });
  });

  test("a made-up token does nothing", async () => {
    assert.deepEqual(await resetPassword("not-a-real-token-not-a-real-token", "brand-new-password"), { ok: false, reason: "invalid-link" });
  });
});
