"use client";

import { useActionState } from "react";
import { createPostAction, type FormState } from "@/app/posts/actions";

// A free-form family post: write anything, and optionally add a scripture or a link.
// After an error, React resets the form to its default values, so the defaults are what
// was just submitted, and nothing typed is lost.
export function PostComposer({ defaultReference = "", returnTo = "/" }: { defaultReference?: string; returnTo?: "/" | "/feed" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPostAction, {});
  const values = state.values;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Write a post</span>
        <textarea
          name="body"
          rows={3}
          maxLength={5000}
          defaultValue={values?.body ?? ""}
          placeholder="A thought, a question, something that stood out to you…"
          className="w-full rounded-lg border border-control bg-card px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Add a scripture (optional)</span>
        <input
          name="reference"
          maxLength={80}
          defaultValue={values?.reference ?? defaultReference}
          placeholder="Alma 32:21 or Moroni 10:4-5"
          className="w-full rounded-lg border border-control bg-card px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      <details open={Boolean(values?.linkUrl)} className="text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center text-muted hover:text-accent">Add a link (optional)</summary>
        <input
          name="linkUrl"
          type="url"
          maxLength={500}
          defaultValue={values?.linkUrl ?? ""}
          aria-label="Link to a conference talk or article"
          placeholder="https://www.churchofjesuschrist.org/study/…"
          className="w-full rounded-lg border border-control bg-card px-3 py-2 text-base outline-none focus:border-accent"
        />
      </details>
      {state.error && <p role="alert" className="text-sm text-error">{state.error}</p>}
      <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-60">
        {pending ? "Posting…" : "Post"}
      </button>
    </form>
  );
}
