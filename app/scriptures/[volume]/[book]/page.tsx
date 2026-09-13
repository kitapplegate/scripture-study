import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { chapterHref, getBook } from "@/lib/scriptures";

type Props = { params: Promise<{ volume: string; book: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { volume, book } = await params;
  return { title: (await getBook(volume, book))?.book.name };
}

export default async function BookPage({ params }: Props) {
  const p = await params;
  const found = await getBook(p.volume, p.book);
  if (!found) notFound();
  const { volume, book } = found;
  const single = volume.books.length === 1;

  return (
    <>
      <nav className="mb-2 text-sm text-muted">
        <Link href="/" className="hover:text-accent">Library</Link>
        {!single && (
          <>
            {" / "}
            <Link href={`/scriptures/${volume.slug}`} className="hover:text-accent">{volume.title}</Link>
          </>
        )}
      </nav>
      <h1 className="font-serif text-3xl font-semibold">{book.fullTitle}</h1>
      {book.fullSubtitle && <p className="mt-1 font-serif italic text-muted">{book.fullSubtitle}</p>}

      <h2 className="mb-3 mt-8 text-xs uppercase tracking-wide text-muted">{book.chapterLabel}s</h2>
      <ol className="grid grid-cols-5 gap-2 sm:grid-cols-8">
        {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            <Link
              href={chapterHref(volume.slug, book.slug, n)}
              className="flex aspect-square items-center justify-center rounded-lg border border-line bg-card font-serif text-lg hover:border-accent hover:text-accent"
            >
              {n}
            </Link>
          </li>
        ))}
      </ol>

      {book.facsimiles?.map((f) => (
        <section key={f.number} className="mt-10">
          <h2 className="font-serif text-xl font-semibold">{f.title}</h2>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted">Explanation</p>
          <ul className="mt-2 space-y-1 font-serif leading-relaxed">
            {f.explanations.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          {f.note && <p className="mt-3 font-serif italic text-muted">{f.note}</p>}
        </section>
      ))}
    </>
  );
}
