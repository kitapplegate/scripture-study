"use client";

import { useState } from "react";
import { AddToTalkButton } from "@/components/talk-builder/AddToTalkButton";
import type { CitationMap } from "./useCitations";
import { VersePopup, type FoundPassage } from "./VersePopup";

// The verified scriptures from an assistant answer, each with "Add to talk". Only
// members can use the assistant, so the button always shows here.
export function CitationPanel({ citations }: { citations?: CitationMap }) {
  const [open, setOpen] = useState<FoundPassage | null>(null);
  if (!citations || citations.size === 0) return null;
  const all = [...citations.values()];
  const found = all.flatMap((c) => (c.found ? [c] : []));
  const missing = all.length - found.length;

  return (
    <>
    <details open={found.length <= 4} className="mt-3 rounded-lg border border-line bg-bg p-3 text-sm">
      <summary className="cursor-pointer text-xs uppercase tracking-wide text-muted">
        Scriptures cited ({found.length})
      </summary>
      <ul className="mt-2 space-y-3">
        {found.map((c) => (
          <li key={c.ref}>
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => setOpen({ ...c })} className="pt-1 text-left font-medium text-accent hover:underline">{c.reference}</button>
              <AddToTalkButton verseId={c.id} endVerseId={c.endId ?? null} reference={c.reference} align="right" />
            </div>
            <p className="mt-1 font-serif leading-relaxed">
              {c.verses.map((v) => (
                <span key={v.verse}>
                  {c.verses.length > 1 && <sup className="mr-0.5 font-sans text-[0.65rem] text-accent">{v.verse}</sup>}
                  {v.text}{" "}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
      {missing > 0 && (
        <p className="mt-3 text-xs text-muted">
          {missing === 1 ? "1 reference" : `${missing} references`} in this answer didn't match a real verse and
          {missing === 1 ? " is" : " are"} shown struck out. Don't rely on {missing === 1 ? "it" : "them"}.
        </p>
      )}
    </details>
    <VersePopup passage={open} />
    </>
  );
}
