# Next

**Action:** Pre-ship, next slice: an admin password-reset link, so when a family member forgets their password Kit can hand them a single-use reset link. There's no email sending, and it mirrors how invites work.

**Why now:** Kit's plan (2026-09-14, SPEC D9): finish Knit, deploy to `knit.marzipan-solutions.com`, invite the family, then port recipe-chat in. The talk builder is done and browser-tested by Kit. The rate-limit IP gap is closed (VERIFICATION row 19). Without a reset path, a forgotten password after launch means hand-editing the database. After this: nightly `pg_dump`, then deploy (slice 2).

**Start here:** read `lib/invites.ts` and the admin invites page under `app/admin/` for the single-use, expiring token pattern. Then check what better-auth 1.7.4 offers for resetting a password server-side (in `node_modules/better-auth`) before writing any of our own hashing.

**Verify with:** `npm run typecheck && npm test` plus a new test: an admin-made link resets the password once, and a reused link, an expired link, or one made by a non-admin is refused. Then curl as a throwaway member: sign-in with the new password works and the old one fails.

**Waiting on Kit (doesn't block this slice):**
- The family's time zone for the Come, Follow Me week (currently `America/New_York`).

**Watch out for:**
- **At deploy, re-check the rate limit through the real Caddy:** 6 wrong passwords from one phone → 429, while another device still signs in. Also make sure the app binds to localhost only, because `trustedProxies` in `lib/auth.ts` relies on it.
- **Throwaway member recipe:** an `.mts` script under `node_modules/.cache/` (gitignored, and bare imports like `better-auth` resolve there), run with `node --env-file-if-exists=.env.local --import tsx`; sign in with `curl -c jar -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"email":…,"password":…}' /api/auth/sign-in/email`. Delete the user and the script afterward.
- **Don't overlap `npm run build` with tests.** Its prebuild step rewrites `data/scriptures`.
- **Browser checks run in Kit's session only with his OK.** No typing passwords into the browser.
- **Recipes stay out of this repo** (principle 1): when the port starts, recipe data is loaded from outside the public repo.
