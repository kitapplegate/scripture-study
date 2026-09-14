import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Highlighted } from "@/components/Highlighted";
import { AddToTalkButton } from "@/components/talk-builder/AddToTalkButton";
import { isVolumeSlug, searchScriptures, VOLUME_FILTERS } from "@/lib/search";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Search" };

type Props = { searchParams: Promise<{ q?: string; vol?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", vol } = await searchParams;
  const volume = isVolumeSlug(vol) ? vol : undefined;
  const [hits, session] = await Promise.all([
    q.trim() ? searchScriptures(q, { volume, limit: 50 }) : Promise.resolve(null),
    // Search is public; "Add to talk" only shows for members.
    getSession().catch((err: Error) => {
      unstable_rethrow(err);
      return null;
    }),
  ]);
  const someOnly = hits?.some((h) => h.matched === "some");

  return (
    <>
      <h1 className="mb-4 font-serif text-3xl font-semibold">Search</h1>
      <form action="/search" method="get" className="mb-2 flex flex-wrap gap-2">
        <label htmlFor="q" className="basis-full text-sm text-muted">Search words</label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          maxLength={200}
          placeholder='faith hope charity, or "strait gate"'
          className="min-w-0 flex-1 basis-60 rounded-lg border border-control bg-card px-3 py-2 outline-none focus:border-accent"
        />
        <label htmlFor="vol" className="sr-only">Volume</label>
        <select id="vol" name="vol" defaultValue={volume ?? ""} className="rounded-lg border border-control bg-card px-3 py-2">
          <option value="">All scriptures</option>
          {VOLUME_FILTERS.map((v) => (
            <option key={v.slug} value={v.slug}>{v.label}</option>
          ))}
        </select>
        <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-bg">Search</button>
      </form>
      <p className="mb-6 text-xs text-muted">Use quotes for an exact phrase, “or” for either word, and -word to exclude.</p>

      {hits && (
        <>
          <p className="mb-3 text-sm text-muted">
            {hits.length === 0
              ? "No verses found."
              : someOnly
                ? `${hits.length} verses. Few had every word, so verses with some of the words are included after them.`
                : `${hits.length === 50 ? "Top 50" : hits.length} verses with every word.`}
          </p>
          <ol className="space-y-3">
            {hits.map((h) => (
              <li key={h.id} className="rounded-xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={h.href} className="pt-1 text-sm font-medium text-accent hover:underline">{h.reference}</Link>
                  {session && <AddToTalkButton verseId={h.id} reference={h.reference} align="right" />}
                </div>
                <p className="mt-1 font-serif leading-relaxed">
                  <Highlighted text={h.highlighted} />
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}
