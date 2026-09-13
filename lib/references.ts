// Parses human scripture references ("1 Ne. 3:7", "D&C 76:22", "Moroni 10:4-5") into
// book slug + chapter + verse(s). Used by the New post box and to check the study
// assistant's citations. Pure: no file or database access, so it's easy to test.
import type { ScriptureIndex } from "./scriptures";

export type ParsedRef = { book: string; chapter: number; verse?: number; endVerse?: number };

type BookEntry = { slug: string; key: string; chapters: number };
export type BookLookup = { exact: Map<string, BookEntry>; names: BookEntry[] };

// Common abbreviations the book names and URL slugs don't already cover.
const EXTRA_ALIASES: Record<string, string[]> = {
  dc: ["doctrine and covenants", "doctrine & covenants", "d&c", "d c"],
  ps: ["psalm"],
  song: ["song of songs"],
  philip: ["phil", "philippians"],
  philem: ["phlm"],
  rev: ["revelations"],
  "js-h": ["jsh", "js—h", "joseph smith history"],
  "js-m": ["jsm", "js—m", "joseph smith matthew"],
  "a-of-f": ["aof", "articles of faith"],
  "w-of-m": ["wom", "words of mormon"],
};

// Hyphen, non-breaking hyphen, figure dash, en/em dash, horizontal bar, minus sign:
// models write "3–4" with all of them. (A non-breaking hyphen once made a real verse
// look fake.)
const DASH_CLASS = "[-\\u2010-\\u2015\\u2212]";
const DASHES_RE = /[‐-―−-]/g;

export function normalizeBookName(raw: string) {
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(DASHES_RE, " ")
    .replace(/[_.]/g, " ")
    .replace(/^(\d)\s*([a-z])/, "$1 $2") // "1ne" -> "1 ne"
    .replace(/\s+/g, " ")
    .trim();
}

export function buildBookLookup(index: ScriptureIndex): BookLookup {
  const exact = new Map<string, BookEntry>();
  const names: BookEntry[] = [];
  for (const volume of index.volumes) {
    for (const book of volume.books) {
      const entry = { slug: book.slug, key: normalizeBookName(book.name), chapters: book.chapters };
      names.push(entry);
      for (const alias of [book.name, book.slug, ...(EXTRA_ALIASES[book.slug] ?? [])]) {
        exact.set(normalizeBookName(alias), entry);
      }
    }
  }
  return { exact, names };
}

function findBook(lookup: BookLookup, raw: string) {
  const key = normalizeBookName(raw);
  const hit = lookup.exact.get(key);
  if (hit) return hit;
  // Otherwise accept an unambiguous start of a book name: "gen", "mosi", "1 nep".
  if (key.length < 3) return undefined;
  const matches = lookup.names.filter((b) => b.key.startsWith(key));
  return matches.length === 1 ? matches[0] : undefined;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Matches references written as plain text ("**Romans 5:3–4**", "see D&C 24:8"), for
// models that don't use [[brackets]]. Only real book names count, and a verse is
// required, so ordinary prose ("at 3:16 pm") doesn't match.
export function buildReferencePattern(index: ScriptureIndex) {
  const names = new Set<string>();
  for (const volume of index.volumes) {
    for (const book of volume.books) {
      names.add(book.name);
      for (const alias of EXTRA_ALIASES[book.slug] ?? []) if (alias.length >= 3 && alias !== "d c") names.add(alias);
    }
  }
  const alternatives = [...names]
    .sort((a, b) => b.length - a.length) // "1 John" before "John"
    .map((n) => escapeRegExp(n).replace(DASHES_RE, DASH_CLASS).replace(/\s+/g, "\\s+"));
  return new RegExp(
    `(?<![\\p{L}\\d])(?:${alternatives.join("|")})\\.?\\s+\\d{1,3}:\\d{1,3}(?:\\s*${DASH_CLASS}\\s*\\d{1,3})?(?![\\d:])`,
    "giu",
  );
}

export function findReferences(text: string, pattern: RegExp) {
  return [...new Set([...text.matchAll(pattern)].map((m) => m[0].trim()))];
}

const REF_RE = new RegExp(
  `^\\s*(.*?[a-z&].*?)\\s*(\\d{1,3})(?:\\s*[:.]\\s*(\\d{1,3})(?:\\s*${DASH_CLASS}\\s*(\\d{1,3}))?)?\\s*$`,
  "i",
);

export function parseReference(input: string, lookup: BookLookup): ParsedRef | null {
  if (input.length > 80) return null;
  const m = REF_RE.exec(input);
  if (!m) return null;
  const book = findBook(lookup, m[1]);
  if (!book) return null;

  const chapter = Number(m[2]);
  if (chapter < 1 || chapter > book.chapters) return null;
  const ref: ParsedRef = { book: book.slug, chapter };
  if (m[3] === undefined) return ref;

  const verse = Number(m[3]);
  if (verse < 1) return null;
  ref.verse = verse;
  if (m[4] !== undefined) {
    const endVerse = Number(m[4]);
    if (endVerse < verse) return null;
    if (endVerse > verse) ref.endVerse = endVerse;
  }
  return ref;
}
