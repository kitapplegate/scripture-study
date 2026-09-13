// Server-side citation checking: finds every scripture reference in a piece of text,
// bracketed or not, and resolves each against the real scripture data.
import { CITATION_RE, extractCitations, sanitizeCitations } from "./citations";
import { findReferences } from "./references";
import { getReferencePattern, resolveReference } from "./scriptures";

export type CitationResult =
  | { ref: string; found: true; reference: string; href: string; verses: { verse: number; text: string }[] }
  | { ref: string; found: false };

const MAX_CITATIONS = 60;

// Plain-text references, ignoring ones already inside [[brackets]].
export async function findPlainReferences(text: string) {
  const blanked = text.replace(CITATION_RE, (m) => " ".repeat(m.length));
  return findReferences(blanked, await getReferencePattern());
}

export async function checkCitations(text: string): Promise<CitationResult[]> {
  const refs = [...new Set([...extractCitations(text), ...(await findPlainReferences(text))])].slice(0, MAX_CITATIONS);
  return Promise.all(
    refs.map(async (ref) => {
      const p = await resolveReference(ref);
      return p ? { ref, found: true as const, reference: p.reference, href: p.href, verses: p.verses } : { ref, found: false as const };
    }),
  );
}

// Before saving a talk: every real reference becomes canonical [[Ref]], and every
// reference that doesn't exist (bracketed or plain) is removed with a visible note.
export async function normalizeCitations(text: string) {
  return sanitizeCitations(text, resolveReference, await findPlainReferences(text));
}
