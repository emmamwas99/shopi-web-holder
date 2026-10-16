"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Building blocks of the phone listing page (ContentDetail's mobile layout).
 * Kept apart so that layout reads as the order a buyer thinks in — what it is,
 * who sells it, the details, how to buy — rather than as markup.
 */

/** The soft band between sections: separation without boxes or borders. */
export function SectionGap() {
  return <div aria-hidden="true" className="h-2 bg-surface" />;
}

export function ListingSection({
  title,
  aside,
  children,
  className,
  sectionRef,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section ref={sectionRef} className={cn("px-4 py-4", className)}>
      {title && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[16px] font-semibold leading-6 text-main">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/** Label on the left, value on the right, a hairline between rows. */
export function DetailRows({ rows }: { rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="divide-y divide-[rgb(var(--color-border))]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-[14px] text-muted">{row.label}</dt>
          <dd className="min-w-0 text-right text-[14px] font-medium text-main">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const STEPS = [
  { title: "Message or call the seller", body: "Ask your questions and agree on a price." },
  { title: "Meet somewhere public", body: "Or agree on a delivery you can follow." },
  { title: "Check it, then pay", body: "Pay once the item is in your hands — never in advance." },
];

/**
 * How buying works, for a first-time buyer: Shopi connects people, the deal
 * happens between them. Three steps and the one rule that prevents most scams.
 */
export function BuyingSteps() {
  return (
    <ol className="space-y-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary-strong dark:text-primary">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-medium leading-5 text-main">{step.title}</p>
            <p className="text-[13px] leading-5 text-muted">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A round icon button that sits over photos and video. */
export function OverlayButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      aria-pressed={pressed}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-transform active:scale-95"
    >
      {children}
    </button>
  );
}
