// The one place that knows which AI providers the study assistant uses.
//
// Every provider whose API key is set joins a fallback chain, in this order unless
// ASSISTANT_PROVIDERS overrides it (comma-separated names):
//   gemini     GEMINI_API_KEY      models GEMINI_MODELS     (comma-separated; each is its own
//                                  link in the chain, so an overloaded one falls to the next)
//   groq       GROQ_API_KEY        model GROQ_MODEL         (default openai/gpt-oss-120b)
//   openrouter OPENROUTER_API_KEY  models OPENROUTER_MODELS (comma-separated, OpenRouter
//                                  falls back through them itself)
// All three have free tiers; stacking them adds up the free allowances. Gemini's free
// tier lets Google use and review prompts, which the assistant's disclaimer states.
// (Cerebras was tried and dropped 2026-09-13: its API returned 402 "payment required".)
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { fallbackModel } from "./fallback-model";

type Provider = { name: string; label: string; create: () => LanguageModelV4 };

const DEFAULT_ORDER = ["gemini", "groq", "openrouter"];
// Newest Flash (via Google's alias), then the version Google's own API recommends. The
// newest returned 503 "overloaded" on 2 of 3 calls in testing (2026-09-13).
const DEFAULT_GEMINI_MODELS = ["gemini-flash-latest", "gemini-3.6-flash"];
const DEFAULT_OPENROUTER_MODELS = ["thinkingmachines/inkling:free", "nvidia/nemotron-3-ultra-550b-a55b:free"];

const env = (name: string) => process.env[name]?.trim() || undefined;
const envList = (name: string) => env(name)?.split(",").map((s) => s.trim()).filter(Boolean);

function allProviders(): Provider[] {
  const list: Provider[] = [];
  const geminiKey = env("GEMINI_API_KEY");
  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    for (const id of envList("GEMINI_MODELS") ?? DEFAULT_GEMINI_MODELS) {
      list.push({ name: "gemini", label: "Google Gemini", create: () => google(id) });
    }
  }
  const groqKey = env("GROQ_API_KEY");
  if (groqKey) {
    list.push({ name: "groq", label: "Groq", create: () => createGroq({ apiKey: groqKey })(env("GROQ_MODEL") ?? "openai/gpt-oss-120b") });
  }
  const openRouterKey = env("OPENROUTER_API_KEY");
  if (openRouterKey) {
    const ids = envList("OPENROUTER_MODELS") ?? DEFAULT_OPENROUTER_MODELS;
    list.push({
      name: "openrouter",
      label: "OpenRouter",
      create: () => createOpenRouter({ apiKey: openRouterKey })(ids[0], ids.length > 1 ? { models: ids } : {}),
    });
  }
  return list;
}

function configuredProviders() {
  const order = envList("ASSISTANT_PROVIDERS") ?? DEFAULT_ORDER;
  return allProviders()
    .filter((p) => order.includes(p.name))
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)); // stable: keeps Gemini models in order
}

export const assistantConfigured = () => configuredProviders().length > 0;

// For the disclaimer: which outside services see what people type.
export const assistantProviderLabels = () => [...new Set(configuredProviders().map((p) => p.label))];

export function assistantModel() {
  const providers = configuredProviders();
  if (providers.length === 0) return null;
  return fallbackModel(
    providers.map((p) => p.create()),
    ({ from, to, error, cooldownMs }) => {
      const e = error as { statusCode?: number; message?: string };
      console.warn(
        `[assistant] ${from} failed (${e.statusCode ?? e.message ?? "error"}); skipping it for ${cooldownMs / 1000}s${to ? `, trying ${to}` : ", no providers left"}`,
      );
    },
  );
}

// Light reasoning: finding scriptures doesn't need much, and it saves time and tokens.
// Each provider only reads its own key.
export function assistantProviderOptions() {
  const effort = "low";
  return {
    google: { thinkingConfig: { thinkingLevel: effort, includeThoughts: true } },
    groq: { reasoningEffort: effort },
    openrouter: { reasoning: { effort } },
  };
}
