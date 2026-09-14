"use client";

import { useActionState } from "react";
import { addCommentAction, type FormState } from "@/app/posts/actions";

export function CommentForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addCommentAction, {});
  return (
    <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <textarea
        name="body"
        rows={3}
        maxLength={2000}
        required
        placeholder="Add a comment"
        className="w-full rounded-lg border border-control bg-card px-3 py-2 outline-none focus:border-accent"
      />
      {state.error && <p role="alert" className="text-sm text-error">{state.error}</p>}
      <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-60">
        {pending ? "Posting…" : "Comment"}
      </button>
    </form>
  );
}
