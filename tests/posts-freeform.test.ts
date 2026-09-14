// Family posts are free-form: text alone is fine, a scripture is optional, and an empty post
// is refused by both the app and the database. Needs the database (npm run db:migrate).
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { betterAuth } from "better-auth";
import { pool } from "../lib/db";
import { preparePost } from "../lib/post-input";
import * as posts from "../lib/posts";
import { getPassage } from "../lib/scriptures";

const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  user: { additionalFields: { role: { type: "string", defaultValue: "member", input: false } } },
});
const run = crypto.randomBytes(4).toString("hex");
let author: string;

before(async () => {
  author = (await auth.api.signUpEmail({ body: { name: "Poster", email: `test-${run}-poster@example.test`, password: "correct-horse-battery" } })).user.id;
});

after(async () => {
  await pool.query(`DELETE FROM "user" WHERE email LIKE $1`, [`test-${run}-%`]);
  await pool.end();
});

function prepared(r: Awaited<ReturnType<typeof preparePost>>) {
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as { ok: true; post: posts.NewPost & { verseId: string | null } }).post;
}

describe("free-form posts", () => {
  test("text alone is a post, with no scripture attached", async () => {
    const post = prepared(await preparePost({ body: "  Grateful for family scripture night.  " }));
    assert.deepEqual(post, { body: "Grateful for family scripture night.", verseId: null, endVerseId: null, linkUrl: null });
    const id = await posts.createPost({ authorId: author, ...post });
    const saved = await posts.getPost(author, id);
    assert.equal(saved?.verse_id, null);
    assert.equal(saved?.body, "Grateful for family scripture night.");
    assert.ok((await posts.listFeed(author)).some((p) => p.id === id));
  });

  test("a typed scripture is attached, including ranges, with or without text", async () => {
    assert.deepEqual(prepared(await preparePost({ reference: "Moroni 10:4-5" })), {
      body: "",
      verseId: "moro.10.4",
      endVerseId: "moro.10.5",
      linkUrl: null,
    });
    const withText = prepared(await preparePost({ body: "Ask with real intent", reference: "Alma 32:21" }));
    assert.equal(withText.verseId, "alma.32.21");
    assert.equal(withText.endVerseId, null);
    const id = await posts.createPost({ authorId: author, ...withText });
    assert.equal((await posts.getPost(author, id))?.verse_id, "alma.32.21");
  });

  test("the reference shown for a verse tapped in the reader resolves back to the same verses", async () => {
    for (const [start, end] of [["1-ne.3.7", null], ["moro.10.4", "moro.10.5"]] as const) {
      const passage = await getPassage(start, end);
      assert.ok(passage);
      const post = prepared(await preparePost({ reference: passage.reference }));
      assert.equal(post.verseId, start, passage.reference);
      assert.equal(post.endVerseId, end, passage.reference);
    }
  });

  test("a post needs text or a scripture", async () => {
    assert.deepEqual(await preparePost({ body: "   ", reference: "  " }), { ok: false, error: "Write something, or add a scripture." });
    assert.deepEqual(await preparePost({ linkUrl: "https://www.churchofjesuschrist.org/study" }), {
      ok: false,
      error: "Write something, or add a scripture.",
    });
  });

  test("a scripture that doesn't exist is an error, not silently dropped", async () => {
    const r = await preparePost({ body: "hello", reference: "Hezekiah 3:1" });
    assert.equal(r.ok, false);
    assert.match((r as { error: string }).error, /Hezekiah 3:1/);
  });

  test("links must be full https addresses; long bodies are refused", async () => {
    for (const bad of ["http://example.com", "javascript:alert(1)", "www.example.com", `https://example.com/${"a".repeat(500)}`]) {
      assert.equal((await preparePost({ body: "x", linkUrl: bad })).ok, false, bad);
    }
    assert.equal(prepared(await preparePost({ body: "x", linkUrl: "https://example.com/talk" })).linkUrl, "https://example.com/talk");
    assert.equal((await preparePost({ body: "a".repeat(5001) })).ok, false);
  });

  test("the database refuses an empty post, or a range without a start, even if the app didn't", async () => {
    await assert.rejects(posts.createPost({ authorId: author, verseId: null, endVerseId: null, body: "  ", linkUrl: null }), /posts_has_content/);
    await assert.rejects(posts.createPost({ authorId: author, verseId: null, endVerseId: "moro.10.5", body: "text", linkUrl: null }), /posts_range_needs_start/);
  });
});
