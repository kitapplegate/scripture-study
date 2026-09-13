import { signOutAction } from "@/app/auth-actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="text-sm text-muted hover:text-accent">
        Sign out
      </button>
    </form>
  );
}
