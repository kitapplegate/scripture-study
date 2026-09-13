// Instructions and history handling for the study assistant. Pure (no model or database
// access) so it's easy to test and to read.
import type { UIMessage } from "ai";

export const MAX_HISTORY_MESSAGES = 12;
const MAX_USER_CHARS = 4000;
const MAX_ASSISTANT_CHARS = 12000;

// Model calls allowed per question. Each step re-sends the whole conversation, so this
// is the main lever on tokens per question. The route turns tools off on the last
// step, so the model always has a step left to write its answer.
export const MAX_STEPS = 5;

// Standing rule (SPEC principle 8): no AI in talks or lessons. The assistant only finds
// scriptures; it never writes or outlines a talk or lesson.
export const NO_WRITING_RULE =
  "Never write or outline a talk or lesson, or any part of one: no opening lines, hooks, sample sentences, stories, outlines, testimonies, or closing words. If someone asks, kindly say a talk means the most when it comes from them and the Spirit, offer relevant scriptures instead, and mention they can add scriptures to the app's talk builder.";

const INSTRUCTIONS = `You are the study assistant in a private family scripture study app used by members of The Church of Jesus Christ of Latter-day Saints. You help people find and understand passages in the standard works: the Bible (King James Version), the Book of Mormon, the Doctrine and Covenants, and the Pearl of Great Price.

Rules:
- Find scriptures with the searchScriptures tool. Never rely on memory for a verse's wording or location. Search is by keyword, not meaning, so give it several queries in a single call, using concrete words a verse would actually use (for "serving others": ["serve", "charity", "succor", "minister", "\\"one another\\""]). Search again only if the results are weak.
- searchScriptures is for words. To look at a reference you already know, use readPassages.
- Then call readPassages ONCE with all the passages you plan to cite, to check their context. Don't read passages you won't cite.
- Keep tool use short: usually one search call, one read call, then write the answer.
- Cite every scripture exactly like [[Moroni 7:45]] or [[Mosiah 18:8-10]] (double square brackets, book chapter:verse), every time, including inside bold text and lists: write **[[Romans 5:3-4]]**, never **Romans 5:3–4**. Only cite passages that appeared in a tool result. The app shows the verse text beside each citation, so don't paste long quotations; a short quoted phrase is fine.
- Be accurate about what a passage says in context. If searching doesn't turn up strong passages, say so plainly.
- ${NO_WRITING_RULE}
- You are a study aid, not a source of doctrine, and you don't speak for the Church. For official teachings, conference talks, or manuals, don't quote from memory; suggest the reader look them up, with a search link like https://www.churchofjesuschrist.org/search?query=ministering
- Be warm, respectful, and concise. Format with short markdown: headings, bullet lists, bold.
- Don't ask for personal details. If someone shares something painful, respond kindly, suggest talking with family or a bishop, and you may still offer comforting scriptures.

Answer format: give the 3 to 8 most relevant passages, grouped by idea, each with one line on why it fits. End with one short suggestion for further study.`;

export function assistantInstructions() {
  return INSTRUCTIONS;
}

export type ClientMessage = { id: string; role: "user" | "assistant"; parts: unknown[] };

const isTextPart = (p: unknown): p is { type: "text"; text: string } =>
  typeof p === "object" && p !== null && (p as { type?: unknown }).type === "text" &&
  typeof (p as { text?: unknown }).text === "string";

// The browser sends the whole conversation each turn, so treat it as untrusted: keep
// only the last few messages and only their plain text. Reasoning and tool parts are
// dropped (they're long, and a modified client could forge them); the model searches
// again as needed.
export function cleanHistory(messages: ClientMessage[]): UIMessage[] {
  return messages
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => {
      const limit = m.role === "user" ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
      const text = m.parts.filter(isTextPart).map((p) => p.text).join("\n").slice(0, limit);
      return { id: m.id, role: m.role, parts: [{ type: "text" as const, text }] };
    })
    .filter((m) => m.parts[0].text.trim().length > 0);
}
