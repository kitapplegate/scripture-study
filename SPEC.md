# Scripture Study — SPEC

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

An invite-only circle of family and friends, somewhere from 5 to 50 people, some of
them kids. It has to work well on phones.

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
- **Database**: Postgres 16 on the VPS, in its own database and role, with the
  `pgvector` extension (`postgresql-16-pgvector` 0.6.0 is in apt).
- **Search**: hybrid. Postgres full-text search handles exact words and phrases
  ("faith hope charity"). pgvector embeddings handle meaning ("scriptures about
  enduring hard trials"). Chunks are single verses plus overlapping 3–5 verse
  passages, with the book/chapter headings included.
- **Embeddings**: a small open model run locally at build time (e.g. bge-small or
  nomic-embed). That's free, private, and done once for 42k verses.
- **LLM**: every call goes through one OpenAI-compatible client (`lib/llm.ts`), so
  the provider is config, not code. Testing uses an OpenRouter `:free` reasoning
  model (D6). Moving to a paid model later means changing an env var.

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
| — | Later: talk/lesson builder with drag-and-drop, verse of the day, read-aloud (browser speech), memorization flashcards and family challenges, kids' reading badges, Isaiah ↔ 2 Nephi side-by-side, PWA/offline, email digest, Nave's Topical Bible and Easton's Bible Dictionary | — |

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
- **Kids**: members only, no public profiles, no direct messages from strangers
  (there are no strangers). Parents create kids' accounts.
- **Branding**: not affiliated with the Church. Don't use Church logos or look like
  an official Church app. The README and footer say so.
- **Dependencies**: Dependabot alerts on the public repo; `npm audit` before deploys.

## Decisions

- **D1 — hosting** — ✅ resolved 2026-09-13: VPS, deployed by pulling from GitHub.
- **D2 — how people join** — open. Recommended: invite links. Alternatives: open
  signup with approval, or an email allow-list.
- **D3 — conference talks** — open. Terms of Use rule out scraping or storing talk
  text. Options:
  (a) **Links + references** (recommended): members attach a talk link to posts; the
  assistant suggests a Church site search link on the theme; per-verse "search talks
  citing this" links to BYU's Scripture Citation Index.
  (b) Ask the Church for written permission to index talks privately (their terms
  offer that route), and build full-text talk search only if they grant it.
  (c) Skip talks.
- **D4 — shape of the social side** — open. Recommended: a feed of verse posts with
  comments and reactions, plus a weekly Come Follow Me discussion thread. A live chat
  room is heavier (websockets) and conversations disappear into scrollback; it could
  come later.
- **D5 — subdomain** — open. e.g. `scriptures.marzipan-solutions.com` (the domain
  the other VPS apps use).
- **D6 — test model** — default chosen, can change: an OpenRouter `:free` reasoning
  model with tool support (19 free models listed on 2026-09-13, e.g.
  `nvidia/nemotron-3-super-120b-a12b:free`, `google/gemma-4-31b-it:free`). Free-model
  availability changes often; `lib/llm.ts` must make swapping one line.

## Status updates

- **2026-09-13** — Project started. All five standard works came from
  `bcbooks/scriptures-json` @ `3bda76e` (Gutenberg has no D&C or PGP), plus the
  OpenBible.info cross-references. Slice 1 (reader) is built and checked over HTTP.
- **2026-09-13** — Direction set: family scripture social network + RAG study
  assistant, public repo for Kit's portfolio, deployed to the VPS by pulling from
  GitHub (D1 resolved). Church Terms of Use checked: no scraping or re-hosting of
  talks or study helps, but linking is fine (D3). Slices reordered around sharing and
  the assistant. Security section added.
