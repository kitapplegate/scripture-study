"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { PassageResult } from "@/app/api/passages/route";
import { saveTalkAction, type SaveTalkState } from "@/app/talks/actions";
import { CitationPanel } from "@/components/assistant/CitationPanel";
import { CitedMarkdown } from "@/components/assistant/CitedMarkdown";
import { useCitations } from "@/components/assistant/useCitations";
import { CITATION_RE } from "@/lib/citations";

type TalkDraft = { id: string; title: string; kind: "talk" | "lesson"; minutes: number | null; audience: string | null; body: string };

const inputClass = "w-full rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent";

export function TalkEditor({ talk }: { talk: TalkDraft }) {
  const [state, action, pending] = useActionState<SaveTalkState, FormData>(saveTalkAction, {});
  const [body, setBody] = useState(talk.body);
  const [tab, setTab] = useState<"write" | "preview">(talk.body ? "preview" : "write");
  const [ref, setRef] = useState("");
  const [refError, setRefError] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // The server canonicalizes citations and removes made-up ones on save; show its version.
  useEffect(() => {
    if (state.body !== undefined) setBody(state.body);
  }, [state]);

  const citations = useCitations(body, tab === "preview");
  const words = body.replace(CITATION_RE, "").split(/\s+/).filter(Boolean).length;

  async function insertScripture() {
    setRefError(null);
    const res = await fetch(`/api/passages?ref=${encodeURIComponent(ref)}`);
    const [result] = ((await res.json()) as { results: PassageResult[] }).results;
    if (!result?.found) {
      setRefError(`Couldn't find “${ref}”. Try something like Alma 32:21 or Moroni 10:4-5.`);
      return;
    }
    const el = textarea.current;
    const at = el?.selectionStart ?? body.length;
    const token = `[[${result.reference}]]`;
    setBody(body.slice(0, at) + token + body.slice(at));
    setRef("");
    setTab("write");
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={talk.id} />
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Title</span>
        <input name="title" defaultValue={talk.title} required maxLength={200} className={`${inputClass} font-serif text-xl`} />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Type</span>
          <select name="kind" defaultValue={talk.kind} className={inputClass}>
            <option value="talk">Talk</option>
            <option value="lesson">Lesson</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Minutes</span>
          <input name="minutes" type="number" min={1} max={120} defaultValue={talk.minutes ?? ""} className={inputClass} />
        </label>
        <label className="col-span-2 block">
          <span className="mb-1 block text-sm text-muted">Audience</span>
          <input name="audience" defaultValue={talk.audience ?? ""} maxLength={200} placeholder="Sacrament meeting, youth…" className={inputClass} />
        </label>
      </div>

      <div className="rounded-xl border border-line bg-card p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" className="inline-flex rounded-lg border border-line p-0.5 text-sm">
            {(["write", "preview"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1 ${tab === t ? "bg-accent text-bg" : "text-muted"}`}
              >
                {t === "write" ? "Write" : "Preview"}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 justify-end gap-2">
            <label htmlFor="insert-ref" className="sr-only">Insert scripture</label>
            <input
              id="insert-ref"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (ref.trim()) insertScripture();
                }
              }}
              maxLength={80}
              placeholder="Insert scripture: Alma 32:21"
              className="min-w-0 max-w-56 flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-sm outline-none focus:border-accent"
            />
            <button type="button" onClick={insertScripture} disabled={!ref.trim()} className="rounded-lg border border-line px-3 py-1 text-sm disabled:opacity-50">
              Insert
            </button>
          </div>
        </div>
        {refError && <p role="alert" className="mb-2 text-sm text-red-700 dark:text-red-400">{refError}</p>}

        {/* The textarea stays mounted (hidden in preview) so the form always submits the body. */}
        <textarea
          ref={textarea}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          maxLength={50000}
          placeholder={"# Title\n\n## Opening\n…\n\nCite scriptures like [[Moroni 7:45]]"}
          className={`${inputClass} font-mono text-sm leading-relaxed ${tab === "write" ? "" : "hidden"}`}
        />
        {tab === "preview" && (
          <div className="min-h-40 px-1">
            {body.trim() ? <CitedMarkdown text={body} citations={citations} /> : <p className="text-sm text-muted">Nothing written yet.</p>}
            <CitationPanel citations={citations} />
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          {words} words · about {Math.max(1, Math.round(words / 130))} min read aloud
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
        {state.error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
        {state.savedAt && !state.error && (
          <p className="text-sm text-muted">
            Saved.
            {state.removed ? ` ${state.removed} reference${state.removed === 1 ? "" : "s"} that didn't match a real verse ${state.removed === 1 ? "was" : "were"} removed.` : ""}
          </p>
        )}
      </div>
    </form>
  );
}
