import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import {
  articlePath,
  categoryPath,
  getActiveCategories,
  getArticles,
  getArticlesInCategory,
  lastModified,
} from "@/lib/articles";
import { locales } from "@/i18n/config";
import { contentPath } from "@/lib/content-url";
import { isTranslatedPath, localeAlternates } from "@/lib/metadata";
import { COUNTIES } from "@/lib/counties";
import { fetchSocialProofSellers } from "@/features/social-proof/queries/socialProofSellers";
import {
  searchIntentPages,
  searchIntentPath,
} from "@/lib/seo/search-intent-pages";
import { sellCarPages, sellCarPath } from "@/lib/seo/sell-car-pages";
import {
  sellCarLocationPath,
  sellCarLocations,
} from "@/lib/seo/sell-car-locations";

/**
 * The app is served under /[lang], but only some pages are translated (see
 * TRANSLATED_PATHS in lib/metadata.ts). Translated pages are listed in every
 * locale with hreflang alternates; English-only pages are listed at /en alone,
 * matching their canonical.
 *
 * Listing pages (/content/[id]) are the highest-value SEO surface of the
 * marketplace, so the newest listings are pulled from the API at generation
 * time. The fetch is best-effort: if the API is unreachable the sitemap still
 * ships with the static + blog entries.
 */

// The API caps discoveryFeed's `limit` at 50, so page through with cursors.
const LISTING_SITEMAP_PAGE = 50;

// A single sitemap may hold 50,000 URLs, so the old 300 ceiling — not the
// format — was what capped indexable inventory. Listings are the marketplace's
// highest-value SEO surface and, being discovered mainly through JS-driven
// browse surfaces, the sitemap is how engines find most of them.
const LISTING_SITEMAP_MAX = 5000;

// …but each page is a sequential round trip, so bound the walk by wall clock
// too. Whatever has been collected when the budget runs out still ships; the
// next hourly revalidate picks up from a fresh NEWEST ordering.
const LISTING_FETCH_BUDGET_MS = 20_000;

type SitemapListing = {
  id: string;
  slug?: string | null;
  title?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  creator?: { username?: string | null } | null;
  media?: {
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    sortOrder?: number | null;
    muxMeta?: { thumbnailUrl?: string | null } | null;
    r2Variants?: { url?: string | null; variant?: string | null }[] | null;
  }[];
};

/**
 * Next serialises `images` into <image:loc> *without* XML-escaping them (only
 * the page's own <loc> is escaped). A single raw `&` therefore makes the whole
 * document not well-formed, and Search Console rejects the entire sitemap —
 * every URL in it, not just the offending entry.
 *
 * The URLs that carry `&` are the signed TikTok CDN links on imported posts
 * (`?x-expires=…&x-signature=…`). Dropping them rather than escaping them is
 * the right fix twice over: it keeps the document valid without depending on
 * Next's escaping behaviour staying as it is, and those links expire within
 * days, so they are worthless for image indexing anyway. Listings keep their
 * own media.shopi.co.ke variants, which is what we want indexed.
 */
function isXmlSafeImageUrl(url: string): boolean {
  return !/[&<>"']/.test(url);
}

function listingImages(item: SitemapListing): string[] {
  return (item.media ?? [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .flatMap((media) => [
      media.r2Variants?.find((variant) => variant.variant === "large")?.url,
      media.r2Variants?.[0]?.url,
      media.imageUrl,
      media.muxMeta?.thumbnailUrl,
      media.thumbnailUrl,
    ])
    .filter((url): url is string => Boolean(url?.trim()))
    .filter(isXmlSafeImageUrl)
    .slice(0, 6);
}

async function fetchRecentListings(): Promise<SitemapListing[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];

  const listings: SitemapListing[] = [];
  const seen = new Set<string>();
  const deadline = Date.now() + LISTING_FETCH_BUDGET_MS;
  let after: string | null = null;

  try {
    while (listings.length < LISTING_SITEMAP_MAX && Date.now() < deadline) {
      const res: Response = await fetch(`${api}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query SitemapListings($limit: Int, $after: String) {
              discoveryFeed(sort: NEWEST, limit: $limit, after: $after) {
                items {
                  id
                  slug
                  title
                  createdAt
                  updatedAt
                  creator { username }
                  media {
                    imageUrl
                    thumbnailUrl
                    sortOrder
                    muxMeta { thumbnailUrl }
                    r2Variants { url variant }
                  }
                }
                pageInfo { hasNextPage endCursor }
              }
            }
          `,
          variables: { limit: LISTING_SITEMAP_PAGE, after },
        }),
        // Refresh the listing set hourly; the sitemap itself is cheap to rebuild.
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;

      const json = (await res.json()) as {
        data?: {
          discoveryFeed?: {
            items?: SitemapListing[];
            pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
          };
        };
      };
      const page = json.data?.discoveryFeed;
      if (!page?.items?.length) break;

      // A feed reordered mid-walk can repeat an item across cursor pages; a
      // sitemap listing the same URL twice is a validation warning.
      for (const item of page.items) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        listings.push(item);
      }

      if (!page.pageInfo?.hasNextPage || !page.pageInfo.endCursor) break;
      after = page.pageInfo.endCursor;
    }
  } catch {
    // Best-effort: ship whatever pages made it.
  }

  return listings.slice(0, LISTING_SITEMAP_MAX);
}

/** Per featured seller: a whole storefront is a few hundred URLs at most. */
const FEATURED_SELLER_LISTINGS_MAX = 500;

/**
 * Every public listing of each homepage-featured seller.
 *
 * The recent-listings walk is newest-first and time-boxed, so a featured
 * seller's older stock falls out of it as other sellers post — and their
 * profile only exposes the first page of listings without JavaScript. These
 * are the sellers we most want found when someone searches for an item they
 * sell, so their full inventory is always submitted.
 */
async function fetchFeaturedSellerListings(sellerIds: string[]): Promise<SitemapListing[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api || sellerIds.length === 0) return [];

  const perSeller = await Promise.all(
    sellerIds.map(async (userId) => {
      const listings: SitemapListing[] = [];
      let afterId: string | null = null;
      try {
        while (listings.length < FEATURED_SELLER_LISTINGS_MAX) {
          const res: Response = await fetch(`${api}/graphql`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
                query SitemapSellerListings($userId: String!, $limit: Int, $afterId: String) {
                  userPosts(userId: $userId, limit: $limit, afterId: $afterId) {
                    hasMore
                    nextCursor
                    posts {
                      id
                      slug
                      title
                      createdAt
                      updatedAt
                      creator { username }
                      media {
                        imageUrl
                        thumbnailUrl
                        sortOrder
                        muxMeta { thumbnailUrl }
                        r2Variants { url variant }
                      }
                    }
                  }
                }
              `,
              variables: { userId, limit: LISTING_SITEMAP_PAGE, afterId },
            }),
            next: { revalidate: 3600 },
          });
          if (!res.ok) break;
          const json = (await res.json()) as {
            data?: {
              userPosts?: {
                hasMore?: boolean;
                nextCursor?: string | null;
                posts?: SitemapListing[];
              };
            };
          };
          const page = json.data?.userPosts;
          if (!page?.posts?.length) break;
          listings.push(...page.posts);
          if (!page.hasMore || !page.nextCursor) break;
          afterId = page.nextCursor;
        }
      } catch {
        // Best-effort, like the recent-listings walk.
      }
      return listings;
    }),
  );

  return perSeller.flat();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const { url } = siteConfig;

  const langs = (l: string, path: string) => `${url}/${l}${path}`;
  // The same localeAlternates() each page emits as <link rel="alternate">: the
  // sitemap's hreflang set and the page's own have to agree, or the
  // annotations are treated as unconfirmed and dropped. Only translated pages
  // carry a Kiswahili alternate; English-only pages list /en alone.
  const alternates = localeAlternates;

  // path -> [changeFrequency, priority, lastModified?]
  const staticPages: {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }[] = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.8 },
    { path: "/shopi-agent", changeFrequency: "monthly", priority: 0.9 },
    {
      path: "/online-selling-jobs-kenya",
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      path: "/marketplace-alternatives-kenya",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    { path: "/jiji-alternative-kenya", changeFrequency: "monthly", priority: 0.85 },
    { path: "/pigiame-alternative-kenya", changeFrequency: "monthly", priority: 0.85 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/for-you", changeFrequency: "always", priority: 0.9 },
    { path: "/explore", changeFrequency: "hourly", priority: 0.8 },
    { path: "/search", changeFrequency: "hourly", priority: 0.8 },
    // The seller directory. Worth crawling for its own sake and as the hub
    // that links every storefront, which is how those profiles get found.
    { path: "/stores", changeFrequency: "daily", priority: 0.85 },
    { path: "/buy-and-sell-in-kenya", changeFrequency: "weekly", priority: 0.92 },
    { path: "/sell-in-kenya", changeFrequency: "weekly", priority: 0.9 },
    { path: "/sell-car-kenya", changeFrequency: "weekly", priority: 0.9 },
    {
      path: "/property-for-sale-kenya",
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      path: "/beauty-cosmetics-kenya",
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      path: "/phones-electronics-kenya",
      changeFrequency: "weekly",
      priority: 0.9,
    },
    { path: "/tiktok-downloader", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
    { path: "/community-guidelines", changeFrequency: "yearly", priority: 0.3 },
    { path: "/prohibited-items", changeFrequency: "yearly", priority: 0.3 },
    { path: "/safety-centre", changeFrequency: "yearly", priority: 0.4 },
  ];

  // Each language version of a translated page is its own <url>, so the /sw
  // copies are submitted for crawling rather than only hinted at.
  const staticEntries: MetadataRoute.Sitemap = staticPages.flatMap((p) =>
    (isTranslatedPath(p.path) ? locales : ["en"]).map((l) => ({
      url: langs(l, p.path),
      lastModified: now,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
      alternates: alternates(p.path),
    })),
  );

  const countyEntries: MetadataRoute.Sitemap = COUNTIES.map((county) => ({
    url: langs("en", `/marketplace/${county.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.85,
    alternates: alternates(`/marketplace/${county.slug}`),
  }));

  const searchIntentEntries: MetadataRoute.Sitemap = searchIntentPages.map(
    (page) => {
      const path = searchIntentPath(page.slug);
      return {
        url: langs("en", path),
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.82,
        alternates: alternates(path),
      };
    },
  );

  // Seller-intent car pages. Priority sits above the buyer pages because a
  // seller converting creates supply, which is what makes the buyer pages
  // worth ranking at all.
  const sellCarEntries: MetadataRoute.Sitemap = sellCarPages.map((page) => {
    const path = sellCarPath(page.slug);
    return {
      url: langs("en", path),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.88,
      alternates: alternates(path),
    };
  });

  // Car-selling location pages. Same reasoning as the model pages, plus local
  // intent is the strongest commercial query pattern in this market.
  const sellCarLocationEntries: MetadataRoute.Sitemap = sellCarLocations.map(
    (location) => {
      const path = sellCarLocationPath(location.slug);
      return {
        url: langs("en", path),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.88,
        alternates: alternates(path),
      };
    },
  );

  // The blog is English-only (see features/blog/metadata.ts), which
  // alternates() already reflects. Articles that set their own canonicalUrl
  // live elsewhere and are left out.
  const articles = getArticles().filter((article) => !article.canonicalUrl);
  const newest = (dates: string[]) =>
    new Date(dates.reduce((a, b) => (a > b ? a : b), "1970-01-01"));

  const blogEntries: MetadataRoute.Sitemap = [
    {
      url: langs("en", "/blog"),
      lastModified: newest(articles.map(lastModified)),
      changeFrequency: "weekly",
      priority: 0.85,
      alternates: alternates("/blog"),
    },
    ...getActiveCategories().map((category) => ({
      url: langs("en", categoryPath(category.slug)),
      lastModified: newest(getArticlesInCategory(category.slug).map(lastModified)),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: alternates(categoryPath(category.slug)),
    })),
    ...articles.map((article) => ({
      url: langs("en", articlePath(article.slug)),
      lastModified: new Date(lastModified(article)),
      // Articles with live listings change as inventory does.
      changeFrequency: article.listings ? ("daily" as const) : ("monthly" as const),
      priority: article.listings ? 0.8 : 0.75,
      alternates: alternates(articlePath(article.slug)),
    })),
  ];

  const [recentListings, featuredSellers] = await Promise.all([
    fetchRecentListings(),
    fetchSocialProofSellers(12, 0),
  ]);
  const featuredListings = await fetchFeaturedSellerListings(
    featuredSellers.map((seller) => seller.id),
  );
  const listingIds = new Set<string>();
  const listings = [...recentListings, ...featuredListings].filter((item) => {
    if (!item?.id || listingIds.has(item.id)) return false;
    listingIds.add(item.id);
    return true;
  });
  const listingEntries: MetadataRoute.Sitemap = listings.map((item) => {
    const path = contentPath("en", item).replace(/^\/en/, "");
    return {
      url: langs("en", path),
      lastModified: item.updatedAt
        ? new Date(item.updatedAt)
        : item.createdAt
          ? new Date(item.createdAt)
          : now,
      changeFrequency: "daily",
      priority: 0.65,
      images: listingImages(item),
      alternates: alternates(path),
    };
  });

  // Sellers featured on the homepage (admin → Social proof) are the profiles we
  // most want crawled, so they are always listed, at a higher priority, even
  // when none of their listings fell inside this snapshot.
  const featuredUsernames = new Set(featuredSellers.map((s) => s.username));

  const sellerLastModified = new Map<string, Date>();
  for (const seller of featuredSellers) sellerLastModified.set(seller.username, now);
  for (const item of listings) {
    const username = item.creator?.username?.trim();
    if (!username) continue;
    const modified = item.updatedAt
      ? new Date(item.updatedAt)
      : item.createdAt
        ? new Date(item.createdAt)
        : now;
    const previous = sellerLastModified.get(username);
    if (!previous || previous === now || modified > previous)
      sellerLastModified.set(username, modified);
  }
  const sellerEntries: MetadataRoute.Sitemap = [...sellerLastModified].map(
    ([username, lastModified]) => {
      // The canonical profile URL. /profile/{username} is a legacy address that
      // permanently redirects here, and engines skip redirecting sitemap URLs.
      const path = `/@${username}`;
      return {
        url: langs("en", path),
        lastModified,
        changeFrequency: "daily" as const,
        priority: featuredUsernames.has(username) ? 0.8 : 0.6,
        alternates: alternates(path),
      };
    },
  );

  return [
    ...staticEntries,
    ...countyEntries,
    ...searchIntentEntries,
    ...sellCarEntries,
    ...sellCarLocationEntries,
    ...blogEntries,
    ...sellerEntries,
    ...listingEntries,
  ];
}
