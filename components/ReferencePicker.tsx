// Plain GET form to /share?ref=… — works without JavaScript.
export function ReferencePicker({ defaultValue = "", buttonLabel = "Find verse" }: { defaultValue?: string; buttonLabel?: string }) {
  return (
    <form action="/share" method="get" className="flex gap-2">
      <label htmlFor="ref" className="sr-only">Scripture reference</label>
      <input
        id="ref"
        name="ref"
        required
        maxLength={80}
        defaultValue={defaultValue}
        placeholder="Alma 32:21 or Moroni 10:4-5"
        className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent"
      />
      <button type="submit" className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 font-medium text-bg">
        {buttonLabel}
      </button>
    </form>
  );
}
