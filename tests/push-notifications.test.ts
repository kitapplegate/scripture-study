import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { betterAuth } from "better-auth";
import { pool } from "../lib/db";
import {
  removePushSubscription,
  savePushSubscription,
  subscriptionsForNewPost,
  subscriptionsForPostAuthor,
} from "../lib/push";
import * as posts from "../lib/posts";

const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  user: { additionalFields: { role: { type: "string", defaultValue: "member", input: false } } },
});
const run = crypto.randomBytes(4).toString("hex");
let alice: string;
let bob: string;
let postId: string;

function subscription(name: string) {
  return {
    endpoint: `https://push.example.test/${run}/${name}`,
    p256dh: `p256dh-${name}`,
    auth: `auth-${name}`,
  };
}

before(async () => {
  alice = (await auth.api.signUpEmail({ body: { name: "Alice", email: `test-${run}-push-a@example.test`, password: "correct-horse-battery" } })).user.id;
  bob = (await auth.api.signUpEmail({ body: { name: "Bob", email: `test-${run}-push-b@example.test`, password: "correct-horse-battery" } })).user.id;
  postId = await posts.createPost({ authorId: alice, body: "A family thought", verseId: null, linkUrl: null });
});

after(async () => {
  await pool.query(`DELETE FROM "user" WHERE email LIKE $1`, [`test-${run}-push-%`]);
  await pool.end();
});

describe("push notification subscriptions", () => {
  test("new posts go to every subscribed device except the author's", async () => {
    await savePushSubscription(alice, subscription("alice-phone"));
    await savePushSubscription(bob, subscription("bob-phone"));
    await savePushSubscription(bob, subscription("bob-laptop"));

    const recipients = await subscriptionsForNewPost(alice);
    assert.deepEqual(recipients.map((row) => row.endpoint).sort(), [
      subscription("bob-laptop").endpoint,
      subscription("bob-phone").endpoint,
    ]);
  });

  test("comments go only to the post author's devices, never for a self-comment", async () => {
    const recipients = await subscriptionsForPostAuthor(postId, bob);
    assert.deepEqual(recipients.map((row) => row.endpoint), [subscription("alice-phone").endpoint]);
    assert.deepEqual(await subscriptionsForPostAuthor(postId, alice), []);
    assert.deepEqual(await subscriptionsForPostAuthor("999999999999", bob), []);
  });

  test("an endpoint follows the currently signed-in member and can be disabled per device", async () => {
    const shared = subscription("shared-browser");
    await savePushSubscription(alice, shared);
    await savePushSubscription(bob, { ...shared, auth: "new-auth" });

    assert.ok((await subscriptionsForNewPost(alice)).some((row) => row.endpoint === shared.endpoint && row.auth === "new-auth"));
    assert.equal(await removePushSubscription(alice, shared.endpoint), false);
    assert.equal(await removePushSubscription(bob, shared.endpoint), true);
    assert.equal(await removePushSubscription(bob, shared.endpoint), false);
  });
});
