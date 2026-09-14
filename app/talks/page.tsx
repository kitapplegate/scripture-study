import type { Metadata } from "next";
import Link from "next/link";
import { createBlankTalkAction } from "@/app/talks/actions";
import { timeAgo } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { listTalks } from "@/lib/talks";

export const metadata: Metadata = { title: "My talks" };

export default async function TalksPage() {
  const user = await requireUser();
  const talks = await listTalks(user.id);

  return (
    <>
      <h1 className="mb-1 font-serif text-3xl font-semibold">My talks and lessons</h1>
      <p className="mb-6 text-sm text-muted">Build talks and lessons from scriptures, thoughts, and headings. Only you can see them.</p>
      <div className="mb-6 flex flex-wrap gap-2">
        <form action={createBlankTalkAction}>
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 font-medium text-bg">New talk</button>
        </form>
      </div>
      {talks.length === 0 ? (
        <p className="text-sm text-muted">No drafts yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {talks.map((t) => (
            <li key={t.id}>
              <Link href={`/talks/${t.id}`} className="flex items-baseline justify-between gap-3 px-4 py-3 hover:text-accent">
                <span className="font-serif text-lg">{t.title}</span>
                <span className="whitespace-nowrap text-xs text-muted">
                  {t.kind}{t.minutes ? ` · ${t.minutes} min` : ""} · {timeAgo(t.updated_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
