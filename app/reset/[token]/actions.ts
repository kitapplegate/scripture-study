"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { resetPassword, type ResetResult } from "@/lib/password-resets";

const schema = z.object({
  token: z.string().min(20).max(100),
  password: z.string(),
});

const MESSAGES: Record<Exclude<ResetResult, { ok: true }>["reason"], string> = {
  "invalid-link": "This reset link is invalid, expired, or already used.",
  "too-short": "Password must be at least 10 characters.",
  "too-long": "Password is too long.",
};

export type ResetState = { error?: string };

export async function resetPasswordAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: MESSAGES["invalid-link"] };

  const result = await resetPassword(parsed.data.token, parsed.data.password);
  if (!result.ok) return { error: MESSAGES[result.reason] };
  redirect("/sign-in?reset=1");
}
