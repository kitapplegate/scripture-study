// Talk builder capsules: ordering, validation, and that one member can never touch
// another member's talk. Needs the database (npm run db:migrate).
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { betterAuth } from "better-auth";
import { pool } from "../lib/db";
import * as items from "../lib/talk-items";
import { createTalk, deleteTalk, getTalk, updateTalkDetails } from "../lib/talks";

const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  user: { additionalFields: { role: { type: "string", defaultValue: "member", input: false } } },
});
const run = crypto.randomBytes(4).toString("hex");
const makeUser = async (who: string) =>
  (await auth.api.signUpEmail({ body: { name: who, email: `test-${run}-${who}@example.test`, password: "correct-horse-battery" } })).user.id;

let alice: string, bob: string, talk: string;

before(async () => {
  alice = await makeUser("alice");
  bob = await makeUser("bob");
  talk = await createTalk(alice, { title: "Faith", kind: "talk", minutes: 10, audience: null, body: "" });
});

after(async () => {
  await pool.query(`DELETE FROM "user" WHERE email LIKE $1`, [`test-${run}-%`]);
  await pool.end();
});

function added(r: items.AddResult) {
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as { ok: true; item: items.TalkItem }).item;
}

const order = async (owner = alice) => (await items.listItems(owner, talk))!.map((i) => i.id);

describe("talk builder capsules", () => {
  test("adds each kind at the end, in order, with scripture text from our data", async () => {
    const heading = added(await items.addItem(alice, talk, { kind: "heading", body: "Introduction" }));
    const scripture = added(await items.addItem(alice, talk, { kind: "scripture", verseId: "moro.10.4", endVerseId: "moro.10.5" }));
    const thought = added(await items.addItem(alice, talk, { kind: "thought", body: "Ask with real intent" }));
    const link = added(
      await items.addItem(alice, talk, { kind: "link", url: "https://www.churchofjesuschrist.org/study/general-conference", body: "Conference" }),
    );
    assert.deepEqual([heading.position, scripture.position, thought.position, link.position], [0, 1, 2, 3]);
    assert.equal(scripture.passage?.reference, "Moroni 10:4–5");
    assert.equal(scripture.passage?.verses.length, 2);
    assert.deepEqual((await items.listItems(alice, talk))!.map((i) => i.kind), ["heading", "scripture", "thought", "link"]);
  });

  test("rejects scriptures that don't exist and links that aren't https", async () => {
    assert.deepEqual(await items.addItem(alice, talk, { kind: "scripture", verseId: "1-ne.3.99" }), { ok: false, reason: "not-found" });
    assert.deepEqual(await items.addItem(alice, talk, { kind: "link", url: "http://example.com" }), { ok: false, reason: "invalid" });
    assert.deepEqual(await items.addItem(alice, talk, { kind: "link", url: "javascript:alert(1)" }), { ok: false, reason: "invalid" });
    const [, , , link] = await items.listItems(alice, talk) as items.TalkItem[];
    assert.deepEqual(await items.updateItem(alice, talk, link.id, { url: "javascript:alert(1)" }), { ok: false, reason: "invalid" });
  });

  test("reordering saves the new order, and edits persist", async () => {
    const reversed = (await order()).reverse();
    assert.equal(await items.reorderItems(alice, talk, reversed), true);
    assert.deepEqual(await order(), reversed);

    const thought = (await items.listItems(alice, talk))!.find((i) => i.kind === "thought")!;
    assert.deepEqual(await items.updateItem(alice, talk, thought.id, { body: "Edited thought" }), { ok: true });
    assert.equal((await items.listItems(alice, talk))!.find((i) => i.id === thought.id)?.body, "Edited thought");
  });

  test("a reorder that doesn't list exactly this talk's capsules changes nothing", async () => {
    const ids = await order();
    assert.equal(await items.reorderItems(alice, talk, ids.slice(1)), false, "missing one");
    assert.equal(await items.reorderItems(alice, talk, [...ids, ids[0]]), false, "duplicate");
    assert.equal(await items.reorderItems(alice, talk, [...ids.slice(1), "999999999999"]), false, "foreign id");
    assert.deepEqual(await order(), ids);
  });

  test("another member can't read, add to, edit, reorder, or remove capsules in your talk", async () => {
    const ids = await order();
    assert.equal(await items.listItems(bob, talk), null);
    assert.deepEqual(await items.addItem(bob, talk, { kind: "thought", body: "sneaky" }), { ok: false, reason: "not-owner" });
    assert.deepEqual(await items.updateItem(bob, talk, ids[0], { body: "hijacked" }), { ok: false, reason: "not-found" });
    assert.equal(await items.reorderItems(bob, talk, [...ids].reverse()), false);
    assert.equal(await items.deleteItem(bob, talk, ids[0]), false);
    assert.equal(await updateTalkDetails(bob, talk, { title: "hijacked", kind: "talk", minutes: null, audience: null }), false);
    assert.deepEqual(await order(), ids);
    assert.equal((await getTalk(alice, talk))?.title, "Faith");
  });

  test("a capsule can't be edited or removed through a different talk's id", async () => {
    const other = await createTalk(alice, { title: "Other", kind: "talk", minutes: null, audience: null, body: "" });
    const [first] = await order();
    assert.deepEqual(await items.updateItem(alice, other, first, { body: "wrong talk" }), { ok: false, reason: "not-found" });
    assert.equal(await items.deleteItem(alice, other, first), false);
  });

  test("the owner can remove a capsule, and deleting the talk removes its capsules", async () => {
    const [first, ...rest] = await order();
    assert.equal(await items.deleteItem(alice, talk, first), true);
    assert.deepEqual(await order(), rest);
    await deleteTalk(alice, talk);
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM talk_items WHERE talk_id = $1::bigint", [talk]);
    assert.equal(rows[0].n, 0);
  });
});
