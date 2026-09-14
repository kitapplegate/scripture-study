# Next

**Action:** Cut a model round from the study assistant: have `searchScriptures` return full verse text (capped), so the model can skip the separate `readPassages` call before answering.
**Why now:** Live answers take minutes because Gemini's free tier waits 28–75s per call, and each question makes 3–5 calls. Kit keeps Gemini first, so fewer calls is the lever left.
**Start here:** `lib/assistant-tools.ts:83` (search returns 200-char snippets) and the search → read → answer rules in `lib/assistant-prompt.ts`. Recreate the per-step timing script under `node_modules/.cache/` (wrap each tool, log model vs tool time per step).
**Verify with:** `npm test` (citation tests pass) plus the timing script on "Scriptures about hearts knit together in unity": 2 steps instead of 3–4, with citations still checked. Use no dev server (Kit wants it off).
**Watch out for:** full text is re-sent every step, so cap verses per result. First, `ssh root@<vps> 'tail -3 /var/log/knit-backup.log'` should show the 2026-09-15 04:45 UTC backup. Never put secrets on a `sudo` command line.
