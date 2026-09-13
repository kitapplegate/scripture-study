# Scripture Study

A Gospel-Library-style scripture reader for family and friends, with sharing,
study plans, and accountability planned as later slices. `SPEC.md` is the plan and
the standing authority; `data/SOURCES.md` covers where the text comes from and why
the Church's study helps are linked rather than bundled.

This is a personal project. It is not affiliated with or endorsed by The Church of
Jesus Christ of Latter-day Saints.

## Run it

Needs Node 22+ and PostgreSQL (16+).

1. Create a database and a login for the app (as the Postgres superuser):
   ```sql
   CREATE ROLE scripture LOGIN PASSWORD 'choose-a-password';
   CREATE DATABASE scripture_study OWNER scripture;
   ```
2. Create `.env.local` (never committed):
   ```sh
   DATABASE_URL=postgres://scripture:choose-a-password@localhost:5432/scripture_study
   BETTER_AUTH_SECRET=<32+ random bytes, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`>
   BETTER_AUTH_URL=http://localhost:3000
   ```
3. Install, create the tables, and make the first admin's invite link:
   ```sh
   npm install
   npm run db:migrate
   npm run invite -- admin "Your name"
   npm run dev          # http://localhost:3000, then open the printed invite link
   ```

After that, admins create invite links for everyone else from the **Invites** page.
Sign-up is invite-only; the public sign-up endpoint is closed.

`npm run build` regenerates `data/scriptures/` from the pinned files in `data/raw/`
first (via `prebuild`). To regenerate the data alone, run `npm run build:data`. That
script fails if any volume's verse count changes.

## What works today (slice 1)

- Library → volume → book → chapter, with URLs that mirror churchofjesuschrist.org
  (`/scriptures/bofm/1-ne/3#v7`)
- Book of Mormon book headings, Psalm superscriptions, Psalm 119 letter headings,
  KJV paragraph marks, D&C signatures, and the Book of Abraham facsimile explanations
- Tap a verse to see its Bible cross-references (OpenBible.info, CC BY 4.0) or copy it
- Previous/next chapter across books and volumes
- A Gospel Library link on every chapter for the official footnotes and study helps
