import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getVolume } from "@/lib/scriptures";

type Props = { params: Promise<{ volume: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const volume = await getVolume((await params).volume);
  return { title: volume?.title };
}

export default async function VolumePage({ params }: Props) {
  const volume = await getVolume((await params).volume);
  if (!volume) notFound();
  // The D&C is a single "book" — go straight to its sections.
  if (volume.books.length === 1) redirect(`/scriptures/${volume.slug}/${volume.books[0].slug}`);

  return (
    <>
      <nav className="mb-2 text-sm text-muted">
        <Link href="/scriptures" className="hover:text-accent">Library</Link>
      </nav>
      <h1 className="font-serif text-3xl font-semibold">{volume.title}</h1>
      {volume.subtitle && <p className="mt-1 text-muted">{volume.subtitle}</p>}
      <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-card">
        {volume.books.map((b) => (
          <li key={b.slug}>
            <Link
              href={`/scriptures/${volume.slug}/${b.slug}`}
              className="flex items-baseline justify-between px-4 py-3 hover:text-accent"
            >
              <span className="font-serif text-lg">{b.name}</span>
              <span className="text-xs text-muted">{b.chapters}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
