import Link from "next/link";
import { Fragment } from "react";
import { dateRange, lessonUrl, readingLinks, weekFor } from "@/lib/come-follow-me";
import { getBookLookup, getIndex } from "@/lib/scriptures";

// This week's Come, Follow Me: readings open in our reader, the lesson opens on the Church's site.
// Renders nothing for a week the schedule doesn't cover.
export async function ComeFollowMeCard() {
  const week = weekFor(new Date());
  if (!week) return null;
  const links = readingLinks(week.readings, await getIndex(), await getBookLookup());

  return (
    <section aria-labelledby="cfm-heading" className="mb-8 rounded-xl border border-line bg-card p-4">
      <p id="cfm-heading" className="text-sm font-medium text-muted">
        Come, Follow Me · {dateRange(week)}
      </p>
      <h2 className="mt-1 font-serif text-xl font-semibold">
        <a href={lessonUrl(week)} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
          “{week.title}” <span className="text-base text-accent">↗</span>
        </a>
      </h2>
      <p className="mt-2 font-serif text-[1.05rem]">
        {links.map((l, i) => (
          <Fragment key={i}>
            {i > 0 && "; "}
            {l.href ? (
              <Link href={l.href} className="text-accent hover:underline">{l.label}</Link>
            ) : (
              l.label
            )}
          </Fragment>
        ))}
      </p>
    </section>
  );
}
