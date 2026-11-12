"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * A "Back to top" pill that appears once the page has scrolled past one
 * screen, and takes you back to the top on tap.
 *
 * - app:     Explore/Browse. On phones it sits bottom-right just above the
 *            bottom nav; on desktop it's centred at the bottom.
 * - landing: the home page. Bottom-right at every size, above the phone action
 *            bar and clear of the centred "welcome back" pill.
 *
 * Mount one per page — every page here scrolls the window.
 */

/** Shown past one screen; hidden again only near the top, so it doesn't flicker at the edge. */
const SHOW_AFTER_SCREENS = 1;
const HIDE_BELOW_SCREENS = 0.5;
/**
 * Farther than this, jump most of the way before the smooth part: gliding
 * back past dozens of feed cards wakes every video on the way (data and
 * battery on a phone) and takes seconds.
 */
const SMOOTH_SCROLL_SCREENS = 2;

const PLACEMENT = {
  app: "right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--nav-height,60px)+var(--safe-bottom,0px)+0.75rem)] md:right-auto md:bottom-6 md:left-1/2 md:-translate-x-1/2",
  landing:
    "right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] md:right-6 md:bottom-6",
  pdp: "right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--nav-height,60px)+var(--safe-bottom,0px)+1rem)] md:hidden",
} as const;

export function BackToTopButton({
  variant = "app",
  hidden = false,
}: {
  variant?: keyof typeof PLACEMENT;
  /** Force it away, e.g. while a screen owns the bottom of the viewport. */
  hidden?: boolean;
}) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const screens = window.scrollY / window.innerHeight;
      setPast((was) => (was ? screens > HIDE_BELOW_SCREENS : screens > SHOW_AFTER_SCREENS));
    };
    // At most one check per frame, however fast the scroll events come.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const nearTop = window.innerHeight * SMOOTH_SCROLL_SCREENS;
    if (window.scrollY > nearTop) window.scrollTo({ top: nearTop, behavior: "instant" });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const visible = past && !hidden;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? undefined : -1}
      className={[
        "fixed z-40 flex h-11 items-center gap-1.5 rounded-full border border-border bg-elevated pl-3.5 pr-4 text-sm font-semibold text-default shadow-lg shadow-black/10",
        "transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none",
        "[-webkit-tap-highlight-color:transparent] active:scale-95",
        PLACEMENT[variant],
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      ].join(" ")}
    >
      <ArrowUp size={18} strokeWidth={2.4} aria-hidden />
      Back to top
    </button>
  );
}
