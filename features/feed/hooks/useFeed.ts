"use client";

import {
  useApolloClient,
  useQuery,
  useSuspenseQuery,
} from "@apollo/client/react";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ForYouFeedDocument,
  FollowingFeedDocument,
  TrendingContentDocument,
  LocalFeedDocument,
} from "@/types/__generated__/graphql";
import {
  FEED_PAGE_SIZE,
  FEED_LOAD_MORE_SIZE,
} from "@/features/feed/constants";
import { useNearbyLocation } from "@/features/feed/hooks/useNearbyLocation";
import { cancelScrollRestore } from "@/lib/scrollRestoration";
import {
  HOME_FEED_REFRESH_EVENT,
  beginHomeFeedLoading,
  consumeHomeFeedRefresh,
  hasPendingHomeFeedRefresh,
} from "@/lib/homeFeedRefresh";

// The first page is deliberately small (it is server-rendered and hydrated
// before the feed is interactive); later pages are larger because they mount
// off-screen and cost nothing on the critical path.
const PAGE_SIZE = FEED_PAGE_SIZE;
const LOAD_MORE_SIZE = FEED_LOAD_MORE_SIZE;

/**
 * Guards cursor-based pagination against a page that returns only duplicates
 * (server overlap): the merge appends nothing yet `hasNextPage` stays true, so
 * the same `endCursor` would otherwise be requested forever.
 *
 * `run(cursor, currentCount, fetch)` fires `fetch` UNLESS the exact same cursor
 * was already requested AND the item count hasn't changed since (a genuine
 * dedupe-empty page). A cursor that later corresponds to more items — e.g. after
 * the accumulated window is restored on revisit — passes, so pagination never
 * gets permanently stuck on a stale cursor.
 *
 * In-flight concurrency is handled by the caller (the infinite-scroll sentinel
 * is gated on `loadingMore`, i.e. Apollo's own `networkStatus === fetchMore`),
 * so we deliberately don't keep an `inFlight` ref here — a ref that failed to
 * clear would silently freeze pagination forever, which is exactly the failure
 * we're fixing.
 */
export function usePaginationGuard(currentCount: number) {
  // The cursor of the last request and the item count at that time.
  const lastCursor = useRef<string | null>(null);
  const lastCount = useRef<number>(-1);
  const maxCountSeen = useRef(currentCount);

  useEffect(() => {
    if (currentCount < maxCountSeen.current) {
      lastCursor.current = null;
      lastCount.current = -1;
    }
    maxCountSeen.current = Math.max(maxCountSeen.current, currentCount);
  }, [currentCount]);

  const run = useCallback(
    (cursor: string, currentCount: number, fetch: () => Promise<unknown>) => {
      if (lastCursor.current === cursor && lastCount.current === currentCount) {
        return;
      }
      lastCursor.current = cursor;
      lastCount.current = currentCount;
      void fetch();
    },
    [],
  );

  return run;
}

/**
 * The For You stream this page load reads, once settled. Module scope, so it
 * outlives the feed: the feed unmounts whenever another screen is opened.
 */
let visitSeed: string | null = null;
let lastHomeRefreshAt = 0;
const HOME_REFRESH_INTERVAL = 60_000;
const isDocumentVisible = () => document.visibilityState === "visible";

/** A different shared API variant from the one the last visit got. */
function nextVisitSeed(): string {
  try {
    const key = "shopi:for-you-variant";
    const stored = window.sessionStorage.getItem(key);
    const saved = stored === null ? 3 : Number(stored);
    const previous = Number.isInteger(saved) && saved >= 0 && saved < 16 ? saved : 3;
    const next = (previous + 1 + Math.floor(Math.random() * 15)) % 16;
    window.sessionStorage.setItem(key, String(next));
    return `shopi-feed-${next}`;
  } catch {
    const value = globalThis.crypto?.randomUUID?.();
    return value ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * @param serverRendered The page's HTML already holds the shared "initial"
 *   stream (the signed-out route renders it on the server).
 */
export function useForYouFeed({
  serverRendered = false,
  active = true,
}: { serverRendered?: boolean; active?: boolean } = {}) {
  // Reuse the same permission/caching flow the Nearby tab already owns: this
  // never itself prompts for permission (no `requestLocation()` call here) —
  // it only picks up a fix the user already granted elsewhere, so ranking
  // reflects where they actually are right now instead of their saved
  // profile/listing address, without ambushing Home with a permission popup.
  const { location } = useNearbyLocation();
  const apollo = useApolloClient();
  // Keep the accumulated stream for Back navigation. Refresh into a separate
  // cache entry only while Home is visible and near the top.
  const [seed, setSeed] = useState(() => {
    if (visitSeed === null && !serverRendered && typeof window !== "undefined") {
      visitSeed = nextVisitSeed();
      lastHomeRefreshAt = Date.now();
    }
    return visitSeed ?? "initial";
  });
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const refreshInFlight = useRef(false);
  const refreshGeneration = useRef(0);

  const refreshHead = useCallback(async (force = false) => {
    if (!active || !isDocumentVisible() || refreshInFlight.current) return;
    if (
      !force &&
      (window.scrollY > 80 || Date.now() - lastHomeRefreshAt < HOME_REFRESH_INTERVAL)
    ) return;

    const generation = refreshGeneration.current;
    let candidate = nextVisitSeed();
    if (candidate === visitSeed) candidate = nextVisitSeed();
    const variables = { limit: PAGE_SIZE, latitude, longitude, seed: candidate };
    refreshInFlight.current = true;
    const finishLoading = beginHomeFeedLoading();
    setRefreshing(true);
    setRefreshError(false);
    try {
      // Stage the result outside the cache: a late response must not alter a
      // list the user has started scrolling or a feed now hidden by a route.
      const result = await apollo.query({
        query: ForYouFeedDocument,
        variables,
        fetchPolicy: "no-cache",
        errorPolicy: "none",
      });
      if (
        generation !== refreshGeneration.current ||
        !isDocumentVisible() ||
        window.scrollY > 80
      ) return;
      if (!result.data?.forYouFeed) throw new Error("Missing Home feed");

      // Variants are reused. Drop this variant's previous window before the
      // write so a fresh first page never inherits an older pagination cursor.
      apollo.cache.evict({
        id: "ROOT_QUERY",
        fieldName: "forYouFeed",
        args: { seed: candidate, latitude, longitude },
      });
      apollo.writeQuery({ query: ForYouFeedDocument, variables, data: result.data });
      visitSeed = candidate;
      lastHomeRefreshAt = Date.now();
      startTransition(() => setSeed(candidate));
    } catch {
      // An offline/error response leaves the existing cards and cursor intact.
      if (generation === refreshGeneration.current) setRefreshError(true);
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
      finishLoading();
      // A Home click during an older request is handled as soon as it ends.
      if (hasPendingHomeFeedRefresh()) {
        window.dispatchEvent(new Event(HOME_FEED_REFRESH_EVENT));
      }
    }
  }, [active, apollo, latitude, longitude]);

  useEffect(() => {
    if (!active) return;
    const refreshIfStale = () => {
      if (refreshInFlight.current) return;
      if (consumeHomeFeedRefresh()) {
        cancelScrollRestore();
        window.scrollTo({ top: 0, behavior: "instant" });
        void refreshHead(true);
      } else {
        void refreshHead();
      }
    };
    // Let route/sub-tab scroll restoration run before deciding to refresh.
    const frame = requestAnimationFrame(refreshIfStale);
    const timer = window.setInterval(refreshIfStale, HOME_REFRESH_INTERVAL);
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(scrollTimer);
      if (window.scrollY <= 80) scrollTimer = setTimeout(refreshIfStale, 200);
    };
    window.addEventListener(HOME_FEED_REFRESH_EVENT, refreshIfStale);
    window.addEventListener("focus", refreshIfStale);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      refreshGeneration.current += 1;
      cancelAnimationFrame(frame);
      clearInterval(timer);
      clearTimeout(scrollTimer);
      window.removeEventListener(HOME_FEED_REFRESH_EVENT, refreshIfStale);
      window.removeEventListener("focus", refreshIfStale);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [active, refreshHead]);

  const refresh = useCallback(() => {
    cancelScrollRestore();
    window.scrollTo({ top: 0, behavior: "instant" });
    void refreshHead(true);
  }, [refreshHead]);

  const { data, error, fetchMore } = useSuspenseQuery(
    ForYouFeedDocument,
    {
      variables: {
        limit: PAGE_SIZE,
        latitude: location?.latitude,
        longitude: location?.longitude,
        seed,
      },
      // Render the saved window immediately; refreshHead replaces it safely
      // with a network result once the visible Home is stale and near the top.
      fetchPolicy: "cache-first",
      // Apollo's default refetch write mode is "overwrite", which can replace
      // an exhausted 33-item window with the refreshed first page while leaving
      // pageInfo stale. We need the field policy merge to receive `existing`.
      refetchWritePolicy: "merge",
      notifyOnNetworkStatusChange: true,
    },
  );

  const items = data?.forYouFeed?.items ?? [];
  const pageInfo = data?.forYouFeed?.pageInfo;

  const itemCount = items.length;
  const guard = usePaginationGuard(itemCount);
  // Apollo's networkStatus === fetchMore transition is too short-lived to
  // reliably land in a React render — the request/response round trip can
  // resolve within the same tick React would use to commit the "fetchMore"
  // state, coalescing it away (verified live: items still grow, but the
  // pagination spinner never showed). Track "in flight" ourselves instead.
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMore = useCallback(() => {
    if (
      refreshInFlight.current || loadingMore ||
      !pageInfo?.hasNextPage || !pageInfo.endCursor
    ) return;
    const cursor = pageInfo.endCursor;
    // The cache `merge` policy appends the page — no updateQuery needed.
    guard(cursor, itemCount, () => {
      setLoadingMore(true);
      let request!: Promise<unknown>;
      startTransition(() => {
        request = fetchMore({
          variables: { limit: LOAD_MORE_SIZE, after: cursor, seed },
        }).finally(() => setLoadingMore(false));
      });
      return request;
    });
  }, [fetchMore, pageInfo, guard, itemCount, seed, loadingMore]);

  return {
    items,
    refresh,
    refreshing,
    refreshError,
    // The initial request is represented by the nearest Suspense fallback.
    loading: false,
    loadingMore,
    error,
    hasMore: pageInfo?.hasNextPage ?? false,
    loadMore,
  };
}

export function useFollowingFeed() {
  const { data, loading, error, fetchMore } = useQuery(
    FollowingFeedDocument,
    {
      variables: { limit: PAGE_SIZE },
      // See useForYouFeed: bottom-tab navigation should restore the cached
      // accumulated window without a page-1 background refresh.
      fetchPolicy: "cache-first",
      refetchWritePolicy: "merge",
      notifyOnNetworkStatusChange: true,
    },
  );

  const items = data?.followingFeed?.items ?? [];
  const pageInfo = data?.followingFeed?.pageInfo;

  const itemCount = items.length;
  const guard = usePaginationGuard(itemCount);
  // See useForYouFeed: networkStatus === fetchMore is too short-lived to
  // reliably render, so loadingMore is tracked with local state instead.
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMore = useCallback(() => {
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;
    const cursor = pageInfo.endCursor;
    guard(cursor, itemCount, () => {
      setLoadingMore(true);
      return fetchMore({
        variables: { limit: LOAD_MORE_SIZE, after: cursor },
      }).finally(() => setLoadingMore(false));
    });
  }, [fetchMore, pageInfo, guard, itemCount]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore: pageInfo?.hasNextPage ?? false,
    loadMore,
  };
}

type NearbyCoordinates = {
  latitude: number;
  longitude: number;
};

export function useNearbyFeed(
  coordinates: NearbyCoordinates | null,
  radiusKm: number,
) {
  const { data, loading, error, fetchMore } = useQuery(
    LocalFeedDocument,
    {
      variables: {
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        radiusKm,
        limit: PAGE_SIZE,
      },
      skip: !coordinates,
      // See useForYouFeed: bottom-tab navigation should restore the cached
      // accumulated window without a page-1 background refresh.
      fetchPolicy: "cache-first",
      refetchWritePolicy: "merge",
      notifyOnNetworkStatusChange: true,
    },
  );

  const items = data?.localFeed?.items ?? [];
  const pageInfo = data?.localFeed?.pageInfo;

  const itemCount = items.length;
  const guard = usePaginationGuard(itemCount);

  // Apollo's networkStatus === fetchMore transition is too short-lived to
  // reliably land in a React render here — the request/response round trip
  // (particularly on a fast/local network) can resolve within the same tick
  // React would use to commit the "fetchMore" state, so the intermediate
  // value is coalesced away and the pagination spinner never shows even
  // though the fetch genuinely happened (verified: items still grow).
  // Track "in flight" ourselves instead of relying on networkStatus.
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMore = useCallback(() => {
    if (!coordinates) return;
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;
    const cursor = pageInfo.endCursor;
    guard(cursor, itemCount, () => {
      setLoadingMore(true);
      return fetchMore({
        variables: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          radiusKm,
          limit: LOAD_MORE_SIZE,
          after: cursor,
        },
      }).finally(() => setLoadingMore(false));
    });
  }, [fetchMore, pageInfo, coordinates, radiusKm, guard, itemCount]);

  return {
    items,
    loading: loading && items.length === 0,
    loadingMore,
    error,
    hasMore: pageInfo?.hasNextPage ?? false,
    loadMore,
  };
}

/** Trending listings — the desktop rail's "Trending now". */
export function useTrending(county?: string) {
  const { data, loading } = useQuery(TrendingContentDocument, {
    variables: { county },
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });
  return { items: data?.trendingContent ?? [], loading };
}
