# Next

**Action:** Deploy prep, done locally. Re-run `npx next build` clean, then add a `deploy/` folder modeled on recipe-chat's: a systemd unit (own Linux user, binds `127.0.0.1` only), a Caddy snippet for `knit.marzipan-solutions.com`, a production `.env` checklist (no values), and a nightly `pg_dump` script with a systemd timer that keeps a week of dumps.

**Why now:** Kit wants to launch Knit for the family (recipes stay a separate app: SPEC D9 was reversed 2026-09-14). The code work before launch is done: the talk builder, the rate-limit IP fix, and password-reset links. What's left is getting it onto the VPS safely (SPEC slice 2).

**Start here:** `C:\AI\recipe-chat\deploy\` (`Caddyfile.snippet`, `*.service`) for the VPS conventions; SPEC "Architecture" and "Security → Shared VPS". `package.json` `db:migrate` also builds the scripture data and loads verses, so the VPS needs enough free memory for that.

**Verify with:** `npx next build` exit 0 (don't run tests at the same time: prebuild rewrites `data/scriptures`). Run the backup script locally against the dev database, and `pg_restore --list` on its output shows the `verses`, `talks`, and `password_resets` tables.

**Then deploy (needs Kit's OK for each outward step):** push to GitHub; on the VPS, create the user, Postgres role and database, clone, `npm ci`, migrate, build, enable the service, append the Caddy block (`caddy validate` before reload: that file serves other sites), create the first admin invite with `npm run invite`.

**Waiting on Kit (doesn't block this slice):**
- The family's time zone for the Come, Follow Me week (currently `America/New_York`).
- Which findings from the Codex layout/color audit to fix before launch.

**Watch out for:**
- **At deploy, Kit tests the talk builder on his phone** at `knit.marzipan-solutions.com` (touch dragging; he chose this over LAN dev testing, 2026-09-14).
- **At deploy, re-check the rate limit through the real Caddy:** 6 wrong passwords from one phone → 429, while another device still signs in. Also make sure the app binds to localhost only, because `trustedProxies` in `lib/auth.ts` relies on it.
- **Production `BETTER_AUTH_URL` must be `https://knit.marzipan-solutions.com`.** Invite and reset links are built from it.
- **Throwaway member recipe:** an `.mts` script under `node_modules/.cache/` (gitignored, and bare imports like `better-auth` resolve there), run with `node --env-file-if-exists=.env.local --import tsx`; sign in with `curl -c jar -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"email":…,"password":…}' /api/auth/sign-in/email`. React puts `<!-- -->` between static text and `{values}`, so grep the pieces separately. Delete the users and the script afterward.
- **Browser checks run in Kit's session only with his OK.** No typing passwords into the browser.
