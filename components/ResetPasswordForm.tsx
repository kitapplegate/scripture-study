"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetState } from "@/app/reset/[token]/actions";
import { Field } from "@/components/SignInForm";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="New password (10+ characters)" name="password" type="password" autoComplete="new-password" minLength={10} />
      {state.error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
