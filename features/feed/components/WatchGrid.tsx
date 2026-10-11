"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { Play } from "lucide-react";
import { VideoFeedDocument } from "@/types/__generated__/graphql";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { useNearbyLocation } from "@/features/feed/hooks/useNearbyLocation";
import { useInfiniteScroll } from "@/features/feed/hooks/useInfiniteScroll";
import { usePaginationGuard } from "@/features/feed/hooks/useFeed";
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
  const { location } = useNearbyLocation();
  const pageSize = desktopLayout ? WATCH_GRID_DESKTOP_PAGE_SIZE : WATCH_GRID_PAGE_SIZE;
  const { data, loading, fetchMore } = useQuery(VideoFeedDocument, {
    variables: {
      limit: pageSize,
      latitude: location?.latitude,
      longitude: location?.longitude,
    },
    fetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
  });
  const items = (data?.videoFeed?.items ?? []).filter(isPlayableVideo);
  const pageInfo = data?.videoFeed?.pageInfo;
  const [loadingMore, setLoadingMore] = useState(false);
  const guard = usePaginationGuard(items.length);

  const loadMore = useCallback(() => {
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;
    const cursor = pageInfo.endCursor;
    guard(cursor, items.length, () => {
      setLoadingMore(true);
      return fetchMore({
        variables: { limit: pageSize, after: cursor },
      }).finally(() => setLoadingMore(false));
    });
  }, [fetchMore, guard, items.length, pageInfo, pageSize]);

  const { sentinelRef } = useInfiniteScroll({
    enabled: active,
    hasMore: pageInfo?.hasNextPage ?? false,
    loading: loading || loadingMore,
    onLoadMore: loadMore,
    // Posters are tall (9:16): start the next page about two rows early so it
    // has landed by the time the user reaches the end.
    rootMargin: "800px",
  });

  if (loading && items.length === 0) {
    return <WatchGridSkeleton desktopLayout={desktopLayout} />;
  }

  if (!loading && items.length === 0) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface text-primary">
          <Play className="ml-0.5 size-5 fill-current" />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">
          No videos to watch yet
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Videos from Shopi sellers will show up here. You can still find video
          posts in Home as you browse.
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
        {items.map((post) => (
          <WatchTile key={post.id} post={post} lang={lang} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && <FeedPaginationSkeleton />}
    </section>
  );
}

function WatchTile({
  post,
  lang,
}: {
  post: ContentCardFieldsFragment;
  lang: string;
}) {
  const poster = posterOf(post);
  const creator = post.creator?.profile;
  const sellerName = [creator?.firstName, creator?.lastName]
    .filter(Boolean)
    .join(" ") || post.creator?.username || "Shopi seller";

  return (
    <Link
      href={`${videoPath(lang, post)}?tab=watch`}
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
      <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
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
