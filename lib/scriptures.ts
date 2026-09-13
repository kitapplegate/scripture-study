// Server-side access to the generated scripture files in data/scriptures/.
// Slugs from the URL are always checked against index.json before any file is read.
import fs from "node:fs/promises";
import path from "node:path";

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
