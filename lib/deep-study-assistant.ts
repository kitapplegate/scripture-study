// The Deep Study chat (SPEC D12): its own assistant, separate from the study assistant.
// It searches the standard works AND the Deep Study texts, and sets the accounts side by
// side. The study assistant (lib/assistant-tools, lib/assistant-prompt) never sees
// Deep Study texts; this file reuses its scripture tools, not the other way round.
// Every tool reads public text only, never member data.
import { tool } from "ai";
import { z } from "zod";
import { NO_WRITING_RULE } from "./assistant-prompt";
import { assistantTools, mergeResults } from "./assistant-tools";
import { extractCitations } from "./citations";
import { checkCitations, type CitationResult } from "./citations-server";
import { getDsIndex, resolveDsReference, searchDeepStudy } from "./deep-study";
import { MARK_END, MARK_START } from "./search";

const PER_QUERY = 5;
const MAX_RESULTS = 15;
const SNIPPET_CHARS = 320;
// Josephus's sections are long; every tool result is re-sent on later steps, so reads are capped.
const MAX_READ_CHARS = 2500;

// The search headline is the matched fragments, which says more than the opening words.
export function dsSnippet(highlighted: string) {
  const plain = highlighted.replaceAll(MARK_START, "").replaceAll(MARK_END, "").replace(/\s+/g, " ").trim();
  if (plain.length <= SNIPPET_CHARS) return plain;
  const cut = plain.lastIndexOf(" ", SNIPPET_CHARS);
  return `${plain.slice(0, cut > 0 ? cut : SNIPPET_CHARS)} …`;
}

export async function readOneDsPassage(reference: string) {
  const p = await resolveDsReference(reference);
  if (!p) {
    return { reference, found: false as const, note: 'No such passage. Use the form "Antiquities 7.13.1" (book.chapter.section), up to 6 sections in one chapter.' };
  }
  // Whole sections until the budget runs out; the section that crosses it is cut short.
  let budget = MAX_READ_CHARS;
  const sections: { section: number; text: string }[] = [];
  for (const s of p.verses) {
    if (budget <= 0) break;
    sections.push({ section: s.verse, text: s.text.length > budget ? `${s.text.slice(0, budget)} …[cut]` : s.text });
    budget -= s.text.length;
  }
  return { reference: p.reference, found: true as const, sections };
}

async function sourceList() {
  const { sources } = await getDsIndex();
  return sources.map((s) => `${s.title} by ${s.author} (cite as "${s.short} book.chapter.section")`).join("; ");
}

export async function deepStudyInstructions() {
  return `You are the Deep Study assistant in a private family scripture study app used by members of The Church of Jesus Christ of Latter-day Saints. Deep Study sets the scriptures beside other ancient writings, so a reader can see the same events and people from different angles.

Two kinds of text, kept clearly apart:
- Scripture: the standard works (the Bible in the King James Version, the Book of Mormon, the Doctrine and Covenants, the Pearl of Great Price). Find it with searchScriptures and readPassages. Cite like [[2 Samuel 24:1]] or [[1 Chronicles 21:1-3]].
- Deep Study texts: ${await sourceList()}. These are NOT scripture. Find them with searchDeepStudy and readDeepStudy. Cite like [[Antiquities 7.13.1]] or [[Wars 6.4.5-6]].

Rules:
- Never rely on memory for any wording or location. Search is by keyword, not meaning: give several queries in one call, using words the text would actually use. Josephus often words things differently from the KJV ("numbered the people", "Joab", "pestilence"), so try names and concrete nouns.
- Usually: one searchScriptures call and one searchDeepStudy call (they can be in the same step), then one readPassages and one readDeepStudy call for what you'll cite, then answer.
- Cite every passage with double square brackets, every time, including inside bold text and lists. Only the reference goes inside the brackets: write "forgot the commands of Moses" [[Antiquities 7.13.1]], never [[Antiquities 7.13.1|forgot the commands of Moses]]. Only cite passages that appeared in a tool result. The app shows the text beside each citation, so quote only short phrases.
- Present accounts side by side. Point out what each one includes, leaves out, or tells differently, in neutral words. Don't harmonize them, rank them, or say which is right, and don't treat a Deep Study text as an authority on doctrine. Always make clear which passages are scripture and which aren't.
- If the Deep Study texts don't cover the event, say so plainly rather than stretching a passage to fit.
- You can give brief, well-known historical context (who Josephus was, when he wrote), but don't invent details.
- ${NO_WRITING_RULE}
- You are a study aid, not a source of doctrine, and you don't speak for the Church.
- Be warm, respectful, and concise. Format with short markdown: headings, bullet lists, bold.
- Don't ask for personal details.

Answer format: a heading per account ("In the scriptures", then one per Deep Study text), each with its citations and one or two lines on what it says. Then a short "Side by side" list of the notable similarities and differences. End with one suggestion for further reading.`;
}

export const deepStudyTools = {
  searchScriptures: assistantTools.searchScriptures,
  readPassages: assistantTools.readPassages,

  searchDeepStudy: tool({
    description:
      "Keyword search across the Deep Study texts (ancient writings that are NOT scripture, e.g. Josephus). Matches words, not meaning. Pass several queries in ONE call. Put a multi-word exact phrase in double quotes. Returns references and short matched fragments; use readDeepStudy for full text.",
    inputSchema: z.object({
      queries: z.array(z.string().min(1).max(100)).min(1).max(5).describe('1 to 5 different searches, e.g. ["David numbered the people", "Joab", "pestilence"]'),
    }),
    execute: async ({ queries }) => {
      const perQuery = await Promise.all(
        queries.map(async (q) => {
          const direct = await resolveDsReference(q.replace(/["“”]/g, ""));
          if (direct) return [{ id: direct.id, reference: direct.reference, highlighted: direct.verses[0].text }];
          return searchDeepStudy(q, { limit: PER_QUERY });
        }),
      );
      return { results: mergeResults(perQuery, MAX_RESULTS).map((h) => ({ reference: h.reference, snippet: dsSnippet(h.highlighted) })) };
    },
  }),

  readDeepStudy: tool({
    description:
      'Read the full text of Deep Study passages you plan to cite, all in ONE call. Up to 4 references like "Antiquities 7.13.1" or "Wars 6.4.5-6" (up to 6 sections within one chapter). Long passages are cut short.',
    inputSchema: z.object({ references: z.array(z.string().min(3).max(80)).min(1).max(4) }),
    execute: async ({ references }) => ({ passages: await Promise.all(references.map(readOneDsPassage)) }),
  }),
};

// Citation checking for Deep Study answers: scripture references are checked as usual;
// any bracketed reference that isn't scripture is tried as a Deep Study passage, and
// marked so the UI labels it "Not scripture" and never offers "Add to talk".
export async function checkDeepStudyCitations(text: string): Promise<CitationResult[]> {
  const scripture = await checkCitations(text);
  return Promise.all(
    scripture.map(async (c) => {
      if (c.found || !extractCitations(text).includes(c.ref)) return c;
      const ds = await resolveDsReference(c.ref);
      return ds ? { ref: c.ref, found: true as const, deepStudy: true as const, ...ds } : c;
    }),
  );
}
