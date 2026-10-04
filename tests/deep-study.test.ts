// Needs `npm run db:migrate` (builds data/deep-study/ and loads ds_passages).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, describe, test } from "node:test";
import { pool } from "../lib/db";
import { NO_WRITING_RULE } from "../lib/assistant-prompt";
import { checkCitations } from "../lib/citations-server";
import { getDsChapter, getDsIndex, resolveDsReference, searchDeepStudy } from "../lib/deep-study";
import { checkDeepStudyCitations, deepStudyInstructions, deepStudyTools, readOneDsPassage } from "../lib/deep-study-assistant";
import { MARK_START, searchScriptures } from "../lib/search";

after(() => pool.end());

describe("Deep Study library", () => {
  test("Josephus is split into numbered sections with stable ids", async () => {
    const { sources } = await getDsIndex();
    const ant = sources.find((s) => s.slug === "jos-ant");
    assert.ok(ant && ant.books.length === 20, "Antiquities has 20 books");
    const ch = await getDsChapter("jos-ant", "7", "13");
    assert.ok(ch);
    assert.equal(ch.sections[0].id, "jos-ant.7.13.1");
    assert.match(ch.sections[0].text, /^Now king David was desirous to know how many ten thousands/);
  });

  test("footnote markers and footnote text are stripped", async () => {
    const ch = await getDsChapter("jos-ant", "1", "1");
    assert.match(ch!.sections[1].text, /after the seventh day was over begins/); // was "over1 begins"
    const raw = fs.readFileSync(path.join(process.cwd(), "data", "deep-study", "jos-war.json"), "utf8");
    assert.ok(!raw.includes("(return)"), "footnote bodies leaked into the text");
    const pref = await getDsChapter("jos-war", "pref", "0");
    assert.match(pref!.sections[0].text, /^Whereas the war/); // was "1 Whereas"
  });

  test("unknown sources, books and chapters are not found", async () => {
    assert.equal(await getDsChapter("jos-ant", "21", "1"), undefined);
    assert.equal(await getDsChapter("../scriptures", "1", "1"), undefined);
    assert.equal(await getDsChapter("jos-ant", "1", "1.5"), undefined);
  });

  test("Deep Study search finds Josephus on David's census", async () => {
    const hits = await searchDeepStudy("numbered the people David");
    assert.ok(hits.some((h) => h.id === "jos-ant.7.13.1"), hits.map((h) => h.id).join(", "));
    assert.equal(hits.find((h) => h.id === "jos-ant.7.13.1")!.href, "/deep-study/jos-ant/7/13#s1");
  });

  test("the source filter keeps results inside that source", async () => {
    const hits = await searchDeepStudy("Titus temple", { source: "jos-war" });
    assert.ok(hits.length > 0);
    assert.ok(hits.every((h) => h.source === "jos-war"));
  });

  // Deep Study rule 1: separate from the standard works.
  test("scripture search never returns Deep Study passages", async () => {
    const hits = await searchScriptures("Vespasian Titus Josephus", { limit: 50 });
    assert.ok(hits.every((h) => !h.id.startsWith("jos-")));
  });

  test("the study assistant doesn't import the Deep Study library", () => {
    for (const f of ["assistant-tools.ts", "assistant-prompt.ts", "citations-server.ts"]) {
      const src = fs.readFileSync(path.join(process.cwd(), "lib", f), "utf8");
      assert.ok(!src.includes("deep-study"), `${f} imports Deep Study`);
    }
  });
});

describe("Deep Study references", () => {
  test("resolves the citation forms a reader or model would use", async () => {
    for (const ref of ["Antiquities 7.13.1", "Ant. 7.13.1", "Josephus, Antiquities 7.13.1", "jos-ant.7.13.1", "antiquities 07.13.1"]) {
      const p = await resolveDsReference(ref);
      assert.equal(p?.id, "jos-ant.7.13.1", ref);
      assert.equal(p?.reference, "Antiquities 7.13.1");
    }
    const range = await resolveDsReference("Wars 6.4.5-6");
    assert.equal(range?.reference, "Wars 6.4.5–6");
    assert.equal(range?.verses.length, 2);
    assert.equal((await resolveDsReference("Wars Preface 3"))?.id, "jos-war.pref.3");
  });

  test("made-up or oversized references don't resolve", async () => {
    for (const ref of ["Antiquities 7.13.99", "Antiquities 21.1.1", "Hezekiah 1.1.1", "Antiquities 7.13.1-9", "2 Samuel 24:1"]) {
      assert.equal(await resolveDsReference(ref), undefined, ref);
    }
  });
});

describe("Deep Study chat", () => {
  test("its citation checker handles scripture and Deep Study, and strikes made-up ones", async () => {
    const results = await checkDeepStudyCitations("[[2 Samuel 24:1]] vs [[Antiquities 7.13.1]], not [[Antiquities 7.13.99]].");
    const by = new Map(results.map((r) => [r.ref, r]));
    const sam = by.get("2 Samuel 24:1");
    assert.ok(sam?.found && !sam.deepStudy);
    const ant = by.get("Antiquities 7.13.1");
    assert.ok(ant?.found && ant.deepStudy && ant.href === "/deep-study/jos-ant/7/13#s1");
    assert.equal(by.get("Antiquities 7.13.99")?.found, false);
  });

  test("the study assistant's checker still doesn't accept Deep Study passages", async () => {
    const [r] = await checkCitations("[[Antiquities 7.13.1]]");
    assert.equal(r.found, false);
  });

  test("its tools search both kinds of text, and long reads are capped", async () => {
    assert.deepEqual(Object.keys(deepStudyTools).sort(), ["readDeepStudy", "readPassages", "searchDeepStudy", "searchScriptures"]);
    const found = await readOneDsPassage("Antiquities 7.13.1-4");
    assert.ok(found.found);
    const chars = found.sections.reduce((n, s) => n + s.text.length, 0);
    assert.ok(chars <= 2600, `${chars} chars`);
    assert.equal((await readOneDsPassage("Antiquities 99.1.1")).found, false);
    const exec = deepStudyTools.searchDeepStudy.execute!;
    const out = (await exec({ queries: ["David numbered the people"] }, { toolCallId: "t", messages: [], context: undefined } as never)) as {
      results: { reference: string; snippet: string }[];
    };
    assert.ok(out.results.some((r) => r.reference === "Antiquities 7.13.1"));
    assert.ok(out.results.every((r) => !r.snippet.includes(MARK_START)));
  });

  test("its instructions keep the no-talk-writing rule and the no-verdict rule", async () => {
    const text = await deepStudyInstructions();
    assert.ok(text.includes(NO_WRITING_RULE));
    assert.match(text, /NOT scripture/);
    assert.match(text, /Don't harmonize them, rank them, or say which is right/);
  });
});
