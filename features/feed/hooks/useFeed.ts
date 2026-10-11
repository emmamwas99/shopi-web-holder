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
/** The mounted feed's seed setter, while a feed is mounted. */
let showSeed: ((seed: string) => void) | null = null;

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
}: { serverRendered?: boolean } = {}) {
  // Reuse the same permission/caching flow the Nearby tab already owns: this
  // never itself prompts for permission (no `requestLocation()` call here) —
  // it only picks up a fix the user already granted elsewhere, so ranking
  // reflects where they actually are right now instead of their saved
  // profile/listing address, without ambushing Home with a permission popup.
  const { location } = useNearbyLocation();
  const apollo = useApolloClient();
  // Each page load reads one ranked stream, a different variant per load, and
  // keeps it until the next load. Coming back to the feed — Back from a
  // listing, the Home tab, the For You sub-tab — finds that stream still
  // cached, with the card the user left from in it. Re-ranking on every mount
  // replaced the list, and Back landed near the top of a different feed.
  const [seed, setSeed] = useState(() => {
    if (visitSeed === null && !serverRendered && typeof window !== "undefined") {
      // Rendered on the client alone (signed in): choose the variant up
      // front — one request, and nothing to swap out later.
      visitSeed = nextVisitSeed();
    }
    return visitSeed ?? "initial";
  });

  useEffect(() => {
    showSeed = setSeed;
    return () => {
      if (showSeed === setSeed) showSeed = null;
    };
  }, []);

  // A server-rendered load opens on the shared "initial" stream in its HTML. A
  // fresh variant takes over only if it arrives before the user starts
  // browsing. Swapping the list in later moved it under someone mid-scroll,
  // and if they had already left for a listing, Back came home to a different
  // feed than the one they left.
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  useEffect(() => {
    if (visitSeed !== null) return;
    visitSeed = "initial";
    const candidate = nextVisitSeed();
    let engaged = false;
    const engage = () => {
      engaged = true;
    };
    const intent = ["scroll", "pointerdown", "keydown"] as const;
    for (const type of intent) {
      window.addEventListener(type, engage, { capture: true, passive: true });
    }
    apollo
      .query({
        query: ForYouFeedDocument,
        variables: { limit: PAGE_SIZE, latitude, longitude, seed: candidate },
        fetchPolicy: "network-only",
      })
      .then(() => {
        if (engaged || !showSeed || visitSeed !== "initial") return;
        visitSeed = candidate;
        const show = showSeed;
        // Already cached, so this renders without suspending.
        startTransition(() => show(candidate));
      })
      .catch(() => {
        // Keep the stream on screen.
      })
      .finally(() => {
        for (const type of intent) {
          window.removeEventListener(type, engage, { capture: true });
        }
      });
  }, [apollo, latitude, longitude]);

  const { data, error, fetchMore } = useSuspenseQuery(
    ForYouFeedDocument,
    {
      variables: {
        limit: PAGE_SIZE,
        latitude: location?.latitude,
        longitude: location?.longitude,
        seed,
      },
      // The seed gives each visit a separate ranked stream. Apollo still keeps
      // the old stream cached, so returning to it remains instant.
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
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;
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
  }, [fetchMore, pageInfo, guard, itemCount, seed]);

  return {
    items,
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
