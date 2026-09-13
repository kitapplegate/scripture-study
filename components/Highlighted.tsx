import { MARK_END, MARK_START } from "@/lib/search";

// Renders search-highlighted text as React nodes — never as HTML.
export function Highlighted({ text }: { text: string }) {
  const pattern = new RegExp(`(${MARK_START}[^${MARK_END}]*${MARK_END})`);
  return (
    <>
      {text.split(pattern).map((part, i) =>
        part.startsWith(MARK_START) ? (
          <mark key={i} className="rounded bg-hl px-0.5 text-fg">
            {part.slice(1, -1)}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
