# Session Log

## 2026-09-13 21:35

**Summary:** Built the scripture study app from an empty folder to a working local app, in three commits.

- **Reader (`26c8f68`).** Project Gutenberg turned out to have no Doctrine and Covenants or Pearl of Great Price, so the text comes from `bcbooks/scriptures-json` @ `3bda76e` (public domain, 2013 LDS edition), plus OpenBible.info cross-references (CC BY). `scripts/build-scriptures.mjs` fails if the 41,995-verse count drifts. The Church's study helps and conference talks are linked, never copied: its Terms of Use forbid scraping and republishing.
- **Accounts, feed, search, assistant, home page (`885905e`, pushed).**
  - **Accounts and feed:** invite-only accounts (better-auth, hashed single-use invites); a feed with verse/range posts, comments and reactions.
  - **Search:** Postgres full-text search. pgvector was skipped because it isn't installed for Postgres 18 on Windows.
  - **Assistant:** the Study assistant runs on AI SDK 7 with a free-tier fallback chain (`lib/fallback-model.ts`, `lib/llm.ts`).
  - **Home page:** the feed beside the assistant.
- **Talk builder T1 and T2 (`c9933de`, local only).**

**How the providers ended up where they are.** OpenRouter's free tier allows only 50 requests a day, so the chain grew:
- **Cerebras:** dropped after its API returned 402 "payment required" despite a valid key.
- **NVIDIA:** its trial terms bar serving real users.
- **SambaNova:** about 20 requests a day.
- **GitHub Models:** retired on 2026-07-30.
- **Result:** Kit chose Gemini's free tier, with a disclaimer about Google's data use, followed by Groq and OpenRouter.

**Two wrong assumptions, both corrected by Kit.** The audience includes kids (it's all adults), and Cerebras was free.

**Live tests against real models exposed several real bugs, all fixed with regression tests:**
- Answers came back empty when the model hit the step limit (fixed with `prepareStep` `toolChoice: "none"` plus a final-step instruction).
- Groq strictly rejected `volume: null` (the schema is now nullable).
- A real verse was flagged as fake because the model used a non-breaking hyphen (every dash variant is now accepted).
- Models wrote plain `**Romans 5:3–4**` instead of `[[ ]]`, so citations went unchecked (plain references are now detected against real book names).
- Gemini searched for references as words (the search tool now resolves them directly).
- OpenRouter reported "overloaded" only after accepting the request (the fallback now reads ahead to the first real stream part).

**Earlier local browser walkthrough fixes:**
- A pre-hydration sign-in submit could have put the password in the URL (the form is now `method="post"`).
- Sign out did nothing before hydration (it's now a server action).
- Delete had no confirmation.
- The layout's database-down fallback swallowed Next's dynamic-rendering signal (`unstable_rethrow`).

**No AI in talks.** Kit removed the AI "outline a talk" mode ("the talk should be by the spirit of God, not by technological AI"), recorded as SPEC principle 8. It was replaced by a no-AI talk builder:
- `talk_items` table, `lib/talk-items.ts`, dnd-kit `components/talk-builder/TalkBuilder.tsx`
- `AddToTalkButton` in the reader, Search, and the assistant's cited scriptures

**State at session end.**
- **Dev server:** every chapter page returned 500 ("Jest worker encountered 2 child process exceptions") with 1.3 GB of 15.3 GB RAM free. A production build served the same pages fine, so it's memory pressure, not code.
- **Pre-ship gap found:** better-auth rate limiting falls back to one shared bucket unless a trusted client IP header is configured, which matters behind Caddy.
- **Browser rules:** browser checks after the walkthrough avoided typing passwords, as those rules require.

**Status:**
- **Reader, accounts, feed, search:** tested in integration (curl and a local browser walkthrough); access control tested locally with `npm test` (100/100).
- **Study assistant, citation checking, fallback chain:** tested in integration (live Gemini/Groq/OpenRouter calls through the local app).
- **Assistant refusing to write talks:** tested locally (instructions test); the live refusal was seen only before the outline mode was removed.
- **Talk builder T1 render and isolation:** tested in integration (curl as a throwaway member) plus 7 new tests. Dragging and autosave in a browser: not yet verified.
- **Add to talk T2:** buttons members-only tested in integration; actually adding through the button: not yet verified.
- **Production build:** tested locally (`npx next build` exit 0).
- **Deploy to VPS:** not started.

**Next:** Talk builder T3. Rebuild `/talks/[id]/print` from capsules, with full verse text in arranged order, and re-link Print view (see `NEXT.md`).

**Blocked:** Dragging and Add to talk need a real browser in Kit's signed-in session. Deploying needs a DNS record.

**Open tasks:**
- [ ] next — T3 print view from capsules; verify with `npm test` plus curl of `/talks/<id>/print` as a throwaway member (order and verse text; another member's talk → 404)
- [ ] blocked-by-Kit — try dragging and Add to talk in the browser (or OK me testing in his session); add a DNS A record `scriptures.marzipan-solutions.com → 217.15.170.26` before deploy
- [ ] not-yet-verified — builder drag/autosave and Add to talk in a real browser; dev-server chapter pages after a restart with more free memory

**Deferred:** Pre-ship checklist: trusted client IP for better-auth rate limiting behind Caddy, an admin one-time password-reset link, VPS deploy (own user/DB, systemd, Caddy), nightly `pg_dump` backups. Also push `c9933de` when Kit asks.
