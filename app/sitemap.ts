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
import { contentPath, videoPath } from "@/lib/content-url";
import { isTranslatedPath, localeAlternates } from "@/lib/metadata";
import { COUNTIES } from "@/lib/counties";
import { fetchSocialProofSellers } from "@/features/social-proof/queries/socialProofSellers";
import { fetchIndexableBrowsePages } from "@/features/discover/queries/browse.server";
import { browsePath } from "@/lib/seo/browse-pages";
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
// next daily revalidate picks up from a fresh NEWEST ordering.
const LISTING_FETCH_BUDGET_MS = 20_000;

// Pages of the all-categories NEWEST walk that run alongside the per-category
// walks — enough to keep the freshest listings in however long the category
// walks take, and to catch anything filed without a category.
const NEWEST_SAFETY_PAGES = 2;

type SitemapListing = {
  id: string;
  slug?: string | null;
  title?: string | null;
  type?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  creator?: { username?: string | null } | null;
  media?: {
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    sortOrder?: number | null;
    muxMeta?: { thumbnailUrl?: string | null; playbackId?: string | null } | null;
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

/** Same rule as isPlayableVideo(): a VIDEO post with a real Mux stream. */
function isPlayableVideoListing(item: SitemapListing): boolean {
  return (
    item.type === "VIDEO" &&
    (item.media ?? []).some((media) => (media.muxMeta?.playbackId ?? "").length > 0)
  );
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

/** Top-level category ids, or [] if the taxonomy can't be fetched. */
async function fetchTopLevelCategoryIds(api: string): Promise<string[]> {
  try {
    const res = await fetch(`${api}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query SitemapCategories { categories { id parentId } }`,
      }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { categories?: { id: string; parentId?: string | null }[] };
    };
    return (json.data?.categories ?? [])
      .filter((category) => !category.parentId)
      .map((category) => category.id);
  } catch {
    return [];
  }
}

/**
 * One NEWEST-ordered cursor walk of discoveryFeed, optionally within one
 * category, until it runs out of pages, `maxPages`, or the shared deadline.
 */
async function walkListings(
  api: string,
  categoryId: string | null,
  deadline: number,
  maxPages = Number.POSITIVE_INFINITY,
): Promise<SitemapListing[]> {
  const listings: SitemapListing[] = [];
  let after: string | null = null;
  let pages = 0;

  try {
    while (
      pages < maxPages &&
      listings.length < LISTING_SITEMAP_MAX &&
      Date.now() < deadline
    ) {
      const res: Response = await fetch(`${api}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query SitemapListings($limit: Int, $after: String, $categoryId: String) {
              discoveryFeed(sort: NEWEST, limit: $limit, after: $after, categoryId: $categoryId) {
                items {
                  id
                  slug
                  title
                  type
                  createdAt
                  updatedAt
                  creator { username }
                  media {
                    imageUrl
                    thumbnailUrl
                    sortOrder
                    muxMeta { thumbnailUrl playbackId }
                    r2Variants { url variant }
                  }
                }
                pageInfo { hasNextPage endCursor }
              }
            }
          `,
          variables: { limit: LISTING_SITEMAP_PAGE, after, categoryId },
        }),
        // Refresh the listing set daily: listings are posted a few dozen times
        // a day, and engines don't refetch a sitemap more often than that.
        next: { revalidate: 86400 },
      });
      pages += 1;
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
      listings.push(...page.items.filter((item) => item?.id));

      if (!page.pageInfo?.hasNextPage || !page.pageInfo.endCursor) break;
      after = page.pageInfo.endCursor;
    }
  } catch {
    // Best-effort: ship whatever pages made it.
  }

  return listings;
}

/**
 * The public listings to submit, gathered by walking every top-level category
 * in parallel.
 *
 * A single newest-first walk is sequential — each page needs the previous
 * page's cursor — so at ~1s a page the 20s budget stopped near 1,000
 * listings: measured against the live data on 2026-10-16, it reached 978 of
 * 1,520, and every older listing silently dropped out of the sitemap. Every
 * listing belongs to a top-level category, so walking the categories side by
 * side covers the same set with the wall time of the largest one. If the
 * taxonomy can't be fetched, this falls back to the single walk.
 */
async function fetchRecentListings(): Promise<SitemapListing[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];

  const deadline = Date.now() + LISTING_FETCH_BUDGET_MS;
  const categoryIds = await fetchTopLevelCategoryIds(api);
  const walks = await Promise.all([
    walkListings(
      api,
      null,
      deadline,
      categoryIds.length ? NEWEST_SAFETY_PAGES : undefined,
    ),
    ...categoryIds.map((id) => walkListings(api, id, deadline)),
  ]);

  // A feed reordered mid-walk can repeat an item across cursor pages, and the
  // newest walk overlaps the category walks; a sitemap listing the same URL
  // twice is a validation warning.
  const seen = new Set<string>();
  const listings: SitemapListing[] = [];
  for (const item of walks.flat()) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    listings.push(item);
  }
  return listings.slice(0, LISTING_SITEMAP_MAX);
}

/** Per featured seller: a whole storefront is a few hundred URLs at most. */
const FEATURED_SELLER_LISTINGS_MAX = 500;

/**
 * Every public listing of each team-selected seller (admin → Social proof).
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
                      type
                      createdAt
                      updatedAt
                      creator { username }
                      media {
                        imageUrl
                        thumbnailUrl
                        sortOrder
                        muxMeta { thumbnailUrl playbackId }
                        r2Variants { url variant }
                      }
                    }
                  }
                }
              `,
              variables: { userId, limit: LISTING_SITEMAP_PAGE, afterId },
            }),
            next: { revalidate: 86400 },
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
  // lastmod is set only where a real modification date exists (listings,
  // profiles via their newest listing, blog posts). It used to be the
  // generation time on every other page, so ~140 URLs claimed to change on
  // every hourly rebuild. Google uses lastmod only when it is "consistently
  // and verifiably accurate", and Bing names generation-time stamps as the
  // common mistake that makes it distrust a sitemap's dates — including the
  // accurate ones on listings. (Both ignore changefreq and priority.)
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
    // Not /for-you: it's a personalised feed, and every desktop user agent —
    // Bingbot and Googlebot's desktop crawler included — is redirected from it
    // to /explore (proxy.ts). A sitemap URL that redirects for some crawlers
    // is a mixed signal; /explore is the stable browse surface.
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
    { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms-and-conditions", changeFrequency: "yearly", priority: 0.3 },
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
      changeFrequency: p.changeFrequency,
      priority: p.priority,
      alternates: alternates(p.path),
    })),
  );

  const countyEntries: MetadataRoute.Sitemap = COUNTIES.map((county) => ({
    url: langs("en", `/marketplace/${county.slug}`),
    changeFrequency: "daily",
    priority: 0.85,
    alternates: alternates(`/marketplace/${county.slug}`),
  }));

  const searchIntentEntries: MetadataRoute.Sitemap = searchIntentPages.map(
    (page) => {
      const path = searchIntentPath(page.slug);
      return {
        url: langs("en", path),
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

  const [recentListings, featuredSellers, browsePages] = await Promise.all([
    fetchRecentListings(),
    fetchSocialProofSellers(12, 0),
    fetchIndexableBrowsePages(),
  ]);

  // Explore subcategories with enough live inventory to index — the same
  // decision the route's robots tag makes (lib/seo/browse-pages.ts).
  const browseEntries: MetadataRoute.Sitemap = browsePages.map((page) => {
    const path = browsePath(page.categorySlug, page.subcategorySlug);
    return {
      url: langs("en", path),
      changeFrequency: "daily",
      priority: 0.75,
      alternates: alternates(path),
    };
  });
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
          : undefined,
      changeFrequency: "daily",
      priority: 0.65,
      images: listingImages(item),
      alternates: alternates(path),
    };
  });

  // Each playable video listing also has a watch page, /video/{slug}: the
  // only page Google will index its video on (the product page above stays
  // the listing's canonical). Plain <url> entries, not <video:video> ones —
  // Next writes video titles into the XML unescaped, so one "&" in a title
  // would get the whole sitemap rejected. The page's VideoObject carries the
  // video details instead.
  const videoEntries: MetadataRoute.Sitemap = listings
    .filter(isPlayableVideoListing)
    .map((item) => {
      const path = videoPath("en", item).replace(/^\/en/, "");
      return {
        url: langs("en", path),
        lastModified: item.updatedAt
          ? new Date(item.updatedAt)
          : item.createdAt
            ? new Date(item.createdAt)
            : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.6,
        images: listingImages(item).slice(0, 1),
        alternates: alternates(path),
      };
    });

  // Sellers the team selected in admin → Social proof are the profiles we
  // most want crawled, so they are always listed, at a higher priority, even
  // when none of their listings fell inside this snapshot.
  const featuredUsernames = new Set(featuredSellers.map((s) => s.username));

  // A profile's lastmod is its newest listing; a featured seller with none in
  // this snapshot gets no date rather than the generation time.
  const sellerLastModified = new Map<string, Date | undefined>();
  for (const seller of featuredSellers) sellerLastModified.set(seller.username, undefined);
  for (const item of listings) {
    const username = item.creator?.username?.trim();
    if (!username) continue;
    const stamp = item.updatedAt ?? item.createdAt;
    const modified = stamp ? new Date(stamp) : undefined;
    const previous = sellerLastModified.get(username);
    if (!previous || (modified && modified > previous))
      sellerLastModified.set(username, modified ?? previous);
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
    ...browseEntries,
    ...blogEntries,
    ...sellerEntries,
    ...listingEntries,
    ...videoEntries,
  ];
}
