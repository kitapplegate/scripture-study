import Link from "next/link";

// Deep Study rule 1: every page says plainly that these texts aren't scripture.
export function DeepStudyNotice() {
  return (
    <p className="mb-6 rounded-xl border border-line bg-card p-3 text-sm text-muted">
      <strong className="text-fg">Not scripture.</strong> Ancient texts to read beside the scriptures, for comparison.
      Of such books the Lord said, “There are many things contained therein that are true… and many things… which are
      not true” (
      <Link href="/scriptures/dc-testament/dc/91#v1" className="text-accent underline">
        D&amp;C 91:1–2
      </Link>
      ).
    </p>
  );
}
