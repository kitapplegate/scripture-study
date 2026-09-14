"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { clearChat, loadChat, saveChat } from "@/lib/assistant-history";
import { CitationPanel } from "./CitationPanel";
import { CitedMarkdown } from "./CitedMarkdown";
import { useCitations } from "./useCitations";

const transport = new DefaultChatTransport({ api: "/api/assistant" });

const STARTERS = [
  "Scriptures about enduring hard times",
  "Verses on keeping the Sabbath day holy",
  "What does the Book of Mormon teach about grace?",
];

// Errors from our route arrive as the raw response body ({"error": "..."}).
function friendlyError(error: Error) {
  try {
    return (JSON.parse(error.message) as { error?: string }).error ?? error.message;
  } catch {
    return error.message || "Something went wrong. Try again.";
  }
}

// sessionStorage can be missing or throw (private windows, blocked site data).
function tabStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

// `compact` is the home-page panel: fewer starters, and the conversation scrolls inside
// the panel instead of moving the whole page. The conversation is saved in the tab per
// member (lib/assistant-history.ts), so the home panel and the full page share it, and
// reading a verse or pressing Back doesn't lose it.
export function AssistantChat({ compact = false, userId }: { compact?: boolean; userId: string }) {
  const [input, setInput] = useState("");
  const { messages, setMessages, sendMessage, status, stop, error, regenerate } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  const [restored, setRestored] = useState(false);
  const restoredFor = useRef<string | null>(null);

  // Bring back this member's conversation from earlier in this tab. Loaded after mount,
  // because storage doesn't exist during the server render.
  useEffect(() => {
    if (restoredFor.current === userId) return;
    restoredFor.current = userId;
    const saved = loadChat<UIMessage>(tabStorage(), userId);
    if (saved.messages.length > 0) setMessages(saved.messages);
    if (saved.draft) setInput(saved.draft);
    setRestored(true);
  }, [userId, setMessages]);

  // Save when an answer finishes and as the draft changes; never a half-streamed answer.
  useEffect(() => {
    if (restored && !busy) saveChat(tabStorage(), userId, { messages, draft: input });
  }, [restored, busy, messages, input, userId]);

  function startOver() {
    setMessages([]);
    setInput("");
    clearChat(tabStorage(), userId);
  }
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!compact) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [compact, messages.length, status]);

  // Compact: follow the answer as it streams, inside the panel only.
  useEffect(() => {
    if (compact && scrollBox.current) scrollBox.current.scrollTop = scrollBox.current.scrollHeight;
  }, [compact, messages]);

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text: text.trim() });
    setInput("");
  }

  return (
    <div>
      {messages.length === 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {STARTERS.slice(0, compact ? 2 : 3).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className={`min-h-11 rounded-full border border-control px-3 py-1.5 text-left text-sm hover:border-accent ${compact ? "bg-bg" : "bg-card"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && !busy && (
        <div className="-mt-2 mb-1 flex justify-end">
          <button type="button" onClick={startOver} className="min-h-11 px-2 text-sm text-muted hover:text-accent">
            Start over
          </button>
        </div>
      )}

      <div ref={scrollBox} className={compact ? "max-h-[32rem] space-y-4 overflow-y-auto pr-1" : "space-y-4"}>
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-xl bg-hl px-4 py-2">
              {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
            </div>
          ) : (
            <AssistantMessage key={m.id} message={m} done={!busy || i < messages.length - 1} compact={compact} />
          ),
        )}
        {status === "submitted" && <p className="text-sm text-muted">Thinking…</p>}
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-error p-3 text-sm text-error">
          {friendlyError(error)}{" "}
          <button onClick={() => regenerate()} className="underline">Try again</button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className={compact ? "mt-4 flex gap-2" : "sticky bottom-0 mt-6 flex gap-2 bg-bg py-3"}
      >
        <label htmlFor={compact ? "assistant-input-compact" : "assistant-input"} className="sr-only">Message</label>
        <textarea
          id={compact ? "assistant-input-compact" : "assistant-input"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder="What scriptures are you looking for?"
          className={`min-w-0 flex-1 resize-none rounded-lg border border-control px-3 py-2 outline-none focus:border-accent ${compact ? "bg-bg" : "bg-card"}`}
        />
        {busy ? (
          <button type="button" onClick={() => stop()} className="rounded-lg border border-control px-4">Stop</button>
        ) : (
          <button type="submit" disabled={!input.trim()} className="rounded-lg bg-accent px-4 font-medium text-bg disabled:opacity-50">
            Send
          </button>
        )}
      </form>
      <div ref={bottomRef} />
    </div>
  );
}

type ToolPart = {
  type: string;
  state: string;
  input?: { queries?: string[]; references?: string[] };
  output?: { results?: unknown[]; passages?: { found: boolean }[] };
};

function ToolChip({ part }: { part: ToolPart }) {
  const name = part.type.slice("tool-".length);
  const done = part.state === "output-available";
  const failed = part.state === "output-error";
  const queries = part.input?.queries?.join("”, “") ?? "…";
  const missing = part.output?.passages?.filter((p) => !p.found).length ?? 0;
  const label =
    name === "searchScriptures"
      ? `${done ? "Searched" : "Searching"} “${queries}”${done ? ` · ${part.output?.results?.length ?? 0} found` : ""}`
      : name === "readPassages"
        ? `${done ? "Read" : "Reading"} ${part.input?.references?.join(", ") ?? "…"}${done && missing ? ` · ${missing} not found` : ""}`
        : name;
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${failed ? "border-error text-error" : "border-line text-muted"}`}>
      {failed ? `${label} · failed` : label}
    </span>
  );
}

function AssistantMessage({ message, done, compact }: { message: UIMessage; done: boolean; compact: boolean }) {
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n\n");
  const reasoning = message.parts.map((p) => (p.type === "reasoning" ? p.text : "")).join("");
  const tools = message.parts.filter((p) => p.type.startsWith("tool-")) as unknown as ToolPart[];
  const citations = useCitations(text, done);

  return (
    <div className={`rounded-xl border border-line p-4 ${compact ? "bg-bg" : "bg-card"}`}>
      {reasoning && (
        <details className="mb-2 text-sm">
          <summary className="cursor-pointer text-xs text-muted">{done ? "How it thought about this" : "Thinking…"}</summary>
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted">{reasoning}</p>
        </details>
      )}
      {tools.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tools.map((t, i) => (
            <ToolChip key={i} part={t} />
          ))}
        </div>
      )}
      {text && <CitedMarkdown text={text} citations={citations} />}
      {done && <CitationPanel citations={citations} />}
    </div>
  );
}
