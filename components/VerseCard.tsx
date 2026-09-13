import Link from "next/link";
import { getPassage } from "@/lib/scriptures";

// Always renders the verses from our own data, never text typed or pasted by a user.
export async function VerseCard({ verseId, endVerseId }: { verseId: string; endVerseId?: string | null }) {
  const passage = await getPassage(verseId, endVerseId);
  if (!passage) {
    return <div className="rounded-lg border border-line px-4 py-3 text-sm text-muted">Verse not found ({verseId})</div>;
  }
  const numbered = passage.verses.length > 1;
  return (
    <blockquote className="rounded-lg border-l-4 border-accent bg-hl/40 px-4 py-3">
      <div className="space-y-1 font-serif text-[1.05rem] leading-relaxed">
        {passage.verses.map((v) => (
          <p key={v.verse}>
            {numbered && <sup className="mr-1 font-sans text-xs font-semibold text-accent">{v.verse}</sup>}
            {v.text}
          </p>
        ))}
      </div>
      <footer className="mt-2 text-sm">
        <Link href={passage.href} className="font-medium text-accent hover:underline">
          {passage.reference}
        </Link>
      </footer>
    </blockquote>
  );
}
