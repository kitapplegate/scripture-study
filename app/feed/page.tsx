import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { FEED_PAGE_SIZE, listFeed } from "@/lib/posts";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Feed" };

type Props = { searchParams: Promise<{ before?: string }> };

export default async function FeedPage({ searchParams }: Props) {
  const user = await requireUser();
  const { before } = await searchParams;
  const beforeId = before && /^\d{1,18}$/.test(before) ? before : undefined;
  const posts = await listFeed(user.id, beforeId);

  return (
    <>
      <h1 className="mb-4 font-serif text-3xl font-semibold">Family feed</h1>
      <div className="mb-6 rounded-xl border border-line bg-card p-4">
        <PostComposer returnTo="/feed" />
        <p className="mt-2 text-xs text-muted">Or tap any verse while you're reading, then Share.</p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-muted">
          {beforeId ? "No older posts." : "Nothing shared yet."}{" "}
          <Link href="/scriptures" className="text-accent underline">Open the library</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} viewer={user} />
          ))}
        </div>
      )}

      {posts.length === FEED_PAGE_SIZE && (
        <div className="mt-6 text-center">
          <Link href={`/feed?before=${posts[posts.length - 1].id}`} className="text-sm text-accent underline">
            Older posts
          </Link>
        </div>
      )}
    </>
  );
}
