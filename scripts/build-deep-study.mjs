// Builds the Deep Study library (SPEC → Deep Study, D10) from the pinned Project
// Gutenberg downloads in data/raw/gutenberg/:
//   data/deep-study/index.json        sources -> books -> chapter list
//   data/deep-study/<source>.json     every passage of one source, in reading order
// Passage ids are namespaced per source ("jos-ant.7.13.1") and, like verse ids,
// must never change once notes or events point at them.
//
// Gutenberg's header, footer and license text are cut off (everything outside the
// "*** START/END OF THE PROJECT GUTENBERG EBOOK" markers); the texts themselves are
// public domain. Run: node scripts/build-deep-study.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW = path.join(ROOT, "data", "raw", "gutenberg");
const OUT = path.join(ROOT, "data", "deep-study");

// Expected passage counts: the build fails if a re-download or parser change moves them.
const SOURCES = [
  {
    slug: "jos-ant",
    title: "Antiquities of the Jews",
    author: "Flavius Josephus",
    translator: "William Whiston",
    year: 1737,
    gutenberg: 2848,
    // Names a reader or a model might cite it by (lowercase); "Antiquities 7.13.1".
    aliases: ["antiquities", "ant", "ant.", "jewish antiquities", "antiquities of the jews", "josephus antiquities"],
    kind: "retelling",
    blurb: "Josephus (c. AD 37–100) retells the history of Israel from the Creation to the war with Rome, for a Greek-speaking audience.",
    parse: (text) => parseJosephus(text, { bodyStart: "BOOK I." }),
    expected: null,
  },
  {
    slug: "jos-war",
    title: "The Wars of the Jews",
    author: "Flavius Josephus",
    translator: "William Whiston",
    year: 1737,
    gutenberg: 2850,
    aliases: ["wars", "war", "jewish war", "the jewish war", "wars of the jews", "the wars of the jews", "josephus wars"],
    kind: "history",
    blurb: "Josephus's eyewitness history of the Jewish revolt against Rome and the fall of Jerusalem in AD 70.",
    parse: (text) => parseJosephus(text, { bodyStart: "PREFACE" }),
    expected: null,
  },
];

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100 };
function romanToInt(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]], next = ROMAN[s[i + 1]] ?? 0;
    n += v < next ? -v : v;
  }
  return n;
}

function gutenbergBody(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const start = raw.search(/^\*\*\* START OF THE PROJECT GUTENBERG EBOOK.*$/m);
  const end = raw.search(/^\*\*\* END OF THE PROJECT GUTENBERG EBOOK.*$/m);
  if (start < 0 || end < 0) throw new Error(`${file}: Gutenberg start/end markers not found`);
  return raw.slice(raw.indexOf("\n", start) + 1, end);
}

const paragraphs = (text) =>
  text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);

// Removes footnote markers from one book's running text, in order. Each book's
// FOOTNOTES block lists its numbers ("12 (return) [ ..."), so we only remove those
// numbers, each after the previous one: "over1 begins" and "Barbarians; 2 Joseph"
// lose their markers, while any other number in the text stays.
function stripFootnoteMarkers(text, ids) {
  let out = "", cursor = 0, missed = [];
  for (const id of ids) {
    const re = new RegExp(`(?<=[^\\s\\d])${id}(?![\\d])|(?<=^|\\s)${id}(?=\\s)`, "g");
    re.lastIndex = cursor;
    const m = re.exec(text);
    if (!m) { missed.push(id); continue; }
    out += text.slice(cursor, m.index);
    cursor = m.index + m[0].length;
  }
  out += text.slice(cursor);
  return { text: out.replace(/ {2,}/g, " ").replace(/ ([,;:.])/g, "$1"), missed };
}

// Whiston's Josephus: BOOK <roman>. → CHAPTER <n>. → numbered sections "<n>. ...".
// A section runs until the next numbered paragraph; footnotes are skipped.
function parseJosephus(text, { bodyStart }) {
  const paras = paragraphs(text);
  // The table of contents repeats every BOOK/CHAPTER heading, so the body begins at
  // the last occurrence of its first heading.
  let start = -1;
  paras.forEach((p, i) => { if (p.startsWith(bodyStart)) start = i; });
  if (start < 0) throw new Error(`body start "${bodyStart}" not found`);

  const books = []; // { n, title, chapters: [{ n, title, sections: [{ n, parts: [] }] }], footnotes: [] }
  let book = null, chapter = null, section = null, inFootnotes = false;
  const newBook = (n, title) => {
    book = { n, title, chapters: [], footnotes: [] };
    books.push(book);
    chapter = null; section = null; inFootnotes = false;
  };
  for (const p of paras.slice(start)) {
    let m;
    if (p === "PREFACE") { newBook(0, "Preface"); chapter = { n: 0, title: "", sections: [] }; book.chapters.push(chapter); continue; }
    if ((m = p.match(/^BOOK ([IVXL]+)\.\s*(.*)$/))) {
      const n = romanToInt(m[1]);
      // A repeated heading (the file lists book VIII's chapters twice) restarts that book.
      if (book && book.n === n) books.pop();
      newBook(n, m[2]);
      continue;
    }
    // "FOOTNOTES:", or in Wars "WAR BOOK 3 FOOTNOTES" (once run together with note 2).
    const heading = p.match(/^(?:WAR [A-Z0-9 ]+ )?FOOTNOTES:?\s*(.*)$/);
    if (heading) { inFootnotes = true; if (!heading[1]) continue; }
    if (inFootnotes) {
      if ((m = (heading?.[1] ?? p).match(/^(\d+) \(return\)/))) book.footnotes.push(Number(m[1]));
      continue;
    }
    // A few headings have no period ("CHAPTER 3") or a roman numeral ("CHAPTER V.").
    if ((m = p.match(/^CHAPTER (\d+|[IVXL]+)\.?(?:\s+(.*))?$/))) {
      const n = /^\d+$/.test(m[1]) ? Number(m[1]) : romanToInt(m[1]);
      const existing = book.chapters.find((c) => c.n === n);
      if (existing && existing.sections.length === 0) book.chapters.splice(book.chapters.indexOf(existing), 1);
      chapter = { n, title: m[2] ?? "", sections: [] };
      book.chapters.push(chapter);
      section = null;
      continue;
    }
    if (!chapter) continue; // the chapter list printed under each BOOK heading
    if ((m = p.match(/^(\d+)\.\s+(.*)$/)) && Number(m[1]) === (section?.n ?? 0) + 1) {
      section = { n: Number(m[1]), parts: [m[2]] };
      chapter.sections.push(section);
      continue;
    }
    if (!section) { if (!chapter.title || chapter.sections.length === 0) chapter.title = `${chapter.title} ${p}`.trim(); continue; }
    section.parts.push(p);
  }
  return books.filter((b) => b.chapters.some((c) => c.sections.length));
}

// Flattens one parsed source into passages and checks numbering is gapless.
function toPassages(source, books) {
  const passages = [], problems = [];
  for (const book of books) {
    const SEP = "\u0000";
    const sections = book.chapters.flatMap((c) => c.sections.map((s) => ({ c, s })));
    const joined = sections.map(({ s }) => s.parts.join("\n\n")).join(SEP);
    const { text, missed } = stripFootnoteMarkers(joined, book.footnotes);
    if (missed.length) problems.push(`book ${book.n}: ${missed.length} footnote markers not found (${missed.slice(0, 5).join(", ")}…)`);
    const texts = text.split(SEP);
    if (texts.length !== sections.length) throw new Error(`${source.slug} book ${book.n}: section split mismatch`);

    book.chapters.forEach((c, i) => {
      if (c.n !== (book.n === 0 ? 0 : i + 1)) problems.push(`book ${book.n}: chapter ${c.n} out of order`);
    });
    sections.forEach(({ c, s }, i) => {
      const bookKey = book.n === 0 ? "pref" : String(book.n);
      const id = book.n === 0 ? `${source.slug}.pref.${s.n}` : `${source.slug}.${book.n}.${c.n}.${s.n}`;
      passages.push({
        id,
        book: bookKey,
        chapter: c.n,
        section: s.n,
        reference: book.n === 0 ? `${source.short} Preface ${s.n}` : `${source.short} ${book.n}.${c.n}.${s.n}`,
        text: texts[i].trim(),
      });
    });
  }
  return { passages, problems };
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const index = { sources: [] };
let failed = false;
const SHORT = { "jos-ant": "Antiquities", "jos-war": "Wars" };

for (const source of SOURCES) {
  source.short = SHORT[source.slug];
  const books = source.parse(gutenbergBody(path.join(RAW, `pg${source.gutenberg}.txt`)));
  const { passages, problems } = toPassages(source, books);
  for (const p of problems) console.warn(`${source.slug}: ${p}`);
  if (source.expected !== null && passages.length !== source.expected) {
    console.error(`${source.slug}: expected ${source.expected} passages, found ${passages.length}`);
    failed = true;
  }
  const dupes = passages.length - new Set(passages.map((p) => p.id)).size;
  if (dupes) { console.error(`${source.slug}: ${dupes} duplicate ids`); failed = true; }

  fs.writeFileSync(path.join(OUT, `${source.slug}.json`), JSON.stringify({ slug: source.slug, passages }));
  const { parse, expected, ...meta } = source;
  index.sources.push({
    ...meta,
    url: `https://www.gutenberg.org/ebooks/${source.gutenberg}`,
    passages: passages.length,
    books: books.map((b) => ({
      key: b.n === 0 ? "pref" : String(b.n),
      title: b.n === 0 ? "Preface" : `Book ${b.n}`,
      summary: b.title,
      chapters: b.chapters.filter((c) => c.sections.length).map((c) => ({ n: c.n, title: c.title, sections: c.sections.length })),
    })),
  });
  console.log(`${source.slug}: ${books.length} books, ${passages.length} passages`);
}

fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 1));
if (failed) process.exit(1);
