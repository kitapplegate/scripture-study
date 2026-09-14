// Fixing a post: only its author can edit it (not another member, not an admin), the edit is
// marked, the scripture can be added, changed, or removed, and an edit can't empty a post.
// Needs the database (npm run db:migrate).
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { betterAuth } from "better-auth";
import { pool } from "../lib/db";
import { preparePost } from "../lib/post-input";
import * as posts from "../lib/posts";

const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  user: { additionalFields: { role: { type: "string", defaultValue: "member", input: false } } },
});
const run = crypto.randomBytes(4).toString("hex");
let alice: posts.Actor, bob: posts.Actor, admin: posts.Actor;

async function makeUser(who: string, role: "member" | "admin" = "member"): Promise<posts.Actor> {
  const { user } = await auth.api.signUpEmail({ body: { name: `Test ${who}`, email: `test-${run}-${who}@example.test`, password: "correct-horse-battery" } });
  if (role === "admin") await pool.query(`UPDATE "user" SET role = 'admin' WHERE id = $1`, [user.id]);
  return { id: user.id, role };
}

async function ready(input: Parameters<typeof preparePost>[0]) {
  const r = await preparePost(input);
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as { ok: true; post: posts.NewPost }).post;
}

before(async () => {
  alice = await makeUser("alice");
  bob = await makeUser("bob");
  admin = await makeUser("admin", "admin");
});

after(async () => {
  await pool.query(`DELETE FROM "user" WHERE email LIKE $1`, [`test-${run}-%`]);
  await pool.end();
});

describe("editing posts", () => {
  test("the author can fix a typo, and the post is marked edited", async () => {
    const id = await posts.createPost({ authorId: alice.id, ...(await ready({ body: "Faith is not to have a perfct knowledge" })) });
    assert.equal((await posts.getPost(alice.id, id))?.edited_at, null);
    assert.equal(await posts.updatePost(alice, id, await ready({ body: "Faith is not to have a perfect knowledge" })), true);
    const saved = await posts.getPost(bob.id, id);
    assert.equal(saved?.body, "Faith is not to have a perfect knowledge");
    assert.ok(saved?.edited_at instanceof Date);
  });

  test("the author can add, change, or remove the scripture", async () => {
    const id = await posts.createPost({ authorId: alice.id, ...(await ready({ body: "A thought" })) });
    await posts.updatePost(alice, id, await ready({ body: "A thought", reference: "Alma 32:21" }));
    assert.equal((await posts.getPost(alice.id, id))?.verse_id, "alma.32.21");
    await posts.updatePost(alice, id, await ready({ body: "A thought", reference: "Moroni 10:4-5" }));
    const range = await posts.getPost(alice.id, id);
    assert.deepEqual([range?.verse_id, range?.end_verse_id], ["moro.10.4", "moro.10.5"]);
    await posts.updatePost(alice, id, await ready({ body: "A thought" }));
    const cleared = await posts.getPost(alice.id, id);
    assert.deepEqual([cleared?.verse_id, cleared?.end_verse_id], [null, null]);
  });

  test("another member can't edit it, even with the post's id", async () => {
    const id = await posts.createPost({ authorId: alice.id, ...(await ready({ body: "Alice's words" })) });
    assert.equal(await posts.updatePost(bob, id, await ready({ body: "Bob was here" })), false);
    assert.equal(await posts.updatePost({ id: bob.id, role: "admin" }, id, await ready({ body: "Claimed admin" })), false);
    assert.equal((await posts.getPost(alice.id, id))?.body, "Alice's words");
  });

  test("an admin can delete someone's post but can't rewrite it", async () => {
    const id = await posts.createPost({ authorId: alice.id, ...(await ready({ body: "Alice's words" })) });
    assert.equal(await posts.updatePost(admin, id, await ready({ body: "Admin rewrite" })), false);
    const saved = await posts.getPost(alice.id, id);
    assert.equal(saved?.body, "Alice's words");
    assert.equal(saved?.edited_at, null);
  });

  test("an edit can't empty a post", async () => {
    const id = await posts.createPost({ authorId: alice.id, ...(await ready({ body: "Keep me", reference: "Alma 32:21" })) });
    assert.deepEqual(await preparePost({ body: " ", reference: "" }), { ok: false, error: "Write something, or add a scripture." });
    await assert.rejects(posts.updatePost(alice, id, { body: "", verseId: null, endVerseId: null, linkUrl: null }), /posts_has_content/);
    assert.equal((await posts.getPost(alice.id, id))?.body, "Keep me");
  });

  test("editing a post that doesn't exist changes nothing", async () => {
    assert.equal(await posts.updatePost(alice, "999999999999", await ready({ body: "ghost" })), false);
  });
});
