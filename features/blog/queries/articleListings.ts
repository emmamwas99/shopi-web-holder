import { gql } from "@apollo/client";
import { query } from "@/lib/apollo/ApolloClient";
import {
  filterListings,
  type ArticleListing,
} from "@/lib/articles/listings";
import type { ListingSource, ListingSpec } from "@/lib/articles";

const ARTICLE_LISTINGS = gql`
  query ArticleListings(
    $limit: Int
    $query: String
    $subcategory: String
    $county: String
    $minPrice: Float
    $maxPrice: Float
  ) {
    discoveryFeed(
      sort: NEWEST
      limit: $limit
      query: $query
      subcategory: $subcategory
      county: $county
      minPrice: $minPrice
      maxPrice: $maxPrice
    ) {
      items {
        id
        slug
        title
        createdAt
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

/** The API caps discoveryFeed at 50 per call. */
const PER_SOURCE = 50;

/**
 * How often an article's listings (and so its live prices and "Checked"
 * date) refresh. Daily: asking prices don't move hour to hour, each refresh
 * is several feed calls per article, and at current traffic an hourly rebuild
 * is mostly paying for regenerations nobody sees. Because this is the page's
 * only fetch, it also sets how often the article page itself regenerates, so
 * keep it equal to the page's `revalidate`.
 */
const LISTINGS_REVALIDATE_SECONDS = 86400;

export type ArticleListingsResult =
  | {
      ok: true;
      /** Every matching listing, newest first — the price summary uses all of them. */
      listings: ArticleListing[];
      /** When the listings were fetched, i.e. what "checked" means on the page. */
      checkedAt: string;
    }
  /** The API couldn't be reached. Never shown as "no listings". */
  | { ok: false };

async function fetchSource(
  source: ListingSource,
  spec: ListingSpec,
): Promise<ArticleListing[]> {
  const { data, error } = await query({
    query: ARTICLE_LISTINGS,
    variables: {
      limit: PER_SOURCE,
      query: source.query ?? null,
      subcategory: source.subcategory ?? null,
      county: spec.county ?? null,
      minPrice: spec.minPrice ?? null,
      maxPrice: spec.maxPrice ?? null,
    },
    context: {
      fetchOptions: { next: { revalidate: LISTINGS_REVALIDATE_SECONDS } },
    },
  });
  const items = (
    data as { discoveryFeed?: { items?: ArticleListing[] } } | undefined
  )?.discoveryFeed?.items;
  // The client's errorPolicy is "all", so a failed request resolves with
  // `error` instead of throwing. A missing feed is a failure: the page must
  // say listings couldn't load, never that there are none.
  if (!items) throw error ?? new Error("discoveryFeed returned no data");
  return items;
}

/**
 * The live listings behind an article, from real Shopi inventory only.
 *
 * Each source is a separate discoveryFeed call; results are merged, newest
 * first, then filtered by the spec's title rules. If every call fails the
 * result is `ok: false`, so the page says listings couldn't be loaded rather
 * than claiming there are none.
 */
export async function fetchArticleListings(
  spec: ListingSpec,
): Promise<ArticleListingsResult> {
  const results = await Promise.allSettled(
    spec.sources.map((source) => fetchSource(source, spec)),
  );
  if (results.every((result) => result.status === "rejected")) {
    return { ok: false };
  }

  const merged = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return {
    ok: true,
    listings: filterListings(merged, spec),
    checkedAt: new Date().toISOString(),
  };
}
