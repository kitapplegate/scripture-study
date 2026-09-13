// The study assistant's tools. Both only read scripture text, never member data, so
// nothing a family member posts can end up in (or inject instructions into) a chat.
//
// Token budget matters: free tiers are limited by tokens per minute and per day, and
// every tool result is re-sent to the model on each later step. So both tools take
// several inputs in one call (fewer steps), and search returns short snippets.
import { tool } from "ai";
import { z } from "zod";
import { resolveReference } from "./scriptures";
import { searchScriptures } from "./search";

const PER_QUERY = 6;
const MAX_RESULTS = 24;
const SNIPPET_CHARS = 200;
const MAX_READ_VERSES = 20;

export function snippet(text: string) {
  if (text.length <= SNIPPET_CHARS) return text;
  const cut = text.lastIndexOf(" ", SNIPPET_CHARS);
  return `${text.slice(0, cut > 0 ? cut : SNIPPET_CHARS)} …`;
}

// Interleaves results by rank so every query contributes its best hits, without repeats.
export function mergeResults<T extends { id: string }>(perQuery: T[][], max = MAX_RESULTS) {
  const seen = new Set<string>();
  const merged: T[] = [];
  const depth = Math.max(0, ...perQuery.map((hits) => hits.length));
  for (let rank = 0; rank < depth && merged.length < max; rank++) {
    for (const hits of perQuery) {
      const hit = hits[rank];
      if (hit && !seen.has(hit.id) && merged.length < max) {
        seen.add(hit.id);
        merged.push(hit);
      }
    }
  }
  return merged;
}

export async function readOnePassage(reference: string) {
  const passage = await resolveReference(reference);
  if (!passage) {
    return { reference, found: false as const, note: "No such passage. Check the book, chapter, and verses; ranges stay within one chapter." };
  }
  return {
    reference: passage.reference,
    found: true as const,
    verses: passage.verses.slice(0, MAX_READ_VERSES),
    ...(passage.verses.length > MAX_READ_VERSES ? { note: `Showing the first ${MAX_READ_VERSES} verses.` } : {}),
  };
}

export const assistantTools = {
  searchScriptures: tool({
    description:
      "Keyword search across the Old Testament, New Testament, Book of Mormon, Doctrine and Covenants, and Pearl of Great Price (KJV and LDS edition wording). Matches words, not meaning. Pass several different queries in ONE call (synonyms, and the words a verse would actually use) rather than calling this tool repeatedly. Put a multi-word exact phrase in double quotes; don't quote single words. Returns short snippets; use readPassages for full text.",
    inputSchema: z.object({
      queries: z
        .array(z.string().min(1).max(100))
        .min(1)
        .max(6)
        .describe('1 to 6 different searches, e.g. ["patience affliction", "long-suffering", "\\"endure to the end\\""]'),
      // nullable as well as optional: some models send null for "no filter", and providers that
      // validate tool calls strictly (Groq) reject null for a plain optional string.
      volume: z
        .enum(["ot", "nt", "bofm", "dc-testament", "pgp"])
        .nullable()
        .optional()
        .describe("Limit to one volume; leave empty to search all five"),
    }),
    execute: async ({ queries, volume }) => {
      const perQuery = await Promise.all(
        queries.map(async (q): Promise<{ id: string; reference: string; text: string }[]> => {
          // Models sometimes "search" for a reference ("John 14:16"), which matches no words
          // and wastes a step. Return that passage instead.
          const passage = await resolveReference(q.replace(/["“”]/g, "").trim());
          if (passage) {
            return [{ id: passage.id, reference: passage.reference, text: passage.verses.map((v) => v.text).join(" ") }];
          }
          return searchScriptures(q, { volume: volume ?? undefined, limit: PER_QUERY });
        }),
      );
      return { results: mergeResults(perQuery).map((h) => ({ reference: h.reference, snippet: snippet(h.text) })) };
    },
  }),

  readPassages: tool({
    description:
      "Read the full text of the passages you plan to cite, all in ONE call, to check their context. Up to 6 references, e.g. [\"Mosiah 18:8-10\", \"Alma 32:21\"]. Each stays within one chapter, up to 20 verses.",
    inputSchema: z.object({ references: z.array(z.string().min(3).max(80)).min(1).max(6) }),
    execute: async ({ references }) => ({ passages: await Promise.all(references.map(readOnePassage)) }),
  }),
};
