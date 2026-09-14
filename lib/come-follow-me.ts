// This week's Come, Follow Me readings for the home page. Only the schedule is stored:
// the week, the reading assignment, and the lesson title as link text. The lesson itself
// stays on churchofjesuschrist.org (SPEC principle 2). Titles and readings match the
// manual's own lesson headings, checked 2026-09-13; see data/SOURCES.md.
import type { BookLookup } from "./references";
import { normalizeBookName } from "./references";
import { chapterHref, type ScriptureIndex } from "./scriptures";

export type CfmWeek = { lesson: number; start: string; title: string; readings: string };

const MANUAL = "come-follow-me-for-home-and-church-old-testament-2026";

// One zone for the whole family, so the week turns over at the same moment for everyone.
export const TIME_ZONE = "America/New_York";

// Weeks run Monday to Sunday. Starts at lesson 37: earlier 2026 weeks had passed when this was added.
export const SCHEDULE: CfmWeek[] = [
  { lesson: 37, start: "2026-09-07", title: "He Shall Direct Thy Paths", readings: "Proverbs 1–4; 15–16; 22; 31; Ecclesiastes 1–3; 11–12" },
  { lesson: 38, start: "2026-09-14", title: "God Is My Salvation", readings: "Isaiah 1–12" },
  { lesson: 39, start: "2026-09-21", title: "A Marvellous Work and a Wonder", readings: "Isaiah 13–14; 22; 24–30; 35" },
  { lesson: 40, start: "2026-09-28", title: "Comfort Ye My People", readings: "Isaiah 40–49" },
  { lesson: 41, start: "2026-10-05", title: "He Hath Borne Our Griefs, and Carried Our Sorrows", readings: "Isaiah 50–57" },
  { lesson: 42, start: "2026-10-12", title: "The Redeemer Shall Come to Zion", readings: "Isaiah 58–66" },
  { lesson: 43, start: "2026-10-19", title: "Before I Formed Thee in the Belly I Knew Thee", readings: "Jeremiah 1–3; 7; 16–18; 20" },
  { lesson: 44, start: "2026-10-26", title: "I Will Turn Their Mourning into Joy", readings: "Jeremiah 31–33; 36–39; Lamentations 1; 3" },
  { lesson: 45, start: "2026-11-02", title: "A New Spirit Will I Put within You", readings: "Ezekiel 1–3; 33–34; 36–37; 47" },
  { lesson: 46, start: "2026-11-09", title: "There Is No Other God That Can Deliver", readings: "Daniel 1–7" },
  { lesson: 47, start: "2026-11-16", title: "I Will Love Them Freely", readings: "Hosea 1–6; 10–14; Joel" },
  { lesson: 48, start: "2026-11-23", title: "Seek the Lord, and Ye Shall Live", readings: "Amos; Obadiah; Jonah" },
  { lesson: 49, start: "2026-11-30", title: "He Delighteth in Mercy", readings: "Micah; Nahum; Habakkuk; Zephaniah" },
  { lesson: 50, start: "2026-12-07", title: "Holiness unto the Lord", readings: "Haggai 1–2; Zechariah 1–4; 7–14" },
  { lesson: 51, start: "2026-12-14", title: "I Have Loved You, Saith the Lord", readings: "Malachi" },
  { lesson: 52, start: "2026-12-21", title: "We Have Waited for Him, and He Will Save Us", readings: "Christmas" },
];

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Today's date in the family's zone, as YYYY-MM-DD (en-CA formats that way).
function localDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function weekFor(now: Date): CfmWeek | undefined {
  const today = localDate(now);
  return SCHEDULE.find((w) => w.start <= today && today <= addDays(w.start, 6));
}

export function lessonUrl(week: CfmWeek) {
  return `https://www.churchofjesuschrist.org/study/manual/${MANUAL}/${String(week.lesson).padStart(2, "0")}?lang=eng`;
}

// "September 7–13", or "September 28–October 4" across a month boundary.
export function dateRange(week: CfmWeek) {
  const end = addDays(week.start, 6);
  const month = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long" }).format(new Date(`${iso}T00:00:00Z`));
  const day = (iso: string) => Number(iso.slice(8));
  return month(week.start) === month(end)
    ? `${month(week.start)} ${day(week.start)}–${day(end)}`
    : `${month(week.start)} ${day(week.start)}–${month(end)} ${day(end)}`;
}

export type ReadingLink = { label: string; href?: string };

const PART_RE = /^(.*?[a-z].*?)?\s*(?:(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/i;

// "Proverbs 1–4; 15–16; Ecclesiastes 1–3" -> one link per part, each to its first chapter.
// A part with no book name continues the previous book, and a bare book name ("Joel")
// means the whole book. Anything that isn't a real chapter ("Christmas") stays plain text.
export function readingLinks(readings: string, index: ScriptureIndex, lookup: BookLookup): ReadingLink[] {
  const volumeOf = new Map(index.volumes.flatMap((v) => v.books.map((b) => [b.slug, v.slug] as const)));
  let book: { slug: string; chapters: number } | undefined;
  return readings.split(";").map((raw) => {
    const label = raw.trim();
    const m = PART_RE.exec(label);
    if (!m) return { label };
    if (m[1]) book = lookup.exact.get(normalizeBookName(m[1]));
    const volume = book && volumeOf.get(book.slug);
    const first = m[2] ? Number(m[2]) : 1;
    const last = m[3] ? Number(m[3]) : first;
    if (!book || !volume || !(m[1] || m[2]) || first < 1 || last < first || last > book.chapters) return { label };
    return { label, href: chapterHref(volume, book.slug, first) };
  });
}
