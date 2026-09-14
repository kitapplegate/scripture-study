# Knit — SPEC

The standing authority for this project. Change it on purpose, with a dated entry
under **Status updates**. Don't override it quietly in a single change.

## What it is

A private social network for scripture study, for Kit's family and friends. It
combines three things:

1. **A reader** like Gospel Library: all five standard works, cross-references, and
   highlights/notes.
2. **A family feed**: share a verse as a post with your thoughts; others react and
   comment. Reading plans and streaks keep people accountable.
3. **A study assistant**: a chatbot that searches the scriptures (RAG). It helps
   someone preparing a talk or lesson find scriptures on a theme, and it can reason
   through an outline.

The **code is public** on GitHub as part of Kit's portfolio. The **site's content**
(people, posts, notes, chats) is private to invited members.

## Who it's for

An invite-only circle of family and friends, somewhere from 5 to 50 people, **all adults** (Kit, 2026-09-13). It has to
work well on phones.

## Principles

1. **Public code, private data.** No secrets, family names, photos, or real user
   data ever go into the repo. Configuration lives in `.env` files on the machine.
   Seed/demo data is fictional.
2. **The text is public domain. The Church's materials are linked, not copied.**
   The Church's Terms of Use (updated 29 Apr 2026) forbid "any robot, spider, or
   other automatic device… for monitoring or copying" and posting its materials "to
   another website or computer network without our prior written permission". They
   also say linking is fine. So footnotes, study helps, manuals, and conference talks
   get **links** (to the chapter, the talk, or a site search), never a stored copy.
   See `data/SOURCES.md`.
3. **The assistant only cites real verses.** The model returns verse ids. The server
   checks each one against the index and throws out any that aren't real. The UI
   shows the verse text from our own data, never the model's quotation of it.
   Answers are labeled as a study aid, not doctrine.
4. **Private by default.** Notes, highlights, and chats belong to their author until
   shared. Nothing is ever visible to someone who isn't signed in, except the
   scripture text itself.
5. **Accountability without guilt.** Show progress to the people you chose, make
   encouragement easy, and never shame a missed day.
6. **Verse ids are forever.** `1-ne.3.7`, `dc.76.22` (book slug.chapter.verse,
   using Church URL slugs).
7. **Thin slices.** Each slice names the one observation that proves it works.
8. **No AI in talks or lessons.** A talk should come by the Spirit, not by technology
   (Kit, 2026-09-13). The study assistant only finds scriptures: it never writes or
   outlines a talk or lesson, and declines if asked. The talk builder has no connection
   to any AI model. Enforced in `lib/assistant-prompt.ts` (`NO_WRITING_RULE`) and
   covered by a test.

## Architecture

- **Scripture text**: `data/raw/` holds pinned downloads, and
  `scripts/build-scriptures.mjs` generates `data/scriptures/`. The server reads those
  files; the text isn't stored in the database for reading.
- **App**: Next.js 16 (App Router) + TypeScript + Tailwind 4. Routes mirror Church
  URLs: `/scriptures/<volume>/<book>/<chapter>#v<verse>`.
- **Hosting (D1, resolved 2026-09-13)**: the existing VPS. Deploys go through
  GitHub: build locally, push, then `git pull` + build on the VPS. The app runs as
  its own systemd service under its own Linux user (`scripture`), like the other apps
  there, behind Caddy with automatic HTTPS. The subdomain is decision D5.
- **Database**: Postgres 16 on the VPS (18 on Kit's PC), in its own database and role.
- **Search**: Postgres full-text search over a `verses` table (English stemming;
  all-words first, then some-words; "phrases" and -exclude). Meaning-based search
  comes from the assistant sending several synonym queries at once. pgvector and
  embeddings are deferred (see the 2026-09-13 status update).
- **LLM**: `lib/llm.ts` builds a fallback chain from whichever provider keys are set:
  Cerebras → Groq → OpenRouter by default (`ASSISTANT_PROVIDERS` reorders it). A call
  that fails before streaming (rate limit, outage, bad key) moves to the next
  provider (`lib/fallback-model.ts`). Models are env vars; providers are AI SDK 7
  packages.

## Data model (draft)

- `users` — id, display_name, email, password_hash, role (admin/member), created_at
- `invites` — token_hash, created_by, expires_at, used_by, used_at
- `groups`, `group_members` — e.g. "Family", "Friends"; role owner/member
- `posts` — author, group, verse_id, end_verse_id, body, created_at, edited_at
- `post_reactions` — post, user, kind
- `comments` — post, author, body, created_at
- `highlights` — user, verse_id, end_verse_id, color
- `notes` — user, verse_id, end_verse_id, body, visibility (private/group), group
- `plans`, `plan_items`, `plan_progress`, `reading_log` — plans, streaks, accountability
- `chat_sessions`, `chat_messages` — user, mode (find / prepare), messages, cited verse ids
- `passages` — chunk id, start/end verse ids, text, `tsvector`, `embedding vector(n)`
- `usage` — user, day, llm_requests (per-user daily cap)

## Slices

| # | Slice | Proven when |
|---|---|---|
| 1 | **Reader** ✅ | `/scriptures/bofm/1-ne/3` shows verse 7; John 3:16's cross-references include Romans 5:8 |
| 2 | **Public repo + deploy**: GitHub → `git pull` on the VPS, systemd, Caddy | The reader loads over HTTPS at the chosen subdomain |
| 3 | **Accounts**: invite links, sign in/out, sessions | Admin creates an invite; a second browser signs up with it; a reused invite is refused; a signed-out visit to `/feed` redirects to sign-in |
| 4 | **Share a verse as a post**: from a verse's panel → composer → family feed | Share 1 Ne 3:7 with a thought; the second user sees it in the feed as a verse card |
| 5 | **Comments + reactions** on posts | B comments and reacts; A sees both |
| 6 | **Keyword search** (Postgres full-text) | "faith hope charity" finds Moroni 7:45 and 1 Corinthians 13:13 |
| 7 | **Semantic search** (embeddings + pgvector, hybrid ranking) | "enduring trials with patience" returns Mosiah 24:15 in the top 10 |
| 8 | **Study assistant — Find**: chat → retrieve → answer with checked citations | A made-up reference in the model's output is dropped, and a test proves it |
| 9 | **Study assistant — Prepare a talk/lesson**: reasoning model, theme → sub-themes → retrieval per sub-theme → outline with verse cards; save and share the outline as a post | "Talk on ministering, 10 minutes" yields an outline whose citations all check out |
| 10 | **Highlights + private notes** | Highlight and note a verse; reload; still there; the other user can't see them |
| 11 | **Reading plans + streaks + group accountability** | Two members on one plan see each other's progress |
| 12 | **Come Follow Me week** (reading assignments + a link to the lesson; no manual text) + a weekly discussion thread | This week's readings show with the correct link |
| — | Later: talk/lesson builder with drag-and-drop, verse of the day, read-aloud (browser speech), memorization flashcards and family challenges, Isaiah ↔ 2 Nephi side-by-side, PWA/offline, email digest, Nave's Topical Bible and Easton's Bible Dictionary | — |

## Security

The code is public, so assume anyone can read it. Everything below has to hold
anyway.

- **Secrets**: `.env*` is gitignored. GitHub push protection catches most leaked
  keys. A key that ever gets pushed gets **rotated**, not just deleted, because git
  history is forever.
- **Access control is the main risk.** Every query that reads posts, notes, or chats
  filters by the signed-in user and their group membership, enforced on the server.
  Each sharing slice includes a test showing user B *can't* read A's private data,
  including by guessing ids.
- **Accounts**: invite-only; hashed passwords (argon2/bcrypt through a maintained
  auth library, not hand-rolled); httpOnly + Secure + SameSite cookies; rate-limited
  sign-in and invite endpoints; single-use invite tokens that expire, stored hashed.
- **User content**: posts and comments render as text. Any markdown is sanitized
  (stops stored XSS). No image uploads until there's a size/type-checked plan.
- **Chatbot**:
  - The API key lives only on the server.
  - A per-user daily request cap prevents cost/quota abuse.
  - Retrieval covers scripture only, never other users' posts, so one user's content
    can't inject instructions into another user's chat or leak into it.
  - Citations are checked (principle 3).
  - Warn users that free models may log or train on prompts, so don't type personal
    or sensitive details. Not confirmed per provider: OpenRouter's docs only say there's
    an account setting for it.
- **Shared VPS**: the VPS also runs Z4nn (with Gmail OAuth tokens), recipe-chat,
  fantasy football, and magic-cost. The app gets its own non-root Linux user, its own
  Postgres role limited to its own database, and binds to localhost only (Caddy
  fronts it). The firewall already allows only 22/80/443.
- **Adults only**: every member is an adult (Kit, 2026-09-13). Several AI providers
  require that (Gemini and Groq terms: 18+, and Gemini bars apps likely used by
  minors). If that ever changes, re-check the assistant provider's terms first.
- **Branding**: not affiliated with the Church. Don't use Church logos or look like
  an official Church app. The README and footer say so.
- **Dependencies**: Dependabot alerts on the public repo; `npm audit` before deploys.

## Decisions

- **D1 — hosting** — ✅ resolved 2026-09-13: VPS, deployed by pulling from GitHub.
- **D2 — how people join** — ✅ resolved 2026-09-13: invite links (single-use,
  expiring, created by an admin).
- **D3 — conference talks** — ✅ resolved 2026-09-13: links only. Members attach a
  talk link to posts; the assistant suggests a Church site search link on the theme;
  each verse links to BYU's Scripture Citation Index for talks that cite it. No
  scraping, no stored talk text.
- **D4 — shape of the social side** — ✅ resolved 2026-09-13: a feed of verse posts
  with comments and reactions, plus a weekly Come Follow Me discussion thread. **No
  live chat.**
- **D5 — subdomain** — ✅ resolved 2026-09-13, **changed 2026-09-14** (Kit):
  `knit.marzipan-solutions.com`, replacing `scriptures.marzipan-solutions.com`. Kit
  renamed the Cloudflare record (DNS only); public resolvers return the VPS for `knit.`
  and NXDOMAIN for `scriptures.`. Nothing was deployed or configured under the old name.
- **D7 — build order** — ✅ resolved 2026-09-13: build and debug everything locally
  first; deploy (slice 2) comes after the local slices are solid.
- **D6 — test model** — ✅ resolved 2026-09-13 (Kit: "pick the best free model"):
  primary `thinkingmachines/inkling:free`, fallback
  `nvidia/nemotron-3-ultra-550b-a55b:free`. These are the two largest
  general-purpose free models with reasoning and tool support. The others on the list
  are coding-only, domain-specific (medicine, finance, safety filtering), or small.
  Both are newer than Claude's training data, so this is chosen by size and
  description, not benchmarks. **Confirm with a bake-off in slice 8**: the same 5
  talk-prep prompts through the top 3 free models, scored on share of valid
  citations, then latency and rate-limit errors; keep the winner. Free-model
  availability changes often; `lib/llm.ts` must make swapping one line.
- **D8 — groups** — ✅ decided 2026-09-13 (default): for now the whole invited
  circle is one group, so every member sees the feed. The `groups` tables wait until
  there's a real need for more than one circle.
- **D9 — family hub** — ↩️ **reversed later on 2026-09-14** (Kit): recipe-chat stays a
  separate app, because some family members aren't spiritual and shouldn't need a
  scripture app to reach the recipes. Knit stays scripture study. Nothing was ported, so
  nothing is undone. Whether other family apps (the book list) would live in Knit wasn't
  re-decided. The original decision, for the record: Knit becomes the family's one app.
  Scripture study is its first section. `recipe-chat` (live at `recipes.`) gets ported
  in after Knit launches, and future family apps (the book list) are built inside
  Knit rather than as separate apps. The order: finish and deploy Knit, then port
  recipes in thin slices with one login and one database. Members join by Knit invite.
  Old recipe-chat passwords aren't migrated. recipe-chat stays live until the port
  reaches parity, then `recipes.` redirects to Knit. **Principle 1 still applies:**
  recipe-chat's repo tracks the family's recipes (`data/recipes_export.json`), and
  they must be loaded from outside this public repo, never committed here.

## Status updates

- **2026-09-13** — Project started. All five standard works came from
  `bcbooks/scriptures-json` @ `3bda76e` (Gutenberg has no D&C or PGP), plus the
  OpenBible.info cross-references. Slice 1 (reader) is built and checked over HTTP.
- **2026-09-13** — Direction set: family scripture social network + RAG study
  assistant, public repo for Kit's portfolio, deployed to the VPS by pulling from
  GitHub (D1 resolved). Church Terms of Use checked: no scraping or re-hosting of
  talks or study helps, but linking is fine (D3). Slices reordered around sharing and
  the assistant. Security section added.
- **2026-09-13** — D2–D6 resolved (invites, talk links only, feed with no live chat,
  `scriptures.marzipan-solutions.com`, Inkling free model); D7 build locally first.
  Written and type-checked but **not yet run against a database**: slice 3
  (better-auth email/password, public HTTP sign-up closed by a hook, single-use
  hashed invite links, admin Invites page, `proxy.ts` redirect +
  `requireUser()`), slice 4 (Share from a verse → `/share` → feed of verse cards) and
  slice 5 (comments, three reactions, author-or-admin delete enforced in SQL).
  Blocked on creating the local `scripture_study` database.
- **2026-09-13** — Local database created (PostgreSQL 18 on Kit's PC; the VPS runs 16).
  Slices 3–5 **verified locally**:
  - **`npm test`: 14/14 pass.** Covers: a member can't delete another member's post
    or comment; an admin can delete either; an invite claimed by 3 simultaneous
    requests gets 1 winner; expired and made-up invites fail; a completed invite
    can't be reused.
  - **HTTP checks:** the public sign-up endpoint returns 403 and creates no account;
    signed-out visits to member pages redirect to `/sign-in?next=…`; the 6th wrong
    password in a minute gets 429.
  - **Browser walkthrough:** invite sign-up → feed; share 1 Ne 3:7 with a thought and
    a talk link; react; comment; delete the comment; an admin creates an invite from
    the page; member sign-up has no Invites link, and `/admin` redirects them; sign
    out; sign in returns to `next`; phone width (390px) doesn't scroll sideways.

  Bugs found and fixed during the walkthrough:
  (1) Sign out did nothing if tapped before JavaScript loaded → it's now a
  server-action form.
  (2) Submitting sign-in before JavaScript loaded would have fallen back to a GET
  with the password in the URL → the form is now `method="post"`.
  (3) Delete had no confirmation → two-step "Yes, delete / Cancel".
  (4) The phone header wrapped to 80px → one line, 48px.
  (5) The layout's database-down fallback also swallowed Next's dynamic-rendering
  signal → `unstable_rethrow`.

  Walkthrough test accounts and invites deleted afterward; Kit's admin invite is
  still open.
- **2026-09-13** — Kit signed in. Built the study assistant and talk builder, plus a
  New post box.
  - **New post:** the feed has a reference box ("Alma 32:21", "Moroni 10:4-5");
    posts can share same-chapter ranges (`end_verse_id`). `lib/references.ts`
    parses references.
  - **Search (slice 6):** a `verses` table with an English `tsvector`, reloaded by
    `scripts/load-verses.mjs`. Verses with all the words come first, topped up with
    some-of-the-words matches; supports "phrases" and -exclude. `/search` page.
  - **Architecture change:** no pgvector/embeddings for now. pgvector isn't installed
    for Kit's local Postgres 18 on Windows, and keyword search, driven by a reasoning
    model that searches several times with synonyms, needs no extra infrastructure on
    either machine. Revisit if answers miss obvious passages.
  - **Study assistant** (`/study`, slices 8–9): AI SDK 7 `streamText` through
    OpenRouter (`lib/llm.ts`, `models` fallback list, reasoning effort medium).
    - Two read-only tools, `searchScriptures` and `readPassage`, which never touch
      member data.
    - Two modes: Find and Prepare (talk/lesson outline).
    - Citations are `[[Ref]]`, checked through `/api/passages`; made-up references
      show struck out and are removed when saved to a talk.
    - The chat history the browser sends is treated as untrusted: last 12 messages,
      text only.
    - Daily cap of 30 requests (admin 150), atomic, in `assistant_usage`.
  - **Talk builder** (`/talks`): private drafts (markdown + citations), "Save as
    talk draft" from any assistant answer, write/preview editor with Insert
    scripture, a word count, and a print view that lists the full text of each cited
    scripture.
  - **Not yet tested against a live model:** no `OPENROUTER_API_KEY` yet. The D6
    bake-off waits on the key.
- **2026-09-13** — OpenRouter key added (free tier, no credits). **First live test
  passed**, run as a throwaway user:
  - Find mode, "Scriptures about enduring trials with patience".
  - 105 s end to end, 4 model steps.
  - 5 keyword searches with varied wording plus 2 `readPassage` context checks;
    reasoning streamed.
  - **11/11 citations were real verses.**

  **Quota constraint** (OpenRouter limits page, checked 2026-09-13): `:free` models
  allow 20 requests/min, and **50 requests/day** until the account has bought ≥ $10 of
  credits, then 1000/day. One assistant question costs about 4 model calls, so the
  free key covers roughly 12 questions a day for the whole family.

  **Decision D9 is Kit's:** buy $10 of credits once, which lifts free models to
  1000/day and isn't spent by `:free` models; or accept the limit; or move to a paid
  model later. The per-user app cap (30/150) is anti-abuse only; the OpenRouter pool is
  the real ceiling.
- **2026-09-13** — **D9 resolved** (Kit): stay free by stacking free tiers, Cerebras →
  Groq → OpenRouter, rather than buying credits. **All members are adults** (Kit), so
  providers with 18+ terms are allowed. Gemini was considered and not chosen; its
  free tier lets Google train on and human-review prompts. Terms checked 2026-09-13:
  - Cerebras: 13+, doesn't train on content.
  - Groq: 18+, doesn't train on inputs/outputs.

  Free limits from their docs:
  - Cerebras gpt-oss-120b: 5 RPM, 1M tokens/day.
  - Groq gpt-oss-120b: 30 RPM, 1K requests/day, 8K TPM, 200K tokens/day.

  **Token diet:** search takes 1–6 queries per call and returns 200-character
  snippets (24 results max); `readPassage` caps at 20 verses; step limit is 4 (Find)
  / 6 (Prepare); reasoning effort is low for Find and medium for Prepare.

  **Disclaimer** on `/study`: AI can be wrong, not doctrine, and prompts go to the
  named outside services.

  Written and unit-tested; **not yet run live on Cerebras or Groq** (keys pending).
- **2026-09-13** — **Home page** (Kit: "a splash page that has the feed and the chat bot").
  - **`/` signed in:** the family feed (New post box + latest 10 posts, "All posts →")
    beside a compact study assistant panel (scrolls inside itself; disclaimer
    underneath). Side by side and sticky on wide screens; assistant first on phones.
  - **`/` signed out:** a welcome page with Sign in / Browse the scriptures and three
    feature cards.
  - **Library moved** from `/` to `/scriptures`. Sign-in, invite sign-up, and sharing
    now land on `/`. Deleting a post from Home returns to Home (`returnTo`, allowlisted
    to `/` or `/feed`).
  - **Width:** the layout keeps its 48rem reading column, and a page whose top element
    has class `wide` gets 72rem (Tailwind `has-[>.wide]:max-w-6xl`).
  - **Verified:** typecheck; 74/74 tests; HTTP checks signed out and as a throwaway
    member. Measured in the browser: Home at 1280px is side by side (feed 672px,
    assistant 416px sticky); at 390px it's stacked with no sideways scroll; reading
    pages stay 768px.
- **2026-09-13** — Live tests on the provider chain found four problems, all fixed
  except the first:
  1. **Cerebras refused every call:** HTTP 402 "Payment required… Visit your billing
     tab". **Dropped at Kit's call**; `@ai-sdk/cerebras` uninstalled. Chain is now Groq
     → OpenRouter.
  2. **Empty answers:** the model spent all of its steps on tool calls. Fixed with
     `prepareStep` setting `toolChoice: "none"` on the last allowed step.
     `readPassage` became `readPassages` (up to 6 references per call) so reading
     takes one step.
  3. **Groq free tier is 8K tokens/min:** one question used about 6.9K tokens, so
     roughly one question a minute. Fixed so far: fewer steps, and a cooldown in
     `lib/fallback-model.ts` skips a provider after it refuses (10 min for
     401/402/403, 60 s for 429, 15 s otherwise), so each step doesn't re-ask it.
  4. **OpenRouter failed after accepting the request:** "Upstream error… overloaded"
     came as the first stream part, after the request was accepted. The fallback now
     reads ahead to the first real stream part and switches providers if it's an
     error.

  Verified: typecheck, 79/79 tests. Also live: a Cerebras 402/401 fell back to Groq,
  and a Groq 429 fell back to OpenRouter. **D9 reopened:** find a replacement free
  provider for Cerebras. GitHub Models was retired 2026-07-30; SambaNova free is
  ~20 requests/day; Mistral's free limits are unpublished (reports of ~1 RPM).
  NVIDIA NIM (40 RPM) is being checked.
- **2026-09-13** — **D9 resolved again** (Kit): Gemini's free tier becomes the primary
  provider, **with a disclaimer**. Chain: Gemini → Groq → OpenRouter.
  - **Checked and rejected:** NVIDIA NIM (its trial terms bar "activity serving real
    end-users"), SambaNova (~20 requests/day), Mistral free (evaluation only; limits
    unpublished).
  - **Gemini terms** (checked earlier today): 18+ and no apps likely used by minors,
    both satisfied since all members are adults. On unpaid services Google uses
    prompts and responses to improve its products, and human reviewers may read
    them. The `/study` disclaimer and the home panel say so whenever Gemini is
    configured.
  - **Setup:** the key goes in `GEMINI_API_KEY`. The model ID is taken from Google's
    model list for Kit's key, not assumed. Free limits show only in AI Studio.
- **2026-09-13** — **Gemini live-tested**, run as a throwaway user after two more fixes:
  - **Dash variants:** a model wrote `Romans 5:3‑4` with a non-breaking hyphen, and a
    real verse was flagged as fake. `lib/references.ts` now accepts U+2010–2015 and
    U+2212.
  - **Null inputs:** gpt-oss on Groq sent `volume: null`, which Groq rejected under
    strict schema checking. The search tool's `volume` is now nullable.

  Results:
  - **Find:** answered by Gemini (`gemini-flash-latest`, which resolves to 3.8 Flash)
    in 13.5 s, 4.9K tokens, 7/7 citations real, `[[ ]]` format used.
  - **Prepare:** Gemini returned 503 "overloaded" (2 of 3 app calls did), so Groq
    answered in 5.3 s, 8.0K tokens (at Groq's 8K TPM cap), 4/4 citations real,
    well-formed outline.
  - **Follow-ups:** a second Gemini model (`gemini-3.6-flash`) joins the chain after
    the newest, so an overloaded one stays within Google before falling to Groq. The
    fallback now adds `response-metadata.modelId` so logs show which model answered
    (Gemini's stream doesn't say). Google's API reports `gemini-2.5-flash` is no longer
    available to new users.
- **2026-09-13** — One more live bug, fixed:
  - **The bug:** on "Verses about the Holy Ghost as a comforter", Gemini spent a step
    searching for `"John 14:16"` as words (0 results), reached the step limit, and on
    the forced tool-less last step wrote only a 125-character fragment.
  - **Fixes:** `searchScriptures` now resolves reference-shaped queries directly to
    that passage (test added). The last step also gets an explicit "no tool calls
    left, write your complete answer now" instruction alongside `toolChoice: "none"`.
    The log line now records per-step finish reasons.
  - **Rerun:** the same question on Gemini took 3 steps (`tool-calls,tool-calls,stop`),
    3.8 s, 5.5K tokens, a complete 1,379-character answer, 6/6 citations real. The
    exact cause of the earlier fragment (recitation filter vs. tool-choice quirk) was
    not reproduced; the log's finish reasons will show it if it recurs.
- **2026-09-13** — Principle 8 added (Kit): Prepare mode (now labeled "Outline a talk or
  lesson") returns only a suggested title, a numbered outline of short headings with
  1–3 cited scriptures each, and extra scriptures to consider. No hooks, sample
  sentences, stories, testimony, or closings. Both modes decline requests to write a
  talk. The previous prompt had produced a scripted opening line in a live Groq test.
  **Live-verified 2026-09-13** (throwaway user, prose check = lines over 30 words
  with no citation):
  1. **"10-minute sacrament meeting talk on ministering"** (Gemini): the exact outline
     shape, 3 sections, 8/8 citations real, 0 prose lines, no Opening/Closing.
  2. **"Please write my whole 10-minute talk on faith, word for word"** (Gemini 3.8
     returned 429, so Gemini 3.6 answered): kindly declined ("will mean the most… in
     your own words"), then an outline only, 6/6 citations real.
  3. **Find mode, "Write the opening paragraph of my talk on repentance"**
     (Gemini 3.6): declined, gave scriptures and short outline pointers, 4/4
     citations real.

  The second Gemini model already caught a rate limit. Tokens per question: 7.7K–12.6K.
- **2026-09-13** — **AI outlines removed** (Kit): "the talk should be by the spirit of
  God, not by technological AI". The assistant is Find scriptures only. Removed:
  - the Outline tab and its instructions
  - `mode` from the chat route, UI, and provider options
  - "Save as talk draft" and `createTalkFromAssistantAction`
  - the "Outline one with the assistant" link on My talks

  Principle 8 rewritten.

  **D10 — talk builder** (Kit, 2026-09-13): a no-AI builder replaces the markdown talk
  editor.
  - **Layout:** an ordered list of capsules, dragged up and down (not a free canvas).
  - **Capsule kinds:** scripture, thought/note, section heading, link.
  - **Printing:** scriptures print with full verse text; PDF comes from the browser's
    Save-as-PDF.
  - **Plan:**

  | # | Slice | Proven when |
  |---|---|---|
  | T1 | **Builder basics**: `talk_items` table (talk, position, kind, verse_id/end_verse_id, text, url); add scripture by reference, thought, heading, link; edit inline; delete; drag to reorder (dnd-kit: mouse, touch, keyboard); autosave | Add one of each capsule, drag the scripture to the top, reload: order and text kept; another member gets 404 for the talk |
  | T2 | **Add to talk** from Find results, Search results, and the reader's verse panel (pick which talk; last used by default) | "Add to talk" on John 14:16 in a Find answer puts a scripture capsule at the end of that talk |
  | T3 | **Print / Save as PDF** view in capsule order with full verse text | Print preview shows headings, thoughts, links, and full scripture text in the arranged order |

  Open at T1: what to do with existing markdown drafts (convert each to a single
  thought capsule, or start fresh).

- **2026-09-13** — Committed `885905e` and pushed. **Talk builder slice T1 built:**
  - **Data:** `talk_items` (migration 005). There were no existing drafts, so no
    conversion; `talks.body` is unused but not dropped.
  - **Server:** `lib/talk-items.ts` does add/update/delete/reorder with owner checks in
    SQL. A reorder must list exactly the talk's capsules or nothing changes.
  - **Builder UI** (`components/talk-builder/TalkBuilder.tsx`):
    - dnd-kit sortable list; the ⠿ handle drags with a mouse (5px), touch (150ms
      press), or keyboard
    - autosave (700ms debounce) with a Saving/All-saved/Not-saved indicator; a
      beforeunload warning; pending edits flushed when navigating away
    - two-step Remove
    - add bar for scripture by reference, thought, section heading, and https link
  - The old markdown `TalkEditor` was removed. The print view is unlinked until T3.

  **Verified:**
  - typecheck
  - **100/100 tests** (7 new: order, validation, exact-set reorder, cross-member and
    cross-talk isolation, cascade delete)
  - HTTP checks as a throwaway member: the builder renders all four capsule kinds in
    order with full verse text and handle labels, My talks lists the talk, another
    member's talk returns 404
  - production build passes

  **Not yet verified:** dragging in a real browser. Kit's Chrome session is signed
  in as Kit, and the browser rules don't allow typing a password to switch accounts,
  so a live drag test needs Kit, or his OK to create and delete a test talk in his
  account.
- **2026-09-13** — **Talk builder slice T2 built (Add to talk):**
  - **`AddToTalkButton`:** a menu of your talks (last used first, remembered in
    localStorage) plus "+ New talk". It appears in the reader's verse panel, on each
    Search result, and on each verified scripture in the assistant's "Scriptures cited"
    list. Members only; signed-out visitors don't see it.
  - **`addScriptureToTalkAction`:** checks the verse exists before creating any new
    talk, checks the talk is the caller's, and appends a scripture capsule.
  - Citation results now carry verse ids (`id`/`endId`).

  **Verified:**
  - typecheck; 100/100 tests
  - Search as a member shows 50 buttons; signed out shows 0
  - `/api/passages` returns `id=moro.10.4 endId=moro.10.5` for Moroni 10:4-5
  - production build compiles, and a production server serves chapter pages with 200

  **Issue found:** on the local **dev** server every chapter page returned 500 ("Jest
  worker encountered 2 child process exceptions"), while the production build served
  them fine. The PC had 1.3 GB of 15.3 GB free (the dev server alone used ~800 MB), so
  Next's dev workers were crashing under memory pressure. Fix: restart the dev server
  after freeing memory.

  **Not yet verified:** adding a scripture through the button in a real browser
  (needs Kit), and dragging in the builder.
- **2026-09-13** — **Slice 12, first half: Come, Follow Me week on the home page**
  (Kit asked for it ahead of T3). `lib/come-follow-me.ts` holds lessons 37–52 of the
  2026 Old Testament manual: start date, readings, and the lesson title used only as
  link text to churchofjesuschrist.org (principle 2 holds: no manual text stored, and
  the Church's site was never fetched; see `data/SOURCES.md`). Readings link into our
  reader. The week turns over Monday midnight `America/New_York`. Signed-in home only.
  `tests/come-follow-me.test.ts` 9/9; curl as a throwaway member showed lesson 37
  with all six reading links, signed-out home shows none. **Gap:** the card vanishes
  on 2026-12-28 unless the 2027 weeks are added. The weekly discussion thread (the
  other half of slice 12) isn't built.
- **2026-09-13** — **Renamed to Knit** (Kit), after Mosiah 18:21, "having their hearts
  knit together in unity and in love". A web search found other apps named Knit (an
  events/socials app, a seniors-and-family social network, a messenger, a knitting
  counter) but none for scripture or faith. Acceptable for a private invite-only app;
  revisit before any public listing. The package name and the `scripture-study:`
  localStorage key are unchanged on purpose; the subdomain decision (D5) stands.
- **2026-09-13** — **DNS record created** (Kit, Cloudflare): `scriptures.marzipan-solutions.com`
  A → the VPS, DNS only (not proxied); 1.1.1.1 and 8.8.8.8 both resolve it. (The IP
  stays out of this public repo.)
  Deploy is no longer blocked on DNS. Because it isn't proxied, Caddy can get its own
  certificate directly, and the client IP for rate limiting comes from Caddy, not
  `CF-Connecting-IP`.
- **2026-09-14** — **Direction: Knit becomes the family hub** (Kit; D9). Scripture
  study, then recipes ported from `recipe-chat`, then the book list, all in one app
  with one login. Recipes wait until Knit is live. **Subdomain changed** to
  `knit.marzipan-solutions.com` (D5). Checked first: no code, env, or Caddy config
  referenced the old name, only docs.
- **2026-09-14** — **Talk builder T3: print view from capsules.** `/talks/[id]/print`
  now renders the talk's capsules in the arranged order: headings, thoughts, links
  with the URL written out for paper, and scriptures with full verse text from our
  data plus the member's note. It no longer reads the retired markdown `talks.body`.
  The builder's "Print view" link is back. The talk builder Kit asked for is complete.
  Curl as a throwaway member confirmed the order and verse text; another member's
  talk returns 404. **Not yet verified:** the browser print preview.
- **2026-09-14** — **Pre-ship: sign-in rate limit per member behind Caddy.** better-auth
  1.7.4 ignores any multi-address `X-Forwarded-For` unless `trustedProxies` is set. It
  put all those requests in one shared bucket, so a few wrong passwords could have
  locked out the whole family. `lib/auth.ts` now trusts only the loopback hops, which
  means the address Caddy saw is used and a forged leftmost address is ignored. This is
  safe only because the app binds to localhost (see Security). Proven by
  `tests/rate-limit-ip.test.ts` (fails without the setting) and a live curl on dev;
  still to confirm through Caddy at deploy.
- **2026-09-14** — **Pre-ship: admin password-reset links** (no email is ever sent). On
  `/admin`, "Reset a password" makes a link for a chosen member: single-use, expires in
  24 hours, and a new link cancels the older one. `/reset/[token]` is public. Saving
  signs the member out on every device. Built like invites (`migrations/006`, only a
  sha256 of the token stored), because better-auth's own reset flow is built around
  sending email and stores its tokens in plain text. The new password is still hashed
  and saved by better-auth (`$context.password.hash`, `internalAdapter.updatePassword`).
  Only a database admin can make a link; a role the caller claims isn't trusted.
  `tests/password-resets.test.ts` 9/9; curl on dev confirmed the flow. **Not yet
  verified:** clicking through both forms in a browser.
- **2026-09-14** — **Recipes stay separate** (Kit; D9 reversed): some family members
  aren't spiritual, so recipe-chat keeps its own app at `recipes.`. Knit launches as
  scripture study only.
- **2026-09-14** — **Deploy prep (slice 2, local half).** `deploy/` follows the
  conventions fantasy-football set on the VPS: `/opt/knit`, a `knit` system user,
  `knit.service` on `127.0.0.1:3102` with `ProtectSystem=strict`, a Caddy block, a
  `deploy.sh` (pull, `npm ci`, `db:migrate`, `next build`, restart, check `/sign-in`),
  a nightly `pg_dump` cron at 04:45 keeping 14 days, `env.example`, and a step-by-step
  `BOOTSTRAP.md`. `npm run build` passes. The backup script was proven locally, including
  that a failed dump leaves no file. **Codex layout/color audit** (read-only, run at
  Kit's request): field and card borders are 1.25–1.33:1 (need 3:1), placeholders fail
  contrast, most phone tap targets are under 44px, the phone nav hides links offscreen,
  the dark-mode failed-tool chip is 2.65:1, and print has no forced light palette. The
  contrast numbers were re-computed independently and match. Which ones to fix before
  launch is Kit's call.
- **2026-09-14** — **Layout and color fixes before launch** (Kit chose fix-first).
  New `--control` token for the edges of fields, buttons, and clickable cards (≥3:1),
  with `--line` kept for dividers. Light `--muted` darkened to `#70655a` so it passes on
  highlighted verses. `--error` replaces the scattered red utilities. Placeholders use
  `--muted`. Form fields are 44px (a base rule), and buttons, nav links, reactions,
  reader chips, and builder buttons get `min-h-11` where they're used, not globally,
  because a global rule would stretch the inline verse-number buttons. On phones the nav
  shows four links plus a "More" menu (`components/NavMore.tsx`). Print forces a light
  palette. Visible labels on search and the reference picker. The `/talks` list wraps
  long titles. `color-scheme` is set for native controls. Verse anchors use
  `scroll-mt-24` for the taller header. **Header (Kit):** "Knit" is larger, with the
  scripture it comes from beside it as plain text: "Mosiah 18:21" on phones, plus the
  words "hearts knit together in unity and in love" on wider screens. Checked with
  headless Chrome at 390px (VERIFICATION row 22). **Deferred** audit items: remaining
  small text links, reading column width, focus rings, 12px guidance text, and h2
  styling.
- **2026-09-14** — **Slice 2: deployed. Knit is live at
  `https://knit.marzipan-solutions.com`.** Pushed `885905e..f1d1616` after a secret scan
  (no keys, secrets, or family names; the VPS IP in `42558e2`'s session log went public
  as Kit decided 2026-09-13, and it's already in public DNS). BOOTSTRAP §0–6 run on the
  VPS: the `knit` user, database, and `.env` (server-generated secrets; AI keys piped from
  Kit's machine unprinted, the same keys as local dev per Kit), migrations and 41,995
  verses, the build, `knit.service` on 127.0.0.1:3102, and the Caddy block (validated
  before reload). One surprise: the VPS lacked `unzip`, which `build-scriptures.mjs`
  needs; installed and added to the preflight. The rate limit was verified through the
  real Caddy (row 19). Neighboring sites were unaffected. **Remaining for launch:** first
  admin invite, nightly backup, Kit's phone check, and an invite/reset/assistant check.
- **2026-09-14** — **Launch checks passed; ready for family invites.** Kit created his
  admin account from the one-time invite. The nightly backup is installed (04:45 UTC, 14
  days) and a manual run produced a valid 2.4 MB dump. On the live site, a throwaway
  member signed up from an invite, got an assistant answer with six real citations, and
  reset their password through a reset link; then it was deleted. The assistant took 68s
  (Gemini Flash, 5 tool steps): it works, but it's slow enough to look at after launch.
  Still open: Kit's phone check and confirming the first scheduled backup.
- **2026-09-14** — **Bug fix (Kit): reading a cited verse lost the assistant
  conversation.** Verse chips were links to the reader, and the chat lived only in memory.
  Now a tap opens the verse in a popup (`components/assistant/VersePopup.tsx`, a native
  `<dialog>` with Add to talk and Read the chapter), for chips in the answer and for the
  "Scriptures cited" list alike. The conversation and unsent draft are also saved in the
  tab's `sessionStorage`, per member, capped at 30 messages (`lib/assistant-history.ts`).
  So Back, a reload, or going from the home panel to the full page keeps it, and "Start
  over" clears it. Principle 4 holds: it stays in that browser tab, is never sent
  anywhere, and is gone when the tab closes. VERIFICATION row 23. Not yet deployed.
