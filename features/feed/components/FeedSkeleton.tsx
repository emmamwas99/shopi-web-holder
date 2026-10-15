"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedLoader } from "@/components/ui/feed-loader";
import { WatchGridSkeleton } from "./WatchGridSkeleton";
import { SHOW_ASK_SHOPI } from "@/features/feed/utils/askShopiAvailability";

/**
 * Skeletons must occupy EXACTLY the space of the content that replaces them —
 * any difference is a layout shift (CLS) when data swaps in. The media box
 * mirrors PostCard's real media sizing: portrait media renders at
 * min(177.78vw, 70svh) (see PostCard.tsx), so the placeholder does too.
 * Colors come from the base Skeleton (bg-muted) so both themes look right —
 * no hardcoded grays.
 */
export function PostCardSkeleton() {
  // Mirrors PostCard's layout — header, media, listing, actions — so a card
  // swaps in without anything moving.
  return (
    <div className="bg-elevated">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 md:gap-3 md:py-3">
        <Skeleton className="h-9 w-9 rounded-full shrink-0 md:h-10 md:w-10" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-36 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
      </div>

      {/* Media — same height budget as PostCard portrait media (the dominant
          case in the feed), so the card doesn't grow/shrink when it loads. */}
      <Skeleton
        className="w-full rounded-none"
        style={{ height: "min(177.78vw, 70svh)" }}
      />

      {/* Price, title, caption */}
      <div className="px-4 pt-2.5 flex flex-col gap-2 md:pt-3">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-3.5 w-3/4 rounded-full" />
        <Skeleton className="h-3 w-1/2 rounded-full" />
      </div>

      <div className="mx-4 mt-2.5 h-px bg-border md:mt-3" />

      {/* Save · Contact · Share */}
      <div className="grid grid-cols-3 gap-1 px-2 py-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex h-10 items-center justify-center gap-2 md:h-11">
            <Skeleton className="w-5 h-5 rounded-full" />
            <Skeleton className="h-3 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeedCardsSkeleton() {
  return (
    <>
      {[...Array(3)].map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </>
  );
}

/**
 * The mobile stories tray while the page loads. Must match StoriesBar's
 * mobile markup (padding, 72px items, 66px circles, label row) so nothing
 * shifts when the real tray takes over.
 */
function StoriesTraySkeleton() {
  return (
    <section className="border-b border-default bg-elevated px-3 pb-2.5 pt-3" aria-hidden>
      <div className="flex gap-2.5 overflow-hidden">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex w-18 shrink-0 flex-col items-center gap-1.5">
            <Skeleton className="size-16.5 rounded-full" />
            <Skeleton className="h-3 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function FeedSkeleton() {
  const [activeTab, setActiveTab] = useState<"for-you" | "watch" | "ask-shopi">("for-you");

  useEffect(() => {
    // The server snapshot defaults to For You; sync a direct Watch URL after
    // hydration so the matching placeholder appears without changing SSR HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const tab = new URLSearchParams(window.location.search).get("tab");
    setActiveTab(
      tab === "watch" || (SHOW_ASK_SHOPI && tab === "ask-shopi")
        ? tab
        : "for-you",
    );
  }, []);

  return (
    <div>
      {/* The real tab links stay visible while the content below loads. */}
      <div className="md:hidden">
        <LoadingFeedTabs activeTab={activeTab} />
        {activeTab === "watch" ? (
          <WatchGridSkeleton />
        ) : activeTab === "ask-shopi" ? (
          <AskShopiSkeleton />
        ) : (
          <>
            <StoriesTraySkeleton />
            <FeedCardsSkeleton />
          </>
        )}
      </div>

      {/* ── Desktop skeleton — mirrors DesktopFeed's frame exactly (same
          container, grid and column widths) so nothing jumps when the real
          feed mounts: tabs + stories + card column, sellers in the RIGHT rail
          on xl. */}
      {/* Desktop Watch is a full-width video grid with no tabs or right rail
          (DesktopFeed), so its placeholder is that grid alone. */}
      {activeTab === "watch" ? (
        <div className="hidden min-h-svh bg-app md:block">
          <div className="mx-auto w-full max-w-[1560px] px-2 md:px-5 lg:px-8">
            <WatchGridSkeleton desktopLayout />
          </div>
        </div>
      ) : (
      <div className="hidden min-h-svh bg-app md:block">
        <div className="mx-auto w-full max-w-[1680px] px-4 pt-4 md:px-6 md:pt-6 xl:px-8">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] xl:items-start">
            <div className="mx-auto w-full min-w-0 max-w-[780px] pb-4 md:pb-6 xl:mx-0 xl:max-w-none">
              <LoadingFeedTabs
                activeTab={activeTab === "ask-shopi" ? "for-you" : activeTab}
                showAskShopi={false}
                className="mb-4"
              />

              {(
                <>
                  {/* Stories belong to For You, not Watch. */}
                  <div className="mb-4 flex gap-2.5 overflow-hidden rounded-xl border border-border bg-elevated p-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="flex w-18 shrink-0 flex-col items-center gap-1.5">
                        <Skeleton className="size-16.5 rounded-full" />
                        <Skeleton className="h-3 w-12 rounded-full" />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-4">
                    {[...Array(2)].map((_, i) => (
                      <div
                        key={i}
                        className="overflow-hidden rounded-2xl border border-default bg-elevated"
                      >
                        <PostCardSkeleton />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right rail — sellers to follow, then trending; xl and up only.
                Mirrors DesktopFeedRail's two cards and row sizes. */}
            <aside className="sticky top-5 hidden self-start xl:block">
              <div className="flex flex-col gap-4">
                <section className="rounded-2xl border border-default bg-elevated px-3 pb-3 pt-4">
                  <Skeleton className="mb-2 ml-2 h-4 w-32 rounded-full" />
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-2/3 rounded-full" />
                        <Skeleton className="h-2.5 w-1/2 rounded-full" />
                      </div>
                      <Skeleton className="h-7 w-22 shrink-0 rounded-full" />
                    </div>
                  ))}
                </section>
                <section className="rounded-2xl border border-default bg-elevated px-3 pb-3 pt-4">
                  <Skeleton className="mb-2 ml-2 h-4 w-28 rounded-full" />
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-2">
                      <Skeleton className="h-3.5 w-4 shrink-0 rounded-full" />
                      <Skeleton className="h-11 w-11 shrink-0 rounded-[10px]" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-3/4 rounded-full" />
                        <Skeleton className="h-2.5 w-1/2 rounded-full" />
                      </div>
                    </div>
                  ))}
                </section>
              </div>
            </aside>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function LoadingFeedTabs({
  activeTab,
  showAskShopi = SHOW_ASK_SHOPI,
  className = "",
}: {
  activeTab: "for-you" | "watch" | "ask-shopi";
  showAskShopi?: boolean;
  className?: string;
}) {
  const tabs = [
    { id: "for-you" as const, label: "For You" },
    { id: "watch" as const, label: "Watch" },
    ...(showAskShopi ? [{ id: "ask-shopi" as const, label: "Ask Shopi" }] : []),
  ];
  const tabClass = (tab: "for-you" | "watch" | "ask-shopi") =>
    `-mb-px border-b-2 px-3 pb-2.5 pt-1 text-sm font-bold ${
      activeTab === tab
        ? "border-primary text-primary"
        : "border-transparent text-muted hover:text-main"
    }`;

  return (
    <nav
      aria-label="Home feed"
      className={`sticky top-0 z-30 grid ${tabs.length === 3 ? "grid-cols-3" : "grid-cols-2"} border-b border-border bg-app px-2 py-3  md:top-(--desktop-top-nav-height,68px) ${className}`}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.id === "for-you" ? "?tab=for-you" : `?tab=${tab.id}`}
          scroll={false}
          className={tabClass(tab.id)}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function AskShopiSkeleton() {
  return (
    <div className="flex min-h-[50svh] flex-col justify-between bg-surface p-4">
      <div className="space-y-3">
        <Skeleton className="h-16 w-4/5 rounded-2xl" />
        <Skeleton className="ml-auto h-12 w-3/5 rounded-2xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

/**
 * Kept under its original name so the four grids importing it don't churn, but
 * it is no longer a skeleton: see {@link FeedLoader} for why the floating glass
 * pill went away.
 */
export function FeedPaginationSkeleton() {
  return <FeedLoader />;
}
