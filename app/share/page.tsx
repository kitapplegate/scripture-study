import type { Metadata } from "next";
import Link from "next/link";
import { ReferencePicker } from "@/components/ReferencePicker";
import { ShareForm } from "@/components/ShareForm";
import { VerseCard } from "@/components/VerseCard";
import { getPassage, resolveReference } from "@/lib/scriptures";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "New post" };

// Reached three ways: a typed reference (?ref=Alma 32:21), a verse tapped in the
// reader (?v=1-ne.3.7), or bare, which shows the reference box.
type Props = { searchParams: Promise<{ v?: string; end?: string; ref?: string }> };

export default async function SharePage({ searchParams }: Props) {
  await requireUser();
  const { v, end, ref } = await searchParams;
  const passage = ref ? await resolveReference(ref) : v ? await getPassage(v, end) : undefined;
  const attempted = ref ?? v;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 font-serif text-3xl font-semibold">New post</h1>
      {passage ? (
        <>
          <VerseCard verseId={passage.id} endVerseId={passage.endId} />
          <p className="mt-2 text-right text-sm">
            <Link href="/share" className="text-muted hover:text-accent">Choose a different verse</Link>
          </p>
          <ShareForm verseId={passage.id} endVerseId={passage.endId ?? ""} backHref={passage.href} />
        </>
      ) : (
        <>
          {attempted && (
            <p role="alert" className="mb-3 text-sm text-error">
              Couldn't find “{attempted}”. Try a reference with a verse, like Alma 32:21 or Moroni 10:4–5.
            </p>
          )}
          <p className="mb-3 text-sm text-muted">Which verse or verses do you want to share?</p>
          <ReferencePicker defaultValue={ref ?? ""} />
        </>
      )}
    </div>
  );
}
