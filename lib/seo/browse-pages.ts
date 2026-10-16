/**
 * Explore's subcategory routes (/explore/{category}/{subcategory}) as landing
 * pages: which ones search engines should index, and what they're called.
 *
 * The route renders the interactive browse UI for any subcategory, but most of
 * the ~290 subcategories in the taxonomy hold no live listings at all, and an
 * indexable page with nothing on it is a soft 404. So a route is indexed only
 * when it has real inventory and no curated page already targets the same
 * search — both the route's robots tag and app/sitemap.ts read this module, so
 * the two can't disagree. Import-free on purpose, like category-hubs.ts.
 */

/**
 * Live listings a subcategory needs before its page is worth indexing. Below
 * this the page still works for visitors, but it's `noindex, follow`: a
 * category page with two items doesn't answer "phones for sale in Kenya".
 */
export const MIN_INDEXABLE_LISTINGS = 5;

/**
 * Subcategories whose search intent already has a hand-written landing page
 * (lib/seo/search-intent-pages.ts) that actually shows listings. Indexing both
 * would put two Shopi pages in competition for one query, so the curated page
 * — copy, tips, FAQs — keeps it, and the browse route stays crawlable but
 * unindexed. Keyed "{category slug}/{subcategory slug}"; values are the
 * curated page's path.
 *
 * Only pages that showed at least five listings when this was written (16 Oct
 * 2026). The curated pages find listings by free-text query, which misses most
 * of a category — /for-sale/home-appliances showed 3 while the Home Appliances
 * subcategory held 99 — and deferring to a near-empty page would hide the
 * better one. Add a pair here once its curated page shows real inventory.
 */
export const CURATED_SUBCATEGORY_PAGES: Readonly<Record<string, string>> = {
  "electronics-technology/phones": "/for-sale/phones",
  "electronics-technology/laptops": "/for-sale/laptops",
  "electronics-technology/televisions": "/for-sale/tvs",
  "home-living/furniture": "/for-sale/furniture",
  "home-living/sofas-couches": "/for-sale/sofas",
  "automotive/cars": "/for-sale/cars",
  "health-beauty/skincare": "/for-sale/skincare",
};

/**
 * Top-level categories whose subcategories aren't goods for sale, so "for
 * Sale" would misdescribe them ("Plumbing for Sale", "Internships for Sale").
 */
const NOT_FOR_SALE_CATEGORIES = new Set([
  "services",
  "jobs-gigs",
  "events-tickets",
  "property-rentals",
]);

export function browsePath(categorySlug: string, subcategorySlug: string) {
  return `/explore/${categorySlug}/${subcategorySlug}` as const;
}

/** "Headphones & Earphones for Sale in Kenya", "Plumbing in Kenya". */
export function browseHeading(categorySlug: string, subcategoryName: string) {
  const forSale =
    !NOT_FOR_SALE_CATEGORIES.has(categorySlug) &&
    !/\bfor (sale|rent)\b/i.test(subcategoryName);
  return `${subcategoryName}${forSale ? " for Sale" : ""} in Kenya`;
}

export function curatedPageFor(
  categorySlug: string,
  subcategorySlug: string,
): string | undefined {
  return CURATED_SUBCATEGORY_PAGES[`${categorySlug}/${subcategorySlug}`];
}

export function isIndexableBrowsePage(
  categorySlug: string,
  subcategorySlug: string,
  liveListings: number,
): boolean {
  return (
    liveListings >= MIN_INDEXABLE_LISTINGS &&
    !curatedPageFor(categorySlug, subcategorySlug)
  );
}
