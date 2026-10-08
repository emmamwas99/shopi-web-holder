"use client";

import { SHOW_ASK_SHOPI } from "@/features/feed/utils/askShopiAvailability";

type Tab = "for-you" | "watch" | "ask-shopi";

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  variant?: "default" | "immersive";
}

export function FeedHeader({
  activeTab,
  onTabChange,
  variant = "default",
}: Props) {
  const immersive = variant === "immersive";
  const tabs: { id: Tab; label: string }[] = [
    { id: "for-you", label: "For You" },
    { id: "watch", label: "Watch" },
    ...(SHOW_ASK_SHOPI ? [{ id: "ask-shopi" as const, label: "Ask Shopi" }] : []),
  ];

  return (
    <header
      className={
        immersive
          ? "absolute inset-x-0 z-40 border-0 bg-transparent px-4 pt-2 text-white"
          : "sticky top-0 z-30 border-b border-default bg-app/80 py-4 backdrop-blur-md"
      }
      style={
        immersive
          ? {
              top: "var(--immersive-top, max(env(safe-area-inset-top, 0px), 16px))",
            }
          : undefined
      }
    >
      {immersive && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-4 h-28 bg-gradient-to-b from-black/65 via-black/25 to-transparent"
        />
      )}
      {/* Tabs */}
      <div
        className={`relative flex gap-0 ${immersive ? "mx-auto h-12 max-w-sm" : "-mb-4 px-4"}`}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={`relative flex-1 border-b-2 pt-1 pb-2.5 text-[14.5px] font-semibold transition-colors ${
              immersive
                ? activeTab === tab.id
                  ? "border-white text-white"
                  : "border-transparent text-white/70 hover:text-white"
                : activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
}
