import Link from "next/link";
import { categoryPages } from "@/components/seo/CategoryCrossLinks";
import { contentPath } from "@/lib/content-url";
import {
  fetchRecentListings,
  type RecentListing,
} from "@/features/discover/queries/recentListings";
import { siteConfig } from "@/config/site";
import { COUNTIES } from "@/lib/counties";
import { listingPriceText } from "@/lib/format";
import { listingItemListSchema, jsonLd } from "@/lib/structured-data";
import {
  searchIntentPath,
  topSearchIntentPages,
} from "@/lib/seo/search-intent-pages";

/**
 * The server-rendered form of /explore and /search.
 *
 * Both routes mount DiscoverPage, a client component that reads
 * useSearchParams — so under SSR the route's Suspense boundary renders its
 * fallback, and that fallback was `null`. The two highest-priority browse
 * surfaces in the sitemap were therefore shipping an empty document: no
 * content to index, and — more costly — no links out to any listing, leaving
 * the sitemap as the only path by which listings could be discovered at all.
 *
 * Rendering this as the fallback instead means crawlers get a real hub page
 * and users get meaningful content for the frame before hydration.
 */
function priceLabel(listing: RecentListing): string | null {
  return listingPriceText(listing.price);
}

function placeLabel(listing: RecentListing): string | null {
  return (
    [listing.location?.placeName, listing.location?.county]
      .filter(Boolean)
      .join(", ")
      .trim() || null
  );
}

export async function BrowseHub({
  lang,
  heading,
  intro,
}: {
  lang: string;
  heading: string;
  intro: string;
}) {
  const listings = await fetchRecentListings(24);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Emitted only when the list below actually renders, so the schema and
          the page always agree. */}
      {listings.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              listingItemListSchema({
                id: `${siteConfig.url}/${lang}#latest-listings`,
                name: heading,
                items: listings.map((listing) => ({
                  name: listing.title ?? "Listing",
                  url: `${siteConfig.url}${contentPath(lang, listing)}`,
                })),
              }),
            ),
          }}
        />
      )}

      <h1 className="font-display text-2xl font-bold leading-tight text-default">
        {heading}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-normal text-muted">
        {intro}
      </p>

      <h2 className="mt-8 text-lg font-bold text-default">
        Browse by category
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {categoryPages.map((c) => (
          <li key={c.path}>
            <Link href={`/${lang}${c.path}`} className="text-primary underline">
              {c.title}
            </Link>
            <span className="text-muted"> — {c.body}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-bold text-default">
        Popular product searches
      </h2>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {topSearchIntentPages.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/${lang}${searchIntentPath(page.slug)}`}
              className="text-primary underline"
            >
              {page.label} for sale
            </Link>
          </li>
        ))}
      </ul>

      {listings.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-bold text-default">
            Latest listings
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {listings.map((listing) => {
              const detail = [priceLabel(listing), placeLabel(listing)]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={listing.id}>
                  <Link
                    href={contentPath(lang, listing)}
                    className="text-primary underline"
                  >
                    {listing.title ?? "Listing"}
                  </Link>
                  {detail && <span className="text-muted"> — {detail}</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h2 className="mt-8 text-lg font-bold text-default">Browse by county</h2>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {COUNTIES.map((county) => (
          <li key={county.slug}>
            <Link
              href={`/${lang}/marketplace/${county.slug}`}
              className="text-primary underline"
            >
              {county.label}
            </Link>
          </li>
        ))}
      </ul>

      <nav className="mt-8 flex flex-wrap gap-3 text-sm text-primary">
        <Link href={`/${lang}/for-you`}>Open For You</Link>
        <Link href={`/${lang}/explore`}>Explore listings</Link>
        <Link href={`/${lang}/shopi-agent`}>Shopi Agent</Link>
        <Link href={`/${lang}/sell-in-kenya`}>Sell on Shopi</Link>
        <Link href={`/${lang}/faq`}>FAQ</Link>
        <Link href={`/${lang}/blog`}>Buying and selling guides</Link>
      </nav>
    </section>
  );
}
