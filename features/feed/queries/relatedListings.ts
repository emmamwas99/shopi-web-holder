import { gql } from "@apollo/client";
import { query } from "@/lib/apollo/ApolloClient";
import { GetUserPostsDocument } from "@/types/__generated__/graphql";
import {
  withCoversFirst,
  type SocialProofListing,
} from "@/features/social-proof/queries/socialProofSellers";

/**
 * Listings shown under a listing page: more from the same seller, and similar
 * items from other sellers.
 *
 * These are server-rendered links out of every PDP. Without them a listing
 * page linked only to its seller, so link equity pooled on the listings and
 * crawlers reached most inventory through the sitemap alone.
 */

const SIMILAR_LISTINGS = gql`
  query RelatedSimilarListings(
    $limit: Int
    $categoryId: String
    $query: String
    $subcategory: String
    $minPrice: Float
  ) {
    discoveryFeed(
      sort: NEWEST
      limit: $limit
      categoryId: $categoryId
      query: $query
      subcategory: $subcategory
      minPrice: $minPrice
    ) {
      items {
        id
        slug
        title
        creatorId
        creator {
          id
          isVerified
        }
        price {
          amount
          currency
          negotiable
        }
        location {
          placeName
          county
        }
        media {
          sortOrder
          imageUrl
          thumbnailUrl
          muxMeta {
            thumbnailUrl
          }
          r2Variants {
            url
            variant
          }
        }
      }
    }
  }
`;

// 12 fills whole rows on desktop (4 or 6 across); phones show the first 8.
const SHOW = 12;
// Over-fetch: the current listing and the seller's own stock are filtered out
// of "similar", and a seller who dominates a category can fill a whole page.
const SIMILAR_FETCH = 24;

type SimilarItem = SocialProofListing & { creatorId?: string | null };

async function fetchFromSeller(
  sellerId: string,
  excludeId: string,
): Promise<SocialProofListing[]> {
  try {
    const { data } = await query({
      query: GetUserPostsDocument,
      variables: { userId: sellerId, limit: SHOW + 1 },
    });
    return (data?.userPosts?.posts ?? []).filter(
      (post) => post.id !== excludeId && post.isLive !== false,
    );
  } catch {
    return [];
  }
}

type SimilarFilter = {
  categoryId?: string;
  query?: string;
  subcategory?: string;
  minPrice?: number;
};

async function fetchSimilar(
  filter: SimilarFilter,
  excludeId: string,
  sellerId: string | null,
): Promise<SocialProofListing[]> {
  try {
    const { data } = await query({
      query: SIMILAR_LISTINGS,
      variables: { limit: SIMILAR_FETCH, ...filter },
    });
    const items =
      (data as { discoveryFeed?: { items?: SimilarItem[] } } | undefined)
        ?.discoveryFeed?.items ?? [];
    return items.filter(
      (item) => item?.id && item.id !== excludeId && item.creatorId !== sellerId,
    );
  } catch {
    return [];
  }
}

/** Best-effort, like the other SEO fetches: a failure yields empty lists. */
export async function fetchRelatedListings(input: {
  id: string;
  sellerId: string | null;
  categoryId: string | null;
  /** Fallback filter when the listing has no category. */
  searchQuery: string | null;
  /**
   * Replaces the category filter with one subcategory, for categories too
   * mixed to be useful whole: under a car, Automotive's newest items are
   * alarms, seat covers and parts. Pass only where the subcategory has the
   * stock to fill it.
   */
  narrow?: { subcategory: string; minPrice?: number } | null;
}): Promise<{ fromSeller: SocialProofListing[]; similar: SocialProofListing[] }> {
  const base = input.categoryId
    ? { categoryId: input.categoryId }
    : input.searchQuery
      ? { query: input.searchQuery }
      : null;
  // The subcategory name identifies the slice on its own, so a narrowed
  // query doesn't depend on the listing's categoryId resolving.
  const filter: SimilarFilter | null = input.narrow ?? base;

  const [fromSeller, similar] = await Promise.all([
    input.sellerId ? fetchFromSeller(input.sellerId, input.id) : [],
    filter ? fetchSimilar(filter, input.id, input.sellerId) : [],
  ]);

  return {
    fromSeller: withCoversFirst(fromSeller).slice(0, SHOW),
    similar: withCoversFirst(similar).slice(0, SHOW),
  };
}
