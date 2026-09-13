import type { Metadata } from "next";
import Link from "next/link";
import { InviteForm } from "@/components/InviteForm";
import { inviteIsUsable } from "@/lib/invites";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Join" };

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const [session, usable] = await Promise.all([getSession(), inviteIsUsable(token)]);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 font-serif text-3xl font-semibold">Join Scripture Study</h1>
      {session ? (
        <p className="text-muted">
          You're already signed in as {session.user.name}. <Link href="/feed" className="text-accent underline">Go to the feed</Link>.
        </p>
      ) : usable ? (
        <>
          <p className="mb-6 text-sm text-muted">Create your account. This link works once.</p>
          <InviteForm token={token} />
        </>
      ) : (
        <p className="text-muted">
          This invite link is invalid, expired, or already used. Ask the person who sent it for a new one.
        </p>
      )}
    </div>
  );
}
