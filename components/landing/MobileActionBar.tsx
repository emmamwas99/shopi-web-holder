"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthSession } from "@/hooks/useAuthSession";
import type { Dictionary } from "@/i18n/getDictionary";

/**
 * Phone-only bottom action bar, like a native app's primary action.
 *
 * Slides up once the hero's buttons have scrolled away and steps aside while
 * the closing "Sell for Free" section is on screen, so there is always
 * exactly one way to post within thumb reach. Guests only: signed-in
 * visitors get WelcomeBackBanner, which sits in the same spot.
 */
export function MobileActionBar({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: string;
}) {
  const { isAuthenticated } = useAuthSession();
  const [pastHero, setPastHero] = useState(false);
  const [atClosingCta, setAtClosingCta] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const closing = document.getElementById("download");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) {
          // Only "past" once it has left through the top, not before it loads.
          setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        } else if (entry.target === closing) {
          setAtClosingCta(entry.isIntersecting);
        }
      }
    });
    if (hero) observer.observe(hero);
    if (closing) observer.observe(closing);
    return () => observer.disconnect();
  }, []);

  if (isAuthenticated) return null;
  const visible = pastHero && !atClosingCta;
  const t = dict.landing.hero;

  return (
    <>
      {/* Room at the end of the page so the bar never covers the footer. */}
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden" />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-app px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden ${
          visible ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
        aria-hidden={!visible}
      >
        <div className="grid grid-cols-[1fr_1.35fr] gap-2.5">
          <Link
            href={`/${lang}/for-you`}
            tabIndex={visible ? undefined : -1}
            className="flex h-12 items-center justify-center rounded-full border border-border bg-elevated text-[0.9375rem] font-semibold text-foreground no-underline active:opacity-70"
          >
            {t.ctaFeed}
          </Link>
          <Link
            href={`/${lang}/upload`}
            tabIndex={visible ? undefined : -1}
            className="flex h-12 items-center justify-center rounded-full bg-primary text-[0.9375rem] font-semibold text-white no-underline active:opacity-80"
          >
            {t.ctaPost}
          </Link>
        </div>
      </div>
    </>
  );
}
