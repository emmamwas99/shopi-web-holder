"use client";

import { OperationTypeNode } from "graphql";
import { ApolloLink, HttpLink, Observable } from "@apollo/client";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { ErrorLink } from "@apollo/client/link/error";
import { SetContextLink } from "@apollo/client/link/context";
import { RetryLink } from "@apollo/client/link/retry";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { useAuthStore } from "@/stores/auth";
import { refreshAccessToken } from "@/lib/auth/refresh-token";
import {
  emitSuspendedAccountEvent,
  getSuspendedAccountMessage,
} from "@/lib/apollo/suspended-account";
import { SuspendedAccountDialogProvider } from "@/components/providers/SuspendedAccountDialogProvider";
import { RefetchOnAuthChange } from "./RefetchOnAuthChange";
import {
  itemKey,
  keyedSet,
  preserveLoadedPages,
  type ListItem,
  type ReadField,
} from "./listMerge";

let clientSingleton: ReturnType<typeof createClient> | undefined;

function makeClient() {
  if (typeof window !== "undefined") {
    if (!clientSingleton) clientSingleton = createClient();
    return clientSingleton;
  }
  return createClient();
}

/**
 * Shared merge for cursor-paginated feeds (forYouFeed/followingFeed/localFeed).
 *
 * - Paginating (`after` present): append, deduped by normalized ref/id so an
 *   overlapping cursor window can't insert a post twice. A duplicate key makes
 *   React remount that subtree → flicker / scroll jump when paging back/forth.
 *
 * - First page (no `after`): this fires both on the very first load AND on every
 *   background `cache-and-network` refetch when revisiting the screen (tab away →
 *   back). We must NOT blindly replace the window here: if we did, a single
 *   page-1 refetch would collapse an accumulated 200-item window down to 10 and
 *   snap scroll to the top. Instead we keep the existing list order intact.
 *   The incoming page still refreshes the
 *   normalized Content records, but the list itself must not be reordered while
 *   the user is away: inserting page-1 at the head moves every scroll anchor and
 *   can leave the cursor pointing at a different ordered stream. Only when
 *   there is no existing window do we take the incoming page verbatim.
 */
type FeedPage = { items?: ListItem[] } & Record<string, unknown>;

function mergeFeedPage(
  existing: FeedPage | undefined,
  incoming: FeedPage,
  {
    args,
    readField,
  }: { args: Record<string, unknown> | null; readField: ReadField },
): FeedPage {
  const incomingItems = incoming?.items ?? [];
  const prevItems = existing?.items ?? [];

  // Pagination (fetchMore): append, deduped against everything we already have.
  if (args?.after) {
    const seen = keyedSet(prevItems, readField);
    const deduped = incomingItems.filter((it) => {
      const key = itemKey(it, readField);
      return !key || !seen.has(key);
    });
    return { ...incoming, items: [...prevItems, ...deduped] };
  }

  // First page on a fresh cache → nothing to preserve, take it as-is.
  if (prevItems.length === 0) return { ...incoming, items: incomingItems };

  // First page on a populated cache (background refresh / route preload).
  // Preserve the exact visible order so returning from Profile does not jump
  // from item 60 back to a re-spliced page 1. Apollo already writes incoming
  // entities into the normalized cache before/while this merge runs, so fields
  // on overlapping Content records still refresh without moving the list.
  if (prevItems.length <= incomingItems.length) {
    return { ...incoming, items: incomingItems };
  }

  const prevKeys = keyedSet(prevItems, readField);
  const newItems = incomingItems.filter((it) => {
    const key = itemKey(it, readField);
    return !key || !prevKeys.has(key);
  });
  // pageInfo: keep the EXISTING cursor — it points at the end of the
  // accumulated window, so the next `loadMore` continues forward instead of
  // re-requesting page 2 (which would refetch posts already shown and stall
  // pagination).
  return {
    ...incoming,
    pageInfo: existing?.pageInfo ?? incoming.pageInfo,
    items: [...prevItems, ...newItems],
  };
}

/**
 * Take the incoming value, unless it is null and we already know better.
 *
 * The replacement for `merge: false` on fields that some queries select but
 * do not populate. Undefined means the field was not part of the response at
 * all, which Apollo handles before reaching a merge function.
 */
function keepUnlessNull<T>(existing: T, incoming: T): T {
  return incoming == null && existing != null ? existing : incoming;
}

type CachedMedia = Record<string, unknown> | null | undefined;

/**
 * Identity for one media item, which has no id of its own.
 *
 * Two entries are "the same picture" when they point at the same asset. The
 * Mux playback id is the strongest signal, then the source URL; sortOrder is
 * the last resort and only agrees when the media type does too.
 */
function sameMediaItem(a: CachedMedia, b: CachedMedia): boolean {
  if (!a || !b) return false;
  const mux = (m: CachedMedia) =>
    (m?.muxMeta as { playbackId?: string } | undefined)?.playbackId;
  const aMux = mux(a);
  const bMux = mux(b);
  if (aMux && bMux) return aMux === bMux;
  if (a.url && b.url) return a.url === b.url;
  if (a.imageUrl && b.imageUrl) return a.imageUrl === b.imageUrl;
  return a.sortOrder != null && a.sortOrder === b.sortOrder && a.mediaType === b.mediaType;
}

/**
 * Merge `Content.media` field-wise instead of replacing it.
 *
 * `MediaItem` has no id, so Apollo stores it inline and, by default, an
 * incoming array REPLACES the cached one. Different screens select different
 * media subsets — the profile grid asks for a handful of fields, the feed card
 * asks for `imageUrl`, `displayWidth/Height`, `muxMeta.duration` and more — so
 * simply visiting a profile used to overwrite every shared Content entity with
 * the narrower shape.
 *
 * That was silent but severe: the feed's own cache read then went INCOMPLETE,
 * Apollo treated it as a miss, and coming back from a profile refetched page
 * one, throwing away an accumulated feed and the scroll position with it.
 *
 * Merging per element fixes it, but only when the two entries are the same
 * asset — otherwise a post whose media genuinely changed would end up a
 * chimera of the old and new item. When they differ, incoming wins outright.
 * The result always has the incoming length, so removals still take effect.
 */
function mergeMediaList(
  existing: readonly CachedMedia[] | undefined,
  incoming: readonly CachedMedia[] | undefined,
): readonly CachedMedia[] | undefined {
  if (!incoming) return existing;
  if (!existing?.length) return incoming;

  return incoming.map((item, index) => {
    // Same position first (the common case), then anywhere in the old list —
    // a reordered gallery should still keep its richer cached fields.
    const previous = sameMediaItem(existing[index], item)
      ? existing[index]
      : existing.find((candidate) => sameMediaItem(candidate, item));
    if (!previous || !item) return item;

    const merged: Record<string, unknown> = { ...previous, ...item };
    // muxMeta is itself an embedded object, so it needs the same treatment or
    // a narrow selection of it wipes duration/animatedThumbnailUrl.
    const previousMux = previous.muxMeta as Record<string, unknown> | undefined;
    const incomingMux = item.muxMeta as Record<string, unknown> | undefined;
    if (previousMux && incomingMux) {
      merged.muxMeta = { ...previousMux, ...incomingMux };
    }
    return merged;
  });
}

function createClient() {
  const httpLink = new HttpLink({
    uri: `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
  });

  // Attach Authorization header from store on every request
  const authLink = new SetContextLink(({ headers }) => {
    const token = useAuthStore.getState().accessToken;
    return {
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  // Intercept UNAUTHENTICATED errors → refresh → retry once, invisibly
  const refreshLink = new ErrorLink(({ error, operation, forward }) => {
    if (!CombinedGraphQLErrors.is(error)) return;

    const suspendedMessage = getSuspendedAccountMessage(error);
    if (suspendedMessage) {
      emitSuspendedAccountEvent(suspendedMessage);
    }

    const isUnauth = error.errors.some(
      (e) =>
        e.extensions?.["code"] === "UNAUTHENTICATED" ||
        e.message?.toLowerCase().includes("unauthorized") ||
        e.message?.toLowerCase().includes("unauthenticated"),
    );

    if (!isUnauth) return;

    const { refreshToken, clearAuth } = useAuthStore.getState();
    if (!refreshToken) {
      clearAuth();
      return;
    }

    return new Observable((observer) => {
      // Deduped in the shared helper: all concurrent expired requests (and the
      // socket client's reconnect path) share one refresh call.
      refreshAccessToken()
        .then((newToken) => {
          if (!newToken) {
            // The helper already signed out if the session was rejected. A
            // failed attempt (offline, server down) keeps the session so the
            // next request can refresh again.
            observer.error(error);
            return;
          }

          // Retry original operation with new token in context
          operation.setContext(({ headers = {} }: Record<string, unknown>) => ({
            headers: {
              ...(headers as Record<string, string>),
              Authorization: `Bearer ${newToken}`,
            },
          }));

          const sub = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });

          return () => sub.unsubscribe();
        })
        .catch((err) => observer.error(err));
    });
  });

  // Retry requests that never got a GraphQL answer — the API restarting (a
  // dev save or a deploy drops it for several seconds), a dropped connection,
  // or a proxy 502/503/504 in front of it. Without this every query in flight
  // during that window surfaced straight to the UI as an error.
  //
  // Queries only: a mutation that failed mid-flight may already have run on
  // the server, and replaying it could double-post or double-charge.
  // GraphQL errors arrive as results, not link errors, so they never reach here.
  const retryLink = new RetryLink({
    // ~0.5s, 1s, 2s, then every 4s (±25%) — about 20s in total. A local API
    // restart measured 7–11s, so this rides one out with room to spare.
    delay: (attempt) =>
      Math.min(4_000, 500 * 2 ** (attempt - 1)) * (0.75 + Math.random() / 2),
    attempts: {
      max: 8,
      retryIf: (error, operation) =>
        operation.operationType === OperationTypeNode.QUERY &&
        (!ServerError.is(error) || [502, 503, 504].includes(error.statusCode)),
    },
  });

  return new ApolloClient({
    // retryLink sits before authLink so each retry picks up a freshly
    // refreshed token.
    link: ApolloLink.from([refreshLink, retryLink, authLink, httpLink]),

    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            forYouFeed: {
              // For You can be ranked with a soft location hint. A no-location
              // window and a location-ranked window have different cursor
              // streams, so they must not share the same cached list.
              keyArgs: ["seed", "latitude", "longitude"],
              merge: mergeFeedPage,
            },
            followingFeed: {
              keyArgs: [],
              merge: mergeFeedPage,
            },
            videoFeed: {
              // seedId MUST key. Two seeds are two differently ordered lists
              // with different item 0s. Sharing one entry would send the
              // second open down mergeFeedPage's "first page on a populated
              // cache" branch, which preserves the FIRST seed's order — the
              // viewer would open on the wrong video.
              keyArgs: ["seedId", "latitude", "longitude"],
              merge: mergeFeedPage,
            },
            localFeed: {
              // Each location/radius is its own list; cursor args don't key it.
              keyArgs: ["latitude", "longitude", "radiusKm", "county", "subregion"],
              merge: mergeFeedPage,
            },
            discoveryFacets: {
              // Facets vary with the active filters, so key on them. Two
              // separate queries share this field with disjoint selections
              // (categories vs counties/subCounties/wards) — merge:true unions
              // them instead of letting one wipe the other's cached fields.
              keyArgs: [
                "query",
                "categoryId",
                "type",
                // The subcategory facet query omits this arg while the location
                // one sends it, so it must key — otherwise the two selections
                // collide on one cache entry.
                "subcategory",
                "countyId",
                "subCountyId",
                "wardId",
                "minPrice",
                "maxPrice",
                "negotiableOnly",
                // Every filter must key the entry. When these were missing, a
                // distance/spec/recency search reused the unfiltered facets.
                "specs",
                "latitude",
                "longitude",
                "radiusKm",
                "postedWithinDays",
              ],
              merge: true,
            },
            discoveryFeed: {
              // Each search/filter/sort combination is its own list; `limit`
              // and `after` only paginate within it. Sharing mergeFeedPage
              // means revisiting Explore restores the accumulated window
              // instead of collapsing back to page 1.
              keyArgs: [
                "query",
                "categoryId",
                "type",
                "subcategory",
                "countyId",
                "subCountyId",
                "wardId",
                "minPrice",
                "maxPrice",
                "negotiableOnly",
                // Missing filters here made a filtered feed share — and show —
                // the unfiltered list, while the uncached result count was
                // right: "Show 2 results" over a full grid.
                "specs",
                "latitude",
                "longitude",
                "radiusKm",
                "postedWithinDays",
                "sort",
              ],
              merge: mergeFeedPage,
            },
            // Cursor lists read with cache-and-network — see
            // preserveLoadedPages. The cursor never keys the entry; the page
            // size still does, so a differently sized read of the same list
            // cannot merge into this one.
            stores: {
              keyArgs: [
                "input",
                ["search", "county", "sort", "verifiedOnly", "limit"],
              ],
              merge: preserveLoadedPages(
                "stores",
                (args) => (args?.input as { after?: unknown } | undefined)?.after,
              ),
            },
            myNotifications: {
              keyArgs: ["limit"],
              merge: preserveLoadedPages("items", (args) => args?.after),
            },
            myManagedContent: {
              keyArgs: ["limit"],
              merge: preserveLoadedPages("items", (args) => args?.afterId),
            },
            mySavedContent: {
              keyArgs: ["limit"],
              merge: preserveLoadedPages("items", (args) => args?.afterId),
            },
            comments: {
              keyArgs: ["contentId"],
              merge(existing, incoming, { args }) {
                const prevItems = existing?.items ?? [];
                const nextItems = incoming?.items ?? [];
                if (!args?.after) return { ...incoming, items: nextItems };
                return { ...incoming, items: [...prevItems, ...nextItems] };
              },
            },
            feed: {
              keyArgs: ["filter", "sortBy"],
              merge(existing, incoming, { args }) {
                const prev = existing?.edges ?? [];
                const next = incoming?.edges ?? [];
                if (!args?.after) return { ...incoming, edges: next };
                return { ...incoming, edges: [...prev, ...next] };
              },
            },
            searchProducts: {
              keyArgs: ["query", "filters"],
              merge(existing, incoming, { args }) {
                if (!args?.after) return incoming;
                return {
                  ...incoming,
                  edges: [...(existing?.edges ?? []), ...incoming.edges],
                };
              },
            },
          },
        },

        // Content is the real type returned by the API (not Post).
        // Without keyFields Apollo can't normalise content objects by ID,
        // so a stale cache entry without `creator` (e.g. a guest fetch)
        // won't be updated when the same item is later fetched as an
        // authenticated user — causing the "Seller bb58bd" flash.
        Content: {
          keyFields: ["id"],
          fields: {
            // These are FieldResolver values that differ per-viewer, so the
            // incoming value must win rather than being deep-merged — that is
            // what keeps a guest-fetched entity from going stale once the same
            // item is refetched as a signed-in user.
            //
            // A NULL incoming value is the exception. Not every query resolves
            // these: `userPosts`, for one, returns `creator: null` while still
            // selecting it, and taking that literally wiped the seller from
            // every one of their posts in the feed — cards fell back to
            // "Seller bb9868". Absent is not the same as "there is nobody".
            isLikedByMe: { merge: keepUnlessNull },
            isMyContent: { merge: keepUnlessNull },
            isSavedByMe: { merge: keepUnlessNull },
            creator: { merge: keepUnlessNull },
            // EngagementStats / ContentLocation have no IDs of their own and
            // different queries select different subsets of their fields.
            // Without merge:true an incoming subset REPLACES the cached object
            // and silently drops fields (e.g. a feed query without
            // stats.comments wiping the comment count a detail query loaded).
            stats: { merge: true },
            location: { merge: true },
            price: { merge: true },
            // Same hazard as the three above, and the one that actually bit.
            // `ranking` and `boost` are embedded objects with no id, and
            // `tiktokEmbed` likewise; a query selecting a subset of any of
            // them would otherwise wipe the rest.
            ranking: { merge: true },
            boost: { merge: true },
            tiktokEmbed: { merge: true },
            // `media` is a LIST of embedded objects with no ids, so the same
            // rule applies per element — see mergeMediaList for why a plain
            // replace corrupted the feed.
            media: { merge: mergeMediaList },
          },
        },

        Post: {
          keyFields: ["id"],
          fields: {
            likeCount: { merge: false },
            isLikedByMe: { merge: false },
            comments: {
              keyArgs: ["first", "after"],
              merge(existing, incoming, { args }) {
                if (!args?.after) return incoming;
                return {
                  ...incoming,
                  edges: [...(existing?.edges ?? []), ...incoming.edges],
                };
              },
            },
          },
        },

        User: {
          keyFields: ["id"],
          fields: {
            isFollowedByMe: { merge: false },
            followerCount: { merge: false },
            // Embedded objects with no id of their own, so an incoming subset
            // would REPLACE the cached one and drop the rest. Real case: the
            // TikTok status query asks only for authProviders.tiktok while the
            // settings list needs authProviders.local — without this the two
            // knock each other out and the read goes incomplete. Same class of
            // bug as Content.media, same fix.
            authProviders: { merge: true },
            profile: { merge: true },
            location: { merge: true },
            posts: {
              keyArgs: ["first", "after"],
              merge(existing, incoming, { args }) {
                if (!args?.after) return incoming;
                return {
                  ...incoming,
                  edges: [...(existing?.edges ?? []), ...incoming.edges],
                };
              },
            },
          },
        },

        Product: {
          keyFields: ["id"],
          fields: {
            price: { merge: false },
            stockCount: { merge: false },
          },
        },
      },
    }),

    defaultOptions: {
      watchQuery: {
        // Default to cache-first so revisiting a screen (tab away → back)
        // renders instantly from the normalized cache and preserves scroll.
        // Screens that genuinely need freshness opt into a one-time background
        // refresh via per-hook fetchPolicy / manual refetch.
        fetchPolicy: "cache-first",
      },
      query: {
        // One-shot reads should still prefer the cache; callers that need
        // a forced network read can override per-call.
        fetchPolicy: "cache-first",
        errorPolicy: "all",
      },
      mutate: {
        errorPolicy: "all",
      },
    },
  });
}

export function ApolloWrapper({ children }: React.PropsWithChildren) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      <RefetchOnAuthChange />
      {children}
      <SuspendedAccountDialogProvider />
    </ApolloNextAppProvider>
  );
}
