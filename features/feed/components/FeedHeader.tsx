"use client";

import { Search } from "lucide-react";
import { useScrollChromeHidden } from "@/hooks/useScrollChromeHidden";

type HomeTab = "for-you" | "following" | "nearby";

const tabs: { key: HomeTab; label: string }[] = [
  { key: "for-you", label: "For you" },
  { key: "following", label: "Following" },
  { key: "nearby", label: "Nearby" },
];

const indicatorPosition: Record<HomeTab, string> = {
  "for-you": "left-[16.6667%]",
  following: "left-1/2",
  nearby: "left-[83.3333%]",
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

  return (
    <>
      <div className="h-12 md:h-16" aria-hidden="true" />
      <header
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
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute bottom-1 h-[3px] w-[22px] -translate-x-1/2 rounded-full bg-primary transition-[left] duration-200 ease-out motion-reduce:transition-none ${indicatorPosition[selected]}`}
              />
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
      </header>
    </>
  );
}
