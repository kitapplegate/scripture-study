// Server-side citation checking: finds every scripture reference in a piece of text,
// bracketed or not, and resolves each against the real scripture data.
import { CITATION_RE, extractCitations, sanitizeCitations } from "./citations";
import { findReferences } from "./references";
import { getReferencePattern, resolveReference, type Passage } from "./scriptures";

export type CitationResult =
  | {
      ref: string;
      found: true;
      id: string; // first verse id, e.g. for "Add to talk"
      endId?: string;
      reference: string;
      href: string;
      verses: { verse: number; text: string }[];
    }
  | { ref: string; found: false };

const MAX_CITATIONS = 60;

export function toCitationResult(ref: string, p: Passage | undefined): CitationResult {
  if (!p) return { ref, found: false };
  return { ref, found: true, id: p.id, ...(p.endId ? { endId: p.endId } : {}), reference: p.reference, href: p.href, verses: p.verses };
}

// Plain-text references, ignoring ones already inside [[brackets]].
export async function findPlainReferences(text: string) {
  const blanked = text.replace(CITATION_RE, (m) => " ".repeat(m.length));
  return findReferences(blanked, await getReferencePattern());
}

export async function checkCitations(text: string): Promise<CitationResult[]> {
  const refs = [...new Set([...extractCitations(text), ...(await findPlainReferences(text))])].slice(0, MAX_CITATIONS);
  return Promise.all(refs.map(async (ref) => toCitationResult(ref, await resolveReference(ref))));
}

// Every real reference becomes canonical [[Ref]], and every reference that doesn't exist
// (bracketed or plain) is removed with a visible note.
export async function normalizeCitations(text: string) {
  return sanitizeCitations(text, resolveReference, await findPlainReferences(text));
}
