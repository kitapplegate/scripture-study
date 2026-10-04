import type { Metadata } from "next";
import Link from "next/link";
import { DeepStudyNotice } from "@/components/DeepStudyNotice";
import { Highlighted } from "@/components/Highlighted";
import { getDsIndex, searchDeepStudy } from "@/lib/deep-study";

export const metadata: Metadata = { title: "Deep Study" };

type Props = { searchParams: Promise<{ q?: string; src?: string }> };

export default async function DeepStudyPage({ searchParams }: Props) {
  const { q = "", src } = await searchParams;
  const { sources } = await getDsIndex();
  const source = sources.some((s) => s.slug === src) ? src : undefined;
  const hits = q.trim() ? await searchDeepStudy(q, { source, limit: 30 }) : null;

  return (
    <>
      <h1 className="mb-2 font-serif text-3xl font-semibold">Deep Study</h1>
      <p className="mb-4 text-muted">The same history, told by other ancient writers.</p>
      <DeepStudyNotice />

      <Link
        href="/deep-study/chat"
        className="mb-6 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-control bg-card p-4 hover:border-accent"
      >
        <span>
          <span className="block font-medium">Ask the Deep Study assistant</span>
          <span className="block text-sm text-muted">Compare an event across the scriptures and Josephus. For members.</span>
        </span>
        <span aria-hidden className="text-accent">→</span>
      </Link>

      <form action="/deep-study" method="get" className="mb-6 flex flex-wrap gap-2">
        <label htmlFor="q" className="basis-full text-sm text-muted">Search these texts</label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          maxLength={200}
          placeholder='David numbered the people, or "burnt the temple"'
          className="min-w-0 flex-1 basis-60 rounded-lg border border-control bg-card px-3 py-2 outline-none focus:border-accent"
        />
        <label htmlFor="src" className="sr-only">Text</label>
        <select id="src" name="src" defaultValue={source ?? ""} className="rounded-lg border border-control bg-card px-3 py-2">
          <option value="">All texts</option>
          {sources.map((s) => (
            <option key={s.slug} value={s.slug}>{s.title}</option>
          ))}
        </select>
        <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-bg">Search</button>
      </form>

      {hits && (
        <section className="mb-10">
          <p className="mb-3 text-sm text-muted">
            {hits.length === 0
              ? "No passages found."
              : `${hits.length} passages${hits.some((h) => h.matched === "some") ? ", including some with only some of the words" : ""}.`}
          </p>
          <ol className="space-y-3">
            {hits.map((h) => (
              <li key={h.id} className="rounded-xl border border-line bg-card p-4">
                <Link href={h.href} className="text-sm font-medium text-accent hover:underline">{h.reference}</Link>
                <p className="mt-1 font-serif leading-relaxed">
                  <Highlighted text={h.highlighted} />
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <h2 className="mb-3 font-serif text-2xl font-semibold">Texts</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {sources.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/deep-study/${s.slug}`}
              className="block h-full rounded-xl border border-control bg-card p-4 transition hover:border-accent"
            >
              <div className="font-serif text-xl font-semibold">{s.title}</div>
              <div className="mt-1 text-sm text-muted">{s.author} · tr. {s.translator} ({s.year})</div>
              <p className="mt-2 text-sm">{s.blurb}</p>
              <div className="mt-3 text-xs uppercase tracking-wide text-muted">
                {s.books.filter((b) => b.key !== "pref").length} books · {s.passages.toLocaleString()} sections
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs text-muted">
        Public-domain texts from <a href="https://www.gutenberg.org/" className="underline">Project Gutenberg</a>.
      </p>
    </>
  );
}
