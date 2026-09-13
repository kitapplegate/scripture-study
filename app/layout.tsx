import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { getSession } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Scripture Study", template: "%s · Scripture Study" },
  description: "Read and study the scriptures together with family and friends.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

function navLinks(user: { role?: string | null } | undefined) {
  return [
    ...(user ? [{ href: "/", label: "Home" }] : []),
    { href: "/scriptures", label: "Library" },
    { href: "/search", label: "Search" },
    ...(user
      ? [
          { href: "/feed", label: "Feed" },
          { href: "/study", label: "Assistant" },
          { href: "/talks", label: "My talks" },
        ]
      : []),
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Invites" }] : []),
  ];
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // If the database is down, keep the public reader working and just show "Sign in".
  // unstable_rethrow lets Next's own signals through (e.g. "this route uses headers(), render
  // it dynamically"); only real failures fall back to a signed-out header. console.warn, not
  // console.error: this is handled, so it shouldn't raise the dev error overlay.
  const session = await getSession().catch((err: Error) => {
    unstable_rethrow(err);
    console.warn(`[auth] session lookup failed, showing signed-out header: ${err.message}`);
    return null;
  });
  const user = session?.user;

  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3">
            <Link href="/" className="whitespace-nowrap font-serif text-base font-semibold text-fg sm:text-lg">
              Scripture Study
            </Link>
            {user ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="hidden text-muted sm:inline">{user.name}</span>
                <SignOutButton />
              </div>
            ) : (
              <Link href="/sign-in" className="text-sm text-muted hover:text-accent">Sign in</Link>
            )}
          </div>
          {/* Scrolls sideways on narrow phones instead of wrapping. */}
          <nav aria-label="Main" className="mx-auto flex max-w-6xl gap-5 overflow-x-auto whitespace-nowrap px-4 py-2 text-sm">
            {navLinks(user).map((l) => (
              <Link key={l.href} href={l.href} className="text-muted hover:text-accent">
                {l.label}
              </Link>
            ))}
          </nav>
        </header>
        {/* A narrow reading column; a page whose top element has class "wide" (home) gets more room. */}
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 has-[>.wide]:max-w-6xl">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted print:hidden">
          A personal project. Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints.
        </footer>
      </body>
    </html>
  );
}
