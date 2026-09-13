// Server-side access to the generated scripture files in data/scriptures/.
// Slugs from the URL are always checked against index.json before any file is read.
import fs from "node:fs/promises";
import path from "node:path";
import { buildBookLookup, buildReferencePattern, parseReference, type BookLookup } from "./references";

// turbopackIgnore: these files are read at runtime, not bundled.
const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data", "scriptures");

export type CrossRef = { to: string; toEnd?: string; votes: number };

export type Verse = {
  id: string; // "1-ne.3.7" — the stable key for notes, highlights, and shares
  verse: number;
  text: string;
  pilcrow?: boolean;
  heading?: string;
  subheading?: string;
  xrefs?: CrossRef[];
};

export type Chapter = {
  volume: string;
  volumeTitle: string;
  book: string;
  bookName: string;
  chapterLabel: string;
  chapter: number;
  reference: string;
  churchUrl: string;
  verses: Verse[];
  bookHeading?: string;
  heading?: string;
  note?: string;
  signature?: string;
  bookNote?: string;
};

export type Facsimile = { number: number; title: string; explanations: string[]; note?: string };

export type Book = {
  slug: string;
  name: string;
  fullTitle: string;
  fullSubtitle?: string;
  chapterLabel: string;
  chapters: number;
  facsimiles?: Facsimile[];
};

export type Volume = { slug: string; title: string; subtitle?: string; verses: number; books: Book[] };

export type ScriptureIndex = { volumes: Volume[]; bookNames: Record<string, string> };

export type RefLink = { label: string; href: string };

let indexCache: Promise<ScriptureIndex> | undefined;

export function getIndex(): Promise<ScriptureIndex> {
  indexCache ??= fs
    .readFile(path.join(DATA_DIR, "index.json"), "utf8")
    .then((text) => JSON.parse(text) as ScriptureIndex)
    .catch((err) => {
      indexCache = undefined;
      throw err;
    });
  return indexCache;
}

export async function getVolume(volumeSlug: string) {
  return (await getIndex()).volumes.find((v) => v.slug === volumeSlug);
}

export async function getBook(volumeSlug: string, bookSlug: string) {
  const volume = await getVolume(volumeSlug);
  const book = volume?.books.find((b) => b.slug === bookSlug);
  return volume && book ? { volume, book } : undefined;
}

export async function getChapter(volumeSlug: string, bookSlug: string, chapterParam: string) {
  const found = await getBook(volumeSlug, bookSlug);
  if (!found || !/^\d+$/.test(chapterParam)) return undefined;
  const n = Number(chapterParam);
  if (n < 1 || n > found.book.chapters) return undefined;
  const file = path.join(DATA_DIR, found.volume.slug, found.book.slug, `${n}.json`);
  return JSON.parse(await fs.readFile(file, "utf8")) as Chapter;
}

export function chapterHref(volume: string, book: string, chapter: number, verse?: number) {
  return `/scriptures/${volume}/${book}/${chapter}${verse ? `#v${verse}` : ""}`;
}

function locateBook(index: ScriptureIndex, bookSlug: string) {
  for (const volume of index.volumes) {
    const book = volume.books.find((b) => b.slug === bookSlug);
    if (book) return { volume, book };
  }
  return undefined;
}

export function crossRefLink(index: ScriptureIndex, ref: CrossRef): RefLink | undefined {
  const [bookSlug, ch, vs] = ref.to.split(".");
  const loc = locateBook(index, bookSlug);
  if (!loc) return undefined;
  let label = `${loc.book.name} ${ch}:${vs}`;
  if (ref.toEnd) {
    const [endBook, endCh, endVs] = ref.toEnd.split(".");
    if (endBook !== bookSlug) label += ` – ${index.bookNames[endBook]} ${endCh}:${endVs}`;
    else if (endCh !== ch) label += `–${endCh}:${endVs}`;
    else label += `–${endVs}`;
  }
  return { label, href: chapterHref(loc.volume.slug, bookSlug, Number(ch), Number(vs)) };
}

export type VerseRef = { id: string; text: string; reference: string; href: string };

export type Passage = {
  id: string; // first verse id
  endId?: string; // last verse id, only for ranges
  reference: string; // "Moroni 10:4–5"
  href: string;
  verses: { verse: number; text: string }[];
};

export const MAX_PASSAGE_VERSES = 40;

export function parseVerseId(id: string) {
  const m = /^([a-z0-9-]{1,20})\.(\d{1,3})\.(\d{1,3})$/.exec(id);
  return m ? { book: m[1], chapter: Number(m[2]), verse: Number(m[3]) } : undefined;
}

// Resolves a verse id, or a same-chapter range of them, to text and a link.
// undefined if any verse doesn't exist or the range is invalid.
export async function getPassage(startId: string, endId?: string | null): Promise<Passage | undefined> {
  const start = parseVerseId(startId);
  if (!start) return undefined;
  const end = endId ? parseVerseId(endId) : undefined;
  if (endId) {
    if (!end || end.book !== start.book || end.chapter !== start.chapter) return undefined;
    if (end.verse <= start.verse || end.verse - start.verse >= MAX_PASSAGE_VERSES) return undefined;
  }

  const loc = locateBook(await getIndex(), start.book);
  if (!loc) return undefined;
  const chapter = await getChapter(loc.volume.slug, loc.book.slug, String(start.chapter));
  if (!chapter) return undefined;

  const last = end?.verse ?? start.verse;
  const verses = chapter.verses.filter((v) => v.verse >= start.verse && v.verse <= last);
  if (verses.length !== last - start.verse + 1) return undefined;

  return {
    id: startId,
    ...(end ? { endId: endId! } : {}),
    reference: `${chapter.reference}:${start.verse}${end ? `–${end.verse}` : ""}`,
    href: chapterHref(loc.volume.slug, loc.book.slug, chapter.chapter, start.verse),
    verses: verses.map((v) => ({ verse: v.verse, text: v.text })),
  };
}

export async function getVerse(id: string): Promise<VerseRef | undefined> {
  const p = await getPassage(id);
  return p && { id: p.id, text: p.verses[0].text, reference: p.reference, href: p.href };
}

let lookupCache: BookLookup | undefined;
let patternCache: RegExp | undefined;

export async function getBookLookup() {
  lookupCache ??= buildBookLookup(await getIndex());
  return lookupCache;
}

export async function getReferencePattern() {
  patternCache ??= buildReferencePattern(await getIndex());
  return patternCache;
}

// "Moroni 10:4-5" -> Passage. Needs at least a verse; a bare chapter isn't a passage.
export async function resolveReference(input: string) {
  const ref = parseReference(input, await getBookLookup());
  if (!ref?.verse) return undefined;
  const base = `${ref.book}.${ref.chapter}`;
  return getPassage(`${base}.${ref.verse}`, ref.endVerse ? `${base}.${ref.endVerse}` : null);
}

// Previous/next chapter, crossing book and volume boundaries (Malachi 4 -> Matthew 1).
export function adjacentChapters(index: ScriptureIndex, volumeSlug: string, bookSlug: string, chapter: number) {
  const flat = index.volumes.flatMap((volume) => volume.books.map((book) => ({ volume, book })));
  const i = flat.findIndex((x) => x.volume.slug === volumeSlug && x.book.slug === bookSlug);
  const link = (x: (typeof flat)[number], ch: number): RefLink => ({
    href: chapterHref(x.volume.slug, x.book.slug, ch),
    label: `${x.book.name} ${ch}`,
  });
  const cur = flat[i];
  const prev = chapter > 1 ? link(cur, chapter - 1) : i > 0 ? link(flat[i - 1], flat[i - 1].book.chapters) : undefined;
  const next =
    chapter < cur.book.chapters ? link(cur, chapter + 1) : i < flat.length - 1 ? link(flat[i + 1], 1) : undefined;
  return { prev, next };
}
