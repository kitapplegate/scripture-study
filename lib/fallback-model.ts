// A model that tries several models in order, used to stack free tiers
// (Gemini, then Groq, then OpenRouter).
//
// A call moves to the next model when it fails before any content arrives: a refused
// request (rate limit, payment required, bad key, outage), or a stream whose first
// real part is an error (e.g. OpenRouter's "upstream overloaded"). Once content has
// started streaming, errors are not retried here.
//
// A model that fails is skipped for a while (a cooldown), so each step of a question
// doesn't re-ask a provider that just refused.
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
} from "@ai-sdk/provider";

export type FallbackEvent = { from: string; to?: string; error: unknown; cooldownMs: number };

const label = (m: LanguageModelV4) => `${m.provider}:${m.modelId}`;

const isAbort = (err: unknown) =>
  err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");

// Payment and auth problems won't fix themselves soon; rate limits and outages do.
export function cooldownFor(err: unknown) {
  const status = (err as { statusCode?: number } | undefined)?.statusCode;
  if (status === 401 || status === 402 || status === 403) return 10 * 60_000;
  if (status === 429) return 60_000;
  return 15_000;
}

// Module-level so it lasts across requests (the chain is rebuilt per request; labels are stable).
const coolingUntil = new Map<string, number>();
export const resetCooldowns = () => coolingUntil.clear();

const SETUP_PARTS = new Set<LanguageModelV4StreamPart["type"]>(["stream-start", "response-metadata", "raw"]);

// Reads ahead to the first real stream part. If it's an error, throws it so the next
// model gets the call; otherwise returns a stream that replays what was read.
// `answeredBy` is added as response metadata when the provider doesn't name its model
// (Gemini doesn't), so logs show which model in the chain actually answered.
export async function openStream(result: LanguageModelV4StreamResult, answeredBy?: string): Promise<LanguageModelV4StreamResult> {
  const reader = result.stream.getReader();
  const buffered: LanguageModelV4StreamPart[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value.type === "error") {
      reader.cancel().catch(() => {});
      throw value.error;
    }
    buffered.push(value);
    if (!SETUP_PARTS.has(value.type)) break;
  }

  const namesModel = buffered.some((p) => p.type === "response-metadata" && (p as { modelId?: string }).modelId);
  if (answeredBy && !namesModel) {
    const afterStart = buffered.findIndex((p) => p.type === "stream-start") + 1;
    buffered.splice(afterStart, 0, { type: "response-metadata", modelId: answeredBy } as LanguageModelV4StreamPart);
  }

  const stream = new ReadableStream<LanguageModelV4StreamPart>({
    start(controller) {
      for (const part of buffered) controller.enqueue(part);
    },
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  return { ...result, stream };
}

export function fallbackModel(
  models: LanguageModelV4[],
  onFallback?: (event: FallbackEvent) => void,
  now: () => number = Date.now,
): LanguageModelV4 {
  if (models.length === 0) throw new Error("fallbackModel needs at least one model");
  if (models.length === 1) return models[0];

  async function attempt<T>(options: LanguageModelV4CallOptions, call: (m: LanguageModelV4) => Promise<T>) {
    const ready = models.filter((m) => (coolingUntil.get(label(m)) ?? 0) <= now());
    const order = ready.length > 0 ? ready : models; // everything cooling: try them all anyway
    let lastError: unknown;
    for (let i = 0; i < order.length; i++) {
      if (options.abortSignal?.aborted) throw options.abortSignal.reason;
      try {
        const result = await call(order[i]);
        coolingUntil.delete(label(order[i]));
        return result;
      } catch (err) {
        // The user pressed Stop: don't spend another provider's quota on it.
        if (isAbort(err) || options.abortSignal?.aborted) throw err;
        lastError = err;
        const cooldownMs = cooldownFor(err);
        coolingUntil.set(label(order[i]), now() + cooldownMs);
        onFallback?.({ from: label(order[i]), to: order[i + 1] && label(order[i + 1]), error: err, cooldownMs });
      }
    }
    throw lastError;
  }

  return {
    specificationVersion: "v4",
    provider: "fallback",
    modelId: models.map(label).join(" > "),
    supportedUrls: {},
    doGenerate: (options) => attempt(options, async (m) => m.doGenerate(options)),
    doStream: (options) => attempt(options, async (m) => openStream(await m.doStream(options), label(m))),
  };
}
