// Relative imports only: the better-auth CLI loads this file outside Next.js.
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { pool } from "./db";

export const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  user: {
    additionalFields: {
      // Copied from the invite after sign-up. input:false means a request can't set it.
      role: { type: "string", defaultValue: "member", input: false },
    },
  },
  rateLimit: {
    enabled: true, // better-auth leaves it off in development by default
    window: 60,
    max: 100,
    customRules: { "/sign-in/email": { window: 60, max: 5 } },
  },
  advanced: {
    // Behind Caddy on the VPS, X-Forwarded-For can be a chain ("forged, real client").
    // Unset, better-auth drops any chain and every member shares one rate-limit bucket.
    // Listing the local hops makes it walk the chain from the right and take the address
    // Caddy saw. Safe because the app binds to localhost, reachable only through Caddy.
    ipAddress: { trustedProxies: ["127.0.0.1", "::1"] },
  },
  hooks: {
    // Invite-only: the public HTTP sign-up endpoint is closed. The invite page signs
    // people up by calling auth.api.signUpEmail on the server, which has no ctx.request.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && ctx.request) {
        throw new APIError("FORBIDDEN", { message: "Sign-up is by invite only." });
      }
    }),
  },
  plugins: [nextCookies()],
});

export type SessionUser = typeof auth.$Infer.Session.user;
