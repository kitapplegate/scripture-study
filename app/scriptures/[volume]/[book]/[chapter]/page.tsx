import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterReader, type ReaderVerse } from "@/components/ChapterReader";
import { adjacentChapters, crossRefLink, getChapter, getIndex } from "@/lib/scriptures";

type Props = { params: Promise<{ volume: string; book: string; chapter: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { volume, book, chapter } = await params;
  return { title: (await getChapter(volume, book, chapter))?.reference };
}

export default async function ChapterPage({ params }: Props) {
  const p = await params;
  const chapter = await getChapter(p.volume, p.book, p.chapter);
  if (!chapter) notFound();
  const index = await getIndex();
  const { prev, next } = adjacentChapters(index, chapter.volume, chapter.book, chapter.chapter);
  const single = index.volumes.find((v) => v.slug === chapter.volume)?.books.length === 1;

  const verses: ReaderVerse[] = chapter.verses.map(({ xrefs, ...v }) => ({
    ...v,
    xrefs: xrefs?.flatMap((r) => {
      const link = crossRefLink(index, r);
      return link ? [link] : [];
    }),
  }));
  const hasXrefs = verses.some((v) => v.xrefs?.length);

  return (
    <article>
      <nav className="mb-2 text-sm text-muted">
        <Link href="/" className="hover:text-accent">Library</Link>
        {!single && (
          <>
            {" / "}
            <Link href={`/scriptures/${chapter.volume}`} className="hover:text-accent">{chapter.volumeTitle}</Link>
          </>
        )}
        {" / "}
        <Link href={`/scriptures/${chapter.volume}/${chapter.book}`} className="hover:text-accent">
          {chapter.bookName}
        </Link>
      </nav>

      <h1 className="font-serif text-3xl font-semibold">{chapter.reference}</h1>
      {chapter.bookHeading && (
        <p className="mt-4 font-serif italic leading-relaxed text-muted">{chapter.bookHeading}</p>
      )}
      {(chapter.heading || chapter.note) && (
        <p className="mt-4 font-serif italic leading-relaxed text-muted">{chapter.heading ?? chapter.note}</p>
      )}

      <ChapterReader reference={chapter.reference} verses={verses} />

      {chapter.signature && <p className="mt-6 text-right font-serif italic">{chapter.signature}</p>}
      {chapter.bookNote && <p className="mt-6 font-serif italic text-muted">{chapter.bookNote}</p>}

      <div className="mt-10 rounded-xl border border-line bg-card p-4 text-sm">
        Footnotes, chapter summaries, and study helps for this chapter are in{" "}
        <a href={chapter.churchUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">
          Gospel Library ↗
        </a>
        .
      </div>

      <nav className="mt-6 flex justify-between gap-4 text-sm">
        {prev ? (
          <Link href={prev.href} className="rounded-lg border border-line px-3 py-2 hover:border-accent">
            ← {prev.label}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={next.href} className="rounded-lg border border-line px-3 py-2 hover:border-accent">
            {next.label} →
          </Link>
        )}
      </nav>

      {hasXrefs && (
        <p className="mt-8 text-xs text-muted">
          Cross-references from{" "}
          <a href="https://www.openbible.info/labs/cross-references/" className="underline">
            OpenBible.info
          </a>
          , licensed{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" className="underline">
            CC BY 4.0
          </a>
          .
        </p>
      )}
    </article>
  );
}
