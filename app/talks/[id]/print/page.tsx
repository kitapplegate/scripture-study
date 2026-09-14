import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { requireUser } from "@/lib/session";
import { isHttpsUrl, listItems, type TalkItem } from "@/lib/talk-items";
import { getTalk } from "@/lib/talks";

export const metadata: Metadata = { title: "Print talk" };

type Props = { params: Promise<{ id: string }> };

// Clean printable page: the talk's capsules in the order the owner arranged them, with the
// full text of each scripture from our own data.
export default async function PrintTalkPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) notFound();
  const [talk, items] = await Promise.all([getTalk(user.id, id), listItems(user.id, id)]);
  if (!talk || !items) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between text-sm print:hidden">
        <Link href={`/talks/${talk.id}`} className="text-muted hover:text-accent">← Back to builder</Link>
        <PrintButton />
      </div>
      <h1 className="font-serif text-3xl font-semibold">{talk.title}</h1>
      <p className="mb-6 text-sm text-muted">
        {talk.kind === "lesson" ? "Lesson" : "Talk"}
        {talk.minutes ? ` · ${talk.minutes} minutes` : ""}
        {talk.audience ? ` · ${talk.audience}` : ""}
      </p>
      {items.length === 0 ? (
        <p className="text-muted">This talk has nothing in it yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <PrintCapsule key={item.id} item={item} />
          ))}
        </div>
      )}
    </article>
  );
}

function PrintCapsule({ item }: { item: TalkItem }) {
  switch (item.kind) {
    case "heading":
      return item.body.trim() ? <h2 className="break-after-avoid pt-4 font-serif text-xl font-semibold">{item.body}</h2> : null;
    case "thought":
      return item.body.trim() ? <p className="whitespace-pre-wrap leading-relaxed">{item.body}</p> : null;
    case "scripture": {
      const passage = item.passage;
      return (
        <div className="break-inside-avoid">
          {passage ? (
            <>
              <p className="font-semibold">{passage.reference}</p>
              <p className="font-serif leading-relaxed">
                {passage.verses.map((v) => (
                  <span key={v.verse}>
                    {passage.verses.length > 1 && <sup className="mr-0.5 text-[0.65rem]">{v.verse}</sup>}
                    {v.text}{" "}
                  </span>
                ))}
              </p>
            </>
          ) : (
            <p className="text-muted">This scripture couldn&apos;t be found.</p>
          )}
          {item.body.trim() && <p className="mt-1 whitespace-pre-wrap text-sm italic">{item.body}</p>}
        </div>
      );
    }
    case "link": {
      const url = item.url && isHttpsUrl(item.url) ? item.url : null;
      if (!url && !item.body.trim()) return null;
      return (
        <p className="break-inside-avoid">
          {item.body.trim() && <span className="font-medium">{item.body} </span>}
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-sm text-muted underline">
              {url}
            </a>
          )}
        </p>
      );
    }
  }
}
