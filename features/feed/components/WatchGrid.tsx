"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Play } from "lucide-react";
import {
  DiscoveryFeedDocument,
  VideoFeedDocument,
} from "@/types/__generated__/graphql";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { useNearbyLocation } from "@/features/feed/hooks/useNearbyLocation";
import { useInfiniteScroll } from "@/features/feed/hooks/useInfiniteScroll";
import { useNearbyFeed, usePaginationGuard } from "@/features/feed/hooks/useFeed";
import { useFeedPreferencesStore } from "@/stores/feedPreferences";
import {
  WATCH_GRID_DESKTOP_PAGE_SIZE,
  WATCH_GRID_PAGE_SIZE,
} from "@/features/feed/constants";
import {
  isPlayableVideo,
  posterOf,
} from "@/features/feed/lib/videoSource";
import { rememberWatchScrollPosition } from "@/features/feed/lib/watchScrollPosition";
import { videoPath } from "@/lib/content-url";
import { rememberScrollBeforeNavigation } from "@/components/layout/RouteScrollRestoration";
import { FeedPaginationSkeleton } from "./FeedSkeleton";
import { WatchGridSkeleton } from "./WatchGridSkeleton";

export function WatchGrid({
  lang,
  active,
  desktopLayout = false,
}: {
  lang: string;
  active: boolean;
  desktopLayout?: boolean;
}) {
  const nearbyFilterActive = useFeedPreferencesStore((s) => s.homeNearbyFilterActive);
  const nearbyRadiusKm = useFeedPreferencesStore((s) => s.homeNearbyRadiusKm);
  const {
    location,
    permState,
    geoError,
    requestLocation,
  } = useNearbyLocation();
  const searchParams = useSearchParams();
  const requestedCategoryId = searchParams.get("categoryId");
  const categoryFiltered = desktopLayout && Boolean(requestedCategoryId);
  const useNearbyFilter = nearbyFilterActive && !categoryFiltered;
  const pageSize = desktopLayout ? WATCH_GRID_DESKTOP_PAGE_SIZE : WATCH_GRID_PAGE_SIZE;
  const nearbyFeed = useNearbyFeed(
    useNearbyFilter ? location : null,
    nearbyRadiusKm,
  );
  const { data: videoData, loading: videoLoading, fetchMore: fetchMoreVideos } = useQuery(VideoFeedDocument, {
    variables: {
      limit: pageSize,
      latitude: location?.latitude,
      longitude: location?.longitude,
    },
    skip: categoryFiltered || useNearbyFilter,
    fetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
  });
  const {
    data: categoryData,
    loading: categoryLoading,
    fetchMore: fetchMoreCategoryVideos,
  } = useQuery(DiscoveryFeedDocument, {
    variables: {
      categoryId: requestedCategoryId,
      type: "VIDEO",
      sort: "NEWEST",
      limit: pageSize,
      latitude: location?.latitude,
      longitude: location?.longitude,
    },
    skip: !categoryFiltered,
    fetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
  });
  // DiscoveryFeed selects the same media fields posterOf/isPlayableVideo use,
  // though its generated item type is intentionally narrower than the shared
  // card fragment.
  const rawItems = categoryFiltered
    ? categoryData?.discoveryFeed?.items ?? []
    : useNearbyFilter
      ? nearbyFeed.items
      : videoData?.videoFeed.items ?? [];
  const items = (rawItems as ContentCardFieldsFragment[]).filter(isPlayableVideo);
  const pageInfo = categoryFiltered
    ? categoryData?.discoveryFeed?.pageInfo
    : useNearbyFilter
      ? undefined
      : videoData?.videoFeed.pageInfo;
  const hasMore = categoryFiltered
    ? pageInfo?.hasNextPage ?? false
    : useNearbyFilter
      ? nearbyFeed.hasMore
      : pageInfo?.hasNextPage ?? false;
  const loading = useNearbyFilter
    ? nearbyFeed.loading || permState === "checking" || permState === "requesting"
    : categoryFiltered
      ? categoryLoading
      : videoLoading;
  const [loadingMore, setLoadingMore] = useState(false);
  const guard = usePaginationGuard(items.length);

  // Local results contain photos and videos. If the first nearby page has no
  // playable videos, continue through its cursor pages until we find some or
  // exhaust the radius, so the grid does not show a premature empty state.
  useEffect(() => {
    if (
      !useNearbyFilter ||
      items.length > 0 ||
      !nearbyFeed.hasMore ||
      nearbyFeed.loading ||
      nearbyFeed.loadingMore
    ) {
      return;
    }
    nearbyFeed.loadMore();
  }, [
    items.length,
    nearbyFeed.hasMore,
    nearbyFeed.loadMore,
    nearbyFeed.loading,
    nearbyFeed.loadingMore,
    useNearbyFilter,
  ]);

  const loadMore = useCallback(() => {
    if (useNearbyFilter) {
      nearbyFeed.loadMore();
      return;
    }
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;
    const cursor = pageInfo.endCursor;
    guard(cursor, items.length, () => {
      setLoadingMore(true);
      const request = categoryFiltered
        ? fetchMoreCategoryVideos({
            variables: {
              categoryId: requestedCategoryId,
              type: "VIDEO",
              sort: "NEWEST",
              limit: pageSize,
              after: cursor,
            },
          })
        : fetchMoreVideos({
            variables: { limit: pageSize, after: cursor },
          });
      return request.finally(() => setLoadingMore(false));
    });
  }, [
    categoryFiltered,
    fetchMoreCategoryVideos,
    fetchMoreVideos,
    guard,
    items.length,
    nearbyFeed.loadMore,
    pageInfo,
    pageSize,
    requestedCategoryId,
    useNearbyFilter,
  ]);

  const { sentinelRef } = useInfiniteScroll({
    enabled: active,
    hasMore,
    loading: loading || loadingMore || nearbyFeed.loadingMore,
    onLoadMore: loadMore,
    // Posters are tall (9:16): start the next page about two rows early so it
    // has landed by the time the user reaches the end.
    rootMargin: "800px",
  });

  if (useNearbyFilter && (permState === "denied" || permState === "unavailable" || geoError)) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface text-primary">
          <Play className="ml-0.5 size-5 fill-current" />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">
          Location needed for nearby videos
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          {permState === "denied"
            ? "Allow location access in your browser settings, then try again."
            : permState === "unavailable"
              ? "This browser or device does not support location access."
              : geoError}
        </p>
        {permState !== "unavailable" ? (
          <button
            type="button"
            onClick={() => requestLocation()}
            className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (useNearbyFilter && !location) {
    return <WatchGridSkeleton desktopLayout={desktopLayout} />;
  }

  if (loading && items.length === 0) {
    return <WatchGridSkeleton desktopLayout={desktopLayout} />;
  }

  if (!loading && !hasMore && items.length === 0) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface text-primary">
          <Play className="ml-0.5 size-5 fill-current" />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">
          {useNearbyFilter
            ? `No videos within ${nearbyRadiusKm} km`
            : "No videos to watch yet"}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          {useNearbyFilter
            ? "Try a wider distance from the location filter."
            : "Videos from Shopi sellers will show up here. You can still find video posts in Home as you browse."}
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Videos to watch"
      className={desktopLayout ? "px-0 pt-3 pb-8" : "px-2 pt-4 pb-8"}
    >
      <div
        className={
          desktopLayout
            ? "mx-auto grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
            : "mx-auto grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
        }
      >
        {useNearbyFilter ? (
          <p className="col-span-full pb-1 text-center text-xs text-muted">
            Videos within {nearbyRadiusKm} km of your location
          </p>
        ) : null}
        {items.map((post) => (
          <WatchTile
            key={post.id}
            post={post}
            lang={lang}
            categoryId={categoryFiltered ? requestedCategoryId : null}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="h-1" />
      {(loadingMore || nearbyFeed.loadingMore) && <FeedPaginationSkeleton />}
    </section>
  );
}

function WatchTile({
  post,
  lang,
  categoryId,
}: {
  post: ContentCardFieldsFragment;
  lang: string;
  categoryId: string | null;
}) {
  const poster = posterOf(post);
  const creator = post.creator?.profile;
  const sellerName = [creator?.firstName, creator?.lastName]
    .filter(Boolean)
    .join(" ") || post.creator?.username || "Shopi seller";

  return (
    <Link
      href={`${videoPath(lang, post)}?tab=watch${categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ""}`}
      scroll={false}
      onClick={() => {
        rememberWatchScrollPosition();
        rememberScrollBeforeNavigation();
      }}
      data-scroll-anchor={post.id}
      className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-black no-underline"
      aria-label={`Watch ${post.title || "video"} by ${sellerName}`}
    >
      {poster ? (
        // The API provides CDN URLs from multiple media providers; the browser
        // loads the selected poster directly without a Next image allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="size-full bg-gradient-to-b from-neutral-700 to-black" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />
      <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white ">
        <Play className="ml-0.5 size-5 fill-current" />
      </span>
      <span className="absolute inset-x-0 bottom-0 p-3 text-white">
        <span className="block line-clamp-2 text-sm font-semibold leading-snug">
          {post.title || post.caption || "Watch video"}
        </span>
        <span className="mt-1 block truncate text-xs text-white/75">
          {sellerName}
        </span>
      </span>
    </Link>
  );
}
