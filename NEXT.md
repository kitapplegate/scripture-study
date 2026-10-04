# Next

**Action:** Deploy Deep Study (`dc1ea10`) and try the Deep Study chat on the live site.
**Why now:** The library, search, and chat pass 160/160 tests and two live model runs, but no browser has used them and the VPS doesn't have migration 010.
**Start here:** `git push`, then on the VPS follow `deploy/` (pull, `npm run db:migrate` to apply 010 and load 2,073 passages, build, restart).
**Verify with:** Signed in on the live site, `/deep-study/chat` → ask "How does Josephus tell the story of David numbering Israel?" → the answer cites 2 Samuel 24 and Antiquities 7.13.1, the Josephus chip shows "Not scripture" with no Add to talk, and the popup's "Read the chapter" opens `/deep-study/jos-ant/7/13`. Record in VERIFICATION rows 30–31.
**Watch out for:** `db:migrate` also runs `build:data`, which now builds `data/deep-study/`; check the VPS log for "loaded 2073 Deep Study passages".
