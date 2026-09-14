# Verification

Scenarios and their current state. Levels: **implemented** · **tested locally** ·
**tested in integration** · **verified in the real environment** · **not yet verified**.
"Local" here means Kit's PC (Postgres 18, `npm run dev`); nothing is deployed yet.

| # | Scenario | Level | Last checked | How / result |
|---|---|---|---|---|
| 1 | Scripture data: all five standard works load with correct verse counts | tested locally | 2026-09-13 | `npm run build:data` → OT 23,145 · NT 7,957 · BoM 6,604 · D&C 3,654 · PGP 635 = 41,995 (script fails on any mismatch) |
| 2 | Reader: library → book → chapter, headings, cross-references, prev/next | tested in integration | 2026-09-13 | curl against the app: `/scriptures/bofm/1-ne/3` has verse 7, John 3:16 cross-refs include Romans 5:8, Malachi 4 → Matthew 1. **At session end the dev server returned 500 on every chapter page** ("Jest worker encountered 2 child process exceptions") with 1.3 GB of 15.3 GB RAM free; a production build (`npx next build` + `next start -p 3211`) served the same pages with 200 |
| 3 | Invite-only accounts: invite sign-up, public sign-up closed, sign-in rate limit, member pages protected | tested in integration | 2026-09-13 | curl: `POST /api/auth/sign-up/email` → 403 and no user row; 6th wrong password in a minute → 429; signed-out `/feed` `/admin` `/talks` → 307 to sign-in. Browser walkthrough on local dev: invite sign-up → feed, member can't see Invites |
| 4 | Access control: posts, comments, reactions, invites, talks, talk items | tested locally | 2026-09-13 | `npm test` → 100/100 pass (access-control, talks-usage, talk-items suites: other member can't read/change/delete; single-use and expiring invites; forged ids refused) |
| 5 | Feed: share verse or range, comments, reactions, delete with confirm | tested in integration | 2026-09-13 | Local browser walkthrough (share 1 Ne 3:7, react, comment, delete); curl as a throwaway member for range posts (Moroni 10:4–5) |
| 6 | Search: all-words then some-words, phrases, volume filter | tested locally | 2026-09-13 | `tests/search.test.ts` 6/6 ("charity never faileth" fallback, `"strait gate"`, bofm filter) |
| 7 | Study assistant cites only real verses (bracketed or plain) | tested in integration | 2026-09-13 | Live calls through the local app as throwaway users: Gemini Find answers 7/7 and 6/6 citations real; `tests/citations-plain.test.ts`, `tests/live-regressions.test.ts` pass |
| 8 | Provider fallback chain (Gemini → Groq → OpenRouter) | tested in integration | 2026-09-13 | Live: Cerebras 402 → Groq, Gemini 3.8 429 → Gemini 3.6, Groq 429 → OpenRouter; `tests/fallback-model.test.ts` pass |
| 9 | Assistant declines to write or outline talks (principle 8) | tested locally | 2026-09-13 | `tests/no-talk-writing.test.ts` pass. The live refusal was observed **before** the outline mode was removed; not re-run live since |
| 10 | Home page: feed beside assistant, stacked on phones | tested in integration | 2026-09-13 | Browser (read-only) iframe measurements: 1280px side by side (672/416px), 390px stacked, no sideways scroll |
| 11 | Talk builder T1: capsules render in order, owner-only | tested in integration | 2026-09-13 | curl as a throwaway member: all four capsule kinds in order with Alma 32:21 text, another member's talk → 404; `tests/talk-items.test.ts` 7/7 |
| 12 | Talk builder T1: drag to reorder (mouse, touch, keyboard) and autosave in a browser | not yet verified | — | Needs Kit to try it, or his OK to test in his signed-in browser session |
| 13 | Add to talk (T2): buttons members-only; adding lands a capsule | tested in integration (buttons) · not yet verified (adding) | 2026-09-13 | curl: Search shows 50 buttons signed in, 0 signed out; `/api/passages` returns `id`/`endId`. Clicking the button in a browser not done |
| 14 | Production build | tested locally | 2026-09-13 | `npx next build` exit 0 |
| 15 | Deploy to VPS (`scriptures.marzipan-solutions.com`) | not yet verified | — | Not started. Known pre-ship gap: better-auth rate limiting needs a trusted client IP header behind Caddy, or all users share one bucket |
