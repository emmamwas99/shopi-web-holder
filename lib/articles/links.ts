import { COUNTIES } from "../counties.ts";
import { categoryPages } from "../seo/category-hubs.ts";
import { searchIntentPages } from "../seo/search-intent-pages.ts";
import { sellCarLocations } from "../seo/sell-car-locations.ts";
import { sellCarPages } from "../seo/sell-car-pages.ts";
import { CATEGORIES } from "./categories.ts";
import { ALL_ARTICLES } from "./registry.ts";
import type { LinkTarget } from "./types.ts";

/**
 * Turns a LinkTarget into an href and a label, using the data that owns each
 * route. Returns null for a target that doesn't exist, which the SEO audit
 * reports as an error; the page simply leaves the link out.
 */

export type ResolvedLink = {
  /** Locale-free internal path ("/for-sale/toyota-vitz"), or a full URL when external. */
  href: string;
  label: string;
  description?: string;
  external: boolean;
};

export const articlePath = (slug: string) => `/blog/${slug}` as const;
export const categoryPath = (slug: string) => `/blog/category/${slug}` as const;

/** Locale-free public pages an article may link to by path. */
const STATIC_PATHS = new Set<string>([
  "/",
  "/about",
  "/blog",
  "/buy-and-sell-in-kenya",
  "/beauty-cosmetics-kenya",
  "/community-guidelines",
  "/contact",
  "/explore",
  "/faq",
  "/for-you",
  "/jiji-alternative-kenya",
  "/marketplace-alternatives-kenya",
  "/online-selling-jobs-kenya",
  "/phones-electronics-kenya",
  "/pigiame-alternative-kenya",
  // The viewer's own profile. Private, but a CTA may point at it (e.g.
  // /profile?tab=invite): signed-out readers are sent to sign in and back.
  "/profile",
  // Shop verification. Private like /profile; signed-out readers sign in first.
  "/profile/verification",
  "/prohibited-items",
  "/property-for-sale-kenya",
  "/safety-centre",
  "/search",
  "/sell-car-kenya",
  "/sell-in-kenya",
  "/shopi-agent",
  "/stores",
  "/tiktok-downloader",
  "/upload",
]);

const isPublishedArticle = (slug: string) =>
  ALL_ARTICLES.some(
    (article) => article.slug === slug && article.status === "published",
  );

/**
 * Whether a locale-free internal path ("/for-sale/toyota-vitz?x=1") is a page
 * that exists. Dynamic routes are checked against the data that generates
 * them, so a slug typo is caught here rather than by a crawler.
 */
export function isKnownInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  const pathname = path.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (STATIC_PATHS.has(pathname)) return true;

  const [, section, slug, extra] = pathname.split("/");
  if (!slug) return false;
  if (section === "blog") {
    if (slug === "category") {
      return !!extra && CATEGORIES.some((category) => category.slug === extra);
    }
    return !extra && isPublishedArticle(slug);
  }
  if (extra) return false;
  switch (section) {
    case "for-sale":
      return searchIntentPages.some((page) => page.slug === slug);
    case "sell":
      return sellCarPages.some((page) => page.slug === slug);
    case "sell-car-kenya":
      return sellCarLocations.some((location) => location.slug === slug);
    case "marketplace":
      return COUNTIES.some((county) => county.slug === slug);
    default:
      return false;
  }
}

function searchHref(target: Extract<LinkTarget, { kind: "search" }>): string {
  const params = new URLSearchParams();
  if (target.query) params.set("q", target.query);
  if (target.minPrice !== undefined) params.set("minPrice", String(target.minPrice));
  if (target.maxPrice !== undefined) params.set("maxPrice", String(target.maxPrice));
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

// Mirrors the /for-sale page title: rentals already say what they are
// ("Houses for rent"), so "for sale" is only added to everything else.
const forSaleLabel = (label: string) =>
  /\bfor rent$/i.test(label) ? label : `${label} for sale`;

export function resolveLink(target: LinkTarget): ResolvedLink | null {
  switch (target.kind) {
    case "forSale": {
      const page = searchIntentPages.find((p) => p.slug === target.slug);
      return page
        ? {
            href: `/for-sale/${page.slug}`,
            label: forSaleLabel(page.label),
            description: page.intro,
            external: false,
          }
        : null;
    }
    case "sellCar": {
      const page = sellCarPages.find((p) => p.slug === target.slug);
      return page
        ? {
            href: `/sell/${page.slug}`,
            label: `Sell your ${page.model}`,
            description: page.intro,
            external: false,
          }
        : null;
    }
    case "sellCarCity": {
      const location = sellCarLocations.find((l) => l.slug === target.slug);
      return location
        ? {
            href: `/sell-car-kenya/${location.slug}`,
            label: `Sell a car in ${location.town}`,
            description: location.intro,
            external: false,
          }
        : null;
    }
    case "county": {
      const county = COUNTIES.find((c) => c.slug === target.slug);
      return county
        ? {
            href: `/marketplace/${county.slug}`,
            label: `Listings in ${county.label}`,
            description: county.blurb,
            external: false,
          }
        : null;
    }
    case "hub": {
      const hub = categoryPages.find((page) => page.path === target.path);
      return hub
        ? { href: hub.path, label: hub.title, description: hub.body, external: false }
        : null;
    }
    case "article": {
      const article = ALL_ARTICLES.find(
        (a) => a.slug === target.slug && a.status === "published",
      );
      return article
        ? {
            href: articlePath(article.slug),
            label: article.title,
            description: article.excerpt,
            external: false,
          }
        : null;
    }
    case "blogCategory": {
      const category = CATEGORIES.find((c) => c.slug === target.slug);
      return category
        ? {
            href: categoryPath(category.slug),
            label: category.title,
            description: category.intro,
            external: false,
          }
        : null;
    }
    case "search":
      return {
        href: searchHref(target),
        label: target.label,
        description: target.description,
        external: false,
      };
    case "page":
      return isKnownInternalPath(target.path)
        ? {
            href: target.path,
            label: target.label,
            description: target.description,
            external: false,
          }
        : null;
    case "external":
      return /^https:\/\//.test(target.url)
        ? {
            href: target.url,
            label: target.label,
            description: target.description,
            external: true,
          }
        : null;
  }
}
