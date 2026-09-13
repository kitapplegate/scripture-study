import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, test } from "node:test";
import { buildBookLookup, parseReference, type ParsedRef } from "../lib/references";
import { getPassage, resolveReference } from "../lib/scriptures";

const index = JSON.parse(fs.readFileSync("data/scriptures/index.json", "utf8"));
const lookup = buildBookLookup(index);

const nephi = { book: "1-ne", chapter: 3, verse: 7 };
const cases: [string, ParsedRef | null][] = [
  ["1 Nephi 3:7", nephi],
  ["1 Ne. 3:7", nephi],
  ["1ne 3:7", nephi],
  ["1 nephi 3 : 7", nephi],
  ["D&C 76:22", { book: "dc", chapter: 76, verse: 22 }],
  ["Doctrine and Covenants 76:22", { book: "dc", chapter: 76, verse: 22 }],
  ["dc 76:22", { book: "dc", chapter: 76, verse: 22 }],
  ["John 3:16", { book: "john", chapter: 3, verse: 16 }],
  ["1 John 4:19", { book: "1-jn", chapter: 4, verse: 19 }],
  ["Psalm 23:1", { book: "ps", chapter: 23, verse: 1 }],
  ["Psalms 119:105", { book: "ps", chapter: 119, verse: 105 }],
  ["Moroni 10:4-5", { book: "moro", chapter: 10, verse: 4, endVerse: 5 }],
  ["Moroni 10:4–5", { book: "moro", chapter: 10, verse: 4, endVerse: 5 }],
  ["Joseph Smith—History 1:17", { book: "js-h", chapter: 1, verse: 17 }],
  ["JS-H 1:17", { book: "js-h", chapter: 1, verse: 17 }],
  ["Articles of Faith 1:13", { book: "a-of-f", chapter: 1, verse: 13 }],
  ["Words of Mormon 1:7", { book: "w-of-m", chapter: 1, verse: 7 }],
  ["Gen 1:1", { book: "gen", chapter: 1, verse: 1 }],
  ["Phil 4:13", { book: "philip", chapter: 4, verse: 13 }],
  ["Alma 32", { book: "alma", chapter: 32 }],
  ["Alma 32:21-21", { book: "alma", chapter: 32, verse: 21 }],
  ["Alma 99:1", null], // no chapter 99
  ["Jo 1:1", null], // ambiguous: Job, Joel, John, Jonah, Joshua…
  ["Mos 4:9", null], // ambiguous: Mosiah, Moses
  ["Hezekiah 1:1", null],
  ["Moroni 10:5-4", null],
  ["3:16", null],
  ["", null],
];

describe("parseReference", () => {
  for (const [input, expected] of cases) {
    test(JSON.stringify(input), () => assert.deepEqual(parseReference(input, lookup), expected));
  }
});

describe("getPassage / resolveReference", () => {
  test("a range resolves to its verses and an en-dash reference", async () => {
    const p = await resolveReference("Moroni 10:4-5");
    assert.equal(p?.reference, "Moroni 10:4–5");
    assert.deepEqual(p?.verses.map((v) => v.verse), [4, 5]);
    assert.equal(p?.href, "/scriptures/bofm/moro/10#v4");
  });

  test("a verse past the end of the chapter doesn't resolve", async () => {
    assert.equal(await resolveReference("1 Nephi 3:99"), undefined);
    assert.equal(await resolveReference("Moroni 10:33-40"), undefined);
  });

  test("backwards and cross-chapter ranges are rejected", async () => {
    assert.equal(await getPassage("moro.10.5", "moro.10.4"), undefined);
    assert.equal(await getPassage("moro.9.25", "moro.10.1"), undefined);
  });

  test("a chapter-only reference isn't a passage", async () => {
    assert.equal(await resolveReference("Alma 32"), undefined);
  });
});
