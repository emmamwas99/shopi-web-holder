"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ShoppingBag } from "lucide-react";
import { useForYouFeed } from "../hooks/useFeed";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { FeedPaginationSkeleton, PostCardSkeleton } from "./FeedSkeleton";
import { LocationPermissionBanner } from "./LocationPermissionBanner";
import { PostCard } from "./PostCard";
import { DesktopFeedRail } from "./DesktopFeedRail";
import { StoriesBar } from "@/features/stories/components/StoriesBar";
import { WatchGridSkeleton } from "./WatchGridSkeleton";
import {
  captureScrollPosition,
  restoreScrollPosition,
  type ScrollPosition,
} from "@/lib/scrollRestoration";
import { rememberNavTabUrl } from "@/lib/navTabMemory";
import {
  hasPendingWatchScrollPosition,
  restoreWatchScrollPosition,
} from "@/features/feed/lib/watchScrollPosition";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";

type Tab = "for-you" | "watch";

const TABS: { id: Tab; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "watch", label: "Watch" },
];

// `loading` gives each its own Suspense boundary (see FeedPage): without it the
// first open suspended to the route boundary and replaced the whole feed with
// its skeleton, snapping the window scroll.
const WatchGrid = dynamic(
  () => import("./WatchGrid").then((mod) => mod.WatchGrid),
  { loading: () => <WatchGridSkeleton desktopLayout /> },
);
const isTab = (v: string | null): v is Tab =>
  v === "for-you" || v === "watch";

const isDesktopViewport = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(min-width: 768px)").matches;

/**
 * Where each sub-tab was left, kept for the whole visit rather than per mount
 * (see FeedPage's twin). Anchored positions, so a column that re-lays out
 * still comes back to the same post.
 */
const subTabPositions: Partial<Record<Tab, ScrollPosition>> = {};

function ColumnSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-elevated"
        >
          <PostCardSkeleton />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-main">
        <ShoppingBag className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-lg font-black text-main">{title}</h3>
        <p className="app-subcopy mx-auto mt-1 max-w-sm">
          {body}
        </p>
      </div>
      {action}
    </div>
  );
}

function DesktopPostCard({
  post,
  lang,
  priority,
}: {
  post: ContentCardFieldsFragment;
  lang: string;
  priority?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-elevated shadow-sm shadow-black/[0.03]">
      <PostCard post={post} lang={lang} priority={priority} />
    </div>
  );
}

function ForYouColumn({ lang, active }: { lang: string; active: boolean }) {
  const { items, loading, loadingMore, hasMore, loadMore } = useForYouFeed(active);
  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: loadMore,
  });

  if (loading && items.length === 0) return <ColumnSkeleton />;

  if (!loading && items.length === 0) {
    return (
      <EmptyState
        title="Your feed is empty"
        body="Follow sellers or explore categories to see content here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <LocationPermissionBanner />
      {items.map((post, i) => (
        <DesktopPostCard
          key={post.id}
          post={post}
          lang={lang}
          priority={i === 0}
        />
      ))}
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && <FeedPaginationSkeleton />}
      {!hasMore && items.length > 0 && (
        <p className="py-6 text-center text-xs text-muted">
          You&apos;re all caught up
        </p>
      )}
    </div>
  );
}

export default function DesktopFeed({
  lang = "en",
  visible = true,
}: {
  lang?: string;
  visible?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTab: Tab = (() => {
    const t = searchParams.get("tab");
    return isTab(t) ? t : "for-you";
  })();
  const [tab, setTab] = useState<Tab>(initialTab);
  const prevTab = useRef<Tab>(initialTab);

  useLayoutEffect(() => {
    if (prevTab.current !== tab) {
      if (isDesktopViewport()) restoreScrollPosition(subTabPositions[tab]);
      prevTab.current = tab;
    }
  }, [tab]);

  const selectTab = useCallback((next: Tab) => {
    const current = prevTab.current;
    if (next === current) return;
    if (isDesktopViewport()) subTabPositions[current] = captureScrollPosition();
    setTab(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "for-you") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}`,
    );
    // Next does not see a bare replaceState, so tell the nav tab memory the
    // Home now returns to this sub-tab.
    rememberNavTabUrl();
  }, []);

  useLayoutEffect(() => {
    if (
      !isDesktopViewport() ||
      !/\/(?:for-you|feed)\/?$/.test(pathname) ||
      !hasPendingWatchScrollPosition()
    ) {
      return;
    }
    if (tab !== "watch") {
      selectTab("watch");
      return;
    }
    const frame = requestAnimationFrame(restoreWatchScrollPosition);
    return () => cancelAnimationFrame(frame);
  }, [pathname, selectTab, tab]);

  useEffect(() => {
    if (!visible) return;
    const t = searchParams.get("tab");
    if (!isTab(t)) return;
    const current = prevTab.current;
    if (t === current) return;
    if (isDesktopViewport()) subTabPositions[current] = captureScrollPosition();
    setTab(t);
  }, [searchParams, visible]);

  return (
    <div className="min-h-svh bg-app">
      {tab === "watch" ? (
        <div className="mx-auto w-full max-w-[1560px] px-2 md:px-5 lg:px-8">
          <WatchGrid lang={lang} active={visible} desktopLayout />
        </div>
      ) : (
      <>
      {/* Capped and centered like the Discover/Explore shell (same
          `lg:max-w-[1560px]` and `lg:px-8`) — without a cap, the fixed
          380/400px right rail just slides further from the feed column as
          the viewport widens past a laptop screen, and the feed itself
          pressed flush against the sidebar with zero gutter.
          The feed column flexes (minmax(0,1fr)) instead of demanding 720–840px:
          beside the 304px side menu those minimums pushed the rail past the
          window on every screen narrower than ~1900px (cut off, with a sideways
          scroll). At 1280px the feed is still ~540px — wider than Instagram's. */}
      <div className="mx-auto grid w-full grid-cols-1 gap-7 px-4 py-0 lg:max-w-[1560px] lg:px-8 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <section className="min-w-0">
          <div className="sticky top-(--desktop-top-nav-height,68px) z-20 -mx-2 mb-4 bg-app/92 px-2 py-3 backdrop-blur">
            {/* Equal-width Home subtabs across the whole column. */}
            <div
              className={[
                "grid w-full border-b border-border",
                TABS.length === 2 ? "grid-cols-2" : "grid-cols-3",
              ].join(" ")}
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTab(t.id)}
                  aria-current={tab === t.id ? "true" : undefined}
                  className={[
                    "-mb-px border-b-2 pb-2.5 pt-1 text-sm font-bold tracking-normal transition-colors",
                    tab === t.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-main",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className={tab === "for-you" ? undefined : "hidden"}>
            <StoriesBar lang={lang} variant="desktop" />
            <ForYouColumn lang={lang} active={visible && tab === "for-you"} />
          </div>
        </section>

        <aside className="sticky top-[calc(var(--desktop-top-nav-height,68px)+1.25rem)] hidden max-h-[calc(100svh-var(--desktop-top-nav-height,68px)-2.5rem)] overflow-y-auto xl:block">
          <DesktopFeedRail lang={lang} />
        </aside>
      </div>
      </>
      )}
    </div>
  );
}
