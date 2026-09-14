"use client";

// "Add to talk": puts a scripture at the end of one of your talks (or a new one) as a
// scripture capsule. Used in the reader, search results, and the study assistant's
// cited scriptures. No AI involved.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { addScriptureToTalkAction, listMyTalksAction } from "@/app/talks/actions";

const LAST_TALK_KEY = "scripture-study:last-talk";

function readLastTalk() {
  try {
    return window.localStorage.getItem(LAST_TALK_KEY);
  } catch {
    return null;
  }
}

function rememberTalk(id: string) {
  try {
    window.localStorage.setItem(LAST_TALK_KEY, id);
  } catch {
    // private window or storage blocked: the menu just won't remember
  }
}

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done"; talkId: string; title: string }
  | { kind: "error"; message: string };

export function AddToTalkButton({
  verseId,
  endVerseId = null,
  reference,
  align = "left",
}: {
  verseId: string;
  endVerseId?: string | null;
  reference: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [talks, setTalks] = useState<{ id: string; title: string }[] | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const box = useRef<HTMLDivElement>(null);
  const busy = status.kind === "busy";

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle() {
    const opening = !open;
    setOpen(opening);
    setStatus({ kind: "idle" });
    if (!opening || talks) return;
    try {
      const list = await listMyTalksAction();
      const last = readLastTalk();
      // The talk you added to last goes first.
      setTalks(last ? [...list.filter((t) => t.id === last), ...list.filter((t) => t.id !== last)] : list);
    } catch {
      setStatus({ kind: "error", message: "Couldn't load your talks. Try again." });
    }
  }

  async function add(talkId: string | null) {
    setStatus({ kind: "busy" });
    const result = await addScriptureToTalkAction({ talkId, verseId, endVerseId }).catch(() => null);
    if (result?.ok) {
      rememberTalk(result.talkId);
      setStatus({ kind: "done", talkId: result.talkId, title: result.title });
      setTalks(null); // reload next time, in case a new talk was created
    } else {
      setStatus({ kind: "error", message: result && !result.ok ? result.error : "Couldn't add it. Try again." });
    }
  }

  return (
    <div ref={box} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="inline-flex min-h-11 items-center rounded-md border border-control px-3 py-1 text-sm hover:border-accent hover:text-accent"
      >
        Add to talk
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`Add ${reference} to a talk`}
          className={`absolute z-30 mt-1 w-64 max-w-[80vw] rounded-lg border border-line bg-card p-2 text-sm shadow-lg ${align === "right" ? "right-0" : "left-0"}`}
        >
          {status.kind === "done" ? (
            <p className="px-1 py-1" role="status">
              Added {reference} to{" "}
              <Link href={`/talks/${status.talkId}`} className="font-medium text-accent underline">
                {status.title}
              </Link>
              .
            </p>
          ) : (
            <>
              <p className="mb-1 px-1 text-xs text-muted">Add {reference} to…</p>
              {talks === null && status.kind !== "error" && <p className="px-1 py-1 text-muted">Loading your talks…</p>}
              {talks && talks.length > 0 && (
                <ul className="max-h-56 overflow-y-auto">
                  {talks.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={busy}
                        onClick={() => add(t.id)}
                        className="min-h-11 w-full truncate rounded px-2 py-1.5 text-left hover:bg-hl disabled:opacity-50"
                      >
                        {t.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => add(null)}
                className="mt-1 min-h-11 w-full rounded px-2 py-1.5 text-left text-accent hover:bg-hl disabled:opacity-50"
              >
                + New talk
              </button>
              {busy && <p className="mt-1 px-1 text-xs text-muted">Adding…</p>}
              {status.kind === "error" && (
                <p role="alert" className="mt-1 px-1 text-xs text-error">
                  {status.message}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
