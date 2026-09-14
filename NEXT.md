# Next

**Action:** Launch. First push to GitHub: 14+ commits to a **public** repo, so first scan the unpushed diff for secrets (`git diff @{u}..HEAD`, grep for `KEY=`, `SECRET`, `password`, and IPs). Then follow `deploy/BOOTSTRAP.md` on the VPS, getting Kit's OK before each outward step (push, SSH, Caddy reload).

**Why now:** Everything Kit wanted before launch is done and verified locally: the talk builder, the rate-limit IP fix, password-reset links, deploy prep, and the Codex layout/color fixes with the larger name and Mosiah 18:21. The family is waiting.

**Start here:** `deploy/BOOTSTRAP.md` §0 preflight (read-only) on the VPS, then §1 onward.

**Verify with:** BOOTSTRAP §9 launch checks. `https://knit.marzipan-solutions.com` loads. The rate limit holds through the real Caddy (6 wrong → "Too many attempts"; another device still signs in). Kit uses the talk builder on his phone. An invite and a reset link work end to end. The assistant answers once. The first backup runs. Record the results in VERIFICATION rows 15, 19, 20, 21, 22.

**Waiting on Kit:**
- OK to push, then OK to start on the VPS.
- The family's time zone for the Come, Follow Me week (currently `America/New_York`).
- The assistant API keys go into the VPS `.env` (Kit pastes them with `sudoedit`, so they never go through chat).

**After launch (not blocking):**
- The rest of the Codex audit: 44px targets for text links (verse references in cards and search results, "Delete", capsule "Remove", breadcrumbs), a narrower reading column (`max-w-[68ch]`), focus rings, 12px guidance text raised to `text-sm`, and h2s that look like metadata.
- The 2027 Come, Follow Me schedule before 2026-12-28, and the weekly discussion thread.

**Watch out for:**
- **Production `BETTER_AUTH_URL` must be `https://knit.marzipan-solutions.com`.** Invite and reset links are built from it.
- **The app must bind to 127.0.0.1 only** (`deploy/knit.service` does). `trustedProxies` in `lib/auth.ts` depends on it.
- **The VPS Node must support `--env-file-if-exists`** (BOOTSTRAP §0 checks).
- **Phone screenshots without Kit's browser:** `phone-shots.mjs` drove headless Chrome through the DevTools protocol (Node's built-in WebSocket). It lived in the session scratchpad and is gone; rewrite it if needed. Set `MSYS_NO_PATHCONV=1`, or Git Bash rewrites `/sign-in` into a Windows path.
- **Throwaway member recipe:** an `.mts` script under `node_modules/.cache/` (gitignored, and bare imports like `better-auth` resolve there), run with `node --env-file-if-exists=.env.local --import tsx`; sign in with `curl -c jar -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"email":…,"password":…}' /api/auth/sign-in/email`. React puts `<!-- -->` between static text and `{values}`, so grep the pieces separately. Delete the users and the script afterward.
- **Don't overlap `npm run build` with tests.** Its prebuild step rewrites `data/scriptures`. Stop the dev server before building.
- **Browser checks run in Kit's session only with his OK.** No typing passwords into the browser.
