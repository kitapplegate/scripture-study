import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { resetLinkName } from "@/lib/password-resets";

export const metadata: Metadata = { title: "Reset password" };

type Props = { params: Promise<{ token: string }> };

// Public on purpose: the person using this link can't sign in.
export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params;
  const name = await resetLinkName(token);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 font-serif text-3xl font-semibold">Choose a new password</h1>
      {name ? (
        <>
          <p className="mb-6 text-sm text-muted">
            For {name}. This link works once. Saving signs you out on every device, then you sign in with the new password.
          </p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <p className="text-muted">This reset link is invalid, expired, or already used. Ask the person who sent it for a new one.</p>
      )}
    </div>
  );
}
