import type { ApolloCache } from "@apollo/client";

/**
 * Home refreshes stale results when visible near the top. Publishing also
 * invalidates saved feed/profile windows so returning immediately fetches a
 * fresh first page, even inside the normal Home refresh interval.
 */
export function invalidatePublishedContentCache(cache: ApolloCache): void {
  cache.evict({ fieldName: "forYouFeed" });
  cache.evict({ fieldName: "followingFeed" });
  cache.evict({ fieldName: "localFeed" });
  cache.evict({ fieldName: "videoFeed" });
  cache.evict({ fieldName: "myPosts" });
  cache.gc();
}

/**
 * Keeps one immersive-viewer list — the one in use — and drops the rest.
 *
 * `videoFeed` keys on `seedId`, so every video the user taps mints its own
 * entry and they would otherwise accumulate one list per tap for the whole
 * session. That is the problem this solves.
 *
 * It is called when a viewer OPENS rather than when one closes, and that
 * timing is the point. Evicting on close meant every return to the viewer —
 * the back button out of a conversation, most obviously — found an empty cache
 * and had to refetch, and the viewer renders a full-screen black panel while it
 * loads. That is the "black screen on back" report.
 *
 * The underlying `Content` entities survive: gc only collects what nothing
 * references, and the feed's own lists still point at them.
 */
export function pruneVideoFeedCache(cache: ApolloCache, keepSeed: string): void {
  const root = (cache.extract() as Record<string, unknown>).ROOT_QUERY as
    | Record<string, unknown>
    | undefined;
  if (!root) return;

  // Store field names look like `videoFeed({"seedId":"my-slug",...})`, so the
  // seed is matched against the serialised arguments rather than parsed out.
  const keep = `"seedId":${JSON.stringify(keepSeed)}`;
  let evicted = false;

  for (const storeFieldName of Object.keys(root)) {
    if (!storeFieldName.startsWith("videoFeed")) continue;
    // Only viewer lists carry a seed. The Watch grid's list has none, and it is
    // the screen the viewer closes back onto: evicting it here dropped every
    // page the user had scrolled through, so Back from a video landed in a
    // refetched first page instead of on the tile they tapped.
    if (!storeFieldName.includes('"seedId":"')) continue;
    if (storeFieldName.includes(keep)) continue;
    cache.evict({ id: "ROOT_QUERY", fieldName: storeFieldName });
    evicted = true;
  }

  if (evicted) cache.gc();
}
