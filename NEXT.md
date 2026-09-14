# Next

**Action:** Knit is launched at `https://knit.marzipan-solutions.com`. Kit invites the family from `/admin` → Invites (one link per person, 7 days, single-use). Two small confirmations are left:
1. Kit uses it on his phone: talk builder dragging by touch, and the "More" menu.
2. After 2026-09-15 04:45 UTC: `ssh root@<vps> 'tail -3 /var/log/knit-backup.log; ls -l /var/backups/knit/'` shows a new `knit-20260915-*.sql.gz` and "backup ok".

**Why now:** Every launch check passed on 2026-09-14 (VERIFICATION rows 7, 15, 19, 20, 21). The family is waiting.

**Deploying (Kit approved 2026-09-14):** post editing (VERIFICATION row 25) and the feed-first home page (row 26). No migration: push, then `deploy.sh`. Then Kit fixes a typo in one of his own live posts and checks the home page on his phone.

**Security, done 2026-09-14: the knit database password was rotated** after verification commands logged it via `sudo -u knit psql "$DATABASE_URL"` (and it was printed into the Claude session). The new one was generated on the VPS and never printed. Postgres `log_statement` is `none`, so the `ALTER ROLE` wasn't logged. It went in through stdin, and `.env` was rewritten via an environment variable (still knit:knit 600). Checks: knit restarted, `/sign-in` 200, the app's `.env` credentials connect as `knit`, a sign-in attempt through the app got 401 (reached the DB), and no journal lines since contain a knit DB URL. Kit doesn't need the password: it lives in `/opt/knit/app-src/.env`, and hands-on DB access is `sudo -u postgres psql -d knit` (no password). If it's ever lost, rotate again the same way.

**Deployed 2026-09-14:** free-form family posts (`c9c174c`, VERIFICATION row 24; migration 007 applied on the VPS). Still to confirm: Kit posts a text-only update on the live feed.

**Assistant providers (Kit's call, 2026-09-14):** Gemini Flash-Lite first, Groq as the backup, OpenRouter dropped; set in the VPS `.env` (`GEMINI_MODELS=gemini-3.5-flash-lite`, `ASSISTANT_PROVIDERS=gemini,groq`). Gemini's free tier can still be slow (28–75s per call measured); Groq only steps in when Gemini fails. If speed stays a problem, the options on the table are paid Gemini billing, or Groq first (Kit declined Groq first for now).

**Deployed 2026-09-14:** the assistant popup and saved-chat fix (`5ca7624`, VERIFICATION row 23) is live. Still to confirm on Kit's phone: tap a verse in an answer, close the popup, tap it again; then Read the chapter → Back keeps the chat. The deploy took about a minute (`deploy.sh` runs `npm ci`, migrations, and the build before restarting). An assistant request running at that moment took 131.7s and ended with finish reason `other`, so it may have been cut off.

**Then, the best next slice:** make the study assistant faster. The live answer took 68s (Gemini Flash, 5 tool steps, 11,761 tokens). Start by reading `lib/assistant-prompt.ts` and the tool loop behind `app/api/assistant` for the step limit and how many searches it runs. **Verify with:** the same question on dev ("Scriptures about hearts knit together in unity") answers in well under 30s with the citations still checked (`tests/citations-plain.test.ts`, `tests/live-regressions.test.ts`).

**Waiting on Kit:**
- The family's time zone for the Come, Follow Me week (currently `America/New_York`).

**After launch (not blocking):**
- The rest of the Codex audit: 44px targets for text links (verse references, "Delete", capsule "Remove", breadcrumbs), a narrower reading column, focus rings, 12px guidance text, and h2 styling.
- The 2027 Come, Follow Me schedule before 2026-12-28, and the weekly discussion thread.
- Clicking the `/admin` "Create reset link" button (only tested through the library on the live site).

**Watch out for:**
- **Never pass a secret on a `sudo` command line** (including `psql "$DATABASE_URL"`): sudo logs full commands to the journal and `/var/log/auth.log`. Use `sudo -u postgres psql -d knit` for DB checks.
- **A rejected tool call can still run on the VPS.** On 2026-09-14 Kit stopped a `deploy.sh` SSH call, but the journal shows it ran anyway (13:23:49 restart), followed by the approved deploy (13:25:03). Check the journal before assuming a stopped remote command didn't happen.
- **Deploying changes:** test and build locally, push, then `ssh root@<vps> /opt/knit/app-src/deploy/deploy.sh`. Run git on the VPS as `knit`, never root ("dubious ownership").
- **Rolling back Caddy:** `/etc/caddy/Caddyfile.bak-knit-20260914-122306` is the pre-Knit file.
- **Live checks without Kit's browser:** headless Chrome through the DevTools protocol, with a fresh profile and a throwaway member created from a `member` invite (`npm run invite` on the VPS as `knit`). Delete the member and its invite afterward. The session's `live-e2e.mjs` was in the scratchpad and is gone. Set `MSYS_NO_PATHCONV=1` in Git Bash.
- **Rate-limit probes lock the prober's IP out of sign-in for about a minute.**
- **SSH scripts:** `cmd | head` under `set -o pipefail` exits 141 and aborts the script.
- **Don't overlap `npm run build` with tests** (prebuild rewrites `data/scriptures`). Stop the dev server before building.
