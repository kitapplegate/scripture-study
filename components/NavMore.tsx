"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Phone-only "More" menu for the nav links that don't fit on a narrow screen. A <details>,
// so it opens before JavaScript loads. It closes itself after a link is chosen, because
// the layout (and this menu) stays mounted across navigations.
export function NavMore({ links }: { links: { href: string; label: string }[] }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const close = () => {
    if (menu.current) menu.current.open = false;
  };
  useEffect(close, [pathname]);

  return (
    <details ref={menu} className="relative sm:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center px-2 text-muted hover:text-accent [&::-webkit-details-marker]:hidden">
        More<span aria-hidden="true" className="ml-1 text-xs">▾</span>
      </summary>
      <div className="absolute right-0 z-20 mt-1 flex min-w-40 flex-col rounded-lg border border-line bg-card p-1 shadow-lg">
        {links.map((l) => (
          <Link key={l.href} href={l.href} onClick={close} className="flex min-h-11 items-center rounded-md px-3 text-fg hover:bg-hl hover:text-accent">
            {l.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
