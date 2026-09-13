import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { PrintButton } from "@/components/PrintButton";
import { citationsToBold, extractCitations } from "@/lib/citations";
import { resolveReference } from "@/lib/scriptures";
import { requireUser } from "@/lib/session";
import { getTalk } from "@/lib/talks";

export const metadata: Metadata = { title: "Print talk" };

type Props = { params: Promise<{ id: string }> };

// Clean printable page: the outline, then the full text of every cited scripture.
export default async function PrintTalkPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) notFound();
  const talk = await getTalk(user.id, id);
  if (!talk) notFound();

  const passages = (await Promise.all(extractCitations(talk.body).map(resolveReference))).filter((p) => p !== undefined);

  return (
    <article className="mx-auto max-w-2xl">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <h1 className="font-serif text-3xl font-semibold">{talk.title}</h1>
      <p className="mb-6 text-sm text-muted">
        {talk.kind === "lesson" ? "Lesson" : "Talk"}
        {talk.minutes ? ` · ${talk.minutes} minutes` : ""}
        {talk.audience ? ` · ${talk.audience}` : ""}
      </p>
      <div className="md">
        <Markdown disallowedElements={["img"]}>{citationsToBold(talk.body)}</Markdown>
      </div>
      {passages.length > 0 && (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="mb-4 font-serif text-xl font-semibold">Scriptures</h2>
          <div className="space-y-4">
            {passages.map((p) => (
              <div key={p.reference} className="break-inside-avoid">
                <p className="font-semibold">{p.reference}</p>
                <p className="font-serif leading-relaxed">
                  {p.verses.map((v) => (
                    <span key={v.verse}>
                      {p.verses.length > 1 && <sup className="mr-0.5 text-[0.65rem]">{v.verse}</sup>}
                      {v.text}{" "}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
