"use client";

import { useEffect, useState } from "react";
import type { PassageResult } from "@/app/api/passages/route";

export type CitationMap = Map<string, PassageResult>;

// Asks the server to find and check every scripture reference in `text` — [[bracketed]]
// or plain. Until it answers, bracketed citations render as plain chips; afterwards
// real references link to the verse and made-up ones are struck out.
export function useCitations(text: string, enabled: boolean) {
  const [map, setMap] = useState<CitationMap>();

  useEffect(() => {
    if (!enabled || !text.trim()) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch("/api/passages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then((r) => r.json() as Promise<{ results?: PassageResult[] }>)
        .then((d) => {
          if (!cancelled && d.results) setMap(new Map(d.results.map((x) => [x.ref, x])));
        })
        .catch(() => {});
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, enabled]);

  return map;
}
