"use client";

import { useState } from "react";
import Markdown, { defaultUrlTransform } from "react-markdown";
import { citationsToLinks } from "@/lib/citations";
import type { CitationMap } from "./useCitations";
import { VersePopup, type FoundPassage } from "./VersePopup";

// Renders model-written markdown safely: no raw HTML (react-markdown's default), no
// images, only https links, and [[citations]] as chips checked against real scripture.
// Tapping a chip opens the verse in a popup, so reading it doesn't leave the conversation.
export function CitedMarkdown({ text, citations }: { text: string; citations?: CitationMap }) {
  const [open, setOpen] = useState<FoundPassage | null>(null);
  return (
    <>
    <div className="md">
      <Markdown
        disallowedElements={["img"]}
        urlTransform={(url) => (url.startsWith("cite:") ? url : defaultUrlTransform(url))}
        components={{
          a: ({ href = "", children }) => {
            if (href.startsWith("cite:")) {
              const ref = decodeURIComponent(href.slice(5));
              const c = citations?.get(ref);
              if (!c) return <span className="rounded bg-hl px-1 font-medium">{ref}</span>;
              if (!c.found) {
                return (
                  <span title="This reference doesn't exist, so it was not shown" className="rounded px-1 text-muted line-through">
                    {ref}
                  </span>
                );
              }
              return (
                <button type="button" onClick={() => setOpen({ ...c })} className="rounded bg-hl px-1 font-medium text-accent hover:underline">
                  {c.reference}
                </button>
              );
            }
            if (!href.startsWith("https://")) return <>{children}</>;
            return (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline">
                {children}
              </a>
            );
          },
        }}
      >
        {citationsToLinks(text, citations ? [...citations.keys()] : [])}
      </Markdown>
    </div>
    {/* Outside .md, whose sibling margins would pull the dialog off center. */}
    <VersePopup passage={open} />
    </>
  );
}
