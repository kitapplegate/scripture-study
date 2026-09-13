"use client";

import Link from "next/link";
import type { CitationMap } from "./useCitations";

export function CitationPanel({ citations }: { citations?: CitationMap }) {
  if (!citations || citations.size === 0) return null;
  const all = [...citations.values()];
  const found = all.filter((c) => c.found);
  const missing = all.length - found.length;

  return (
    <details open={found.length <= 4} className="mt-3 rounded-lg border border-line bg-bg p-3 text-sm">
      <summary className="cursor-pointer text-xs uppercase tracking-wide text-muted">
        Scriptures cited ({found.length})
      </summary>
      <ul className="mt-2 space-y-3">
        {found.map((c) =>
          c.found ? (
            <li key={c.ref}>
              <Link href={c.href} className="font-medium text-accent hover:underline">{c.reference}</Link>
              <p className="mt-1 font-serif leading-relaxed">
                {c.verses.map((v) => (
                  <span key={v.verse}>
                    {c.verses.length > 1 && <sup className="mr-0.5 font-sans text-[0.65rem] text-accent">{v.verse}</sup>}
                    {v.text}{" "}
                  </span>
                ))}
              </p>
            </li>
          ) : null,
        )}
      </ul>
      {missing > 0 && (
        <p className="mt-3 text-xs text-muted">
          {missing === 1 ? "1 reference" : `${missing} references`} in this answer didn't match a real verse and
          {missing === 1 ? " is" : " are"} shown struck out. Don't rely on {missing === 1 ? "it" : "them"}.
        </p>
      )}
    </details>
  );
}
