import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeepStudyNotice } from "@/components/DeepStudyNotice";
import { getDsChapter } from "@/lib/deep-study";

type Props = { params: Promise<{ source: string; book: string; chapter: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  return { title: (await getDsChapter(p.source, p.book, p.chapter))?.title };
}

export default async function DsChapterPage({ params }: Props) {
  const p = await params;
  const ch = await getDsChapter(p.source, p.book, p.chapter);
  if (!ch) notFound();

  return (
    <article>
      <nav className="mb-2 text-sm text-muted">
        <Link href="/deep-study" className="hover:text-accent">Deep Study</Link>
        {" / "}
        <Link href={`/deep-study/${ch.source.slug}`} className="hover:text-accent">{ch.source.title}</Link>
      </nav>
      <h1 className="font-serif text-3xl font-semibold">
        {ch.book.key === "pref" ? "Preface" : `${ch.book.title}, Chapter ${ch.chapter.n}`}
      </h1>
      {ch.chapter.title && <p className="mt-3 mb-4 font-serif italic leading-relaxed text-muted">{ch.chapter.title}</p>}
      <DeepStudyNotice />

      <div className="space-y-5 font-serif text-lg leading-relaxed">
        {ch.sections.map((s) => (
          <section key={s.id} id={`s${s.section}`} className="scroll-mt-20">
            {s.text.split("\n\n").map((para, i) => (
              <p key={i} className={i ? "mt-3" : undefined}>
                {i === 0 && (
                  <a href={`#s${s.section}`} title={s.reference} className="mr-1 align-super font-sans text-xs text-muted">
                    {s.section}
                  </a>
                )}
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>

      <nav className="mt-8 flex justify-between gap-4 text-sm">
        {ch.prev ? (
          <Link href={ch.prev.href} className="inline-flex min-h-11 items-center rounded-lg border border-control px-3 py-2 hover:border-accent">
            ← {ch.prev.label}
          </Link>
        ) : (
          <span />
        )}
        {ch.next && (
          <Link href={ch.next.href} className="inline-flex min-h-11 items-center rounded-lg border border-control px-3 py-2 hover:border-accent">
            {ch.next.label} →
          </Link>
        )}
      </nav>
      <p className="mt-8 text-xs text-muted">
        {ch.source.author}, <em>{ch.source.title}</em>, translated by {ch.source.translator} ({ch.source.year}). Public
        domain, from <a href={ch.source.url} className="underline">Project Gutenberg</a>.
      </p>
    </article>
  );
}
