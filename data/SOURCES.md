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

## Deep Study texts (SPEC → Deep Study)

Plain-text downloads from Project Gutenberg, fetched 2026-10-03 from
`https://www.gutenberg.org/cache/epub/<id>/pg<id>.txt`. `scripts/build-deep-study.mjs`
cuts off Gutenberg's header, footer, and license (the texts are US public domain; the
"Project Gutenberg" name is a trademark, so it isn't on the processed text), strips
the translator's footnotes, and writes `data/deep-study/` (gitignored).

| File | Text | Status |
|---|---|---|
| `raw/gutenberg/pg2848.txt` | Josephus, *Antiquities of the Jews*, tr. Whiston (1737), #2848 | Built: 1,409 sections |
| `raw/gutenberg/pg2850.txt` | Josephus, *The Wars of the Jews*, tr. Whiston (1737), #2850 | Built: 664 sections |
| `raw/gutenberg/pg77935.txt` | *The Book of Enoch*, tr. R.H. Charles (SPCK, 1917), #77935 | Downloaded, not yet built |
| `raw/gutenberg/pg124.txt` | *Deuterocanonical Books* (the KJV Apocrypha: 1–2 Esdras, Tobit, Judith, … 1–2 Maccabees), #124 | Downloaded, not yet built |

Whiston's footnotes are dropped, not shown. Each book's footnote numbers come from its
FOOTNOTES block, and only those markers are removed, in order. 62 of the
~830 markers aren't in Gutenberg's text at all (checked: no stray numbers are left), and the build lists them as warnings.

**Not on Gutenberg** (checked through the Gutendex catalog 2026-10-03): *Jubilees*,
Young's Literal Translation, Brenton's Septuagint. They come from the sources below.

## Pinned for later slices (downloaded 2026-10-05, nothing built yet)

Every remaining source in SPEC → Deep Study → Sources, plus the public-domain study
helps. None of these is read by `npm run build:data` yet. Large text is stored
compressed (`.gz`, `.zip`, `.tar.gz`) exactly as downloaded or gzipped byte-for-byte.
Checksums are the first 12 hex digits of SHA-256.

| File | Text | Source | License | SHA-256 |
|---|---|---|---|---|
| `raw/ebible/eng-Brenton_usfm.zip` | Brenton, *Septuagint in English* (1844), with Apocrypha | [eBible.org](https://ebible.org/eng-Brenton/) USFM | PD | `03e4fc1f7283` |
| `raw/ebible/grcbrent_usfm.zip` | Brenton's Greek Septuagint with Apocrypha | [eBible.org](https://ebible.org/grcbrent/) USFM | PD | `cc6591b067fa` |
| `raw/ebible/engylt_usfm.zip` | Young's Literal Translation (1898) | [eBible.org](https://ebible.org/engylt/) USFM | PD | `e50e55320bd5` |
| `raw/ebible/engDRA_usfm.zip` | Douay-Rheims, American edition of 1899 (Challoner) | [eBible.org](https://ebible.org/engDRA/) USFM | PD | `2a4bbd180de4` |
| `raw/ebible/latVUC_usfm.zip` | Clementine Vulgate (1598) | [eBible.org](https://ebible.org/latVUC/) USFM | PD | `f31ec8c0e1c3` |
| `raw/ebible/grcmt_usfm.zip` | Robinson-Pierpont Byzantine Greek NT (2018) | [eBible.org](https://ebible.org/grcmt/) USFM | PD | `c8b97cd0ace2` |
| `raw/stepbible/TAHOT_*.txt.gz` (4) | Hebrew OT words, glosses, Strong's (TAHOT) | [STEPBible-Data](https://github.com/STEPBible/STEPBible-Data) @ `1f3423d` | CC BY 4.0 — **credit "STEP Bible" linked to www.STEPBible.org** | per file below |
| `raw/stepbible/TAGNT_*.txt.gz` (2) | Greek NT words, glosses, Strong's (TAGNT) | same | same | per file below |
| `raw/stepbible/TVTMS.txt.gz` | Versification map, MT/LXX/Vulgate/English | same | same | `63058e0f2020`¹ |
| `raw/stepbible/README.md` | STEPBible's license terms | same | — | — |
| `raw/sefaria/jubilees-charles-1917.json` | *Jubilees*, tr. R.H. Charles (SPCK, 1917), 50 chapters, 1,758 verses | [Sefaria](https://www.sefaria.org/Book_of_Jubilees) API v3, version "The Book of Jubilees, trans. R. H. Charles. London [1917]" | PD | `adc70abc8fe3` |
| `raw/gutenberg/pg36264.txt` | A.T. Robertson, *Harmony of the Gospels* (1922) | Gutenberg #36264 | PD | `e4fa605f9b0e` |
| `raw/ccel/easton-ebd2.xml.gz` | Easton's Bible Dictionary (1897), ThML | [CCEL](https://ccel.org/ccel/easton/ebd2) | PD (DC.Rights "Public Domain") | `53f1fbab4067` |
| `raw/ccel/nave-bible.xml.gz` | Nave's Topical Bible (1896), ThML | [CCEL](https://ccel.org/ccel/nave/bible) | PD by age (CCEL leaves DC.Rights blank) | `6041a43836bc` |
| `raw/crosswire/TSK.zip` | Treasury of Scripture Knowledge (c. 1880), SWORD zCom module v1.4 | [CrossWire](https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/TSK.zip) | PD (module conf) | `6784c7099465` |
| `raw/wikisource/woodruff-manifesto-1890-official-declaration.json` | Official Declaration 1, as printed in the 1890 pamphlet *President Woodruff's Manifesto* | [Wikisource](https://en.wikisource.org/wiki/President_Woodruff%27s_Manifesto/Conference_Proceedings:_Official_Declaration) parse API, rev 16285939 | PD-old | `10efee7ed54f` |

¹ STEPBible files are gzipped at level 9 with no timestamp, so the SHA-256 of the
*uncompressed* text is what to check against upstream: TAHOT Gen-Deu `e9b8546ee48f`,
Jos-Est `195fee1dc365`, Job-Sng `4ece8583dac7`, Isa-Mal `f3ded203d2a7`; TAGNT Mat-Jhn
`ab8eaaeb68e1`, Act-Rev `524e32375361`; TVTMS `63058e0f2020`.

Decisions made while pinning:

- **Greek OT = Brenton's Greek (`grcbrent`)**, Kit's decision 2026-10-05 (SPEC D13).
  Swete was the spec's first choice, but the only digitizations (First1KGreek via
  `nathans/lxx-swete`, and the partial `Sollupulo/Swete-1909-LXX`) are CC BY-SA 4.0,
  so it wasn't pinned. eBible's `grclxx` wasn't pinned either: it's labelled public
  domain but doesn't name its base edition, and the spec says to avoid Rahlfs.
- **SBLGNT** was not pinned (© SBL and Logos). **Westcott-Hort** wasn't found as a
  clean standalone text; TAGNT already marks which words each edition, WH
  included, has.
- **Jubilees** came from Sefaria rather than archive.org's OCR of the same 1917
  edition, which has footnotes and page headers mixed into the text.
- **Official Declaration 1** is only the 1890 text. The excerpts from Woodruff's 1891
  addresses that follow it in the current D&C were selected and introduced by the
  Church in 1981, so they aren't pinned.

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
   Nave's Topical Bible, Easton's Bible Dictionary, and the Treasury of Scripture
   Knowledge are now pinned (above) but not built.

Also missing from the built data: Official Declaration 1 (pinned above, not yet
built) and the Book of Abraham facsimile images (the dataset's image
URLs point at retired lds.org paths).

## Come, Follow Me schedule

`lib/come-follow-me.ts` holds the 2026 week list: start date, reading assignment, and
lesson title, which is shown only as the text of a link to the lesson on
churchofjesuschrist.org. None of the manual's text is stored. The entries were typed
in by hand on 2026-09-13 from the lesson headings as they appear in web search results
(for example "September 7–13. “He Shall Direct Thy Paths”: Proverbs 1–4; 15–16; 22; 31;
Ecclesiastes 1–3; 11–12"). The Church's site was never fetched. It covers lessons 37–52
only; add the 2027 manual's weeks before 2026-12-28, or the card disappears.
