"use client";

import { useState } from "react";

// Two-step submit for destructive actions: "Delete" → "Yes, delete / Cancel".
// Before hydration the first button does nothing, which is the safe default.
export function ConfirmSubmit({ label = "Delete", confirmLabel = "Yes, delete", small = false }) {
  const [armed, setArmed] = useState(false);
  const size = small ? "text-xs" : "text-sm";

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={`${size} text-muted hover:text-error`}>
        {label}
      </button>
    );
  }
  return (
    <span className={`inline-flex items-center gap-3 ${size}`}>
      <button type="submit" className="font-medium text-error">
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className="text-muted hover:text-accent">
        Cancel
      </button>
    </span>
  );
}
