import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostComposer } from "@/components/PostComposer";
import { getPost } from "@/lib/posts";
import { getPassage } from "@/lib/scriptures";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit post" };

type Props = { params: Promise<{ id: string }> };

// Only the author can edit. Anyone else gets the same 404 as a post that doesn't exist.
export default async function EditPostPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) notFound();
  const post = await getPost(user.id, id);
  if (!post || post.author_id !== user.id) notFound();
  const passage = post.verse_id ? await getPassage(post.verse_id, post.end_verse_id) : undefined;

  return (
    <div className="mx-auto max-w-xl">
      <nav className="mb-2 text-sm">
        <Link href={`/posts/${post.id}`} className="inline-flex min-h-11 items-center text-muted hover:text-accent">
          ← Back to post
        </Link>
      </nav>
      <h1 className="mb-4 font-serif text-3xl font-semibold">Edit post</h1>
      <div className="rounded-xl border border-line bg-card p-4">
        <PostComposer
          postId={post.id}
          defaultBody={post.body}
          defaultReference={passage?.reference ?? ""}
          defaultLinkUrl={post.link_url ?? ""}
        />
      </div>
    </div>
  );
}
