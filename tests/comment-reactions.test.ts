// Reactions on comments work like reactions on posts: toggle on and off, your own reactions
// are per viewer while counts are shared, a made-up comment id does nothing, and reactions
// go away with their comment. Needs the database (npm run db:migrate).
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { betterAuth } from "better-auth";
import { pool } from "../lib/db";
import * as posts from "../lib/posts";

const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  user: { additionalFields: { role: { type: "string", defaultValue: "member", input: false } } },
});
const run = crypto.randomBytes(4).toString("hex");
let alice: string, bob: string, postId: string;

const makeUser = async (who: string) =>
  (await auth.api.signUpEmail({ body: { name: `Test ${who}`, email: `test-${run}-${who}@example.test`, password: "correct-horse-battery" } })).user.id;

before(async () => {
  alice = await makeUser("alice");
  bob = await makeUser("bob");
  postId = await posts.createPost({ authorId: alice, body: "A post to comment on", verseId: null, endVerseId: null, linkUrl: null });
});

after(async () => {
  await pool.query(`DELETE FROM "user" WHERE email LIKE $1`, [`test-${run}-%`]);
  await pool.end();
});

const commentAs = async (viewer: string, commentId: string) => (await posts.listComments(viewer, postId)).find((c) => c.id === commentId);

describe("comment reactions", () => {
  test("toggle on and off; my reactions are per viewer, counts are shared", async () => {
    const commentId = (await posts.addComment({ authorId: bob, postId, body: "Amen to that" }))!;
    const fresh = await commentAs(alice, commentId);
    assert.deepEqual([fresh?.reaction_counts, fresh?.my_reactions], [{}, []]);

    assert.deepEqual(await posts.toggleCommentReaction(alice, commentId, "heart"), { on: true, postId });
    assert.deepEqual(await posts.toggleCommentReaction(bob, commentId, "heart"), { on: true, postId });
    await posts.toggleCommentReaction(alice, commentId, "pray");

    const asAlice = await commentAs(alice, commentId);
    assert.deepEqual(asAlice?.reaction_counts, { heart: 2, pray: 1 });
    assert.deepEqual([...(asAlice?.my_reactions ?? [])].sort(), ["heart", "pray"]);
    assert.deepEqual((await commentAs(bob, commentId))?.my_reactions, ["heart"]);

    assert.deepEqual(await posts.toggleCommentReaction(alice, commentId, "heart"), { on: false, postId });
    assert.deepEqual((await commentAs(bob, commentId))?.reaction_counts, { heart: 1, pray: 1 });
  });

  test("reacting to a comment doesn't touch the post's own reactions", async () => {
    const commentId = (await posts.addComment({ authorId: bob, postId, body: "Separate" }))!;
    await posts.toggleCommentReaction(alice, commentId, "insight");
    assert.deepEqual((await posts.getPost(alice, postId))?.reaction_counts.insight, undefined);
  });

  test("a comment that doesn't exist does nothing", async () => {
    assert.equal(await posts.toggleCommentReaction(bob, "999999999999", "pray"), null);
  });

  test("reactions go away with their comment, and only the three kinds are allowed", async () => {
    const commentId = (await posts.addComment({ authorId: bob, postId, body: "Soon deleted" }))!;
    await posts.toggleCommentReaction(alice, commentId, "heart");
    assert.ok(await posts.deleteComment({ id: bob }, commentId));
    const { rowCount } = await pool.query("SELECT 1 FROM comment_reactions WHERE comment_id = $1::bigint", [commentId]);
    assert.equal(rowCount, 0);

    const other = (await posts.addComment({ authorId: bob, postId, body: "Check the kinds" }))!;
    await assert.rejects(
      pool.query("INSERT INTO comment_reactions (comment_id, user_id, kind) VALUES ($1::bigint, $2, 'thumbs')", [other, alice]),
      /check constraint/,
    );
  });
});
