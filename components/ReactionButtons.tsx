import { REACTIONS, REACTION_KINDS, type ReactionKind } from "@/lib/posts";

// The ❤️ 🙏 💡 buttons, for posts and comments alike. Each is a tiny form, so it works
// without JavaScript. `fields` names what's being reacted to (postId or commentId).
export function ReactionButtons({
  counts,
  mine,
  action,
  fields,
}: {
  counts: Partial<Record<ReactionKind, number>>;
  mine: ReactionKind[];
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
}) {
  return (
    <>
      {REACTION_KINDS.map((kind) => {
        const on = mine.includes(kind);
        const count = counts[kind] ?? 0;
        return (
          <form key={kind} action={action}>
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <input type="hidden" name="kind" value={kind} />
            <button
              type="submit"
              aria-pressed={on}
              aria-label={`${REACTIONS[kind].label}${count ? ` (${count})` : ""}`}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-2.5 py-1 ${on ? "border-accent bg-hl" : "border-control hover:border-accent"}`}
            >
              {REACTIONS[kind].emoji}
              {count > 0 && <span className="ml-1">{count}</span>}
            </button>
          </form>
        );
      })}
    </>
  );
}
