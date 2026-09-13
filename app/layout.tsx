import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Scripture Study", template: "%s · Scripture Study" },
  description: "Read and study the scriptures together with family and friends.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-serif text-lg font-semibold text-fg">
              Scripture Study
            </Link>
            <Link href="/" className="text-sm text-muted hover:text-accent">
              Library
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">{children}</main>
      </body>
    </html>
  );
}
