// Posts, comments, and reactions. Every member of the circle can read every post
// (SPEC D8: one circle for now). Writes that change or remove someone's content are
// scoped in the SQL itself to the author (or an admin), so a forged id can't touch
// another member's post or comment.
// Relative imports only, so tests can load this outside Next.js.
import { pool } from "./db";

export const REACTIONS = {
  heart: { emoji: "❤️", label: "Love" },
  pray: { emoji: "🙏", label: "Amen" },
  insight: { emoji: "💡", label: "Insight" },
} as const;
export type ReactionKind = keyof typeof REACTIONS;
export const REACTION_KINDS = Object.keys(REACTIONS) as ReactionKind[];

export type Actor = { id: string; role?: string | null };
const isAdmin = (actor: Actor) => actor.role === "admin";

export type FeedPost = {
  id: string;
  author_id: string;
  author_name: string;
  verse_id: string | null; // null for a post without a scripture
  end_verse_id: string | null;
  body: string;
  link_url: string | null;
  created_at: Date;
  edited_at: Date | null;
  comment_count: number;
  reaction_counts: Partial<Record<ReactionKind, number>>;
  my_reactions: ReactionKind[];
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: Date;
};

export const FEED_PAGE_SIZE = 30;

// $1 is always the viewer's user id (for my_reactions).
const POST_SELECT = `
  SELECT p.id, p.author_id, u.name AS author_name, p.verse_id, p.end_verse_id, p.body, p.link_url,
         p.created_at, p.edited_at,
         (SELECT count(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count,
         COALESCE((SELECT json_object_agg(k.kind, k.n)
                   FROM (SELECT kind, count(*)::int AS n FROM post_reactions r
                         WHERE r.post_id = p.id GROUP BY kind) k), '{}'::json) AS reaction_counts,
         COALESCE((SELECT array_agg(r.kind) FROM post_reactions r
                   WHERE r.post_id = p.id AND r.user_id = $1::text), '{}'::text[]) AS my_reactions
  FROM posts p
  JOIN "user" u ON u.id = p.author_id`;

export async function listFeed(viewerId: string, beforeId?: string) {
  const { rows } = await pool.query<FeedPost>(
    `${POST_SELECT}
     WHERE ($2::bigint IS NULL OR p.id < $2::bigint)
     ORDER BY p.id DESC
     LIMIT $3`,
    [viewerId, beforeId ?? null, FEED_PAGE_SIZE],
  );
  return rows;
}

export async function getPost(viewerId: string, postId: string) {
  const { rows } = await pool.query<FeedPost>(`${POST_SELECT} WHERE p.id = $2::bigint`, [viewerId, postId]);
  return rows[0] ?? null;
}

export type NewPost = { body: string; verseId: string | null; endVerseId?: string | null; linkUrl: string | null };

// The scripture is optional; the database refuses a post with neither text nor a scripture.
export async function createPost(input: NewPost & { authorId: string }) {
  const { rows } = await pool.query<{ id: string }>(
    "INSERT INTO posts (author_id, verse_id, end_verse_id, body, link_url) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [input.authorId, input.verseId, input.endVerseId ?? null, input.body, input.linkUrl],
  );
  return rows[0].id;
}

// Only the author can edit, never an admin rewriting someone else's words, and a forged id
// changes nothing. The database still refuses an edit that empties the post. Returns true
// only if a post was actually updated.
export async function updatePost(actor: Actor, postId: string, input: NewPost) {
  const { rowCount } = await pool.query(
    `UPDATE posts SET body = $3, verse_id = $4, end_verse_id = $5, link_url = $6, edited_at = now()
     WHERE id = $1::bigint AND author_id = $2::text`,
    [postId, actor.id, input.body, input.verseId, input.endVerseId ?? null, input.linkUrl],
  );
  return rowCount === 1;
}

// Returns true only if a post was actually deleted.
export async function deletePost(actor: Actor, postId: string) {
  const { rowCount } = await pool.query(
    "DELETE FROM posts WHERE id = $1::bigint AND (author_id = $2::text OR $3::boolean)",
    [postId, actor.id, isAdmin(actor)],
  );
  return rowCount === 1;
}

export async function listComments(postId: string) {
  const { rows } = await pool.query<PostComment>(
    `SELECT c.id, c.post_id, c.author_id, u.name AS author_name, c.body, c.created_at
     FROM comments c JOIN "user" u ON u.id = c.author_id
     WHERE c.post_id = $1::bigint
     ORDER BY c.created_at, c.id`,
    [postId],
  );
  return rows;
}

// Returns the new comment id, or null if the post doesn't exist.
export async function addComment(input: { authorId: string; postId: string; body: string }) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO comments (post_id, author_id, body)
     SELECT $1::bigint, $2::text, $3::text WHERE EXISTS (SELECT 1 FROM posts WHERE id = $1::bigint)
     RETURNING id`,
    [input.postId, input.authorId, input.body],
  );
  return rows[0]?.id ?? null;
}

// Returns the comment's post id if a comment was deleted, otherwise null.
export async function deleteComment(actor: Actor, commentId: string) {
  const { rows } = await pool.query<{ post_id: string }>(
    `DELETE FROM comments WHERE id = $1::bigint AND (author_id = $2::text OR $3::boolean)
     RETURNING post_id`,
    [commentId, actor.id, isAdmin(actor)],
  );
  return rows[0]?.post_id ?? null;
}

// Adds the reaction, or removes it if the user already had it. Returns true if it's now on.
export async function toggleReaction(userId: string, postId: string, kind: ReactionKind) {
  const removed = await pool.query(
    "DELETE FROM post_reactions WHERE post_id = $1::bigint AND user_id = $2::text AND kind = $3::text",
    [postId, userId, kind],
  );
  if (removed.rowCount) return false;
  const added = await pool.query(
    `INSERT INTO post_reactions (post_id, user_id, kind)
     SELECT $1::bigint, $2::text, $3::text WHERE EXISTS (SELECT 1 FROM posts WHERE id = $1::bigint)
     ON CONFLICT DO NOTHING`,
    [postId, userId, kind],
  );
  return added.rowCount === 1;
}
