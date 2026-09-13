import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream } from "ai";
import { z } from "zod";
import { assistantInstructions, cleanHistory, MAX_STEPS } from "@/lib/assistant-prompt";
import { assistantTools } from "@/lib/assistant-tools";
import { auth } from "@/lib/auth";
import { assistantModel, assistantProviderOptions } from "@/lib/llm";
import { assistantDailyLimit, consumeAssistantRequest } from "@/lib/usage";

const bodySchema = z.object({
  messages: z
    .array(z.object({ id: z.string().max(100), role: z.enum(["user", "assistant"]), parts: z.array(z.unknown()).max(200) }))
    .min(1)
    .max(100),
});

const FINAL_STEP_NOTE =
  "You have no tool calls left. Write your complete final answer now, using only the passages already found above, in the format described. Don't stop partway through.";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return fail(401, "Sign in to use the study assistant.");

  const model = assistantModel();
  if (!model) return fail(503, "The study assistant isn't set up yet: no AI provider API key is configured.");

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "That request didn't look right. Reload the page and try again.");

  const messages = cleanHistory(parsed.data.messages);
  if (messages.at(-1)?.role !== "user") return fail(400, "Send a message first.");

  const usage = await consumeAssistantRequest(session.user.id, assistantDailyLimit(session.user.role));
  if (!usage.allowed) return fail(429, `You've used all ${usage.limit} assistant requests for today. They reset at midnight UTC.`);

  const instructions = assistantInstructions();
  const startedAt = Date.now();
  const result = streamText({
    model,
    instructions,
    messages: await convertToModelMessages(messages),
    tools: assistantTools,
    stopWhen: isStepCount(MAX_STEPS),
    // On the last allowed step: no more tools, and an explicit instruction to write the
    // whole answer. Without this a model that keeps searching can hit the limit and
    // return nothing, or only a sentence.
    prepareStep: ({ stepNumber }) =>
      stepNumber >= MAX_STEPS - 1 ? { toolChoice: "none" as const, instructions: `${instructions}\n\n${FINAL_STEP_NOTE}` } : {},
    maxOutputTokens: 6000,
    // The fallback chain handles rate limits by switching providers; one SDK retry covers blips.
    maxRetries: 1,
    providerOptions: assistantProviderOptions(),
    abortSignal: req.signal,
    // Which model answered, why each step stopped, and the token cost. Logs no message
    // content. finish= reads like "tool-calls,tool-calls,stop"; a final "length" or
    // "content-filter" means the answer was cut short.
    onFinish: ({ steps, response, totalUsage }) => {
      const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      const google = (steps.at(-1)?.providerMetadata as { google?: { finishMessage?: string | null } } | undefined)?.google;
      console.info(
        `[assistant] model=${response.modelId} steps=${steps.length} finish=${steps.map((s) => s.finishReason).join(",")} tokens=${totalUsage.totalTokens ?? "?"} ${seconds}s` +
          (google?.finishMessage ? ` google="${google.finishMessage}"` : ""),
      );
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      sendReasoning: true,
      onError: (error) => {
        console.error("[assistant]", error);
        const status = (error as { statusCode?: number })?.statusCode;
        if (status === 429) {
          return "Every free AI provider is at its request limit right now. Wait a minute and try again. If it keeps happening, today's free allowance is used up.";
        }
        return "The assistant ran into a problem. Try again in a moment.";
      },
    }),
  });
}
