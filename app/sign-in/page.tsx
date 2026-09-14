import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/SignInForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ reset?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  if (await getSession()) redirect("/");
  const { reset } = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 font-serif text-3xl font-semibold">Sign in</h1>
      {reset === "1" && (
        <p role="status" className="mb-4 rounded-lg border border-line bg-card px-3 py-2 text-sm">
          Your password was changed. Sign in with the new one.
        </p>
      )}
      <p className="mb-6 text-sm text-muted">New here? You'll need an invite link from a family member.</p>
      <SignInForm />
    </div>
  );
}
