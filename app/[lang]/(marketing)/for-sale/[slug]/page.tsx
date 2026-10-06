import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { GuideLinks } from "@/components/seo/GuideLinks";
import { getArticlesLinkingTo } from "@/lib/articles";
import { siteConfig } from "@/config/site";
import { fetchRecentListings } from "@/features/discover/queries/recentListings";
import { isValidLocale, locales } from "@/i18n/config";
import { contentPath } from "@/lib/content-url";
import { publicPageMetadata } from "@/lib/metadata";
import {
  breadcrumbSchema,
  faqSchema,
  jsonLd,
  listingItemListSchema,
  marketplaceSchema,
  marketplaceWebPageSchema,
} from "@/lib/structured-data";
import {
  getSearchIntentPage,
  searchIntentPages,
  searchIntentPath,
} from "@/lib/seo/search-intent-pages";
import { getSellCarPage, sellCarPath } from "@/lib/seo/sell-car-pages";

type Props = { params: Promise<{ lang: string; slug: string }> };
type SearchIntentPageData = NonNullable<
  ReturnType<typeof getSearchIntentPage>
>;

export const revalidate = 3600;

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    searchIntentPages.map((page) => ({ lang, slug: page.slug })),
  );
}

// Rental labels already say what the listing is ("Houses for rent"), so
// appending "for Sale" would produce "Houses for rent for Sale in Kenya".
const isRental = (label: string) => /\bfor rent$/i.test(label);

function pageTitle(label: string) {
  return isRental(label) ? `${label} in Kenya` : `${label} for Sale in Kenya`;
}

// The intro is already on the page; the meta description is written for the
// results page and kept under 155 chars so it isn't truncated.
function pageDescription(page: SearchIntentPageData) {
  const subject = isRental(page.label)
    ? page.pluralLabel
    : `${page.pluralLabel} for sale`;
  return `Find ${subject} in Kenya from local sellers. Compare prices, photos and locations, then message the seller directly on Shopi.`;
}

function priceLabel(listing: {
  price?: { amount: number; currency: string } | null;
}) {
  if (!listing.price) return null;
  if (listing.price.amount === 0) return "Free";
  return `${listing.price.currency} ${listing.price.amount.toLocaleString()}`;
}

function placeLabel(listing: {
  location?: { placeName?: string | null; county?: string | null } | null;
}) {
  return (
    [listing.location?.placeName, listing.location?.county]
      .filter(Boolean)
      .join(", ")
      .trim() || null
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const page = getSearchIntentPage(slug);
  if (!page) return {};

  return {
    ...publicPageMetadata({
      lang: safeLang,
      path: searchIntentPath(page.slug),
      title: pageTitle(page.label),
      description: pageDescription(page),
    }),
    keywords: [
      ...page.keywords,
      `${page.query} Kenya`,
      `${page.query} price Kenya`,
      `${page.query} near me`,
      "Shopi",
      "Kenya marketplace",
      "buy and sell Kenya",
    ],
  };
}

export default async function SearchIntentLandingPage({ params }: Props) {
  const { lang, slug } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const page = getSearchIntentPage(slug);
  if (!page) notFound();

  const path = searchIntentPath(page.slug);
  const pageUrl = `${siteConfig.url}/${safeLang}${path}`;
  const listings = await fetchRecentListings(12, undefined, page.query);
  // Non-null only for models that have a seller-intent counterpart page.
  const sellPage = getSellCarPage(page.slug);
  const guides = getArticlesLinkingTo({ kind: "forSale", slug: page.slug });
  const relatedPages = page.related
    .map((relatedSlug) => getSearchIntentPage(relatedSlug))
    .filter((related): related is SearchIntentPageData => Boolean(related));
  const faq = [
    {
      q: `Can I find ${page.pluralLabel} for sale on Shopi?`,
      a: `Yes. Shopi helps buyers find ${page.pluralLabel} in Kenya from local sellers. Open a listing, compare price and location, then message the seller directly.`,
    },
    {
      q: `How do I sell ${page.label.toLowerCase()} on Shopi?`,
      a: `Create a free listing with clear photos or video, price, location and the details buyers search for. Shopi Agent can also help draft the title, description and specifications.`,
    },
    {
      q: "Does Shopi handle payment or delivery?",
      a: "No. Shopi connects buyers and sellers. Payment, inspection, pickup and delivery are agreed directly between buyer and seller.",
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            marketplaceSchema,
            marketplaceWebPageSchema({
              url: pageUrl,
              name: pageTitle(page.label),
              description: pageDescription(page),
              keywords: page.keywords,
            }),
            faqSchema(faq),
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/${safeLang}` },
              { name: "For sale", url: `${siteConfig.url}/${safeLang}/search` },
              { name: page.label, url: pageUrl },
            ]),
            ...(listings.length
              ? [
                  listingItemListSchema({
                    id: `${pageUrl}#listings`,
                    name: `${page.label} listings on Shopi`,
                    items: listings.map((listing) => ({
                      name: listing.title ?? page.label,
                      url: `${siteConfig.url}${contentPath(safeLang, listing)}`,
                    })),
                  }),
                ]
              : []),
          ),
        }}
      />
      <LegalNav lang={safeLang} />
      <BreadcrumbJsonLd
        lang={safeLang}
        trail={[{ name: pageTitle(page.label), path }]}
      />

      <main>
        <section className="px-5 pt-24 pb-14">
          <div className="mx-auto max-w-190">
            <p className="mb-4 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              {page.category} in Kenya
            </p>
            <h1 className="max-w-175 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold tracking-normal leading-[1.08] text-foreground">
              {pageTitle(page.label)}
            </h1>
            <p className="mt-5 max-w-150 text-[1.05rem] leading-[1.75] text-muted">
              {page.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${safeLang}/search?q=${encodeURIComponent(page.query)}`}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline"
              >
                Search current listings
              </Link>
              <Link
                href={`/${safeLang}/upload`}
                className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground no-underline"
              >
                Sell one free
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-surface px-5 py-14">
          <div className="mx-auto grid max-w-190 gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-display text-[clamp(1.45rem,3vw,2.1rem)] font-bold tracking-normal text-foreground">
                What buyers should check
              </h2>
              <ul className="mt-5 grid gap-3 p-0">
                {page.buyerTips.map((tip) => (
                  <li
                    key={tip}
                    className="list-none rounded-lg border border-border bg-elevated p-4 text-sm leading-[1.65] text-muted"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-[clamp(1.45rem,3vw,2.1rem)] font-bold tracking-normal text-foreground">
                How sellers can rank better
              </h2>
              <ul className="mt-5 grid gap-3 p-0">
                {page.sellerTips.map((tip) => (
                  <li
                    key={tip}
                    className="list-none rounded-lg border border-border bg-elevated p-4 text-sm leading-[1.65] text-muted"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-190 px-5 py-16">
          <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
                Matching supply
              </p>
              <h2 className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-bold tracking-normal leading-tight text-foreground">
                Recent {page.pluralLabel} on Shopi
              </h2>
              <p className="mt-4 text-[0.95rem] leading-[1.7] text-muted">
                These links are refreshed from Shopi listings when matching
                products are available.
              </p>
            </div>
            {listings.length > 0 ? (
              <ul className="grid list-none gap-3 p-0">
                {listings.map((listing) => {
                  const detail = [priceLabel(listing), placeLabel(listing)]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li
                      key={listing.id}
                      className="rounded-lg border border-border bg-elevated p-4"
                    >
                      <Link
                        href={contentPath(safeLang, listing)}
                        className="font-bold text-primary underline"
                      >
                        {listing.title ?? page.label}
                      </Link>
                      {detail && (
                        <p className="mt-2 text-sm text-muted">{detail}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-lg border border-border bg-elevated p-5">
                <p className="text-sm leading-[1.7] text-muted">
                  No matching listings are available in this server-rendered
                  snapshot yet. You can still search Shopi live or post a
                  listing for buyers looking for this item.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/${safeLang}/search?q=${encodeURIComponent(
                      page.query,
                    )}`}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white no-underline"
                  >
                    Search live
                  </Link>
                  <Link
                    href={`/${safeLang}/upload`}
                    className="rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground no-underline"
                  >
                    Create listing
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* A large share of people researching "<model> for sale" are owners
            checking what theirs is worth before selling. Give them the route
            to the seller guide instead of letting them bounce. */}
        {sellPage && (
          <section className="mx-auto max-w-190 px-5 pb-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 md:flex md:items-center md:justify-between md:gap-6">
              <div>
                <h2 className="font-display text-[1.15rem] font-bold text-foreground">
                  Own a {sellPage.model} and thinking of selling?
                </h2>
                <p className="mt-2 max-w-140 text-[0.9rem] leading-[1.7] text-muted">
                  See what other owners are asking, what moves the price, and
                  how to list yours free — no broker, no commission.
                </p>
              </div>
              <Link
                href={`/${safeLang}${sellCarPath(sellPage.slug)}`}
                className="mt-4 inline-block shrink-0 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline md:mt-0"
              >
                Sell my {sellPage.model}
              </Link>
            </div>
          </section>
        )}

        {/* Every blog guide that links to this page, found automatically —
            "Toyota Vitz price in Kenya" appears here without anyone adding it. */}
        <GuideLinks
          lang={safeLang}
          articles={guides.slice(0, 3)}
          heading="Price and buying guides"
        />

        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-170">
            <h2 className="mb-7 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
              Related searches
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedPages.map((related) => (
                <Link
                  key={related.slug}
                  href={`/${safeLang}${searchIntentPath(related.slug)}`}
                  className="rounded-lg border border-border bg-elevated p-5 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
                >
                  <h3 className="font-display text-[1.05rem] font-bold text-foreground">
                    {pageTitle(related.label)}
                  </h3>
                  <p className="mt-2 text-[0.9rem] leading-[1.65] text-muted">
                    {related.intro}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-170 px-5 py-16">
          <h2 className="mb-8 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Questions about {page.pluralLabel}
          </h2>
          <div className="flex flex-col gap-3">
            {faq.map(({ q, a }) => (
              <details
                key={q}
                className="rounded-lg border border-border bg-elevated p-5"
              >
                <summary className="cursor-pointer text-base font-bold text-foreground">
                  {q}
                </summary>
                <p className="mt-3 text-[0.95rem] leading-[1.7] text-muted">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <CategoryCrossLinks lang={safeLang} currentPath={path} />
      </main>
      <LandingFooter lang={safeLang} />
    </>
  );
}
