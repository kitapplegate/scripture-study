import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTalkAction } from "@/app/talks/actions";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { TalkBuilder } from "@/components/talk-builder/TalkBuilder";
import { requireUser } from "@/lib/session";
import { listItems } from "@/lib/talk-items";
import { getTalk } from "@/lib/talks";

export const metadata: Metadata = { title: "Talk builder" };

type Props = { params: Promise<{ id: string }> };

export default async function TalkPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) notFound();
  const [talk, items] = await Promise.all([getTalk(user.id, id), listItems(user.id, id)]);
  if (!talk || !items) notFound();

  return (
    <>
      <nav className="mb-4 flex justify-between text-sm">
        <Link href="/talks" className="text-muted hover:text-accent">← My talks</Link>
        <Link href={`/talks/${talk.id}/print`} className="text-muted hover:text-accent">Print view</Link>
      </nav>
      <TalkBuilder
        talkId={talk.id}
        initialDetails={{ title: talk.title, kind: talk.kind, minutes: talk.minutes, audience: talk.audience ?? "" }}
        initialItems={items}
      />
      <form action={deleteTalkAction} className="mt-10 border-t border-line pt-4 text-right">
        <input type="hidden" name="id" value={talk.id} />
        <ConfirmSubmit label="Delete this talk" confirmLabel="Yes, delete talk" />
      </form>
    </>
  );
}
