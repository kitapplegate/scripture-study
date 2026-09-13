// Needs the `verses` table loaded (npm run db:migrate).
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { pool } from "../lib/db";
import { searchScriptures } from "../lib/search";

after(() => pool.end());

const refs = async (q: string, opts?: { volume?: string; limit?: number }) =>
  (await searchScriptures(q, opts)).map((h) => h.reference);

describe("searchScriptures", () => {
  test("all-words query finds the classic verses", async () => {
    const r = await refs("faith hope charity");
    assert.ok(r.includes("1 Corinthians 13:13"), r.join(", "));
  });

  test("falls back to some-of-the-words when few verses have every word", async () => {
    const hits = await searchScriptures("charity never faileth");
    assert.ok(hits.length >= 5, `only ${hits.length} hits`);
    assert.ok(hits.some((h) => h.reference === "Moroni 7:46" || h.reference === "1 Corinthians 13:8"));
    assert.ok(hits.some((h) => h.matched === "some"));
  });

  test("quoted phrase search", async () => {
    const r = await refs('"strait gate"');
    assert.ok(r.includes("Matthew 7:13"));
    assert.ok(r.includes("3 Nephi 14:13"));
  });

  test("volume filter keeps results inside that volume", async () => {
    const hits = await searchScriptures("charity", { volume: "bofm" });
    assert.ok(hits.length > 0);
    assert.ok(hits.every((h) => h.volume === "bofm"));
  });

  test("highlights are marked, and an exclusion query doesn't fall back", async () => {
    const [first] = await searchScriptures("charity");
    assert.match(first.highlighted, /charity/i);
    const excluded = await searchScriptures("charity -faith");
    assert.ok(excluded.every((h) => h.matched === "all"));
  });

  test("empty and stopword-only queries return nothing", async () => {
    assert.deepEqual(await searchScriptures("   "), []);
    assert.deepEqual(await searchScriptures("and the"), []);
  });
});
