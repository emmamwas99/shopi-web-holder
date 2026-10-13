"use client";

import { gql, type TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { concatAST } from "graphql";
import { startTransition, useCallback, useMemo, useState } from "react";
import {
  ContentCardFieldsFragmentDoc,
  GetContentDocument,
  VideoFeedDocument,
  type ContentCardFieldsFragment,
} from "@/types/__generated__/graphql";
import {
  VIDEO_FEED_PAGE_SIZE,
  VIDEO_FEED_LOAD_MORE_SIZE,
} from "@/features/feed/constants";
import { useNearbyLocation } from "@/features/feed/hooks/useNearbyLocation";
import { usePaginationGuard } from "@/features/feed/hooks/useFeed";

const CategoryVideoFeedDocument = concatAST([
  gql`
    query CategoryVideoFeed(
      $categoryId: String!
      $limit: Int
      $after: String
    ) {
      discoveryFeed(
        categoryId: $categoryId
        type: VIDEO
        sort: NEWEST
        limit: $limit
        after: $after
      ) {
        items {
          ...ContentCardFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
  ContentCardFieldsFragmentDoc,
]) as unknown as TypedDocumentNode<
  CategoryVideoFeedData,
  CategoryVideoFeedVariables
>;

interface CategoryVideoFeedData {
  discoveryFeed: {
    items: ContentCardFieldsFragment[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

interface CategoryVideoFeedVariables {
  categoryId: string;
  limit: number;
  after?: string;
}

/**
 * The immersive viewer's list. Without a category it uses the ranked platform
 * feed; when opened from a Watch category it keeps every slide in that same
 * category. The tapped video is pinned first in either case.
 */
export function useVideoFeed(seed: string, categoryId?: string | null) {
  // Passive only — this never prompts for location.
  const { location } = useNearbyLocation();
  const isCategoryFeed = Boolean(categoryId);

  const globalQuery = useQuery(VideoFeedDocument, {
    variables: {
      limit: VIDEO_FEED_PAGE_SIZE,
      seedId: seed,
      latitude: location?.latitude,
      longitude: location?.longitude,
    },
    skip: isCategoryFeed,
    fetchPolicy: "cache-first",
    returnPartialData: false,
    notifyOnNetworkStatusChange: true,
  });

  const categoryQuery = useQuery(CategoryVideoFeedDocument, {
    variables: {
      categoryId: categoryId ?? "",
      limit: VIDEO_FEED_PAGE_SIZE,
    },
    skip: !isCategoryFeed,
    fetchPolicy: "cache-first",
    returnPartialData: false,
    notifyOnNetworkStatusChange: true,
  });

  // The category list can be paginated and the selected card may not be on its
  // first page. Fetch its full card data so opening the viewer always starts on
  // the video the user tapped.
  const seedQuery = useQuery(GetContentDocument, {
    variables: { id: seed },
    skip: !isCategoryFeed,
    fetchPolicy: "cache-first",
    returnPartialData: false,
  });

  const [loadingMore, setLoadingMore] = useState(false);
  // Apollo's result type includes DeepPartial cache snapshots even though
  // these queries disable partial results and select the complete fragment.
  const categoryItems = (categoryQuery.data?.discoveryFeed?.items ?? []) as ContentCardFieldsFragment[];
  const categorySeed = seedQuery.data?.content as ContentCardFieldsFragment | null | undefined;
  const globalItems = (globalQuery.data?.videoFeed?.items ?? []) as ContentCardFieldsFragment[];
  const items = useMemo(() => {
    if (!isCategoryFeed) return globalItems;

    const foundSeed = categoryItems.find(
      (item) => item.id === seed || item.slug === seed,
    );
    const selectedSeed = foundSeed ?? categorySeed;
    if (!selectedSeed) return categoryItems;

    return [
      selectedSeed,
      ...categoryItems.filter((item) => item.id !== selectedSeed.id),
    ];
  }, [categoryItems, categorySeed, globalItems, isCategoryFeed, seed]);

  const pageInfo = isCategoryFeed
    ? categoryQuery.data?.discoveryFeed?.pageInfo
    : globalQuery.data?.videoFeed?.pageInfo;
  const itemCount = items.length;
  const guard = usePaginationGuard(itemCount);
  const loading = isCategoryFeed
    ? (categoryQuery.loading && itemCount === 0) ||
      (seedQuery.loading && !categoryItems.some((item) => item.id === seed || item.slug === seed))
    : globalQuery.loading && itemCount === 0;

  const loadMore = useCallback(() => {
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;
    const cursor = pageInfo.endCursor;
    guard(cursor, itemCount, () => {
      setLoadingMore(true);
      let request!: Promise<unknown>;
      startTransition(() => {
        request = (isCategoryFeed
          ? categoryQuery.fetchMore({
              variables: {
                categoryId: categoryId ?? "",
                limit: VIDEO_FEED_LOAD_MORE_SIZE,
                after: cursor,
              },
              updateQuery: (previous, { fetchMoreResult }) => {
                if (!fetchMoreResult) return previous;
                const existingIds = new Set(
                  previous.discoveryFeed.items.map((item) => item.id),
                );
                return {
                  discoveryFeed: {
                    ...fetchMoreResult.discoveryFeed,
                    items: [
                      ...previous.discoveryFeed.items,
                      ...fetchMoreResult.discoveryFeed.items.filter(
                        (item) => !existingIds.has(item.id),
                      ),
                    ],
                  },
                };
              },
            })
          : globalQuery.fetchMore({
              variables: { limit: VIDEO_FEED_LOAD_MORE_SIZE, after: cursor },
            })
        ).finally(() => setLoadingMore(false));
      });
      return request;
    });
  }, [
    categoryId,
    categoryQuery.fetchMore,
    globalQuery.fetchMore,
    guard,
    isCategoryFeed,
    itemCount,
    pageInfo,
  ]);

  return {
    items,
    loading,
    loadingMore,
    error: isCategoryFeed ? categoryQuery.error ?? seedQuery.error : globalQuery.error,
    hasMore: pageInfo?.hasNextPage ?? false,
    loadMore,
  };
}
