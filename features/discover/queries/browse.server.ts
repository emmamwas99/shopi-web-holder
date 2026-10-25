import "server-only";

import { cache } from "react";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { query } from "@/lib/apollo/ApolloClient";
import { slugifyContentTitle } from "@/lib/content-url";
import { isIndexableBrowsePage } from "@/lib/seo/browse-pages";
import { DISCOVERY_CATEGORIES, type CategoryFacet } from "../categories";
import {
  CategoriesDocument,
  type ContentCardFieldsFragment,
} from "@/types/__generated__/graphql";

/**
 * Server-side data for Explore's browse routes.
 *
 * DiscoverPage loads everything on the client, so on its own the server HTML
 * of /explore and /explore/{category}/{subcategory} carried a skeleton and no
 * listing links — and the subcategory routes couldn't tell a real subcategory
 * from a typo, so any /explore/x/y answered 200. These fetchers give those
 * routes what the server needs: the taxonomy to validate against, live counts
 * to decide indexing, and a first page of cards to render.
 */

export type BrowseCategory = { id: string; name: string; slug: string };

export type BrowseRoute = {
  category: BrowseCategory;
  /** The label the feed filters on — the facet's spelling when there is one. */
  subcategoryName: string;
  subcategorySlug: string;
  /** Live public listings in the subcategory right now. */
  liveListings: number;
};

type SubcategoryFacet = { name: string; count: number };

const SUBCATEGORY_FACETS: TypedDocumentNode<
  { discoveryFacets: { subcategories: SubcategoryFacet[] } },
  { categoryId: string }
> = gql`
  query BrowseSubcategoryFacets($categoryId: String) {
    discoveryFacets(categoryId: $categoryId) {
      subcategories {
        name
        count
      }
    }
  }
`;

// The same item selection as DiscoverPage's DiscoveryFeed query, so the cards
// rendered from it are the cards the client renders. It can't import that
// document: DiscoverPage is a client module, and a value imported from one
// into server code arrives as a client reference, not the document.
const BROWSE_CARDS: TypedDocumentNode<
  { discoveryFeed: { items: ContentCardFieldsFragment[] } },
  { categoryId?: string; subcategory?: string; limit: number }
> = gql`
  query SeoBrowseCards($categoryId: String, $subcategory: String, $limit: Int) {
    discoveryFeed(
      categoryId: $categoryId
      subcategory: $subcategory
      sort: RELEVANCE
      limit: $limit
    ) {
      items {
        id
        slug
        type
        title
        caption
        hashtags
        creatorId
        allowDownload
        hdEnabled
        createdAt
        creator {
          id
          username
          isVerified
          isFollowedByMe
          followerCount
          profile {
            firstName
            lastName
            avatar
          }
        }
        media {
          mediaType
          url
          imageUrl
          thumbnailUrl
          sortOrder
          displayWidth
          displayHeight
          muxMeta {
            playbackId
            duration
            aspectRatio
            thumbnailUrl
            animatedThumbnailUrl
          }
          r2Variants {
            url
            variant
            width
            height
          }
        }
        price {
          amount
          currency
          negotiable
        }
        stats {
          views
          likes
          shares
          saves
        }
        location {
          county
          subregion
          placeName
          displayAddress
        }
        ranking {
          rankScore
          trendingScore
        }
        isLikedByMe
        isSavedByMe
        isMyContent
      }
    }
  }
`;

/**
 * The category taxonomy. Throws when the API can't supply it: a route that
 * can't load the taxonomy can't tell a real subcategory from a bad link, and
 * answering 404 during an outage would deindex real pages — a 500 makes
 * engines come back later instead.
 */
const fetchTaxonomy = cache(async () => {
  const result = await query({ query: CategoriesDocument });
  const categories = result.data?.categories;
  if (!categories?.length) {
    throw new Error("Category taxonomy could not be loaded", {
      cause: result.error,
    });
  }
  return categories;
});

/** Live listing counts per subcategory label. Throws like fetchTaxonomy. */
const fetchSubcategoryFacets = cache(
  async (categoryId: string): Promise<SubcategoryFacet[]> => {
    const result = await query({
      query: SUBCATEGORY_FACETS,
      variables: { categoryId },
    });
    const facets = result.data?.discoveryFacets?.subcategories;
    if (!facets) {
      throw new Error(`Subcategory counts for ${categoryId} could not be loaded`, {
        cause: result.error,
      });
    }
    return facets;
  },
);

/**
 * Resolves /explore/{categorySlug}/{subcategorySlug} to a real subcategory, or
 * null when either segment isn't one — the route answers that with a 404.
 *
 * A subcategory is real if it's in the taxonomy or listings are filed under
 * it: the feed filters on a free-form label, and DiscoverPage builds these
 * URLs from the facet labels, so both spellings have to resolve.
 */
export const resolveBrowseRoute = cache(
  async (
    categorySlug: string,
    subcategorySlug: string,
  ): Promise<BrowseRoute | null> => {
    const taxonomy = await fetchTaxonomy();
    const category = taxonomy.find(
      (item) => !item.parentId && item.slug === categorySlug,
    );
    if (!category) return null;

    const facets = await fetchSubcategoryFacets(category.id);
    const facet = facets
      .filter((item) => slugifyContentTitle(item.name) === subcategorySlug)
      .sort((a, b) => b.count - a.count)[0];
    const child = taxonomy.find(
      (item) =>
        item.parentId === category.id &&
        slugifyContentTitle(item.name) === subcategorySlug,
    );
    if (!facet && !child) return null;

    return {
      category: { id: category.id, name: category.name, slug: category.slug },
      subcategoryName: facet?.name ?? child!.name,
      subcategorySlug,
      liveListings: facet?.count ?? 0,
    };
  },
);

/**
 * The first page of cards for a browse view, in the order DiscoverPage's own
 * first request returns them. Best-effort: on failure the page renders its
 * skeleton and the client fetches as before.
 */
export async function fetchBrowseCards(
  filters: { categoryId?: string; subcategory?: string } = {},
  limit = 20,
): Promise<ContentCardFieldsFragment[]> {
  try {
    const result = await query({
      query: BROWSE_CARDS,
      variables: { ...filters, limit },
    });
    return (result.data?.discoveryFeed?.items ?? []).filter((item) => item?.id);
  } catch {
    return [];
  }
}

/**
 * Explore's unfiltered category shortcuts, fetched with the first page of cards
 * so the phone grid paints with them rather than after hydration and its own
 * round trip. The client still refreshes the counts once it loads, so ten
 * minutes only bounds what the first paint can show. Best-effort: on failure
 * the grid loads on the client as before.
 */
export async function fetchExploreCategories(): Promise<CategoryFacet[] | undefined> {
  try {
    const result = await query({
      query: DISCOVERY_CATEGORIES,
      variables: {},
      context: { fetchOptions: { next: { revalidate: 600 } } },
    });
    return result.data?.discoveryFacets?.categories ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Every subcategory route that should be indexed right now, for the sitemap.
 * Best-effort: an API failure leaves them out of this regeneration only.
 */
export async function fetchIndexableBrowsePages(): Promise<
  { categorySlug: string; subcategorySlug: string; name: string }[]
> {
  try {
    const taxonomy = await fetchTaxonomy();
    const topLevel = taxonomy.filter((item) => !item.parentId);
    const perCategory = await Promise.all(
      topLevel.map(async (category) => {
        const facets = await fetchSubcategoryFacets(category.id);
        const bySlug = new Map<string, SubcategoryFacet>();
        for (const facet of facets) {
          const slug = slugifyContentTitle(facet.name);
          const seen = bySlug.get(slug);
          if (!seen || facet.count > seen.count) bySlug.set(slug, facet);
        }
        return [...bySlug]
          .filter(([slug, facet]) =>
            isIndexableBrowsePage(category.slug, slug, facet.count),
          )
          .map(([slug, facet]) => ({
            categorySlug: category.slug,
            subcategorySlug: slug,
            name: facet.name,
          }));
      }),
    );
    return perCategory.flat();
  } catch {
    return [];
  }
}
