import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCommentAction } from "@/app/posts/actions";
import { CommentForm } from "@/components/CommentForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { PostCard } from "@/components/PostCard";
import { timeAgo } from "@/lib/format";
import { getPost, listComments } from "@/lib/posts";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Post" };

type Props = { params: Promise<{ id: string }> };

export default async function PostPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) notFound();
  const [post, comments] = await Promise.all([getPost(user.id, id), listComments(id)]);
  if (!post) notFound();

  return (
    <>
      <nav className="mb-4 text-sm">
        <Link href="/feed" className="text-muted hover:text-accent">← Feed</Link>
      </nav>
      <PostCard post={post} viewer={user} linkToPost={false} />

      <section className="mt-8">
        <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">
          {comments.length === 1 ? "1 comment" : `${comments.length} comments`}
        </h2>
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-line bg-card p-3">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold">{c.author_name}</span>
                <span className="text-muted">{timeAgo(c.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words">{c.body}</p>
              {(c.author_id === user.id || user.role === "admin") && (
                <form action={deleteCommentAction} className="mt-1 text-right">
                  <input type="hidden" name="commentId" value={c.id} />
                  <ConfirmSubmit small label="Delete" confirmLabel="Yes, delete comment" />
                </form>
              )}
            </li>
          ))}
        </ul>
        <CommentForm postId={id} />
      </section>
    </>
  );
}
