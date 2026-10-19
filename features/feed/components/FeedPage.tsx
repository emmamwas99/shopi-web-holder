"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  use,
  Suspense,
} from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { FeedHeader } from "./FeedHeader";
import { MobileSearchScreen, type MobileSearchTab } from "./MobileSearchScreen";
import { GoogleOneTap } from "@/features/auth/components/GoogleOneTap";
import FeedGrid from "./FeedGrid";
import {
  AskShopiSkeleton,
  FeedCardsSkeleton,
  FeedSkeleton,
} from "./FeedSkeleton";
import { StoriesBar } from "@/features/stories/components/StoriesBar";
import { LocationPermissionBanner } from "./LocationPermissionBanner";
import { WatchGridSkeleton } from "./WatchGridSkeleton";
import { SHOW_ASK_SHOPI } from "@/features/feed/utils/askShopiAvailability";
import {
  hasPendingWatchScrollPosition,
  restoreWatchScrollPosition,
} from "@/features/feed/lib/watchScrollPosition";
import {
  captureScrollPosition,
  restoreScrollPosition,
  type ScrollPosition,
} from "@/lib/scrollRestoration";
import { rememberNavTabUrl } from "@/lib/navTabMemory";
import { useUiStore } from "@/stores/ui";
import { isTabletViewportNow, TABLET_QUERY } from "@/hooks/useIsTablet";
import {
  RecordSearchTermDocument,
  type ContentCardFieldsFragment,
} from "@/types/__generated__/graphql";

// Each sub-tab grid needs its own `loading`: that is what makes next/dynamic
// wrap it in a Suspense boundary. Without one, the first open of a sub-tab
// suspended up to the route's boundary and swapped the WHOLE feed for its
// skeleton while the chunk downloaded — the header vanished and the window
// scroll clamped to the skeleton's height.
const WatchGrid = dynamic(
  () => import("./WatchGrid").then((mod) => mod.WatchGrid),
  { loading: () => <WatchGridSkeleton /> },
);
const AskShopiGrid = SHOW_ASK_SHOPI
  ? dynamic(
      () => import("./AskShopiGrid").then((mod) => mod.AskShopiGrid),
      { loading: () => <AskShopiSkeleton /> },
    )
  : null;
const DesktopFeed = dynamic(() => import("./DesktopFeed"), {
  // Show the desktop-shaped skeleton while the chunk downloads, so the
  // dashboard frame (tabs, column, right rail) is stable from the first paint.
  loading: () => <FeedSkeleton />,
});

interface Props {
  lang: string;
  visible?: boolean;
  /** Server-fetched first page, handed to FeedGrid so the feed's cards (and
   *  the LCP image) are present in the server-rendered HTML. */
  initialItems?: ContentCardFieldsFragment[];
  /** Server query streamed separately so the header need not wait for it. */
  initialItemsPromise?: Promise<ContentCardFieldsFragment[]>;
}

type Tab = "for-you" | "watch" | "ask-shopi";

const isTab = (v: string | null): v is Tab =>
  v === "for-you" || v === "watch" || (SHOW_ASK_SHOPI && v === "ask-shopi");

const DESKTOP_QUERY = "(min-width: 1280px) and (pointer: fine)";
const isDesktopViewportNow = () =>
  window.matchMedia(DESKTOP_QUERY).matches && !isTabletViewportNow();

/** Tablets use the phone feed too, including its window scroll restoration. */
const isMobileViewport = () =>
  typeof window !== "undefined" && !isDesktopViewportNow();

function subscribeViewport(onChange: () => void) {
  const desktopMedia = window.matchMedia(DESKTOP_QUERY);
  const tabletMedia = window.matchMedia(TABLET_QUERY);
  desktopMedia.addEventListener("change", onChange);
  tabletMedia.addEventListener("change", onChange);
  return () => {
    desktopMedia.removeEventListener("change", onChange);
    tabletMedia.removeEventListener("change", onChange);
  };
}
const serverIsDesktop = () => false;

/**
 * Where each sub-tab was left, kept for the whole visit rather than per mount,
 * so coming back to the feed and switching to another sub-tab still lands
 * where that one was. Anchored positions, like the route-level ones.
 */
const subTabPositions: Partial<Record<Tab, ScrollPosition>> = {};

/**
 * Mirror the sub-tab into the address bar, as DesktopFeed does, so the Home
 * nav tab (lib/navTabMemory) can bring the user back to it. A bare
 * replaceState on purpose: it is not a navigation, and Next must not re-render
 * the route for it.
 */
function mirrorTabToUrl(tab: Tab) {
  const url = new URL(window.location.href);
  if (tab === "for-you") url.searchParams.delete("tab");
  else url.searchParams.set("tab", tab);
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
  rememberNavTabUrl();
}

export function FeedPage({
  lang,
  visible = true,
  initialItems,
  initialItemsPromise,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchDraft, setMobileSearchDraft] = useState("");
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [searchTab, setSearchTab] = useState<MobileSearchTab>("Top");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const setBottomNavHidden = useUiStore((s) => s.setBottomNavHidden);
  const [recordSearchTerm] = useMutation(RecordSearchTermDocument);
  const isSearchResultPdpOpen =
    pathname.includes("/video/") || pathname.includes("/content/");
  // Only mount the feed tree that can actually be displayed. CSS-hidden client
  // components still execute, query, observe layout, and download all of their
  // dependencies; mounting both variants made mobile load the desktop Mux/HLS
  // and chat bundles as well as a duplicate set of PostCards.
  //
  // The server snapshot stays mobile-first so the PageSpeed/Lighthouse viewport
  // receives useful HTML immediately. Desktop swaps to its dedicated tree just
  // after hydration and gets a lightweight reserved-height fallback meanwhile.
  // On a client-side navigation there is no hydration, so the real viewport is
  // read on the first render — the desktop feed is there in the same commit,
  // which is what lets a return to the feed restore its scroll before paint
  // instead of flashing the skeleton at the top first.
  const desktop = useSyncExternalStore(
    subscribeViewport,
    isDesktopViewportNow,
    serverIsDesktop,
  );

  const initialParam = searchParams.get("tab");
  const initialTab: Tab = isTab(initialParam) ? initialParam : "for-you";
  const [tab, setTab] = useState<Tab>(initialTab);
  // Mount each secondary tab only when opened, then keep it mounted so tab
  // switches preserve its state and loaded content.
  const [openedTabs, setOpenedTabs] = useState<Set<Tab>>(
    () => new Set([initialTab]),
  );
  // The page scrolls on `window` (there's no inner scroll container), so hiding
  // the inactive feed collapses the document height and the browser loses the
  // position. Each sub-tab's position is kept in `subTabPositions` and
  // restored on return.
  const prevTab = useRef<Tab>(initialTab);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("shopi:recent-searches");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(
            parsed.filter((term): term is string => typeof term === "string").slice(0, 10),
          );
        }
      }
    } catch {
      // Recent searches are a convenience; ignore unavailable or invalid storage.
    }
  }, []);

  useLayoutEffect(() => {
    setBottomNavHidden(mobileSearchOpen);
    return () => setBottomNavHidden(false);
  }, [mobileSearchOpen, setBottomNavHidden]);

  useEffect(() => {
    if (!mobileSearchOpen || searchResultsOpen || isSearchResultPdpOpen) return;
    const frame = requestAnimationFrame(() => mobileSearchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isSearchResultPdpOpen, mobileSearchOpen, searchResultsOpen]);

  useEffect(() => {
    if (searchResultsOpen) mobileSearchInputRef.current?.blur();
  }, [searchResultsOpen]);

  function submitMobileSearch(term: string) {
    const normalized = term.trim();
    if (!normalized) return;
    const nextRecent = [
      normalized,
      ...recentSearches.filter(
        (recent) => recent.toLocaleLowerCase() !== normalized.toLocaleLowerCase(),
      ),
    ].slice(0, 10);
    setRecentSearches(nextRecent);
    try {
      window.localStorage.setItem("shopi:recent-searches", JSON.stringify(nextRecent));
    } catch {
      // Continue to results if browser storage is unavailable.
    }
    void recordSearchTerm({ variables: { input: { term: normalized } } }).catch(() => {});
    setSubmittedSearch(normalized);
    setMobileSearchDraft(normalized);
    setSearchTab("Top");
    setSearchResultsOpen(true);
  }

  function removeRecentSearch(term: string) {
    setRecentSearches((current) => {
      const next = current.filter((recent) => recent !== term);
      try {
        window.localStorage.setItem("shopi:recent-searches", JSON.stringify(next));
      } catch {
        // Keep the in-memory list usable when storage is unavailable.
      }
      return next;
    });
  }

  // Restore the incoming tab's scroll AFTER the show/hide classes apply but
  // before paint, so there's no flash at the wrong offset. Layout effects run
  // post-DOM-mutation, by which point the restored feed has its full height
  // back; a sub-tab opened for the first time is waited for until its cards
  // render. Nothing saved means the top.
  useLayoutEffect(() => {
    if (prevTab.current !== tab) {
      if (isMobileViewport()) restoreScrollPosition(subTabPositions[tab]);
      prevTab.current = tab;
    }
  }, [tab]);

  // The video viewer is an intercepted route, but the feed may be remounted
  // when returning from it. Keep Watch's own anchored position and restore it
  // as soon as Home is back, whether the feed stayed mounted or not.
  useLayoutEffect(() => {
    if (desktop || !/\/(?:for-you|feed)\/?$/.test(pathname)) return;
    if (!hasPendingWatchScrollPosition()) return;

    // Chat can remount the feed without the in-memory tab state. The pending
    // Watch return is authoritative even if the restored URL has no tab query.
    if (tab !== "watch") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab("watch");
      setOpenedTabs((prev) =>
        prev.has("watch") ? prev : new Set(prev).add("watch"),
      );
      mirrorTabToUrl("watch");
      return;
    }

    // RouteScrollRestoration also runs on this navigation. Restore Watch on
    // the next frame so its route-level position decision cannot replace
    // this tab's saved anchor with the page's older position.
    const frame = requestAnimationFrame(restoreWatchScrollPosition);
    return () => cancelAnimationFrame(frame);
  }, [desktop, pathname, tab]);

  // Sync the feed view from its URL while visible. A bare /for-you URL always
  // means For You, including when the user taps Home while Watch is open.
  useEffect(() => {
    if (!visible) return;
    const t = searchParams.get("tab");
    const nextTab: Tab = isTab(t) ? t : "for-you";
    if (nextTab !== tab) {
      if (isMobileViewport()) subTabPositions[tab] = captureScrollPosition();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(nextTab);
      setOpenedTabs((prev) =>
        prev.has(nextTab) ? prev : new Set(prev).add(nextTab),
      );
    }
    // only re-run when the search params change, not when tab changes internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, visible]);

  function handleTabChange(next: Tab) {
    if (next === tab) return;
    // Remember where we are on the tab we're leaving, before it gets hidden.
    if (isMobileViewport()) subTabPositions[tab] = captureScrollPosition();
    setTab(next);
    setOpenedTabs((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    mirrorTabToUrl(next);
  }

  return (
    <div>
      {/* Google One Tap for logged-out visitors — only while the feed is the
          screen being shown (FeedPage stays mounted behind other routes). */}
      <GoogleOneTap lang={lang} active={visible} />

      {mobileSearchOpen && !isSearchResultPdpOpen ? (
        <MobileSearchScreen
          lang={lang}
          view={searchResultsOpen ? "results" : "entry"}
          query={submittedSearch}
          activeTab={searchTab}
          onTabChange={setSearchTab}
          recentSearches={recentSearches}
          searchDraft={mobileSearchDraft}
          inputRef={mobileSearchInputRef}
          onDraftChange={setMobileSearchDraft}
          onSubmit={submitMobileSearch}
          onClose={() => setMobileSearchOpen(false)}
          onBackToEntry={() => setSearchResultsOpen(false)}
          onSelectRecent={submitMobileSearch}
          onRemoveRecent={removeRecentSearch}
          onViewAllUsers={() => setSearchTab("Users")}
        />
      ) : null}

      {/* ── Desktop: loaded only on a desktop viewport. The skeleton reserves
          the desktop layout during hydration; CSS limits it to desktop. ── */}
      {desktop ? (
        <DesktopFeed lang={lang} visible={visible} />
      ) : (
        <div className="desktop-feed-skeleton" aria-hidden>
          <FeedSkeleton />
        </div>
      )}

      {/* ── Phone and tablet: feed toolbar and selected feed view ── */}
      {!desktop ? (
        <div className="feed-mobile-shell min-h-svh">
          <FeedHeader
            activeTab={tab}
            onTabChange={handleTabChange}
            onSearchOpen={() => {
              setMobileSearchDraft("");
              setSearchResultsOpen(false);
              setMobileSearchOpen(true);
            }}
          />

          {/* Once a feed has been opened it stays mounted; we only toggle
            visibility. Conditionally rendering on `tab ===` would unmount the
            inactive feed and, on switch-back, remount a fresh Apollo observer —
            re-running the page-1 fetch and discarding both the accumulated
            window and scroll position. Keeping it mounted preserves scroll +
            pagination and makes tab switches instant. A display:none feed
            reports intersection ratio 0, so its PostCard videos never win the
            active-video election. */}
          <div className="relative bg-surface">
            <div className={tab === "for-you" ? undefined : "hidden"}>
              {initialItemsPromise ? (
                <Suspense
                  fallback={
                    <>
                      <StoriesBar lang={lang} />
                      <LocationPermissionBanner />
                      <FeedCardsSkeleton />
                    </>
                  }
                >
                  <DeferredFeedGrid
                    lang={lang}
                    active={visible && tab === "for-you"}
                    initialItemsPromise={initialItemsPromise}
                  />
                </Suspense>
              ) : (
                <FeedGrid
                  lang={lang}
                  active={visible && tab === "for-you"}
                  initialItems={initialItems}
                />
              )}
            </div>

            {openedTabs.has("watch") ? (
              <div className={tab === "watch" ? undefined : "hidden"}>
                <WatchGrid lang={lang} active={visible && tab === "watch"} />
              </div>
            ) : null}
            {SHOW_ASK_SHOPI && AskShopiGrid && openedTabs.has("ask-shopi") ? (
              <div className={tab === "ask-shopi" ? undefined : "hidden"}>
                <AskShopiGrid lang={lang} active={visible && tab === "ask-shopi"} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DeferredFeedGrid({
  lang,
  active,
  initialItemsPromise,
}: {
  lang: string;
  active: boolean;
  initialItemsPromise: Promise<ContentCardFieldsFragment[]>;
}) {
  const initialItems = use(initialItemsPromise);
  return <FeedGrid lang={lang} active={active} initialItems={initialItems} />;
}
