# Next

**Action:** Finish launch (`deploy/BOOTSTRAP.md` §9). Knit is live at `https://knit.marzipan-solutions.com`. §0–8 were done 2026-09-14: the admin invite was created and the nightly backup was installed and proven by hand.
1. Confirm Kit's account exists with role `admin` (he signs up from the one-time invite he was given; it expires 2026-09-21).
2. §9: Kit on his phone (talk builder touch dragging, "More" menu); one invite and one reset link end to end with a test member, deleted afterward; the assistant answers one question; check `/var/log/knit-backup.log` after the first scheduled run (2026-09-15 04:45 UTC).
3. Then Kit invites the family from `/admin`.

**Why now:** Everything's in place except Kit's own account and the final checks. The family is waiting.

**Verify with:** `SELECT role FROM "user" WHERE name ILIKE 'kit%'` returns `admin`; `/admin` loads for him. Record the results in VERIFICATION rows 15, 20, 22.

**Waiting on Kit:**
- Create his account from the admin invite link.
- OK to run the §9 test-member checks on the live site.
- The family's time zone for the Come, Follow Me week (currently `America/New_York`).
- Push the local doc commits made after `f1d1616` (NEXT, VERIFICATION, SPEC, BOOTSTRAP). The VPS doesn't need them to run.

**After launch (not blocking):**
- The rest of the Codex audit: 44px targets for text links, a narrower reading column, focus rings, 12px guidance text, and h2 styling.
- The 2027 Come, Follow Me schedule before 2026-12-28, and the weekly discussion thread.

**Watch out for:**
- **Later deploys:** push, then `ssh root@<vps> /opt/knit/app-src/deploy/deploy.sh`. Run git on the VPS as `knit`, never root ("dubious ownership").
- **Rolling back Caddy:** `/etc/caddy/Caddyfile.bak-knit-20260914-122306` is the pre-Knit file.
- **Rate-limit probes lock Kit's home IP out of sign-in for about a minute.**
- **SSH scripts:** `cmd | head` under `set -o pipefail` exits 141 (SIGPIPE) and aborts the script. Don't pipe into `head` in remote `set -euo pipefail` scripts.
- **Throwaway member recipe (local):** an `.mts` script under `node_modules/.cache/`, run with `node --env-file-if-exists=.env.local --import tsx`; sign in with `curl -c jar -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"email":…,"password":…}' /api/auth/sign-in/email`. React puts `<!-- -->` between static text and `{values}`. Delete the users and the script afterward.
- **Don't overlap `npm run build` with tests** (prebuild rewrites `data/scriptures`). Stop the dev server before building.
