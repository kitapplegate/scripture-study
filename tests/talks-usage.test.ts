// Talk drafts are private to their owner, and the assistant's daily cap holds.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { betterAuth } from "better-auth";
import { pool } from "../lib/db";
import * as talks from "../lib/talks";
import { consumeAssistantRequest } from "../lib/usage";

const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  user: { additionalFields: { role: { type: "string", defaultValue: "member", input: false } } },
});
const run = crypto.randomBytes(4).toString("hex");
const makeUser = async (who: string) =>
  (await auth.api.signUpEmail({ body: { name: who, email: `test-${run}-${who}@example.test`, password: "correct-horse-battery" } })).user.id;

let alice: string, bob: string;
before(async () => {
  alice = await makeUser("alice");
  bob = await makeUser("bob");
});
after(async () => {
  await pool.query(`DELETE FROM "user" WHERE email LIKE $1`, [`test-${run}-%`]);
  await pool.end();
});

const fields = (title: string): talks.TalkFields => ({ title, kind: "talk", minutes: 10, audience: null, body: "# Faith\n[[Alma 32:21]]" });

describe("talks are private", () => {
  test("another member can't read, list, edit, or delete your draft", async () => {
    const id = await talks.createTalk(alice, fields("Alice's talk"));
    assert.equal(await talks.getTalk(bob, id), null);
    assert.ok(!(await talks.listTalks(bob)).some((t) => t.id === id));
    assert.equal(await talks.updateTalk(bob, id, fields("hijacked")), false);
    assert.equal(await talks.deleteTalk(bob, id), false);
    assert.equal((await talks.getTalk(alice, id))?.title, "Alice's talk");
  });

  test("the owner can edit and delete", async () => {
    const id = await talks.createTalk(alice, fields("draft"));
    assert.equal(await talks.updateTalk(alice, id, fields("final")), true);
    assert.equal((await talks.getTalk(alice, id))?.title, "final");
    assert.equal(await talks.deleteTalk(alice, id), true);
    assert.equal(await talks.getTalk(alice, id), null);
  });
});

describe("assistant daily cap", () => {
  test("allows up to the limit, then refuses, even under concurrent requests", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => consumeAssistantRequest(bob, 3)));
    assert.equal(results.filter((r) => r.allowed).length, 3);
    assert.equal((await consumeAssistantRequest(bob, 3)).allowed, false);
  });
});
