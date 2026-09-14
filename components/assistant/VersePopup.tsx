"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import type { PassageResult } from "@/app/api/passages/route";
import { AddToTalkButton } from "@/components/talk-builder/AddToTalkButton";

export type FoundPassage = Extract<PassageResult, { found: true }>;

// Read a cited scripture without leaving the conversation. A native <dialog>: Esc or a tap
// outside closes it, and keyboard focus stays inside while it's open. The text comes from
// our own data (the checked citation), never from the model.
// Closing only closes the dialog; it never reports back. Pass a new object on every tap so
// the same verse reopens. (Syncing close back to React state raced: a late `close` event
// after Escape could swallow the next tap.)
export function VersePopup({ passage }: { passage: FoundPassage | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId(); // one popup per answer and per citation list, so ids must differ

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (passage && !d.open) d.showModal();
    if (!passage && d.open) d.close();
  }, [passage]);

  return (
    <dialog
      ref={dialog}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close(); // the backdrop
      }}
      aria-labelledby={titleId}
      className="m-auto max-h-[85dvh] w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-line bg-card p-0 text-fg shadow-xl backdrop:bg-black/50"
    >
      {passage && (
        <div className="p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h2 id={titleId} className="pt-2 font-serif text-xl font-semibold">
              {passage.reference}
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="-mr-2 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-2xl leading-none text-muted hover:text-accent"
            >
              ×
            </button>
          </div>
          <p className="max-h-[55dvh] overflow-y-auto font-serif text-[1.1rem] leading-relaxed">
            {passage.verses.map((v) => (
              <span key={v.verse}>
                {passage.verses.length > 1 && <sup className="mr-0.5 font-sans text-xs text-accent">{v.verse}</sup>}
                {v.text}{" "}
              </span>
            ))}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <AddToTalkButton verseId={passage.id} endVerseId={passage.endId ?? null} reference={passage.reference} />
            <Link
              href={passage.href}
              className="inline-flex min-h-11 items-center rounded-md border border-control px-3 text-sm hover:border-accent hover:text-accent"
            >
              Read the chapter
            </Link>
          </div>
        </div>
      )}
    </dialog>
  );
}
