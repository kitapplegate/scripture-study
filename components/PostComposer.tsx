"use client";

import { useActionState } from "react";
import { createPostAction, updatePostAction, type FormState } from "@/app/posts/actions";

// A free-form family post: write anything, and optionally add a scripture or a link.
// With `postId` it edits that post instead (pre-filled; only the author can save).
// After an error, React resets the form to its default values, so the defaults are what
// was just submitted, and nothing typed is lost.
export function PostComposer({
  defaultReference = "",
  defaultBody = "",
  defaultLinkUrl = "",
  returnTo = "/",
  postId,
}: {
  defaultReference?: string;
  defaultBody?: string;
  defaultLinkUrl?: string;
  returnTo?: "/" | "/feed";
  postId?: string;
}) {
  const editing = Boolean(postId);
  const [state, action, pending] = useActionState<FormState, FormData>(editing ? updatePostAction : createPostAction, {});
  const values = state.values;
  const linkUrl = values?.linkUrl ?? defaultLinkUrl;

  return (
    <form action={action} className="space-y-3">
      {postId ? <input type="hidden" name="postId" value={postId} /> : <input type="hidden" name="returnTo" value={returnTo} />}
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{editing ? "Your post" : "Write a post"}</span>
        <textarea
          name="body"
          rows={editing ? 6 : 3}
          maxLength={5000}
          defaultValue={values?.body ?? defaultBody}
          placeholder="A thought, a question, something that stood out to you…"
          className="w-full rounded-lg border border-control bg-card px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{editing ? "Scripture (optional; clear it to remove)" : "Add a scripture (optional)"}</span>
        <input
          name="reference"
          maxLength={80}
          defaultValue={values?.reference ?? defaultReference}
          placeholder="Alma 32:21 or Moroni 10:4-5"
          className="w-full rounded-lg border border-control bg-card px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      <details open={Boolean(linkUrl)} className="text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center text-muted hover:text-accent">
          {editing ? "Link (optional)" : "Add a link (optional)"}
        </summary>
        <input
          name="linkUrl"
          type="url"
          maxLength={500}
          defaultValue={linkUrl}
          aria-label="Link to a conference talk or article"
          placeholder="https://www.churchofjesuschrist.org/study/…"
          className="w-full rounded-lg border border-control bg-card px-3 py-2 text-base outline-none focus:border-accent"
        />
      </details>
      {state.error && <p role="alert" className="text-sm text-error">{state.error}</p>}
      <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-60">
        {pending ? (editing ? "Saving…" : "Posting…") : editing ? "Save changes" : "Post"}
      </button>
    </form>
  );
}
