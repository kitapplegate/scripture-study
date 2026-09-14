"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="min-h-11 rounded-lg border border-control px-3 py-1.5 text-sm hover:border-accent">
      Print
    </button>
  );
}
