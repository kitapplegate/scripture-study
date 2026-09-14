// Keeps the study assistant's conversation in the browser tab (sessionStorage), so opening a
// verse or another page and coming back doesn't lose it. One saved chat per member, so
// someone else signing in on the same tab never sees it. Nothing is sent anywhere; closing
// the tab clears it.
// Relative imports only (none needed), so tests can load this outside Next.js.

export const MAX_SAVED_MESSAGES = 30;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type SavedMessage = { id: string; role: string; parts: unknown[] };
export type SavedChat<M> = { messages: M[]; draft: string };

export const historyKey = (userId: string) => `scripture-study:assistant:${userId}`;

const isMessage = (m: unknown): m is SavedMessage =>
  !!m &&
  typeof m === "object" &&
  typeof (m as SavedMessage).id === "string" &&
  ["user", "assistant", "system"].includes((m as SavedMessage).role) &&
  Array.isArray((m as SavedMessage).parts);

export function loadChat<M>(storage: StorageLike | undefined, userId: string): SavedChat<M> {
  const empty = { messages: [], draft: "" };
  try {
    const raw = storage?.getItem(historyKey(userId));
    if (!raw) return empty;
    const saved = JSON.parse(raw) as { messages?: unknown; draft?: unknown };
    const messages = Array.isArray(saved.messages) ? saved.messages.filter(isMessage) : [];
    const draft = typeof saved.draft === "string" ? saved.draft.slice(0, 4000) : "";
    return { messages: messages.slice(-MAX_SAVED_MESSAGES) as M[], draft };
  } catch {
    // unreadable or blocked storage: start with an empty chat
    return empty;
  }
}

// false if the chat couldn't be saved (no storage, private window, or quota full).
export function saveChat<M>(storage: StorageLike | undefined, userId: string, chat: SavedChat<M>) {
  if (!storage) return false;
  try {
    if (chat.messages.length === 0 && !chat.draft) {
      storage.removeItem(historyKey(userId));
    } else {
      storage.setItem(historyKey(userId), JSON.stringify({ messages: chat.messages.slice(-MAX_SAVED_MESSAGES), draft: chat.draft }));
    }
    return true;
  } catch {
    return false;
  }
}

export function clearChat(storage: StorageLike | undefined, userId: string) {
  try {
    storage?.removeItem(historyKey(userId));
  } catch {
    // nothing saved that we can reach
  }
}
