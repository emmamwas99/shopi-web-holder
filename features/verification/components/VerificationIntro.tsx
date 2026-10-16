"use client";

import { Gift, Info } from "lucide-react";
import { VerifiedTick } from "@/components/verification/VerifiedTick";
import { BENEFITS, FINE_PRINT, REQUIREMENTS } from "../copy";

/**
 * The first look: what verification gets you, what it takes, and — just as
 * plainly — what it doesn't promise. One button to begin; nothing is saved
 * until the seller types or uploads something.
 */
export function VerificationIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1D9BF0]/10">
          <VerifiedTick size={28} label={null} />
        </span>
        <h2 className="mt-3 text-[18px] font-bold leading-6 tracking-[-0.01em] text-main">
          Get your shop verified
        </h2>
        <p className="mt-1 max-w-[22rem] text-[13px] leading-[1.35rem] text-muted">
          Show buyers you&rsquo;re a real, registered business. It&rsquo;s free and takes about 3 minutes.
        </p>
      </div>

      <section className="mt-5" aria-labelledby="verification-benefits">
        <h3 id="verification-benefits" className="text-[14px] font-semibold text-main">
          What you get
        </h3>
        <ul className="mt-2 overflow-hidden rounded-xl border border-border bg-elevated px-3">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-2.5 border-b border-border py-2.5 last:border-b-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle text-main">
                {Icon === "tick" ? (
                  <VerifiedTick size={16} label={null} />
                ) : (
                  <Icon size={15} strokeWidth={1.9} aria-hidden />
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[13px] font-semibold leading-[1.15rem] text-main">{title}</p>
                <p className="text-[12px] leading-[1.1rem] text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5" aria-labelledby="verification-needs">
        <h3 id="verification-needs" className="text-[14px] font-semibold text-main">
          What you&rsquo;ll need
        </h3>
        <ol className="mt-2 overflow-hidden rounded-xl border border-border bg-elevated">
          {REQUIREMENTS.map(({ key, icon: Icon, title, body }, index) => (
            <li
              key={key}
              className="flex items-start gap-2.5 border-b border-border px-3 py-2.5 last:border-b-0"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-main">
                <Icon size={15} strokeWidth={1.9} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-[1.15rem] text-main">
                  <span className="sr-only">Step {index + 1}: </span>
                  {title}
                </p>
                <p className="text-[12px] leading-[1.1rem] text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-4 flex flex-col gap-2 rounded-xl bg-subtle px-3 py-3">
        <p className="flex items-start gap-2 text-[12px] leading-[1.1rem] text-main">
          <Info size={15} strokeWidth={1.9} className="mt-0.5 shrink-0" aria-hidden />
          {FINE_PRINT.trust}
        </p>
        <p className="flex items-start gap-2 text-[12px] leading-[1.1rem] text-main">
          <Gift size={15} strokeWidth={1.9} className="mt-0.5 shrink-0" aria-hidden />
          {FINE_PRINT.free}
        </p>
      </div>

      {/* Sticky on a phone so the way forward never scrolls out of reach. */}
      <div className="sticky bottom-0 -mx-4 mt-4 border-t border-border bg-app/95 px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button
          type="button"
          onClick={onStart}
          className="flex h-11 w-full items-center justify-center rounded-full bg-primary text-[14px] font-semibold text-white transition-opacity active:opacity-80 md:w-auto md:px-7"
        >
          Start verification
        </button>
      </div>
    </div>
  );
}
