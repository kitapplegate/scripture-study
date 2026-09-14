"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

// Only follow ?next= to a path on this site ("/feed"), never "//evil.com" or a full URL.
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function SignInForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Too many attempts. Wait a minute and try again." : "Wrong email or password.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    // method="post": if someone submits before JavaScript loads, the browser's fallback
    // submit must never put the password in the URL (history, server logs).
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-11 rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function Field(props: { label: string; name: string; type?: string; autoComplete?: string; minLength?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{props.label}</span>
      <input
        name={props.name}
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        minLength={props.minLength}
        required
        className="w-full rounded-lg border border-control bg-card px-3 py-2 outline-none focus:border-accent"
      />
    </label>
  );
}
