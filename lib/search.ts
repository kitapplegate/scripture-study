// Full-text scripture search over the `verses` table (Postgres, English stemming).
// Shared by the Search page and the study assistant's search tool.
// Relative imports only, so tests can load this outside Next.js.
import { pool } from "./db";
import { chapterHref } from "./scriptures";

export const VOLUME_FILTERS = [
  { slug: "ot", label: "Old Testament" },
  { slug: "nt", label: "New Testament" },
  { slug: "bofm", label: "Book of Mormon" },
  { slug: "dc-testament", label: "Doctrine and Covenants" },
  { slug: "pgp", label: "Pearl of Great Price" },
] as const;

export const isVolumeSlug = (s: string | undefined | null): s is string =>
  !!s && VOLUME_FILTERS.some((v) => v.slug === s);

export type SearchHit = {
  id: string;
  reference: string;
  text: string;
  highlighted: string; // text with matches wrapped in MARK_START / MARK_END
  href: string;
  volume: string;
  matched: "all" | "some"; // had every search word, or only some
};

// Private-use characters as highlight markers: they can't occur in scripture text,
// so the page can split on them and render <mark> without ever injecting HTML.
export const MARK_START = "";
export const MARK_END = "";

type Row = {
  id: string;
  volume: string;
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
  highlighted: string;
};

const ALL_WORDS = "websearch_to_tsquery('english', $1::text)";
const ANY_WORD = "replace(websearch_to_tsquery('english', $1::text)::text, ' & ', ' | ')::tsquery";

const sql = (tsquery: string) => `
  SELECT v.id, v.volume, v.book, v.chapter, v.verse, v.reference, v.text,
         ts_headline('english', v.text, q, 'StartSel="${MARK_START}", StopSel="${MARK_END}", HighlightAll=true') AS highlighted
  FROM verses v, (SELECT ${tsquery} AS q) AS query
  WHERE v.tsv @@ q AND ($2::text IS NULL OR v.volume = $2::text)
  ORDER BY ts_rank_cd(v.tsv, q) DESC, v.sort_order
  LIMIT $3`;

const toHit = (r: Row, matched: SearchHit["matched"]): SearchHit => ({
  id: r.id,
  reference: r.reference,
  text: r.text,
  highlighted: r.highlighted,
  href: chapterHref(r.volume, r.book, r.chapter, r.verse),
  volume: r.volume,
  matched,
});

// Verses with all the words first. If that finds fewer than 5, top up with verses that
// have some of them, so "faith hope charity" still finds verses naming only two.
// Supports websearch syntax: "exact phrase", or, -exclude.
export async function searchScriptures(q: string, opts: { volume?: string; limit?: number } = {}) {
  const query = q.trim().slice(0, 200);
  if (!query) return [];
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const params = [query, isVolumeSlug(opts.volume) ? opts.volume : null, limit];

  const all = (await pool.query<Row>(sql(ALL_WORDS), params)).rows;
  const hits = all.map((r) => toHit(r, "all"));

  const excludes = /(^|\s)-\S/.test(query); // OR-ing an exclusion would match almost everything
  if (all.length < Math.min(5, limit) && !excludes) {
    const seen = new Set(all.map((r) => r.id));
    const some = (await pool.query<Row>(sql(ANY_WORD), params)).rows.filter((r) => !seen.has(r.id));
    hits.push(...some.slice(0, limit - hits.length).map((r) => toHit(r, "some")));
  }
  return hits;
}
