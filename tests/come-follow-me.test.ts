// Come, Follow Me schedule: the week turns over on Monday in the family's time zone, the
// schedule has no gaps, and every reading points at a real chapter.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, test } from "node:test";
import { SCHEDULE, dateRange, lessonUrl, readingLinks, weekFor } from "../lib/come-follow-me";
import { buildBookLookup } from "../lib/references";

const index = JSON.parse(fs.readFileSync("data/scriptures/index.json", "utf8"));
const lookup = buildBookLookup(index);
const lesson = (n: number) => SCHEDULE.find((w) => w.lesson === n)!;

describe("weekFor", () => {
  test("Sunday is the end of a week, and Monday starts the next", () => {
    assert.equal(weekFor(new Date("2026-09-13T23:30:00-04:00"))?.lesson, 37);
    assert.equal(weekFor(new Date("2026-09-14T00:30:00-04:00"))?.lesson, 38);
  });

  test("uses the family's time zone, not UTC", () => {
    // 02:00 UTC Monday is still Sunday evening in New York.
    assert.equal(weekFor(new Date("2026-09-14T02:00:00Z"))?.lesson, 37);
  });

  test("nothing outside the schedule", () => {
    assert.equal(weekFor(new Date("2026-09-06T12:00:00-04:00")), undefined);
    assert.equal(weekFor(new Date("2026-12-28T12:00:00-05:00")), undefined);
  });
});

describe("schedule", () => {
  test("weeks are consecutive Mondays with consecutive lesson numbers", () => {
    for (const [i, w] of SCHEDULE.entries()) {
      assert.equal(new Date(`${w.start}T00:00:00Z`).getUTCDay(), 1, `${w.start} is not a Monday`);
      if (i === 0) continue;
      assert.equal(w.lesson, SCHEDULE[i - 1].lesson + 1);
      assert.equal(Date.parse(w.start) - Date.parse(SCHEDULE[i - 1].start), 7 * 86_400_000);
    }
  });

  test("date ranges read like the manual's headings", () => {
    assert.equal(dateRange(lesson(37)), "September 7–13");
    assert.equal(dateRange(lesson(40)), "September 28–October 4");
    assert.equal(dateRange(lesson(49)), "November 30–December 6");
  });

  test("lesson links use the manual's two-digit lesson number", () => {
    assert.equal(
      lessonUrl(lesson(37)),
      "https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/37?lang=eng",
    );
  });

  test("every reading links to a real chapter, except the Christmas week", () => {
    for (const w of SCHEDULE) {
      for (const l of readingLinks(w.readings, index, lookup)) {
        if (w.readings === "Christmas") assert.equal(l.href, undefined);
        else assert.ok(l.href, `lesson ${w.lesson}: "${l.label}" didn't resolve`);
      }
    }
  });
});

describe("readingLinks", () => {
  test("a part with no book name continues the previous book", () => {
    assert.deepEqual(readingLinks("Proverbs 1–4; 15–16; Ecclesiastes 11–12", index, lookup), [
      { label: "Proverbs 1–4", href: "/scriptures/ot/prov/1" },
      { label: "15–16", href: "/scriptures/ot/prov/15" },
      { label: "Ecclesiastes 11–12", href: "/scriptures/ot/eccl/11" },
    ]);
  });

  test("a bare book opens chapter 1; a chapter past the end, or not a book, stays plain text", () => {
    assert.deepEqual(readingLinks("Joel; Malachi 5; Christmas", index, lookup), [
      { label: "Joel", href: "/scriptures/ot/joel/1" },
      { label: "Malachi 5" },
      { label: "Christmas" },
    ]);
  });
});
