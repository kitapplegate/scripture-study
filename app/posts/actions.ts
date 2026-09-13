"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as posts from "@/lib/posts";
import { getPassage } from "@/lib/scriptures";
import { requireUser } from "@/lib/session";

const dbId = z.string().regex(/^\d{1,18}$/);

const createSchema = z.object({
  verseId: z.string().max(40),
  endVerseId: z.string().max(40).optional(),
  body: z.string().trim().max(5000, "Keep it under 5,000 characters."),
  linkUrl: z
    .union([z.literal(""), z.url({ protocol: /^https$/, error: "Links must be a full https:// address." }).max(500)])
    .optional(),
});

export type FormState = { error?: string };

export async function createPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const passage = await getPassage(parsed.data.verseId, parsed.data.endVerseId || null);
  if (!passage) return { error: "That verse wasn't found." };

  await posts.createPost({
    authorId: user.id,
    verseId: passage.id,
    endVerseId: passage.endId ?? null,
    body: parsed.data.body,
    linkUrl: parsed.data.linkUrl || null,
  });
  revalidatePath("/feed");
  revalidatePath("/");
  redirect("/");
}

export async function deletePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = dbId.parse(formData.get("postId"));
  await posts.deletePost(user, postId);
  revalidatePath("/feed");
  revalidatePath("/");
  // Only two places to return to; never an arbitrary URL from the form.
  redirect(formData.get("returnTo") === "/" ? "/" : "/feed");
}

const commentSchema = z.object({
  postId: dbId,
  body: z.string().trim().min(1, "Write a comment first.").max(2000, "Keep it under 2,000 characters."),
});

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the comment and try again." };

  const created = await posts.addComment({ authorId: user.id, postId: parsed.data.postId, body: parsed.data.body });
  if (!created) return { error: "That post no longer exists." };
  revalidatePath(`/posts/${parsed.data.postId}`);
  revalidatePath("/feed");
  revalidatePath("/");
  return {};
}

export async function deleteCommentAction(formData: FormData) {
  const user = await requireUser();
  const commentId = dbId.parse(formData.get("commentId"));
  const postId = await posts.deleteComment(user, commentId);
  if (postId) revalidatePath(`/posts/${postId}`);
  revalidatePath("/feed");
  revalidatePath("/");
}

const reactionSchema = z.object({ postId: dbId, kind: z.enum(posts.REACTION_KINDS) });

export async function toggleReactionAction(formData: FormData) {
  const user = await requireUser();
  const { postId, kind } = reactionSchema.parse(Object.fromEntries(formData));
  await posts.toggleReaction(user.id, postId, kind);
  revalidatePath("/feed");
  revalidatePath("/");
  revalidatePath(`/posts/${postId}`);
}
