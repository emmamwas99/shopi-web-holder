"use client";

import Link from "next/link";
import { trackHomepageButtonClick } from "@/lib/analytics";
import { useLandingViewer } from "./useLandingViewer";

export type HeroMobileCopy = {
  browse: string;
  sell: string;
  /** "Continue as {name}"; `{name}` is replaced. */
  continueAs: string;
  /** For a signed-in account without a first name. */
  continue: string;
};

/**
 * The phone hero's two buttons: plain, equal, no icons or motion, so the
 * first screen reads in a glance. Signed in, the first one becomes the way
 * back into the app ("Continue as Dash"); the phone header stays clean.
 * Tablet and desktop keep the animated pair (hidden here from md).
 */
export function HeroMobileActions({ lang, copy }: { lang: string; copy: HeroMobileCopy }) {
  const viewer = useLandingViewer();
  const forYou = `/${lang}/for-you`;
  const sell = `/${lang}/upload`;
  const primaryLabel = viewer
    ? viewer.firstName
      ? copy.continueAs.replace("{name}", viewer.firstName)
      : copy.continue
    : copy.browse;

  return (
    <div className="mt-6 grid grid-cols-2 gap-2.5 md:hidden">
      <Link
        href={forYou}
        onClick={() =>
          trackHomepageButtonClick(viewer ? "continue_to_app" : "browse_for_you", "hero", forYou)
        }
        className="flex h-12 min-w-0 items-center justify-center rounded-xl bg-primary px-3 text-[0.9375rem] font-semibold text-white no-underline active:bg-primary-strong"
      >
        <span className="truncate">{primaryLabel}</span>
      </Link>
      <Link
        href={sell}
        onClick={() => trackHomepageButtonClick("sell_item", "hero", sell)}
        className="flex h-12 min-w-0 items-center justify-center rounded-xl bg-landing-card px-3 text-[0.9375rem] font-semibold text-landing-ink no-underline ring-1 ring-landing-line-strong active:bg-primary/[0.07]"
      >
        <span className="truncate">{copy.sell}</span>
      </Link>
    </div>
  );
}
