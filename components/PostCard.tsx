import Link from "next/link";
import { deletePostAction, toggleReactionAction } from "@/app/posts/actions";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { ReactionButtons } from "@/components/ReactionButtons";
import { VerseCard } from "@/components/VerseCard";
import { timeAgo } from "@/lib/format";
import type { Actor, FeedPost } from "@/lib/posts";

export function PostCard({
  post,
  viewer,
  linkToPost = true,
  returnTo = "/feed",
}: {
  post: FeedPost;
  viewer: Actor;
  linkToPost?: boolean;
  returnTo?: "/" | "/feed";
}) {
  const canEdit = post.author_id === viewer.id; // author only (lib/posts.ts updatePost)
  const canDelete = canEdit || viewer.role === "admin";
  const comments = post.comment_count === 1 ? "1 comment" : `${post.comment_count} comments`;

  return (
    <article className="rounded-xl border border-line bg-card p-4">
      <header className="mb-3 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{post.author_name}</span>
        <span className="text-muted">
          <time dateTime={post.created_at.toISOString()}>{timeAgo(post.created_at)}</time>
          {post.edited_at && (
            <span title={`Edited ${post.edited_at.toLocaleString()}`}> · edited</span>
          )}
        </span>
      </header>

      {post.verse_id && <VerseCard verseId={post.verse_id} endVerseId={post.end_verse_id} />}
      {post.body && <p className={`${post.verse_id ? "mt-3 " : ""}whitespace-pre-wrap break-words`}>{post.body}</p>}
      {post.link_url && (
        <a
          href={post.link_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 block truncate text-sm text-accent underline"
        >
          {post.link_url} ↗
        </a>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <ReactionButtons
          counts={post.reaction_counts}
          mine={post.my_reactions}
          action={toggleReactionAction}
          fields={{ postId: post.id }}
        />
        <div className="ml-auto flex items-center gap-3">
          {linkToPost && (
            <Link href={`/posts/${post.id}`} className="text-muted hover:text-accent">
              {comments}
            </Link>
          )}
          {canEdit && (
            <Link href={`/posts/${post.id}/edit`} className="text-muted hover:text-accent">
              Edit
            </Link>
          )}
          {canDelete && (
            <form action={deletePostAction}>
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <ConfirmSubmit label="Delete" confirmLabel="Yes, delete post" />
            </form>
          )}
        </div>
      </footer>
    </article>
  );
}
