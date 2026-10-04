import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeepStudyNotice } from "@/components/DeepStudyNotice";
import { dsChapterHref, getDsSource } from "@/lib/deep-study";

type Props = { params: Promise<{ source: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await getDsSource((await params).source))?.title };
}

export default async function DsSourcePage({ params }: Props) {
  const source = await getDsSource((await params).source);
  if (!source) notFound();

  return (
    <>
      <nav className="mb-2 text-sm text-muted">
        <Link href="/deep-study" className="hover:text-accent">Deep Study</Link>
      </nav>
      <h1 className="font-serif text-3xl font-semibold">{source.title}</h1>
      <p className="mt-1 mb-4 text-muted">
        {source.author} · translated by {source.translator} ({source.year}) ·{" "}
        <a href={source.url} className="underline">Project Gutenberg #{source.gutenberg}</a>
      </p>
      <DeepStudyNotice />

      <div className="space-y-3">
        {source.books.map((b) => (
          <details key={b.key} className="rounded-xl border border-line bg-card">
            <summary className="cursor-pointer px-4 py-3">
              <span className="font-serif text-lg">{b.title}</span>
              {b.summary && <span className="mt-1 block text-sm text-muted">{b.summary}</span>}
            </summary>
            <ol className="divide-y divide-line border-t border-line">
              {b.chapters.map((c) => (
                <li key={c.n}>
                  <Link href={dsChapterHref(source.slug, b.key, c.n)} className="flex gap-3 px-4 py-3 hover:text-accent">
                    {b.key !== "pref" && <span className="w-8 shrink-0 text-right text-muted">{c.n}</span>}
                    <span>{c.title || b.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </>
  );
}
