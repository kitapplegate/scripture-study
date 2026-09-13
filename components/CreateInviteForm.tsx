"use client";

import { useActionState, useState } from "react";
import { createInviteAction, type CreateInviteState } from "@/app/admin/actions";

export function CreateInviteForm() {
  const [state, action, pending] = useActionState<CreateInviteState, FormData>(createInviteAction, {});
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="min-w-40 flex-1">
          <span className="mb-1 block text-sm text-muted">Who is it for? (optional)</span>
          <input name="note" maxLength={60} className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
        </label>
        <label>
          <span className="mb-1 block text-sm text-muted">Role</span>
          <select name="role" defaultValue="member" className="rounded-lg border border-line bg-bg px-3 py-2">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" disabled={pending} className="rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-60">
          {pending ? "Creating…" : "Create invite link"}
        </button>
      </form>
      {state.error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      {state.link && (
        <div className="mt-4">
          <p className="mb-1 text-sm text-muted">Send this link. It works once and expires in 7 days. It won't be shown again.</p>
          <div className="flex gap-2">
            <input readOnly value={state.link} className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 font-mono text-xs" />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(state.link!);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-lg border border-line px-3 py-2 text-sm hover:border-accent"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
