"use client";

import Link from "next/link";
import Markdown, { defaultUrlTransform } from "react-markdown";
import { citationsToLinks } from "@/lib/citations";
import type { CitationMap } from "./useCitations";

// Renders model-written markdown safely: no raw HTML (react-markdown's default), no
// images, only https links, and [[citations]] as chips checked against real scripture.
export function CitedMarkdown({ text, citations }: { text: string; citations?: CitationMap }) {
  return (
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
                <Link href={c.href} className="rounded bg-hl px-1 font-medium text-accent hover:underline">
                  {c.reference}
                </Link>
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
  );
}
