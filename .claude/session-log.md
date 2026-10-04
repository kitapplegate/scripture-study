# Session Log

## 2026-10-04 00:30 — Deep Study: Josephus library, search, and chat

**Summary:** A friend wanted a way to read the same events from other ancient angles. Kit chose both halves, events and wording (D10), as a separate Deep Study section. Josephus's *Antiquities* and *Wars* come from Project Gutenberg. Jubilees, Young's Literal, and Brenton aren't on Gutenberg, and the Dead Sea Scrolls are links only (copyright). `scripts/build-deep-study.mjs` splits Josephus into Whiston's sections (`jos-ant.7.13.1`). Parsing traps: the table of contents repeats every heading, one heading has no period and one is roman, and footnote markers are glued ("over1") or spaced ("; 2 Joseph"). Markers are removed only when they're in that book's FOOTNOTES list. Migration 010 adds `ds_passages`. The `/deep-study` pages and the `/deep-study/chat` assistant (D12: scripture plus Josephus, its own chat) share the new `lib/assistant-route.ts` with the study assistant. A live run found models writing `[[Ref|quote]]`; fixed in `95a43a8`. Main work `dc1ea10`. Enoch and the Apocrypha are pinned but not parsed.

**Status:**
- Deep Study library + search — **tested in integration**: `npm test` 160/160; curl on dev (VERIFICATION 30)
- Deep Study chat — **tested in integration**: two live Gemini runs, every citation real (VERIFICATION 31); no browser
- Piped-citation fix — **tested locally**: regression test (VERIFICATION 32)
- Deploy — **not yet verified**: not pushed; the VPS needs migration 010

**Open tasks:**
- [ ] next — Deploy `dc1ea10` and try `/deep-study/chat` on the live site; Josephus chip shows "Not scripture" (VERIFICATION 30–31)
- [ ] blocked (Kit) — D11: who approves events (blocks DS1's approval step)
- [ ] not-yet-verified — Push delivery on a real phone (VERIFICATION 28), carried over

**Deferred:** Parse Charles's 1 Enoch (#77935) and the KJV Apocrypha (#124); DS1 parallels in the canon; the Gemini `thoughtSignature` warning across fallbacks.

## 2026-09-29 02:57 — Site done (Kit's check)

**Summary:** Kit reports the site is done and looks good on both his computer and his phone. No code changed this session. Recorded in `d229585` and pushed to `origin/main`, along with the unpushed log commits `3da5609` and `f53addb`. The live VPS was not redeployed; there was nothing to deploy.

**Status:** Live site layout on desktop and phone — **verified in the real environment** (Kit, by eye, 2026-09-29; recorded as VERIFICATION row 29). This was a visual check only. It does not cover push notification delivery (row 28).

**Open tasks:**
- [ ] next — Opt a real phone in and verify new-post/comment delivery, deep links, private preview text, and self-notification suppression; record the device/browser in VERIFICATION row 28.

## 2026-09-28 20:10 — Backlog triage (Brittany)

**Summary:** Backlog triage by Brittany's weekly job. Open tasks from the previous entry were sorted into done-automatically / needs-Kit / parked / optional / drop. Only next and blocked stay as checkboxes; the previous entry keeps the original wording. Scripture Study's opt-in Web Push infrastructure is deployed and locally tested, but the acceptance test deliberately requires a real phone and member accounts. Nothing repository-only can prove delivery.

**Open tasks:**
- [ ] blocked (Kit) — Opt a real phone in and verify new-post/comment delivery, deep links, private preview text, and self-notification suppression; record the device/browser in VERIFICATION row 28.
- [ ] blocked (Kit) — Verify actual Web Push delivery while Knit is closed.

## 2026-09-24 18:11

**Summary:** Added and deployed opt-in Web Push for the two events Kit chose: new family posts and comments on your posts. Commit `8fc3d26` adds `migrations/009_push_subscriptions.sql`, multi-device subscription storage and VAPID delivery in `lib/push.ts`, an authenticated `/notifications` enable/disable page, the service worker and PWA manifest/icons, and post/comment hooks that run after the response so notification failure cannot block posting. Authors do not receive their own new-post notification and self-comments do not notify; lock-screen previews name the actor but omit family content. Stale 404/410 endpoints are removed. The deploy script now generates persistent VAPID keys once into the mode-600 VPS `.env` without printing them. The first production pass used the old in-memory deploy script body after pulling its own update and therefore skipped key generation; rerunning the now-updated script corrected that before the final build/restart. Deployment state was recorded in `1c35596`.

**Status:** Push targeting and subscription behavior — **tested locally**: `npm test` 145/145, including `tests/push-notifications.test.ts` 3/3; `npm run typecheck` clean; `npx next build` exit 0; `npm audit --omit=dev` found 0 vulnerabilities; deployment script and service-worker syntax checks passed. Push infrastructure — **verified in the real environment**: migration 009 is applied, `push_subscriptions` exists and is owned by `knit`, the service is active, exactly three push settings are non-empty in the `knit`-owned mode-600 `.env`, and the journal has no error-priority entries since deploy. Public HTTPS checks returned 200 for the manifest, service worker, and both PNG icons; `/sw.js` has no-store and self-only CSP headers; signed-out `/notifications` redirects to sign-in; neighboring sites remain 200. Actual phone notification delivery — **not yet verified** because no member device has opted in.

**Next:** Verify both notification types end to end on a real phone with two member accounts; details and acceptance checks are in `NEXT.md`.

**Open tasks:**
- [ ] next — opt a real phone in and verify new-post and comment delivery, deep links, privacy-preserving preview text, and self-notification suppression; record the device/browser in VERIFICATION row 28
- [ ] not-yet-verified — actual Web Push delivery while Knit is closed

**Deferred:** Reduce assistant model rounds by returning capped full verse text from `searchScriptures`; the previous `NEXT.md` described this performance slice. Older optional items remain in SPEC/history rather than being copied into this handoff.

## 2026-09-14 12:42

**Summary:** Launch day. T3 print view (`a59e552`). Sign-in rate limiting now keys on each member's IP behind Caddy: better-auth dropped multi-address `X-Forwarded-For` without `trustedProxies` (`9dace4c`). Added admin reset links (`eee6cb1`), the Codex UI fixes and the Mosiah 18:21 header (`f1d1616`), and `deploy/`. Knit went live at `knit.marzipan-solutions.com` (the VPS lacked `unzip`). D9 was reversed: recipes stay separate. After launch: verse popup and saved chat (`5ca7624`; a late dialog `close` event swallowed taps), free-form posts (`c9c174c`, migration 007), post editing and a feed-first home (`d12ee8d`), comment reactions (`605bd71`, migration 008). The slow assistant is Gemini free-tier latency (28–75s per call; Groq 0.4s). Kit chose Flash-Lite first with Groq as backup, and dropped OpenRouter (403). My mistakes: `sudo psql "$DATABASE_URL"` logged the DB password (rotated), and a deploy Kit stopped still ran. The dev server stays off (low memory).

**Status:**
- Launch (deploy, invite, reset, assistant, rate limit through Caddy, manual backup) — **verified in the real environment**: throwaway member on the live site, VERIFICATION 15 and 19–21
- Popup and saved chat, free-form posts, post editing, feed-first home — **tested in integration** (headless Chrome on dev) and deployed; not yet used on the live site by a person (rows 23–26)
- Comment reactions — **tested locally**: `npm test` 142/142, deployed, migration 008 on the VPS; never rendered in a browser (row 27)
- DB password rotation — **verified in the real environment**: the app connects, sign-in reaches the DB, no secrets in the journal since
- Assistant providers — **verified in the real environment**: probes from the VPS (Gemini 27.7s, Groq 0.4s, OpenRouter 403); `.env` has `ASSISTANT_PROVIDERS=gemini,groq`

**Open tasks:**
- [ ] next — fewer assistant model rounds (full text from search, skip `readPassages`); verify with the timing script (2 steps) plus `npm test`
- [ ] blocked-by-Kit — Come, Follow Me time zone (currently America/New_York); phone checks: touch drag, verse popup, post edit, comment reactions
- [ ] not-yet-verified — first scheduled backup 2026-09-15 04:45 UTC (`/var/log/knit-backup.log`); comment reactions in a browser

**Deferred:** rest of the Codex audit (text-link targets, column width, focus rings), 2027 Come, Follow Me schedule before 2026-12-28, multiple scriptures per post, comment editing.

## 2026-09-13 22:22

**Summary:** Launch found the repo matching the log (typecheck clean, `npm test` 100/100, Postgres up, 3.6 GB free), but Kit set the planned T3 print view aside for two requests. **Come, Follow Me (`bb28b03`)**, the first half of SPEC slice 12: `lib/come-follow-me.ts` holds lessons 37–52 of the 2026 Old Testament manual (Monday start date, readings, lesson title), `components/ComeFollowMeCard.tsx` renders it at the top of the signed-in home page with the title linking to the lesson on churchofjesuschrist.org and each reading part ("Proverbs 1–4; 15–16; …") linking to its first chapter in our reader, and `tests/come-follow-me.test.ts` adds 9 tests. To keep principle 2, the Church's site was never fetched: titles and URLs came from web-search result headings, recorded in `data/SOURCES.md`. A third-party schedule site was checked first but dropped because its titles were paraphrased and at least one reading was wrong (Jeremiah 36–38 instead of 36–39). The week turns over at Monday midnight `America/New_York`, a guess Kit hasn't confirmed. **Rename to Knit (`9f9cc28`)**, after Mosiah 18:21: title template, header, welcome and invite headings, README and SPEC titles. The package name and the `scripture-study:last-talk` localStorage key are deliberately unchanged, since renaming the key would drop members' saved last talk. A web search found other apps named Knit (events, a seniors/family social network, a messenger, a knitting counter) but none for scripture or faith; fine for a private app, revisit before any public listing. **DNS:** Kit created the Cloudflare A record for `scriptures.marzipan-solutions.com`. The first lookup was NXDOMAIN because of a typo in the record name; after he fixed it, 1.1.1.1 and 8.8.8.8 both resolve it to the VPS, DNS only. Cloudflare's "enable proxy to protect your origin" warning was judged low-value because `recipes.marzipan-solutions.com` already exposes the same IP unproxied, so real origin protection would be a whole-VPS project. The IP was kept out of the SPEC; Kit declined scrubbing it from the earlier unpushed session-log commit `42558e2`. The dev-server 500s from last session were memory pressure and didn't recur.

**Status:**
- **Come, Follow Me card:** tested in integration.
  - `npm test` 109/109, including the 9 new tests.
  - curl as a throwaway member on the dev server showed lesson 37, its lesson link, and all six reading links; signed-out home has no card.
  - Not yet viewed in a browser.
- **Rename to Knit:** tested in integration. curl of the signed-out home page showed the new title, header, and heading; `npm run typecheck` clean.
- **DNS record:** verified in the real environment (public resolvers return the VPS).
- **Home layout with the new card, production build:** not re-verified since these changes.

**Next:** Talk builder T3, the print view built from capsules (see `NEXT.md`).

**Open tasks:**
- [ ] next — T3 print view from capsules; verify with `npm test` plus curl of `/talks/<id>/print` as a throwaway member (order and verse text; another member's talk → 404)
- [ ] blocked-by-Kit — try dragging and Add to talk in the browser (or OK me testing in his session); confirm the family's time zone for the Come, Follow Me week (currently America/New_York)
- [ ] not-yet-verified — builder drag/autosave and Add to talk in a real browser; home page layout with the card at phone width; `npx next build` after today's changes

**Deferred:**
- Come, Follow Me: the weekly discussion thread (other half of slice 12), and the 2027 schedule, needed before 2026-12-28 or the card disappears.
- Pre-ship checklist: trusted client IP for rate limiting behind Caddy, admin password-reset link, VPS deploy, nightly `pg_dump`.
- Push `c9933de`…`9f9cc28` when Kit asks.

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
