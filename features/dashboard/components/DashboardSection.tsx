import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * The seller dashboard's shared page chrome, so every section reads as one
 * product: the same header (title, one line of context, actions on the
 * right) and the same empty state.
 *
 * The header keeps its right edge clear of the dialog's close button, which
 * sits over this corner on every section (see DashboardModal).
 */
export function DashboardHeader({
  title,
  description,
  actions,
  tourId,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  tourId?: string;
}) {
  return (
    <header
      data-dashboard-tour={tourId}
      className="flex shrink-0 flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border/70 bg-app pb-5 pl-8 pr-20 pt-7"
    >
      <div className="min-w-0">
        <h1 className="text-[1.625rem] font-black leading-tight tracking-tight text-main">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-[rgb(var(--color-text-muted))]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** A section with nothing in it yet: what will appear, and the way to start. */
export function DashboardEmpty({
  icon: Icon,
  title,
  body,
  action,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-[rgb(var(--color-border-strong))] bg-elevated/60 px-6 py-14 text-center ${className}`}
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-6" strokeWidth={2} aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-bold text-main">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-[rgb(var(--color-text-muted))]">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** The dashboard's primary button: one shape everywhere. */
export const DASHBOARD_PRIMARY_BUTTON =
  "inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_rgb(var(--brand-primary)/0.6)] transition-colors hover:bg-primary-strong";
