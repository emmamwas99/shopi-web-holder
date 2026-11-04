import { gql } from "@apollo/client";
import { query } from "@/lib/apollo/ApolloClient";

/**
 * A small, server-fetchable slice of the discovery feed.
 *
 * Deliberately narrower than the feed's own query — this exists to give the
 * browse routes crawlable content and outbound links, not to render media.
 */
const RECENT_LISTINGS = gql`
  query SeoRecentListings(
    $limit: Int
    $county: String
    $query: String
    $subcategory: String
    $minPrice: Float
  ) {
    discoveryFeed(
      sort: NEWEST
      limit: $limit
      county: $county
      query: $query
      subcategory: $subcategory
      minPrice: $minPrice
    ) {
      items {
        id
        slug
        title
        price {
          amount
          currency
        }
        location {
          placeName
          county
        }
      }
    }
  }
`;

export type RecentListing = {
  id: string;
  slug?: string | null;
  title?: string | null;
  price?: { amount: number; currency: string } | null;
  location?: { placeName?: string | null; county?: string | null } | null;
};

/**
 * Narrows a text search that would otherwise match too much. Search covers
 * captions and specs, so "car" also finds car chargers and phone holders:
 * `subcategory` (the classifier's level-2 name, e.g. "Cars") and a price floor
 * keep a page about vehicles to vehicles.
 */
export type RecentListingFilters = {
  subcategory?: string;
  minPrice?: number;
};

/**
 * Best-effort: the browse pages must still render if the API is unreachable,
 * so a failure yields an empty list rather than throwing the route.
 */
export async function fetchRecentListings(
  limit = 24,
  county?: string,
  searchQuery?: string,
  filters: RecentListingFilters = {},
): Promise<RecentListing[]> {
  try {
    const { data } = await query({
      query: RECENT_LISTINGS,
      variables: {
        limit,
        county: county ?? null,
        query: searchQuery ?? null,
        subcategory: filters.subcategory ?? null,
        minPrice: filters.minPrice ?? null,
      },
    });
    const items = (
      data as { discoveryFeed?: { items?: RecentListing[] } } | undefined
    )?.discoveryFeed?.items;
    return (items ?? []).filter((i) => i?.id);
  } catch {
    return [];
  }
}

/**
 * Newest listings across several subcategories, interleaved so one busy
 * subcategory can't fill the list, and de-duplicated. For seller pages whose
 * item spans several level-2 categories (furniture, electronics, produce).
 */
export async function fetchRecentListingsAcross(
  subcategories: string[],
  total = 8,
): Promise<RecentListing[]> {
  if (subcategories.length === 0) return [];
  const perSub = Math.max(3, Math.ceil((total * 1.5) / subcategories.length));
  const batches = await Promise.all(
    subcategories.map((subcategory) =>
      fetchRecentListings(perSub, undefined, undefined, { subcategory }),
    ),
  );
  const seen = new Set<string>();
  const merged: RecentListing[] = [];
  for (let i = 0; i < perSub; i++) {
    for (const batch of batches) {
      const listing = batch[i];
      if (listing && !seen.has(listing.id)) {
        seen.add(listing.id);
        merged.push(listing);
      }
    }
  }
  return merged.slice(0, total);
}
