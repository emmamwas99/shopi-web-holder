"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

const COLLAPSED_ROWS = 3;

export interface FormIssue {
  /** The `data-field` of the block the row jumps to. */
  field: string;
  label: string;
  /** Short — it shares one line with the label. The full sentence sits
   *  under the field itself. */
  message: string;
}

/**
 * What still stands between the seller and the next step, shown above the
 * button once they've tapped it. The button never greys out; this list says
 * why it didn't move on. Each row jumps to its field, and the list shrinks as
 * fields are fixed, so it disappears on its own when there's nothing left.
 */
export function FormIssues({
  issues,
  onSelect,
}: {
  issues: FormIssue[];
  onSelect: (field: string) => void;
}) {
  // Three rows, then a "show more" row: a long list would push the form
  // itself off a phone screen. It shrinks as fields are fixed anyway.
  const [expanded, setExpanded] = useState(false);
  if (issues.length === 0) return null;
  const count = issues.length;
  const visible = expanded ? issues : issues.slice(0, COLLAPSED_ROWS);
  const hidden = count - visible.length;

  return (
    <div
      role="alert"
      className="mb-3 overflow-hidden rounded-xl border border-[rgb(var(--color-error)/0.2)] bg-[rgb(var(--color-error)/0.05)]"
    >
      <p className="flex items-center gap-2 px-3 pb-1 pt-2.5 text-[13px] font-semibold text-error">
        <AlertCircle size={16} className="shrink-0" aria-hidden />
        {count === 1 ? "1 thing to fix before you continue" : `${count} things to fix before you continue`}
      </p>
      <ul className="max-h-[30svh] overflow-y-auto overscroll-contain pb-1">
        {visible.map((issue) => (
          <li key={issue.field}>
            <button
              type="button"
              onClick={() => onSelect(issue.field)}
              className="flex min-h-9 w-full items-center gap-3 px-3 text-left text-[13px] transition-colors active:bg-[rgb(var(--color-error)/0.08)]"
            >
              <span className="w-22 shrink-0 font-medium text-main">{issue.label}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{issue.message}</span>
              <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
            </button>
          </li>
        ))}
        {hidden > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex min-h-9 w-full items-center gap-1.5 px-3 text-left text-[13px] font-semibold text-error transition-colors active:bg-[rgb(var(--color-error)/0.08)]"
            >
              Show {hidden} more
              <ChevronDown size={16} aria-hidden />
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

/** A request that failed after the fields were fine — the save, or the API. */
export function FormNotice({ title, children }: { title?: string; children: string }) {
  return (
    <div
      role="alert"
      className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--color-error)/0.2)] bg-[rgb(var(--color-error)/0.05)] px-3 py-2.5 text-[13px] text-error"
    >
      <AlertCircle size={16} className="mt-px shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {title && <span className="block font-semibold">{title}</span>}
        {children}
      </span>
    </div>
  );
}
