# Next

**Action:** Knit is launched at `https://knit.marzipan-solutions.com`. Kit invites the family from `/admin` → Invites (one link per person, 7 days, single-use). Two small confirmations are left:
1. Kit uses it on his phone: talk builder dragging by touch, and the "More" menu.
2. After 2026-09-15 04:45 UTC: `ssh root@<vps> 'tail -3 /var/log/knit-backup.log; ls -l /var/backups/knit/'` shows a new `knit-20260915-*.sql.gz` and "backup ok".

**Why now:** Every launch check passed on 2026-09-14 (VERIFICATION rows 7, 15, 19, 20, 21). The family is waiting.

**Deploy pending (needs Kit's OK):** free-form family posts (VERIFICATION row 24) are committed locally, not on the VPS. Push, then `deploy.sh`; its `db:migrate` step applies `migrations/007` there. Then post a text-only update on the live feed.

**Waiting on Kit, assistant speed:** the VPS `.env` has `GEMINI_MODELS=gemini-3.5-flash-lite` (set 2026-09-14), but probes showed Gemini's free tier is slow off and on (28–42s for a one-word reply) while Groq answered in 0.4–0.6s. The recommendation is `ASSISTANT_PROVIDERS=groq,gemini` (restart only, no code). OpenRouter's `thinkingmachines/inkling:free` now returns 403 ("only available on agentic harnesses"), so that backup is dead either way.

**Deployed 2026-09-14:** the assistant popup and saved-chat fix (`5ca7624`, VERIFICATION row 23) is live. Still to confirm on Kit's phone: tap a verse in an answer, close the popup, tap it again; then Read the chapter → Back keeps the chat. The deploy took about a minute (`deploy.sh` runs `npm ci`, migrations, and the build before restarting). An assistant request running at that moment took 131.7s and ended with finish reason `other`, so it may have been cut off.

**Then, the best next slice:** make the study assistant faster. The live answer took 68s (Gemini Flash, 5 tool steps, 11,761 tokens). Start by reading `lib/assistant-prompt.ts` and the tool loop behind `app/api/assistant` for the step limit and how many searches it runs. **Verify with:** the same question on dev ("Scriptures about hearts knit together in unity") answers in well under 30s with the citations still checked (`tests/citations-plain.test.ts`, `tests/live-regressions.test.ts`).

**Waiting on Kit:**
- The family's time zone for the Come, Follow Me week (currently `America/New_York`).
- Push the local doc commits after `f1d1616`. The VPS runs `f1d1616` and doesn't need them.

**After launch (not blocking):**
- The rest of the Codex audit: 44px targets for text links (verse references, "Delete", capsule "Remove", breadcrumbs), a narrower reading column, focus rings, 12px guidance text, and h2 styling.
- The 2027 Come, Follow Me schedule before 2026-12-28, and the weekly discussion thread.
- Clicking the `/admin` "Create reset link" button (only tested through the library on the live site).

**Watch out for:**
- **Deploying changes:** test and build locally, push, then `ssh root@<vps> /opt/knit/app-src/deploy/deploy.sh`. Run git on the VPS as `knit`, never root ("dubious ownership").
- **Rolling back Caddy:** `/etc/caddy/Caddyfile.bak-knit-20260914-122306` is the pre-Knit file.
- **Live checks without Kit's browser:** headless Chrome through the DevTools protocol, with a fresh profile and a throwaway member created from a `member` invite (`npm run invite` on the VPS as `knit`). Delete the member and its invite afterward. The session's `live-e2e.mjs` was in the scratchpad and is gone. Set `MSYS_NO_PATHCONV=1` in Git Bash.
- **Rate-limit probes lock the prober's IP out of sign-in for about a minute.**
- **SSH scripts:** `cmd | head` under `set -o pipefail` exits 141 and aborts the script.
- **Don't overlap `npm run build` with tests** (prebuild rewrites `data/scriptures`). Stop the dev server before building.
