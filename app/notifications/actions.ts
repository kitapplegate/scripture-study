"use server";

import { z } from "zod";
import { removePushSubscription, savePushSubscription } from "@/lib/push";
import { requireUser } from "@/lib/session";

const endpoint = z.string().url().startsWith("https://").max(2048);
const subscriptionSchema = z.object({
  endpoint,
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export type PushActionResult = { success: true } | { success: false; error: string };

export async function subscribeToPush(input: unknown): Promise<PushActionResult> {
  const user = await requireUser();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "That browser subscription was not valid." };

  await savePushSubscription(user.id, {
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  return { success: true };
}

export async function unsubscribeFromPush(input: unknown): Promise<PushActionResult> {
  const user = await requireUser();
  const parsed = endpoint.safeParse(input);
  if (!parsed.success) return { success: false, error: "That browser subscription was not valid." };

  await removePushSubscription(user.id, parsed.data);
  return { success: true };
}
