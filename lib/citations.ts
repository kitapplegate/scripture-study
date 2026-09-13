// Citations in assistant answers and talk drafts: explicit [[Moroni 7:45]], plus plain
// references a model wrote without brackets (found server-side by lib/citations-server).
// These helpers are pure so they're easy to test.

export const CITATION_RE = /\[\[([^[\]\n]{2,80})\]\]/g;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function extractCitations(text: string) {
  const refs: string[] = [];
  for (const m of text.matchAll(CITATION_RE)) {
    const ref = m[1].trim();
    if (!refs.includes(ref)) refs.push(ref);
  }
  return refs;
}

// One left-to-right pass over explicit [[refs]] and the given plain-text refs, so a
// reference inside [[brackets]] is never processed twice.
export function replaceCitations(text: string, plainRefs: string[], replace: (ref: string, explicit: boolean) => string) {
  const plain = [...new Set(plainRefs)].filter(Boolean).sort((a, b) => b.length - a.length).map(escapeRegExp);
  const source = `\\[\\[([^[\\]\\n]{2,80})\\]\\]${plain.length ? `|(${plain.join("|")})(?!\\d)` : ""}`;
  return text.replace(new RegExp(source, "g"), (_, explicit: string | undefined, bare: string | undefined) =>
    explicit !== undefined ? replace(explicit.trim(), true) : replace(bare!, false),
  );
}

// -> [Alma 32:21](cite:Alma%2032%3A21), for the markdown renderer.
export function citationsToLinks(text: string, plainRefs: string[] = []) {
  return replaceCitations(text, plainRefs, (ref) => `[${ref}](cite:${encodeURIComponent(ref)})`);
}

// [[Alma 32:21]] -> **Alma 32:21**, for plain rendering (print view).
export function citationsToBold(text: string) {
  return text.replace(CITATION_RE, (_, ref: string) => `**${ref.trim()}**`);
}

type Resolver = (ref: string) => Promise<{ reference: string } | undefined>;

// Canonicalizes explicit [[references]] ("moroni 10:4-5" -> "Moroni 10:4–5") and replaces
// ones that don't exist. lib/citations-server's normalizeCitations also handles plain refs.
export async function sanitizeCitations(text: string, resolve: Resolver, plainRefs: string[] = []) {
  const refs = [...new Set([...extractCitations(text), ...plainRefs])];
  const resolved = new Map(await Promise.all(refs.map(async (r) => [r, await resolve(r)] as const)));
  let removed = 0;
  const cleaned = replaceCitations(text, plainRefs, (ref) => {
    const hit = resolved.get(ref);
    if (hit) return `[[${hit.reference}]]`;
    removed++;
    return `(unverified reference removed: ${ref})`;
  });
  return { text: cleaned, removed };
}

export function titleFromMarkdown(markdown: string, fallback = "Untitled talk") {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1];
  const title = heading?.replace(CITATION_RE, "$1").replace(/[*_`]/g, "").trim();
  return (title || fallback).slice(0, 200);
}
