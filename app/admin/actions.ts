"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createInvite } from "@/lib/invites";
import { requireAdmin } from "@/lib/session";

const schema = z.object({
  note: z.string().trim().max(60, "Keep the note under 60 characters.").optional(),
  role: z.enum(["member", "admin"]),
});

export type CreateInviteState = { link?: string; error?: string };

export async function createInviteAction(_prev: CreateInviteState, formData: FormData): Promise<CreateInviteState> {
  const admin = await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const token = await createInvite({ role: parsed.data.role, note: parsed.data.note, createdBy: admin.id });
  revalidatePath("/admin");
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return { link: `${base}/invite/${token}` };
}
