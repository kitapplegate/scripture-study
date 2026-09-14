# Next

**Action:** Finish launch (`deploy/BOOTSTRAP.md` §7–9). Knit is live at `https://knit.marzipan-solutions.com` (§0–6 done 2026-09-14).
1. §7: create Kit's admin invite on the VPS (`sudo -u knit env HOME=/opt/knit npm run invite -- admin "Kit"` from `/opt/knit/app-src`). Hand Kit the link, and he creates his account.
2. §8: install the nightly backup (cron as postgres at 04:45, 14 days) and prove it with one manual run plus `gunzip -t`.
3. §9: Kit on his phone (talk builder touch dragging, "More" menu); one invite and one reset link end to end with a test member, deleted afterward; the assistant answers one question.

**Why now:** The site is up, but nobody can sign in yet, and there's no backup. The family is waiting.

**Verify with:** Kit's account exists with role `admin` and `/admin` loads for him. `/var/backups/knit/knit-*.sql.gz` exists, passes `gunzip -t`, and is over 100 KB. Record the results in VERIFICATION rows 15, 20, 21, 22.

**Waiting on Kit:**
- OK for §7 and §8 (both change the VPS).
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
