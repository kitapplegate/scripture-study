"use client";

// The talk builder: capsules (section heading, scripture, thought, link) in one ordered
// list. Drag the ⠿ handle to reorder with a mouse, a finger (short press), or the
// keyboard. Every change saves automatically. No AI is involved (SPEC principle 8).
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type TextareaHTMLAttributes } from "react";
import {
  addTalkItemAction,
  deleteTalkItemAction,
  reorderTalkItemsAction,
  updateTalkDetailsAction,
  updateTalkItemAction,
} from "@/app/talks/actions";
import type { TalkItem, TalkItemKind } from "@/lib/talk-items";

export type TalkDetailsDraft = { title: string; kind: "talk" | "lesson"; minutes: number | null; audience: string };
type SaveState = "idle" | "saving" | "saved" | "error";
type Patch = { body?: string; url?: string };
type NewItemInput =
  | { kind: "scripture"; reference: string }
  | { kind: "thought" }
  | { kind: "heading" }
  | { kind: "link"; url: string; body: string };

const SAVE_DELAY_MS = 700;
const KIND_LABEL: Record<TalkItemKind, string> = { heading: "Section", scripture: "Scripture", thought: "Thought", link: "Link" };
const KIND_STRIPE: Record<TalkItemKind, string> = {
  heading: "border-l-accent",
  scripture: "border-l-accent/50",
  thought: "border-l-line",
  link: "border-l-muted",
};

const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

function isHttps(url: string) {
  if (!/^https:\/\//i.test(url)) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// What gets saved for a capsule: its text, plus its link only once the link is valid.
const patchFor = (item: TalkItem): Patch => ({
  body: item.body,
  ...(item.kind === "link" && item.url && isHttps(item.url) ? { url: item.url } : {}),
});

export function TalkBuilder({
  talkId,
  initialDetails,
  initialItems,
}: {
  talkId: string;
  initialDetails: TalkDetailsDraft;
  initialItems: TalkItem[];
}) {
  const [details, setDetails] = useState(initialDetails);
  const [items, setItems] = useState(initialItems);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const itemsRef = useRef(items);
  const inFlight = useRef(0);
  const itemTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const detailsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (inFlight.current > 0 || itemTimers.current.size > 0 || detailsTimer.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Navigating away inside the app: send any edits still waiting on their timer.
  useEffect(() => {
    const timers = itemTimers.current;
    return () => {
      for (const [itemId, timer] of timers) {
        clearTimeout(timer);
        const item = itemsRef.current.find((i) => i.id === itemId);
        if (item) void updateTalkItemAction(talkId, itemId, patchFor(item));
      }
      timers.clear();
    };
  }, [talkId]);

  async function save<T extends { ok: boolean }>(work: () => Promise<T>, failMessage: string): Promise<T | null> {
    inFlight.current += 1;
    setSaveState("saving");
    let result: T | null = null;
    try {
      result = await work();
    } catch {
      result = null;
    }
    inFlight.current -= 1;
    if (!result?.ok) {
      setError((result as { error?: string } | null)?.error ?? failMessage);
      setSaveState("error");
    } else if (inFlight.current === 0 && itemTimers.current.size === 0 && !detailsTimer.current) {
      setSaveState((s) => (s === "error" ? s : "saved"));
    }
    return result;
  }

  function editDetails(patch: Partial<TalkDetailsDraft>) {
    const next = { ...details, ...patch };
    setDetails(next);
    setSaveState("saving");
    clearTimeout(detailsTimer.current);
    detailsTimer.current = setTimeout(() => {
      detailsTimer.current = undefined;
      if (!next.title.trim()) {
        setError("Give the talk a title.");
        setSaveState("error");
        return;
      }
      void save(() => updateTalkDetailsAction(talkId, { ...next, title: next.title.trim() }), "Couldn't save the talk details.");
    }, SAVE_DELAY_MS);
  }

  function editItem(itemId: string, patch: Patch) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
    setSaveState("saving");
    clearTimeout(itemTimers.current.get(itemId));
    itemTimers.current.set(
      itemId,
      setTimeout(() => {
        itemTimers.current.delete(itemId);
        const item = itemsRef.current.find((i) => i.id === itemId);
        if (item) void save(() => updateTalkItemAction(talkId, itemId, patchFor(item)), "Couldn't save that change.");
      }, SAVE_DELAY_MS),
    );
  }

  async function addItem(input: NewItemInput) {
    setError(null);
    const result = await save(() => addTalkItemAction(talkId, input), "Couldn't add that. Try again.");
    if (result?.ok) {
      setItems((prev) => [...prev, result.item]);
      setFocusId(result.item.id);
      return true;
    }
    return false;
  }

  async function removeItem(itemId: string) {
    clearTimeout(itemTimers.current.get(itemId));
    itemTimers.current.delete(itemId);
    const before = itemsRef.current;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    const result = await save(() => deleteTalkItemAction(talkId, itemId), "Couldn't remove that capsule. Try again.");
    if (!result?.ok) setItems(before);
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // A short press before dragging, so a normal swipe still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const current = itemsRef.current;
    const from = current.findIndex((i) => i.id === active.id);
    const to = current.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(current, from, to);
    setItems(next);
    void save(
      () => reorderTalkItemsAction(talkId, next.map((i) => i.id)),
      "Couldn't save the new order. Reload the page to see the saved order.",
    );
  }

  const words = items.reduce(
    (n, i) => n + countWords(i.body) + (i.passage ? countWords(i.passage.verses.map((v) => v.text).join(" ")) : 0),
    0,
  );

  return (
    <div>
      <div className="mb-4 space-y-3">
        <label className="block">
          <span className="sr-only">Title</span>
          <input
            value={details.title}
            onChange={(e) => editDetails({ title: e.target.value })}
            maxLength={200}
            placeholder="Talk title"
            className="w-full rounded-lg border border-transparent bg-transparent px-1 font-serif text-3xl font-semibold outline-none hover:border-line focus:border-accent"
          />
        </label>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-muted">Type</span>
            <select
              value={details.kind}
              onChange={(e) => editDetails({ kind: e.target.value as TalkDetailsDraft["kind"] })}
              className="rounded-lg border border-line bg-card px-2 py-1"
            >
              <option value="talk">Talk</option>
              <option value="lesson">Lesson</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-muted">Minutes</span>
            <input
              type="number"
              min={1}
              max={120}
              value={details.minutes ?? ""}
              onChange={(e) =>
                editDetails({ minutes: e.target.value === "" ? null : Math.min(120, Math.max(1, Math.round(Number(e.target.value)))) })
              }
              className="w-20 rounded-lg border border-line bg-card px-2 py-1"
            />
          </label>
          <label className="flex min-w-48 flex-1 items-center gap-2">
            <span className="text-muted">Audience</span>
            <input
              value={details.audience}
              onChange={(e) => editDetails({ audience: e.target.value })}
              maxLength={200}
              placeholder="Sacrament meeting, youth…"
              className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1"
            />
          </label>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted">
        <span>
          {items.length} {items.length === 1 ? "capsule" : "capsules"}
          {words > 0 ? ` · about ${Math.max(1, Math.round(words / 130))} min read aloud` : ""}
        </span>
        <SaveIndicator state={saveState} />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-300 p-3 text-sm text-red-700 dark:border-red-800 dark:text-red-400"
        >
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Add scriptures, thoughts, section headings, and links below. Then drag the ⠿ handle to put them in order.
        </div>
      ) : (
        <DndContext
          id="talk-builder"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                "To move a capsule, press space or enter on its handle, use the arrow keys to move it, then press space or enter to drop it. Press escape to cancel.",
            },
          }}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-3">
              {items.map((item) => (
                <Capsule
                  key={item.id}
                  item={item}
                  autoFocus={item.id === focusId}
                  onEdit={(patch) => editItem(item.id, patch)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <AddBar onAdd={addItem} />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text = { idle: "", saving: "Saving…", saved: "All changes saved", error: "Not saved" }[state];
  return (
    <span aria-live="polite" className={state === "error" ? "text-red-700 dark:text-red-400" : ""}>
      {text}
    </span>
  );
}

function Capsule({
  item,
  autoFocus,
  onEdit,
  onRemove,
}: {
  item: TalkItem;
  autoFocus: boolean;
  onEdit: (patch: Patch) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const name = item.kind === "scripture" ? (item.passage?.reference ?? "scripture") : KIND_LABEL[item.kind].toLowerCase();

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-xl border border-l-4 bg-card ${isDragging ? "relative z-10 border-accent shadow-lg" : "border-line"} ${KIND_STRIPE[item.kind]}`}
    >
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Move ${name}`}
          title="Drag to move"
          className="mt-0.5 cursor-grab touch-manipulation select-none rounded px-1 text-lg leading-none text-muted hover:text-accent active:cursor-grabbing"
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{KIND_LABEL[item.kind]}</span>
            <RemoveButton onRemove={onRemove} />
          </div>
          <CapsuleBody item={item} autoFocus={autoFocus} onEdit={onEdit} />
        </div>
      </div>
    </li>
  );
}

function RemoveButton({ onRemove }: { onRemove: () => void }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className="text-xs text-muted hover:text-red-600">
        Remove
      </button>
    );
  }
  return (
    <span className="flex items-center gap-3 text-xs">
      <button type="button" onClick={onRemove} className="font-medium text-red-700 dark:text-red-400">
        Yes, remove
      </button>
      <button type="button" onClick={() => setArmed(false)} className="text-muted hover:text-accent">
        Cancel
      </button>
    </span>
  );
}

const fieldClass = "w-full rounded-md border border-transparent bg-transparent px-1 outline-none hover:border-line focus:border-accent";

function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const rows = Math.max(2, props.value.split("\n").length + Math.floor(props.value.length / 90));
  return <textarea {...props} rows={rows} />;
}

function CapsuleBody({ item, autoFocus, onEdit }: { item: TalkItem; autoFocus: boolean; onEdit: (patch: Patch) => void }) {
  switch (item.kind) {
    case "heading":
      return (
        <input
          value={item.body}
          onChange={(e) => onEdit({ body: e.target.value })}
          maxLength={200}
          placeholder="Section heading"
          aria-label="Section heading"
          autoFocus={autoFocus}
          className={`${fieldClass} font-serif text-xl font-semibold`}
        />
      );
    case "thought":
      return (
        <AutoTextarea
          value={item.body}
          onChange={(e) => onEdit({ body: e.target.value })}
          maxLength={10000}
          placeholder="Type a thought…"
          aria-label="Thought"
          autoFocus={autoFocus}
          className={`${fieldClass} resize-none leading-relaxed`}
        />
      );
    case "scripture": {
      const passage = item.passage;
      return (
        <>
          {passage ? (
            <div className="rounded-lg bg-hl/40 px-3 py-2">
              <Link href={passage.href} target="_blank" rel="noopener" className="text-sm font-medium text-accent hover:underline">
                {passage.reference}
              </Link>
              <p className="mt-1 font-serif leading-relaxed">
                {passage.verses.map((v) => (
                  <span key={v.verse}>
                    {passage.verses.length > 1 && <sup className="mr-0.5 font-sans text-[0.65rem] text-accent">{v.verse}</sup>}
                    {v.text}{" "}
                  </span>
                ))}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">This scripture couldn't be found.</p>
          )}
          <AutoTextarea
            value={item.body}
            onChange={(e) => onEdit({ body: e.target.value })}
            maxLength={2000}
            placeholder="Your note on this scripture (optional)"
            aria-label="Note on this scripture"
            autoFocus={autoFocus}
            className={`${fieldClass} mt-2 resize-none text-sm`}
          />
        </>
      );
    }
    case "link": {
      const url = item.url ?? "";
      return (
        <div className="space-y-1">
          <input
            value={item.body}
            onChange={(e) => onEdit({ body: e.target.value })}
            maxLength={200}
            placeholder="Label, e.g. a conference talk title"
            aria-label="Link label"
            autoFocus={autoFocus}
            className={fieldClass}
          />
          <input
            value={url}
            onChange={(e) => onEdit({ url: e.target.value })}
            maxLength={500}
            placeholder="https://…"
            aria-label="Link address"
            inputMode="url"
            className={`${fieldClass} text-sm text-muted`}
          />
          {isHttps(url) ? (
            <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-block px-1 text-xs text-accent underline">
              Open link ↗
            </a>
          ) : (
            <p className="px-1 text-xs text-red-700 dark:text-red-400">Enter a full address starting with https://</p>
          )}
        </div>
      );
    }
  }
}

function AddBar({ onAdd }: { onAdd: (input: NewItemInput) => Promise<boolean> }) {
  const [open, setOpen] = useState<null | "scripture" | "link">(null);
  const [reference, setReference] = useState("");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(input: NewItemInput) {
    setBusy(true);
    const ok = await onAdd(input);
    setBusy(false);
    return ok;
  }

  async function addScripture(e: FormEvent) {
    e.preventDefault();
    if (!reference.trim()) return;
    if (await run({ kind: "scripture", reference: reference.trim() })) {
      setReference("");
      setOpen(null);
    }
  }

  async function addLink(e: FormEvent) {
    e.preventDefault();
    if (!isHttps(url.trim())) return;
    if (await run({ kind: "link", url: url.trim(), body: label.trim() })) {
      setUrl("");
      setLabel("");
      setOpen(null);
    }
  }

  const button = "rounded-lg border border-line bg-card px-3 py-2 text-sm hover:border-accent disabled:opacity-50";
  const input = "min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent";

  return (
    <div className="sticky bottom-0 z-20 mt-6 border-t border-line bg-bg py-3">
      {open === "scripture" && (
        <form onSubmit={addScripture} className="mb-2 flex gap-2">
          <label htmlFor="add-reference" className="sr-only">Scripture reference</label>
          <input
            id="add-reference"
            autoFocus
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={80}
            placeholder="Alma 32:21 or Moroni 10:4-5"
            className={input}
          />
          <button type="submit" disabled={busy || !reference.trim()} className="rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-50">
            Add
          </button>
        </form>
      )}
      {open === "link" && (
        <form onSubmit={addLink} className="mb-2 flex flex-wrap gap-2">
          <label htmlFor="add-link-url" className="sr-only">Link address</label>
          <input
            id="add-link-url"
            autoFocus
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={500}
            placeholder="https://www.churchofjesuschrist.org/…"
            className={`${input} basis-64`}
          />
          <label htmlFor="add-link-label" className="sr-only">Link label</label>
          <input
            id="add-link-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={200}
            placeholder="Label (optional)"
            className={`${input} basis-40`}
          />
          <button type="submit" disabled={busy || !isHttps(url.trim())} className="rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-50">
            Add
          </button>
        </form>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} aria-expanded={open === "scripture"} onClick={() => setOpen(open === "scripture" ? null : "scripture")}>
          + Scripture
        </button>
        <button type="button" className={button} disabled={busy} onClick={() => run({ kind: "thought" })}>
          + Thought
        </button>
        <button type="button" className={button} disabled={busy} onClick={() => run({ kind: "heading" })}>
          + Section heading
        </button>
        <button type="button" className={button} aria-expanded={open === "link"} onClick={() => setOpen(open === "link" ? null : "link")}>
          + Link
        </button>
      </div>
    </div>
  );
}
