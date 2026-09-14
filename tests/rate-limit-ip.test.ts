// Sign-in rate limiting keys on each member's real IP behind Caddy, so one person's wrong
// passwords can't lock out everyone, and a forged leftmost X-Forwarded-For can't dodge
// the limit. Sends real requests through better-auth's handler with lib/auth.ts's own
// rate-limit and IP settings (no Next.js cookie plugin). Uses TEST-NET addresses.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, describe, test } from "node:test";
import { betterAuth } from "better-auth";
import { auth } from "../lib/auth";
import { pool } from "../lib/db";

const authUnderTest = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  rateLimit: auth.options.rateLimit,
  advanced: auth.options.advanced,
});

const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const run = crypto.randomBytes(4).toString("hex");

async function wrongPassword(forwardedFor: string) {
  const res = await authUnderTest.handler(
    new Request(`${base}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: base, "x-forwarded-for": forwardedFor },
      body: JSON.stringify({ email: `nobody-${run}@example.test`, password: "not-the-password" }),
    }),
  );
  return res.status;
}

after(() => pool.end());

describe("sign-in rate limit behind a proxy", () => {
  test("keys on the client address Caddy appended, not a forged one, and not one shared bucket", async () => {
    for (let i = 1; i <= 5; i++) assert.equal(await wrongPassword(`198.51.100.${i}, 203.0.113.10`), 401, `attempt ${i}`);
    assert.equal(await wrongPassword("198.51.100.99, 203.0.113.10"), 429, "a new forged address doesn't reset the limit");
    assert.equal(await wrongPassword("203.0.113.10"), 429, "the same client without a forged address is still limited");

    assert.equal(await wrongPassword("198.51.100.1, 203.0.113.20"), 401, "a different member behind the proxy isn't locked out");
    assert.equal(await wrongPassword("203.0.113.30"), 401, "a single-address header gets its own bucket");
  });
});
