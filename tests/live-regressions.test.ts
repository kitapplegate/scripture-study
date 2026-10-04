// Bugs found in live assistant tests, 2026-09-13.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, test } from "node:test";
import { asSchema } from "ai";
import { assistantTools } from "../lib/assistant-tools";
import { citationsToLinks } from "../lib/citations";
import { checkCitations } from "../lib/citations-server";
import { buildBookLookup, buildReferencePattern, findReferences, parseReference } from "../lib/references";

const index = JSON.parse(fs.readFileSync("data/scriptures/index.json", "utf8"));
const lookup = buildBookLookup(index);
const pattern = buildReferencePattern(index);

describe("dash variants in references", () => {
  // A model wrote "Romans 5:3‑4" with U+2011 (non-breaking hyphen), and a real verse was flagged as fake.
  const dashes = { "hyphen": "-", "non-breaking hyphen": "‑", "figure dash": "‒", "en dash": "–", "em dash": "—", "minus": "−" };
  for (const [name, d] of Object.entries(dashes)) {
    test(`parses a range written with a ${name}`, () => {
      assert.deepEqual(parseReference(`Romans 5:3${d}4`, lookup), { book: "rom", chapter: 5, verse: 3, endVerse: 4 });
    });
  }

  test("plain-text detection keeps the whole range with a non-breaking hyphen", () => {
    assert.deepEqual(findReferences("see **Romans 5:3‑4** today", pattern), ["Romans 5:3‑4"]);
  });

  test("book names written with a non-breaking hyphen still match", () => {
    assert.deepEqual(parseReference("Joseph Smith‑History 1:17", lookup), { book: "js-h", chapter: 1, verse: 17 });
  });

  test("the citation from the live answer now checks out as real", async () => {
    const [result] = await checkCitations("**[[Romans 5:3‑4]]**");
    assert.equal(result.found, true);
  });
});

describe("search tool", () => {
  // Gemini searched for ["\"John 14:16\"", ...] as words, got 0 results, and wasted a step.
  test("a query that is really a reference returns that passage", async () => {
    const run = assistantTools.searchScriptures.execute as unknown as (
      input: { queries: string[] },
      options: unknown,
    ) => Promise<{ results: { reference: string; snippet: string }[] }>;
    const { results } = await run({ queries: ['"John 14:16"', "John 15:26"] }, { toolCallId: "t", messages: [] });
    assert.deepEqual(results.map((r) => r.reference), ["John 14:16", "John 15:26"]);
    assert.match(results[0].snippet, /Comforter/);
  });
});

describe("tool schemas accept what models actually send", () => {
  // gpt-oss on Groq sent {"volume": null}; Groq rejected the call because the schema said string.
  test("searchScriptures accepts a null volume", async () => {
    const schema = asSchema(assistantTools.searchScriptures.inputSchema);
    const result = await schema.validate?.({ queries: ["prayer"], volume: null });
    assert.equal(result?.success, true);
    const json = JSON.stringify(schema.jsonSchema);
    assert.match(json, /"null"/, "the JSON schema sent to providers must allow null");
  });
});

// 2026-10-03, Deep Study chat: Gemini wrote wiki-style [[2 Samuel 24:3|("why doth my lord…")]],
// and real references were struck out as fake.
describe("wiki-style piped citations", () => {
  const answer = 'Joab objected [[2 Samuel 24:3|("why doth my lord the king delight in this thing?")]] but [[1 Chronicles 21:5|1,100,000 men]].';

  test("the reference before the pipe is what gets checked", async () => {
    const results = await checkCitations(answer);
    assert.deepEqual(results.map((r) => [r.ref, r.found]), [["2 Samuel 24:3", true], ["1 Chronicles 21:5", true]]);
  });

  test("the quoted phrase stays as text beside the citation chip", () => {
    assert.equal(
      citationsToLinks("x [[Alma 32:21|a quoted phrase]] y"),
      "x a quoted phrase ([Alma 32:21](cite:Alma%2032%3A21)) y",
    );
  });
});
