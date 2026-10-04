// Deep Study library (SPEC → Deep Study, D10): ancient texts read beside scripture,
// never mixed into it. Text is read from the generated files in data/deep-study/;
// search uses the `ds_passages` table. The study assistant must not import this file.
// Relative imports only, so tests can load this outside Next.js.
import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "./db";
import { MARK_END, MARK_START } from "./search";

// turbopackIgnore: these files are read at runtime, not bundled.
const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data", "deep-study");

export type DsChapterInfo = { n: number; title: string; sections: number };
export type DsBook = { key: string; title: string; summary: string; chapters: DsChapterInfo[] };
export type DsSource = {
  slug: string;
  title: string;
  short: string;
  author: string;
  translator: string;
  year: number;
  gutenberg: number;
  aliases: string[]; // lowercase names it may be cited by: "antiquities", "ant."
  url: string;
  kind: string;
  blurb: string;
  passages: number;
  books: DsBook[];
};
export type DsPassage = { id: string; book: string; chapter: number; section: number; reference: string; text: string };

let indexCache: Promise<{ sources: DsSource[] }> | undefined;
const passageCache = new Map<string, Promise<DsPassage[]>>();

export function getDsIndex() {
  indexCache ??= fs
    .readFile(path.join(DATA_DIR, "index.json"), "utf8")
    .then((t) => JSON.parse(t) as { sources: DsSource[] })
    .catch((err) => {
      indexCache = undefined;
      throw err;
    });
  return indexCache;
}

export async function getDsSource(slug: string) {
  return (await getDsIndex()).sources.find((s) => s.slug === slug);
}

// Only called with a slug that index.json already knows, so no path is built from raw input.
function passagesOf(slug: string) {
  let p = passageCache.get(slug);
  if (!p) {
    p = fs
      .readFile(path.join(DATA_DIR, `${slug}.json`), "utf8")
      .then((t) => (JSON.parse(t) as { passages: DsPassage[] }).passages)
      .catch((err) => {
        passageCache.delete(slug);
        throw err;
      });
    passageCache.set(slug, p);
  }
  return p;
}

export const dsChapterHref = (source: string, book: string, chapter: number, section?: number) =>
  `/deep-study/${source}/${book}/${chapter}${section ? `#s${section}` : ""}`;

export async function getDsChapter(sourceSlug: string, bookKey: string, chapterParam: string) {
  const source = await getDsSource(sourceSlug);
  const bookIdx = source?.books.findIndex((b) => b.key === bookKey) ?? -1;
  if (!source || bookIdx < 0 || !/^\d+$/.test(chapterParam)) return undefined;
  const book = source.books[bookIdx];
  const info = book.chapters.find((c) => c.n === Number(chapterParam));
  if (!info) return undefined;

  const all = await passagesOf(source.slug);
  const sections = all.filter((p) => p.book === book.key && p.chapter === info.n);

  // Previous/next chapter across book boundaries, in reading order.
  const flat = source.books.flatMap((b) => b.chapters.map((c) => ({ book: b, c })));
  const at = flat.findIndex((x) => x.book.key === book.key && x.c.n === info.n);
  const label = (x: (typeof flat)[number]) => (x.book.key === "pref" ? "Preface" : `${x.book.title}, ch. ${x.c.n}`);
  const link = (x: (typeof flat)[number] | undefined) =>
    x && { label: label(x), href: dsChapterHref(source.slug, x.book.key, x.c.n) };

  return {
    source,
    book,
    chapter: info,
    title: book.key === "pref" ? `${source.title}: Preface` : `${source.title}, ${book.title}, Chapter ${info.n}`,
    sections,
    prev: link(flat[at - 1]),
    next: link(flat[at + 1]),
  };
}

// ---- References: "Antiquities 7.13.1", "Ant. 7.13.1-3", "Wars Preface 4", or an id ----

// Same shape as a scripture Passage (lib/scriptures), so citation chips and popups can
// show either; `verses` are the sections.
export type DsResolved = {
  id: string;
  endId?: string;
  reference: string;
  href: string;
  verses: { verse: number; text: string }[];
};

const MAX_RANGE_SECTIONS = 6;
const REF_RE = /^(.+?)\s*(?:(\d{1,2})\.(\d{1,3})\.(\d{1,3})|pref(?:ace)?\.?\s*(\d{1,3}))(?:\s*[-–]\s*(\d{1,3}))?$/i;
const ID_RE = /^([a-z][a-z0-9-]{1,19})\.(\d{1,2}|pref)\.(\d{1,3})(?:\.(\d{1,3}))?$/;

export async function resolveDsReference(input: string): Promise<DsResolved | undefined> {
  const text = input.trim().replace(/\s+/g, " ").slice(0, 80);
  const { sources } = await getDsIndex();
  let source: DsSource | undefined, book: string, chapter: number, from: number, to: number;

  const id = ID_RE.exec(text);
  if (id) {
    source = sources.find((s) => s.slug === id[1]);
    if (id[2] === "pref") [book, chapter, from] = ["pref", 0, Number(id[3])];
    else if (id[4]) [book, chapter, from] = [id[2], Number(id[3]), Number(id[4])];
    else return undefined;
    to = from;
  } else {
    const m = REF_RE.exec(text);
    if (!m) return undefined;
    const name = m[1].toLowerCase().replace(/^josephus,?\s+/, "").trim();
    source = sources.find((s) => s.aliases.includes(name) || s.title.toLowerCase() === name);
    if (m[5]) [book, chapter, from] = ["pref", 0, Number(m[5])];
    else [book, chapter, from] = [String(Number(m[2])), Number(m[3]), Number(m[4])];
    to = m[6] ? Number(m[6]) : from;
  }
  if (!source || to < from || to - from >= MAX_RANGE_SECTIONS) return undefined;

  const all = await passagesOf(source.slug);
  const picked = all.filter((p) => p.book === book && p.chapter === chapter && p.section >= from && p.section <= to);
  if (picked.length !== to - from + 1) return undefined; // any missing section = not a real reference

  const first = picked[0], last = picked.at(-1)!;
  return {
    id: first.id,
    ...(picked.length > 1 ? { endId: last.id } : {}),
    reference: picked.length > 1 ? `${first.reference}–${last.section}` : first.reference,
    href: dsChapterHref(source.slug, book, chapter, from),
    verses: picked.map((p) => ({ verse: p.section, text: p.text })),
  };
}

// ---- Search (the Deep Study chat's retrieval, and the /deep-study search box) ----

export type DsHit = {
  id: string;
  source: string;
  reference: string;
  text: string;
  highlighted: string;
  href: string;
  matched: "all" | "some";
};

type Row = { id: string; source: string; book: string; chapter: number; section: number; reference: string; text: string; highlighted: string };

const ALL_WORDS = "websearch_to_tsquery('english', $1::text)";
const ANY_WORD = "replace(websearch_to_tsquery('english', $1::text)::text, ' & ', ' | ')::tsquery";

// Josephus's sections run to a few thousand characters, so the headline is a set of
// short fragments around the matches rather than the whole passage.
const sql = (tsquery: string) => `
  SELECT p.id, p.source, p.book, p.chapter, p.section, p.reference, p.text,
         ts_headline('english', p.text, q,
           'StartSel="${MARK_START}", StopSel="${MARK_END}", MaxFragments=3, MaxWords=30, MinWords=12, FragmentDelimiter=" … "') AS highlighted
  FROM ds_passages p, (SELECT ${tsquery} AS q) AS query
  WHERE p.tsv @@ q AND ($2::text IS NULL OR p.source = $2::text)
  ORDER BY ts_rank_cd(p.tsv, q, 1) DESC, p.source, p.sort_order
  LIMIT $3`;

const toHit = (r: Row, matched: DsHit["matched"]): DsHit => ({
  id: r.id,
  source: r.source,
  reference: r.reference,
  text: r.text,
  highlighted: r.highlighted,
  href: dsChapterHref(r.source, r.book, r.chapter, r.section),
  matched,
});

// Same behavior as the scripture search: passages with every word first, topped up
// with passages that have some of them; supports "phrases", or, and -exclude.
export async function searchDeepStudy(q: string, opts: { source?: string; limit?: number } = {}) {
  const query = q.trim().slice(0, 200);
  if (!query) return [];
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const source = opts.source && (await getDsSource(opts.source)) ? opts.source : null;
  const params = [query, source, limit];

  const all = (await pool.query<Row>(sql(ALL_WORDS), params)).rows;
  const hits = all.map((r) => toHit(r, "all"));
  const excludes = /(^|\s)-\S/.test(query);
  if (all.length < Math.min(5, limit) && !excludes) {
    const seen = new Set(all.map((r) => r.id));
    const some = (await pool.query<Row>(sql(ANY_WORD), params)).rows.filter((r) => !seen.has(r.id));
    hits.push(...some.slice(0, limit - hits.length).map((r) => toHit(r, "some")));
  }
  return hits;
}
