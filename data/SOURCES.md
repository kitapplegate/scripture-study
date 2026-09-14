# Scripture data sources

Everything in `data/raw/` is a pinned, unmodified download. `npm run build:data`
turns it into `data/scriptures/` (gitignored, regenerated on every build).

| File | Source | License |
|---|---|---|
| `raw/scriptures-json/old-testament.json` | [bcbooks/scriptures-json](https://github.com/bcbooks/scriptures-json) @ `3bda76e` | Public domain |
| `raw/scriptures-json/new-testament.json` | same | Public domain |
| `raw/scriptures-json/book-of-mormon.json` | same | Public domain |
| `raw/scriptures-json/doctrine-and-covenants.json` | same | Public domain |
| `raw/scriptures-json/pearl-of-great-price.json` | same | Public domain |
| `raw/openbible/cross-references.zip` | [OpenBible.info cross-references](https://www.openbible.info/labs/cross-references/), dated 2026-09-07 | CC-BY 4.0 — **attribution required in the app** |

Downloaded 2026-09-13.

## Why this source instead of Project Gutenberg

Gutenberg only has the KJV (#10) and the Book of Mormon (#17), both as plain text.
It has no Doctrine and Covenants or Pearl of Great Price. `scriptures-json` has all
five standard works in the Church's 2013 edition text, already split into
book/chapter/verse. It keeps the original Book of Mormon book headings, Psalm
superscriptions, the Psalm 119 letter headings, KJV paragraph marks, D&C signatures,
and the Book of Abraham facsimile explanations. Its verse counts match the printed
editions: OT 23,145 · NT 7,957 · BoM 6,604 · D&C 3,654 · PGP 635. The build script
fails if any count changes.

## What is *not* here, and why

The Church's **study helps** are copyrighted by Intellectual Reserve, Inc. (IRI) and
can't be redistributed. That covers footnotes, modern chapter summaries, the Topical
Guide, the Bible Dictionary, the Guide to the Scriptures, the Triple Combination
Index, the D&C section introductions, Official Declaration 2, and the JST excerpts.
`scriptures-json` leaves them out for the same reason. The app handles this two ways:

1. Every chapter links to the same chapter on churchofjesuschrist.org / Gospel
   Library, where the official footnotes and study helps are available.
2. Open-licensed study helps are bundled in place of the official ones. Right now
   that's the OpenBible.info cross-references (top 8 per verse by community vote).
   Public-domain candidates for later: Nave's Topical Bible (1896), Easton's Bible
   Dictionary (1897), Treasury of Scripture Knowledge.

Also missing: Official Declaration 1 (1890, public domain, but not in the dataset;
could be hand-added) and the Book of Abraham facsimile images (the dataset's image
URLs point at retired lds.org paths).

## Come, Follow Me schedule

`lib/come-follow-me.ts` holds the 2026 week list: start date, reading assignment, and
lesson title, which is shown only as the text of a link to the lesson on
churchofjesuschrist.org. None of the manual's text is stored. The entries were typed
in by hand on 2026-09-13 from the lesson headings as they appear in web search results
(for example "September 7–13. “He Shall Direct Thy Paths”: Proverbs 1–4; 15–16; 22; 31;
Ecclesiastes 1–3; 11–12"). The Church's site was never fetched. It covers lessons 37–52
only; add the 2027 manual's weeks before 2026-12-28, or the card disappears.
