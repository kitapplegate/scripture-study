import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/SignInForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getSession()) redirect("/");
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 font-serif text-3xl font-semibold">Sign in</h1>
      <p className="mb-6 text-sm text-muted">New here? You'll need an invite link from a family member.</p>
      <SignInForm />
    </div>
  );
}
