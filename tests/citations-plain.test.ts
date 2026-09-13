// Models don't always write [[citations]]; plain references must be found and checked too.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, test } from "node:test";
import { citationsToLinks } from "../lib/citations";
import { checkCitations, normalizeCitations } from "../lib/citations-server";
import { buildReferencePattern, findReferences } from "../lib/references";

const pattern = buildReferencePattern(JSON.parse(fs.readFileSync("data/scriptures/index.json", "utf8")));
const find = (text: string) => findReferences(text, pattern);

describe("findReferences (plain text)", () => {
  test("finds bold, ranged, numbered, and dashed book names", () => {
    assert.deepEqual(
      find("See **Romans 5:3–4** and D&C 24:8, also 1 John 4:19 and Joseph Smith—History 1:17. Psalm 23:1 too."),
      ["Romans 5:3–4", "D&C 24:8", "1 John 4:19", "Joseph Smith—History 1:17", "Psalm 23:1"],
    );
  });

  test("ignores prose that isn't a verse reference", () => {
    assert.deepEqual(find("Meet at 3:16 pm. Read Alma 32 tonight. Almanac 3:4."), []);
    assert.deepEqual(find("Read Mosiah 24:10–15 (Alma's people)"), ["Mosiah 24:10–15"]);
  });
});

describe("citationsToLinks with plain references", () => {
  test("links bracketed and plain references in one pass", () => {
    assert.equal(
      citationsToLinks("**Romans 5:3–4** and [[Alma 32:21]]", ["Romans 5:3–4", "Alma 32:21"]),
      "**[Romans 5:3–4](cite:Romans%205%3A3%E2%80%934)** and [Alma 32:21](cite:Alma%2032%3A21)",
    );
  });

  test("a shorter reference doesn't match inside a longer verse number", () => {
    assert.equal(citationsToLinks("Alma 32:25 and Alma 32:2", ["Alma 32:2"]), "Alma 32:25 and [Alma 32:2](cite:Alma%2032%3A2)");
  });
});

describe("server-side checks", () => {
  const answer = "Faith grows: **Alma 32:21**. Made up: Romans 5:99. Explicit [[moroni 10:4-5]] and fake [[Hezekiah 3:16]].";

  test("checkCitations finds plain and bracketed references and flags fakes", async () => {
    const results = new Map((await checkCitations(answer)).map((r) => [r.ref, r.found]));
    assert.deepEqual(Object.fromEntries(results), {
      "moroni 10:4-5": true,
      "Hezekiah 3:16": false,
      "Alma 32:21": true,
      "Romans 5:99": false,
    });
  });

  test("normalizeCitations brackets real references and removes fakes, plain or bracketed", async () => {
    const { text, removed } = await normalizeCitations(answer);
    assert.equal(removed, 2);
    assert.equal(
      text,
      "Faith grows: **[[Alma 32:21]]**. Made up: (unverified reference removed: Romans 5:99). Explicit [[Moroni 10:4–5]] and fake (unverified reference removed: Hezekiah 3:16).",
    );
  });
});
