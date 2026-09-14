import { signOutAction } from "@/app/auth-actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="flex min-h-11 items-center text-sm text-muted hover:text-accent">
        Sign out
      </button>
    </form>
  );
}
