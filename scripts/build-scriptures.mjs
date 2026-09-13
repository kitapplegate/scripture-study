// Normalizes the raw downloads in data/raw/ into the shape the app reads:
//   data/scriptures/index.json                      volumes -> books -> chapter counts
//   data/scriptures/<volume>/<book>/<chapter>.json  one file per chapter
// Every volume uses the same volume/book/chapter shape (the D&C becomes book "dc"
// with sections as chapters), and slugs match churchofjesuschrist.org study URLs.
// Verse ids ("1-ne.3.7") are what notes/highlights will key on — never change them.
//
// Run: node scripts/build-scriptures.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW = path.join(ROOT, "data", "raw");
const OUT = path.join(ROOT, "data", "scriptures");
const XREFS_PER_VERSE = 8;

const EXPECTED_VERSES = { ot: 23145, nt: 7957, bofm: 6604, "dc-testament": 3654, pgp: 635 };

const readRaw = (name) =>
  JSON.parse(fs.readFileSync(path.join(RAW, "scriptures-json", `${name}.json`), "utf8"));

const churchUrl = (volume, book, chapter) =>
  `https://www.churchofjesuschrist.org/study/scriptures/${volume}/${book}${chapter ? `/${chapter}` : ""}?lang=eng`;

// ---- OpenBible.info cross-references (CC-BY), OSIS book codes -> our slugs ----
const OSIS = {
  Gen: "gen", Exod: "ex", Lev: "lev", Num: "num", Deut: "deut", Josh: "josh", Judg: "judg",
  Ruth: "ruth", "1Sam": "1-sam", "2Sam": "2-sam", "1Kgs": "1-kgs", "2Kgs": "2-kgs",
  "1Chr": "1-chr", "2Chr": "2-chr", Ezra: "ezra", Neh: "neh", Esth: "esth", Job: "job",
  Ps: "ps", Prov: "prov", Eccl: "eccl", Song: "song", Isa: "isa", Jer: "jer", Lam: "lam",
  Ezek: "ezek", Dan: "dan", Hos: "hosea", Joel: "joel", Amos: "amos", Obad: "obad",
  Jonah: "jonah", Mic: "micah", Nah: "nahum", Hab: "hab", Zeph: "zeph", Hag: "hag",
  Zech: "zech", Mal: "mal", Matt: "matt", Mark: "mark", Luke: "luke", John: "john",
  Acts: "acts", Rom: "rom", "1Cor": "1-cor", "2Cor": "2-cor", Gal: "gal", Eph: "eph",
  Phil: "philip", Col: "col", "1Thess": "1-thes", "2Thess": "2-thes", "1Tim": "1-tim",
  "2Tim": "2-tim", Titus: "titus", Phlm: "philem", Heb: "heb", Jas: "james", "1Pet": "1-pet",
  "2Pet": "2-pet", "1John": "1-jn", "2John": "2-jn", "3John": "3-jn", Jude: "jude", Rev: "rev",
};

function osisToId(osis) {
  const [book, chapter, verse] = osis.split(".");
  if (!OSIS[book]) throw new Error(`unknown OSIS book: ${book}`);
  return `${OSIS[book]}.${chapter}.${verse}`;
}

function loadCrossRefs() {
  const zip = path.join(RAW, "openbible", "cross-references.zip");
  const text = execFileSync("unzip", ["-p", zip], { maxBuffer: 64 * 1024 * 1024, encoding: "utf8" });
  const byVerse = new Map();
  for (const line of text.split("\n").slice(1)) {
    const [from, to, votesRaw] = line.trim().split("\t");
    if (!from || !to) continue;
    const votes = Number(votesRaw);
    if (!(votes > 0)) continue; // negative/zero votes = crowd says "not related"
    const [start, end] = to.split("-");
    const ref = { to: osisToId(start), votes };
    if (end) ref.toEnd = osisToId(end);
    const key = osisToId(from);
    if (!byVerse.has(key)) byVerse.set(key, []);
    byVerse.get(key).push(ref);
  }
  for (const refs of byVerse.values()) {
    refs.sort((a, b) => b.votes - a.votes);
    refs.length = Math.min(refs.length, XREFS_PER_VERSE);
  }
  return byVerse;
}

// ---- normalize ----
function verseOut(raw, bookSlug, chapter, xrefs) {
  const id = `${bookSlug}.${chapter}.${raw.verse}`;
  const v = { id, verse: raw.verse, text: raw.text };
  if (raw.pilcrow) v.pilcrow = true;
  if (raw.heading) v.heading = raw.heading;
  if (raw.subheading) v.subheading = raw.subheading;
  const refs = xrefs.get(id);
  if (refs) v.xrefs = refs;
  return v;
}

function main() {
  const xrefs = loadCrossRefs();
  fs.rmSync(OUT, { recursive: true, force: true });

  const volumes = [];
  const seenBookSlugs = new Set();
  const bookNames = {}; // slug -> short name, for rendering cross-reference labels

  const sources = [
    readRaw("old-testament"),
    readRaw("new-testament"),
    readRaw("book-of-mormon"),
    (() => {
      // Reshape the D&C (sections) into the common books/chapters shape.
      const dc = readRaw("doctrine-and-covenants");
      const [volumeSlug, bookSlug] = dc.lds_slug.split("/");
      return {
        ...dc,
        lds_slug: volumeSlug,
        books: [{
          book: "Doctrine and Covenants",
          short: "D&C",
          full_title: dc.title,
          lds_slug: bookSlug,
          chapterLabel: "Section",
          chapters: dc.sections.map((s) => ({ ...s, chapter: s.section })),
        }],
      };
    })(),
    readRaw("pearl-of-great-price"),
  ];

  for (const vol of sources) {
    const volSlug = vol.lds_slug;
    let verseCount = 0;
    const books = [];

    for (const b of vol.books) {
      if (seenBookSlugs.has(b.lds_slug)) throw new Error(`duplicate book slug ${b.lds_slug}`);
      seenBookSlugs.add(b.lds_slug);
      bookNames[b.lds_slug] = b.short ?? b.book;

      for (const c of b.chapters) {
        const out = {
          volume: volSlug,
          volumeTitle: vol.title,
          book: b.lds_slug,
          bookName: b.short ?? b.book,
          chapterLabel: b.chapterLabel ?? "Chapter",
          chapter: c.chapter,
          reference: c.reference,
          churchUrl: churchUrl(volSlug, b.lds_slug, c.chapter),
          verses: c.verses.map((v) => verseOut(v, b.lds_slug, c.chapter, xrefs)),
        };
        if (c.chapter === 1 && b.heading) out.bookHeading = b.heading;
        if (c.heading) out.heading = c.heading;
        if (c.note) out.note = c.note;
        if (c.signature) out.signature = c.signature;
        if (c.chapter === b.chapters.length && b.note) out.bookNote = b.note;
        verseCount += out.verses.length;

        const dir = path.join(OUT, volSlug, b.lds_slug);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${c.chapter}.json`), JSON.stringify(out));
      }

      const book = {
        slug: b.lds_slug,
        name: b.short ?? b.book,
        fullTitle: b.full_title,
        chapterLabel: b.chapterLabel ?? "Chapter",
        chapters: b.chapters.length,
      };
      if (b.full_subtitle) book.fullSubtitle = b.full_subtitle;
      if (b.facsimiles) {
        // Image URLs point at retired lds.org paths; keep the explanations, drop the links.
        book.facsimiles = b.facsimiles.map(({ number, title, explanations, note }) => ({
          number, title, explanations, ...(note ? { note } : {}),
        }));
      }
      books.push(book);
    }

    if (verseCount !== EXPECTED_VERSES[volSlug]) {
      throw new Error(`${volSlug}: expected ${EXPECTED_VERSES[volSlug]} verses, got ${verseCount}`);
    }
    const volume = { slug: volSlug, title: vol.title, verses: verseCount, books };
    if (vol.subtitle) volume.subtitle = vol.subtitle;
    if (vol.title_page) volume.titlePage = vol.title_page;
    if (vol.testimonies) volume.testimonies = vol.testimonies;
    volumes.push(volume);
    console.log(`${volSlug.padEnd(13)} ${String(books.length).padStart(2)} books  ${verseCount} verses`);
  }

  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ volumes, bookNames }, null, 1));
  const total = volumes.reduce((n, v) => n + v.verses, 0);
  console.log(`total ${total} verses; cross-refs attached to ${xrefs.size} Bible verses`);
}

main();
