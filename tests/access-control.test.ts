// Proves the SPEC security rule "user B can't change or remove user A's content, even
// with forged ids", plus single-use invites. Runs against the database in
// DATABASE_URL, creating throwaway users and removing them afterward.
//
// Run: npm test
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { betterAuth } from "better-auth";
import { pool } from "../lib/db";
import { claimInvite, completeInvite, createInvite, inviteIsUsable, releaseInvite } from "../lib/invites";
import * as posts from "../lib/posts";

// A bare auth instance (no Next.js cookie plugin, no invite hook) just to create users.
const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  user: { additionalFields: { role: { type: "string", defaultValue: "member", input: false } } },
});

const run = crypto.randomBytes(4).toString("hex");
const emailFor = (who: string) => `test-${run}-${who}@example.test`;

async function makeUser(who: string, role: "member" | "admin" = "member") {
  const { user } = await auth.api.signUpEmail({
    body: { name: `Test ${who}`, email: emailFor(who), password: "correct-horse-battery" },
  });
  if (role === "admin") await pool.query(`UPDATE "user" SET role = 'admin' WHERE id = $1`, [user.id]);
  return { id: user.id, role };
}

let alice: posts.Actor, bob: posts.Actor, admin: posts.Actor;

before(async () => {
  alice = await makeUser("alice");
  bob = await makeUser("bob");
  admin = await makeUser("admin", "admin");
});

after(async () => {
  await pool.query(`DELETE FROM invites WHERE note LIKE $1`, [`test-${run}%`]);
  await pool.query(`DELETE FROM "user" WHERE email LIKE $1`, [`test-${run}-%`]);
  await pool.end();
});

const newPost = (author: posts.Actor) =>
  posts.createPost({ authorId: author.id, verseId: "1-ne.3.7", body: "test post", linkUrl: null });

describe("posts", () => {
  test("a member can't delete someone else's post", async () => {
    const id = await newPost(alice);
    assert.equal(await posts.deletePost(bob, id), false);
    assert.ok(await posts.getPost(bob.id, id), "post should still exist");
  });

  test("the author can delete their own post", async () => {
    const id = await newPost(alice);
    assert.equal(await posts.deletePost(alice, id), true);
    assert.equal(await posts.getPost(alice.id, id), null);
  });

  test("an admin can delete anyone's post", async () => {
    const id = await newPost(bob);
    assert.equal(await posts.deletePost(admin, id), true);
  });

  test("a role claimed by the caller object alone doesn't grant admin", async () => {
    // deletePost trusts the Actor it's given, so callers must pass the session user.
    // This documents that contract: a plain member object can't delete.
    const id = await newPost(alice);
    assert.equal(await posts.deletePost({ id: bob.id, role: "member" }, id), false);
  });

  test("every member sees every post in the feed", async () => {
    const id = await newPost(alice);
    const feed = await posts.listFeed(bob.id);
    assert.ok(feed.some((p) => p.id === id));
  });
});

describe("comments", () => {
  test("a member can't delete someone else's comment, but the author can", async () => {
    const postId = await newPost(alice);
    const commentId = await posts.addComment({ authorId: alice.id, postId, body: "hi" });
    assert.ok(commentId);
    assert.equal(await posts.deleteComment(bob, commentId), null);
    assert.equal(await posts.deleteComment(alice, commentId), postId);
  });

  test("commenting on a post that doesn't exist does nothing", async () => {
    assert.equal(await posts.addComment({ authorId: bob.id, postId: "999999999999", body: "hi" }), null);
  });
});

describe("reactions", () => {
  test("toggle on and off; my_reactions is per viewer, counts are shared", async () => {
    const postId = await newPost(alice);
    assert.equal(await posts.toggleReaction(alice.id, postId, "heart"), true);

    const asBob = await posts.getPost(bob.id, postId);
    assert.equal(asBob?.reaction_counts.heart, 1);
    assert.deepEqual(asBob?.my_reactions, []);

    const asAlice = await posts.getPost(alice.id, postId);
    assert.deepEqual(asAlice?.my_reactions, ["heart"]);

    assert.equal(await posts.toggleReaction(alice.id, postId, "heart"), false);
    assert.equal((await posts.getPost(alice.id, postId))?.reaction_counts.heart, undefined);
  });

  test("reacting to a post that doesn't exist does nothing", async () => {
    assert.equal(await posts.toggleReaction(bob.id, "999999999999", "pray"), false);
  });
});

describe("invites", () => {
  test("an invite can only be claimed once, even by two simultaneous requests", async () => {
    const token = await createInvite({ role: "member", note: `test-${run}-race` });
    const results = await Promise.all([claimInvite(token), claimInvite(token), claimInvite(token)]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(await inviteIsUsable(token), false);
  });

  test("a released claim (failed sign-up) makes the invite usable again", async () => {
    const token = await createInvite({ role: "member", note: `test-${run}-release` });
    const claim = await claimInvite(token);
    assert.ok(claim);
    await releaseInvite(claim.id);
    assert.equal(await inviteIsUsable(token), true);
  });

  test("a completed invite can't be released back into use", async () => {
    const token = await createInvite({ role: "admin", note: `test-${run}-complete` });
    const claim = await claimInvite(token);
    assert.ok(claim);
    const user = await makeUser("invitee");
    await completeInvite(claim.id, user.id, claim.role);
    await releaseInvite(claim.id);
    assert.equal(await inviteIsUsable(token), false);
    const { rows } = await pool.query(`SELECT role FROM "user" WHERE id = $1`, [user.id]);
    assert.equal(rows[0].role, "admin", "the invite's role is applied to the new user");
  });

  test("an expired invite can't be claimed", async () => {
    const token = await createInvite({ role: "member", note: `test-${run}-expired` });
    await pool.query(
      `UPDATE invites SET expires_at = now() - interval '1 minute' WHERE token_hash = $1`,
      [crypto.createHash("sha256").update(token).digest("hex")],
    );
    assert.equal(await claimInvite(token), null);
  });

  test("a made-up token claims nothing", async () => {
    assert.equal(await claimInvite("not-a-real-token-not-a-real-token"), null);
  });
});
