"use client";

import Link from "next/link";
import { useState } from "react";
import type { RefLink, Verse } from "@/lib/scriptures";

export type ReaderVerse = Omit<Verse, "xrefs"> & { xrefs?: RefLink[] };

// Tap a verse to open its panel. For now the panel holds cross-references and
// "copy"; later it's where highlighting, notes, and sharing go.
export function ChapterReader({ reference, verses }: { reference: string; verses: ReaderVerse[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  async function copy(v: ReaderVerse) {
    await navigator.clipboard.writeText(`${v.text}\n— ${reference}:${v.verse}`);
    setCopiedId(v.id);
    setTimeout(() => setCopiedId((cur) => (cur === v.id ? null : cur)), 1500);
  }

  return (
    <ol className="mt-6 space-y-1 font-serif text-[1.15rem] leading-relaxed">
      {verses.map((v) => {
        const open = openId === v.id;
        return (
          <li key={v.id} id={`v${v.verse}`} className="verse scroll-mt-20 rounded-lg">
            {v.heading && <h2 className="mt-6 text-center text-lg font-semibold">{v.heading}</h2>}
            {v.subheading && <p className="mb-2 text-center text-base italic text-muted">{v.subheading}</p>}
            <p
              className={`cursor-pointer rounded-lg px-2 py-1 ${open ? "bg-hl" : "hover:bg-hl/50"}`}
              onClick={() => {
                // Don't hijack a text selection.
                if (!window.getSelection()?.toString()) toggle(v.id);
              }}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-label={`Verse ${v.verse} options`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(v.id);
                }}
                className="mr-1.5 align-top font-sans text-xs font-semibold text-accent"
              >
                {v.verse}
              </button>
              {v.pilcrow && <span className="mr-1 text-muted">¶</span>}
              {v.text}
            </p>
            {open && (
              <div className="mx-2 mb-3 mt-1 rounded-lg border border-line bg-card p-3 font-sans text-sm">
                {v.xrefs && v.xrefs.length > 0 && (
                  <>
                    <div className="mb-2 text-xs uppercase tracking-wide text-muted">Cross-references</div>
                    <ul className="mb-3 flex flex-wrap gap-2">
                      {v.xrefs.map((x) => (
                        <li key={x.href + x.label}>
                          <Link href={x.href} className="rounded-md border border-line px-2 py-1 hover:border-accent hover:text-accent">
                            {x.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/share?v=${v.id}`}
                    className="rounded-md border border-accent px-2 py-1 text-accent hover:bg-hl"
                  >
                    Share
                  </Link>
                  <button
                    type="button"
                    onClick={() => copy(v)}
                    className="rounded-md border border-line px-2 py-1 hover:border-accent hover:text-accent"
                  >
                    {copiedId === v.id ? "Copied" : "Copy verse"}
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
