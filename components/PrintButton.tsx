"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent">
      Print
    </button>
  );
}
