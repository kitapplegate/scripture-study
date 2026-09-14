import type { Metadata } from "next";
import { PostComposer } from "@/components/PostComposer";
import { VerseCard } from "@/components/VerseCard";
import { getPassage, resolveReference } from "@/lib/scriptures";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "New post" };

// Reached from a verse tapped in the reader (?v=1-ne.3.7), a typed reference
// (?ref=Alma 32:21), or bare. Shows the verse, then the free-form composer with that
// scripture filled in (it can be changed or cleared).
type Props = { searchParams: Promise<{ v?: string; end?: string; ref?: string }> };

export default async function SharePage({ searchParams }: Props) {
  await requireUser();
  const { v, end, ref } = await searchParams;
  const passage = ref ? await resolveReference(ref) : v ? await getPassage(v, end) : undefined;
  const attempted = ref ?? v;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 font-serif text-3xl font-semibold">New post</h1>
      {passage && <VerseCard verseId={passage.id} endVerseId={passage.endId} />}
      {!passage && attempted && (
        <p role="alert" className="mb-3 text-sm text-error">
          Couldn't find “{attempted}”. Try a reference with a verse, like Alma 32:21 or Moroni 10:4–5.
        </p>
      )}
      <div className="mt-4 rounded-xl border border-line bg-card p-4">
        <PostComposer defaultReference={passage?.reference ?? ref ?? ""} />
      </div>
    </div>
  );
}
