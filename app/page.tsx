import Link from "next/link";
import { getIndex } from "@/lib/scriptures";

export default async function LibraryPage() {
  const { volumes } = await getIndex();
  return (
    <>
      <h1 className="mb-6 font-serif text-3xl font-semibold">Library</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {volumes.map((v) => (
          <li key={v.slug}>
            <Link
              href={`/scriptures/${v.slug}`}
              className="block h-full rounded-xl border border-line bg-card p-4 transition hover:border-accent"
            >
              <div className="font-serif text-xl font-semibold">{v.title}</div>
              {v.subtitle && <div className="mt-1 text-sm text-muted">{v.subtitle}</div>}
              <div className="mt-3 text-xs uppercase tracking-wide text-muted">
                {v.books.length === 1 ? `${v.books[0].chapters} sections` : `${v.books.length} books`} ·{" "}
                {v.verses.toLocaleString()} verses
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
