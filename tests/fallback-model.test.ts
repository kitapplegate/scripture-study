import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { LanguageModelV4, LanguageModelV4CallOptions, LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { mergeResults, readOnePassage, snippet } from "../lib/assistant-tools";
import { cooldownFor, fallbackModel, resetCooldowns, type FallbackEvent } from "../lib/fallback-model";

const streamOf = (parts: LanguageModelV4StreamPart[]) =>
  new ReadableStream<LanguageModelV4StreamPart>({
    start(c) {
      for (const p of parts) c.enqueue(p);
      c.close();
    },
  });

const textParts = (text: string) =>
  [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t" },
    { type: "text-delta", id: "t", delta: text },
    { type: "text-end", id: "t" },
  ] as unknown as LanguageModelV4StreamPart[];

const errorParts = (message: string) =>
  [{ type: "stream-start", warnings: [] }, { type: "error", error: new Error(message) }] as unknown as LanguageModelV4StreamPart[];

async function readText(result: { stream: ReadableStream<LanguageModelV4StreamPart> }) {
  let text = "";
  const reader = result.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text;
    if (value.type === "text-delta") text += (value as { delta: string }).delta;
  }
}

// behavior: return stream parts, or throw to refuse the request.
const fake = (name: string, behavior: () => LanguageModelV4StreamPart[]) => {
  const calls = { count: 0 };
  const model = {
    specificationVersion: "v4",
    provider: name,
    modelId: "m",
    supportedUrls: {},
    doGenerate: async () => (calls.count++, behavior()),
    doStream: async () => {
      calls.count++;
      return { stream: streamOf(behavior()) };
    },
  } as unknown as LanguageModelV4;
  return Object.assign(model, { calls });
};

const httpError = (statusCode: number) => Object.assign(new Error(`HTTP ${statusCode}`), { statusCode });
const opts = (signal?: AbortSignal) => ({ prompt: [], abortSignal: signal }) as unknown as LanguageModelV4CallOptions;

beforeEach(() => resetCooldowns());

describe("fallbackModel", () => {
  test("uses the first model when it works, and never calls the others", async () => {
    const a = fake("a", () => textParts("from a"));
    const b = fake("b", () => textParts("from b"));
    assert.equal(await readText(await fallbackModel([a, b]).doStream(opts())), "from a");
    assert.equal(b.calls.count, 0);
  });

  test("moves past refused requests, reporting each fallback", async () => {
    const events: FallbackEvent[] = [];
    const m = fallbackModel(
      [fake("cerebras", () => { throw httpError(402); }), fake("groq", () => { throw httpError(429); }), fake("openrouter", () => textParts("ok"))],
      (e) => events.push(e),
    );
    assert.equal(await readText(await m.doStream(opts())), "ok");
    assert.deepEqual(events.map((e) => [e.from, e.to]), [["cerebras:m", "groq:m"], ["groq:m", "openrouter:m"]]);
  });

  test("a stream whose first real part is an error falls back too", async () => {
    const m = fallbackModel([fake("openrouter", () => errorParts("Upstream error: overloaded")), fake("groq", () => textParts("recovered"))]);
    assert.equal(await readText(await m.doStream(opts())), "recovered");
  });

  test("a healthy stream is replayed intact, and names the model that answered", async () => {
    const m = fallbackModel([fake("a", () => textParts("hello world")), fake("b", () => textParts("unused"))]);
    const { stream } = await m.doStream(opts());
    const parts: LanguageModelV4StreamPart[] = [];
    const reader = stream.getReader();
    for (let r = await reader.read(); !r.done; r = await reader.read()) parts.push(r.value);
    assert.deepEqual(parts.map((p) => p.type), ["stream-start", "response-metadata", "text-start", "text-delta", "text-end"]);
    assert.equal((parts[1] as { modelId?: string }).modelId, "a:m");
  });

  test("a provider's own model name is kept, not overwritten", async () => {
    const withMeta = () =>
      [{ type: "stream-start", warnings: [] }, { type: "response-metadata", modelId: "gemini-3.8-flash" }, ...textParts("hi").slice(1)] as unknown as LanguageModelV4StreamPart[];
    const m = fallbackModel([fake("google", withMeta), fake("b", () => textParts("unused"))]);
    const { stream } = await m.doStream(opts());
    const ids: string[] = [];
    const reader = stream.getReader();
    for (let r = await reader.read(); !r.done; r = await reader.read()) {
      if (r.value.type === "response-metadata") ids.push((r.value as { modelId?: string }).modelId ?? "");
    }
    assert.deepEqual(ids, ["gemini-3.8-flash"]);
  });

  test("throws the last error when every provider fails", async () => {
    const m = fallbackModel([fake("a", () => { throw httpError(429); }), fake("b", () => { throw httpError(503); })]);
    await assert.rejects(async () => m.doStream(opts()), (err: { statusCode?: number }) => err.statusCode === 503);
  });

  test("doesn't try the next provider after the user pressed Stop", async () => {
    const ctrl = new AbortController();
    const b = fake("b", () => textParts("should not run"));
    const a = fake("a", () => {
      ctrl.abort();
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    await assert.rejects(async () => fallbackModel([a, b]).doStream(opts(ctrl.signal)));
    assert.equal(b.calls.count, 0);
  });

  test("a provider that refused is skipped until its cooldown ends", async () => {
    let clock = 0;
    const a = fake("cooling", () => { throw httpError(402); });
    const b = fake("backup", () => textParts("b"));
    const m = fallbackModel([a, b], undefined, () => clock);

    await readText(await m.doStream(opts()));
    await readText(await m.doStream(opts()));
    assert.equal(a.calls.count, 1, "skipped while cooling");

    clock = cooldownFor(httpError(402)) + 1;
    await readText(await m.doStream(opts()));
    assert.equal(a.calls.count, 2, "tried again after the cooldown");
  });

  test("cooldowns: long for payment/auth, a minute for rate limits, short otherwise", () => {
    assert.equal(cooldownFor(httpError(402)), 600_000);
    assert.equal(cooldownFor(httpError(401)), 600_000);
    assert.equal(cooldownFor(httpError(429)), 60_000);
    assert.equal(cooldownFor(new Error("socket hang up")), 15_000);
  });

  test("a single model is returned as-is", () => {
    const a = fake("a", () => textParts("x"));
    assert.equal(fallbackModel([a]), a);
  });
});

describe("assistant tools", () => {
  test("snippets cut at a word boundary and mark the cut", () => {
    const s = snippet("word ".repeat(80).trim());
    assert.ok(s.length <= 203, `length ${s.length}`);
    assert.ok(s.endsWith(" …"));
    assert.equal(snippet("short verse"), "short verse");
  });

  test("merged results interleave queries by rank, drop repeats, and cap the total", () => {
    const h = (id: string) => ({ id });
    const merged = mergeResults([[h("a1"), h("a2"), h("shared")], [h("shared"), h("b2")], [h("c1")]], 4);
    assert.deepEqual(merged.map((x) => x.id), ["a1", "shared", "c1", "a2"]);
  });

  test("readOnePassage returns verses for real references and a note for fake ones", async () => {
    const real = await readOnePassage("Moroni 10:4-5");
    assert.equal(real.found, true);
    assert.equal(real.found && real.verses.length, 2);
    const fake = await readOnePassage("Hezekiah 3:16");
    assert.equal(fake.found, false);
  });
});
