"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { preparePost } from "@/lib/post-input";
import * as posts from "@/lib/posts";
import { requireUser } from "@/lib/session";

const dbId = z.string().regex(/^\d{1,18}$/);

// Loose shape only; lib/post-input.ts does the real checks (and the tests cover it).
const createSchema = z.object({
  body: z.string().max(10000).optional(),
  reference: z.string().max(200).optional(),
  linkUrl: z.string().max(1000).optional(),
  returnTo: z.string().max(10).optional(),
});

export type FormState = { error?: string; values?: { body: string; reference: string; linkUrl: string } };

export async function createPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the form and try again." };
  const { body = "", reference = "", linkUrl = "", returnTo } = parsed.data;

  const prepared = await preparePost({ body, reference, linkUrl });
  // Send back what was typed, so the form keeps it after an error.
  if (!prepared.ok) return { error: prepared.error, values: { body, reference, linkUrl } };

  await posts.createPost({ authorId: user.id, ...prepared.post });
  revalidatePath("/feed");
  revalidatePath("/");
  // Only two places to return to; never an arbitrary URL from the form.
  redirect(returnTo === "/feed" ? "/feed" : "/");
}

const updateSchema = createSchema.extend({ postId: dbId });

export async function updatePostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the form and try again." };
  const { postId, body = "", reference = "", linkUrl = "" } = parsed.data;

  const prepared = await preparePost({ body, reference, linkUrl });
  if (!prepared.ok) return { error: prepared.error, values: { body, reference, linkUrl } };

  if (!(await posts.updatePost(user, postId, prepared.post))) {
    return { error: "Only the person who wrote this post can edit it.", values: { body, reference, linkUrl } };
  }
  revalidatePath("/feed");
  revalidatePath("/");
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}`);
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
