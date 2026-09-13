"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { claimInvite, completeInvite, releaseInvite } from "@/lib/invites";

const schema = z.object({
  token: z.string().min(20).max(100),
  name: z.string().trim().min(1, "Enter your name.").max(60, "Name is too long."),
  email: z.email("Enter a valid email.").max(200),
  password: z.string().min(10, "Password must be at least 10 characters.").max(128, "Password is too long."),
});

export type InviteState = { error?: string };

export async function acceptInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const { token, name, email, password } = parsed.data;

  const invite = await claimInvite(token);
  if (!invite) return { error: "This invite link is invalid, expired, or already used." };

  let userId: string | undefined;
  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() });
    userId = result.user.id;
    await completeInvite(invite.id, userId, invite.role);
  } catch (err) {
    // Only give the invite back if no account was created with it.
    if (!userId) await releaseInvite(invite.id);
    if (err instanceof APIError) return { error: err.message };
    throw err;
  }
  redirect("/");
}
