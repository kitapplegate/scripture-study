"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createPostAction, type FormState } from "@/app/posts/actions";

export function ShareForm({ verseId, endVerseId, backHref }: { verseId: string; endVerseId: string; backHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPostAction, {});
  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="verseId" value={verseId} />
      <input type="hidden" name="endVerseId" value={endVerseId} />
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Your thoughts (optional)</span>
        <textarea
          name="body"
          rows={5}
          maxLength={5000}
          placeholder="What stood out to you?"
          className="w-full rounded-lg border border-control bg-card px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Link to a conference talk or article (optional)</span>
        <input
          name="linkUrl"
          type="url"
          maxLength={500}
          placeholder="https://www.churchofjesuschrist.org/study/general-conference/…"
          className="w-full rounded-lg border border-control bg-card px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      {state.error && <p role="alert" className="text-sm text-error">{state.error}</p>}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-60">
          {pending ? "Sharing…" : "Share with family"}
        </button>
        <Link href={backHref} className="text-sm text-muted hover:text-accent">Cancel</Link>
      </div>
    </form>
  );
}
