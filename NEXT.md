# Next

**Action:** Pre-ship, first slice: make better-auth's rate limit key on the real client IP behind Caddy (a trusted forwarded-IP header), so members don't all share one bucket once Knit is deployed.

**Why now:** Kit's plan (2026-09-14, SPEC D9): finish Knit, deploy it to `knit.marzipan-solutions.com`, invite the family, then port recipe-chat in. The talk builder is complete (T3 done). This is the known gap blocking deploy (VERIFICATION row 15). The rest of the pre-ship list comes after: admin password-reset link, nightly `pg_dump`, then deploy (slice 2).

**Start here:** `lib/auth.ts` (rate limit config); check how better-auth 1.7 reads the client IP in `node_modules/better-auth` before choosing a header. Caddy sets `X-Forwarded-For` on `reverse_proxy`.

**Verify with:** `npm run typecheck && npm test`. Then on dev, 6 wrong passwords in a minute from one forwarded IP → 429, while a different forwarded IP still gets 401, not 429.

**Waiting on Kit (doesn't block this slice):**
- Rename the Cloudflare record `scriptures` → `knit`; then confirm it resolves with 1.1.1.1 and 8.8.8.8.
- Browser checks: the T3 print preview (no site header/footer), dragging in the builder, Add to talk. Or OK me to test in his session.
- The family's time zone for the Come, Follow Me week (currently `America/New_York`).

**Watch out for:**
- **Throwaway member recipe:** an `.mts` script under `node_modules/.cache/` (gitignored, and bare imports like `better-auth` resolve there), run with `node --env-file-if-exists=.env.local --import tsx`; sign in with `curl -c jar -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"email":…,"password":…}' /api/auth/sign-in/email`. Delete the user and the script afterward.
- **Don't overlap `npm run build` with tests.** Its prebuild step rewrites `data/scriptures`.
- **Browser checks run in Kit's session only with his OK.** No typing passwords into the browser.
- **Recipes stay out of this repo** (principle 1): when the port starts, recipe data is loaded from outside the public repo.
