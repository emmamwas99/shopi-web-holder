"use client";

import { Search } from "lucide-react";
import { m, useReducedMotion } from "framer-motion";
import { useScrollChromeHidden } from "@/hooks/useScrollChromeHidden";
import { AppMotion, CHROME_TRANSITION } from "@/lib/motion/AppMotion";

type HomeTab = "for-you" | "following" | "nearby";

const tabs: { key: HomeTab; label: string }[] = [
  { key: "for-you", label: "For you" },
  { key: "following", label: "Following" },
  { key: "nearby", label: "Nearby" },
];

/** Each tab is a third of the row; the underline track is one third wide,
 *  so moving it by its own width lands it under the next tab. */
const indicatorX: Record<HomeTab, string> = {
  "for-you": "0%",
  following: "100%",
  nearby: "200%",
};

export function FeedHeader({
  activeTab,
  onTabChange,
  onSearchOpen,
}: {
  activeTab: HomeTab | "watch" | "ask-shopi";
  onTabChange: (tab: HomeTab) => void;
  onSearchOpen: () => void;
}) {
  const headerHidden = useScrollChromeHidden(activeTab);
  const selected = tabs.find((tab) => tab.key === activeTab)?.key;
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : CHROME_TRANSITION;

  return (
    <AppMotion>
      <div className="h-12 md:h-16" aria-hidden="true" />
      {/* Slides up out of the way on a deliberate scroll down, back on the
          way up (useScrollChromeHidden decides; framer moves it). */}
      <m.header
        initial={false}
        animate={{ y: headerHidden ? "-100%" : 0 }}
        transition={transition}
        className="feed-scroll-header fixed inset-x-0 top-0 z-30 border-b border-border/70 bg-elevated"
        data-hidden={headerHidden}
      >
        <div className="mx-auto grid h-12 max-w-2xl grid-cols-[40px_minmax(0,1fr)_40px] items-center px-2 md:h-16 md:max-w-5xl md:grid-cols-[52px_minmax(0,1fr)_52px] md:px-5">
          <span aria-hidden="true" />
          <div className="relative flex h-full min-w-0 items-center" role="tablist" aria-label="Home feed">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`h-full min-w-0 flex-1 px-1 text-[15px] font-semibold transition-colors sm:text-base md:text-lg ${
                  activeTab === tab.key ? "text-main" : "text-muted"
                }`}
              >
                <span className="block truncate">{tab.label}</span>
              </button>
            ))}
            {selected ? (
              // A transform slide, not a `left` transition: no layout work
              // per frame, so it glides between tabs.
              <m.span
                aria-hidden="true"
                initial={false}
                animate={{ x: indicatorX[selected] }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42, mass: 0.8 }}
                className="pointer-events-none absolute bottom-1 left-0 flex w-1/3 justify-center"
              >
                <span className="h-[3px] w-[22px] rounded-full bg-primary" />
              </m.span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onSearchOpen}
            aria-label="Search Shopi"
            className="grid size-10 place-items-center rounded-full text-main active:bg-surface md:size-12"
          >
            <Search size={24} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      </m.header>
    </AppMotion>
  );
}
