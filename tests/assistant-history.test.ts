// The study assistant's conversation survives leaving the page (opening a verse, pressing
// Back), per member, and bad or blocked storage never breaks the chat.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MAX_SAVED_MESSAGES, clearChat, historyKey, loadChat, saveChat } from "../lib/assistant-history";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
  };
}

const msg = (i: number) => ({ id: `m${i}`, role: i % 2 ? "assistant" : "user", parts: [{ type: "text", text: `message ${i}` }] });

describe("assistant chat history", () => {
  test("round-trips the conversation and the unsent draft", () => {
    const s = fakeStorage();
    assert.equal(saveChat(s, "alice", { messages: [msg(0), msg(1)], draft: "and grace?" }), true);
    assert.deepEqual(loadChat(s, "alice"), { messages: [msg(0), msg(1)], draft: "and grace?" });
  });

  test("each member has their own saved chat", () => {
    const s = fakeStorage();
    saveChat(s, "alice", { messages: [msg(0)], draft: "" });
    assert.deepEqual(loadChat(s, "bob"), { messages: [], draft: "" });
    assert.notEqual(historyKey("alice"), historyKey("bob"));
  });

  test("keeps only the most recent messages", () => {
    const s = fakeStorage();
    const many = Array.from({ length: 40 }, (_, i) => msg(i));
    saveChat(s, "alice", { messages: many, draft: "" });
    const { messages } = loadChat<ReturnType<typeof msg>>(s, "alice");
    assert.equal(messages.length, MAX_SAVED_MESSAGES);
    assert.equal(messages.at(-1)?.id, "m39");
  });

  test("corrupt or unexpected saved data loads as an empty chat, dropping bad messages", () => {
    const s = fakeStorage();
    s.map.set(historyKey("alice"), "not json");
    assert.deepEqual(loadChat(s, "alice"), { messages: [], draft: "" });
    s.map.set(historyKey("alice"), JSON.stringify({ messages: "nope", draft: 7 }));
    assert.deepEqual(loadChat(s, "alice"), { messages: [], draft: "" });
    s.map.set(historyKey("alice"), JSON.stringify({ messages: [msg(0), { role: "user" }, null, { id: "x", role: "hacker", parts: [] }], draft: "" }));
    assert.deepEqual(loadChat(s, "alice").messages, [msg(0)]);
  });

  test("an empty chat removes the saved entry, and clearing removes it too", () => {
    const s = fakeStorage();
    saveChat(s, "alice", { messages: [msg(0)], draft: "" });
    saveChat(s, "alice", { messages: [], draft: "" });
    assert.equal(s.map.has(historyKey("alice")), false);
    saveChat(s, "alice", { messages: [msg(0)], draft: "x" });
    clearChat(s, "alice");
    assert.equal(s.map.has(historyKey("alice")), false);
  });

  test("storage that throws (private window, full quota) or is missing doesn't break the chat", () => {
    const broken = {
      getItem: () => { throw new Error("SecurityError"); },
      setItem: () => { throw new Error("QuotaExceededError"); },
      removeItem: () => { throw new Error("SecurityError"); },
    };
    assert.deepEqual(loadChat(broken, "alice"), { messages: [], draft: "" });
    assert.equal(saveChat(broken, "alice", { messages: [msg(0)], draft: "" }), false);
    assert.doesNotThrow(() => clearChat(broken, "alice"));
    assert.deepEqual(loadChat(undefined, "alice"), { messages: [], draft: "" });
    assert.equal(saveChat(undefined, "alice", { messages: [msg(0)], draft: "" }), false);
  });
});
