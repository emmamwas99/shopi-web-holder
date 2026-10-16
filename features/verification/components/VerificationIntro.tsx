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
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1D9BF0]/10">
          <VerifiedTick size={36} label={null} />
        </span>
        <h2 className="mt-4 text-[20px] font-bold leading-7 tracking-[-0.01em] text-main md:text-[22px]">
          Get your shop verified
        </h2>
        <p className="mt-1.5 max-w-[22rem] text-[14px] leading-5 text-muted">
          Show buyers you&rsquo;re a real, registered business. It&rsquo;s free and takes about 3 minutes.
        </p>
      </div>

      <section className="mt-7" aria-labelledby="verification-benefits">
        <h3 id="verification-benefits" className="text-[15px] font-semibold text-main">
          What you get
        </h3>
        <ul className="mt-3 flex flex-col gap-4">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-subtle text-main">
                {Icon === "tick" ? (
                  <VerifiedTick size={18} label={null} />
                ) : (
                  <Icon size={17} strokeWidth={1.9} aria-hidden />
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[14px] font-semibold leading-5 text-main">{title}</p>
                <p className="text-[13px] leading-5 text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-7" aria-labelledby="verification-needs">
        <h3 id="verification-needs" className="text-[15px] font-semibold text-main">
          What you&rsquo;ll need
        </h3>
        <ol className="mt-3 overflow-hidden rounded-2xl border border-border bg-elevated">
          {REQUIREMENTS.map(({ key, icon: Icon, title, body }, index) => (
            <li
              key={key}
              className="flex items-start gap-3 border-b border-border px-4 py-3.5 last:border-b-0"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-main">
                <Icon size={17} strokeWidth={1.9} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold leading-5 text-main">
                  <span className="sr-only">Step {index + 1}: </span>
                  {title}
                </p>
                <p className="text-[13px] leading-5 text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-5 flex flex-col gap-2.5 rounded-2xl bg-subtle px-4 py-3.5">
        <p className="flex items-start gap-2.5 text-[13px] leading-5 text-main">
          <Info size={16} strokeWidth={1.9} className="mt-0.5 shrink-0" aria-hidden />
          {FINE_PRINT.trust}
        </p>
        <p className="flex items-start gap-2.5 text-[13px] leading-5 text-main">
          <Gift size={16} strokeWidth={1.9} className="mt-0.5 shrink-0" aria-hidden />
          {FINE_PRINT.free}
        </p>
      </div>

      {/* Sticky on a phone so the way forward never scrolls out of reach. */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-app/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button
          type="button"
          onClick={onStart}
          className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-white transition-opacity active:opacity-80 md:h-11 md:w-auto md:px-8"
        >
          Start verification
        </button>
      </div>
    </div>
  );
}
