import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { siteConfig } from "@/config/site";
import { fetchRecentListings } from "@/features/discover/queries/recentListings";
import { isValidLocale, locales } from "@/i18n/config";
import { contentPath } from "@/lib/content-url";
import { publicPageMetadata } from "@/lib/metadata";
import {
  breadcrumbSchema,
  faqSchema,
  jsonLd,
  marketplaceSchema,
  marketplaceWebPageSchema,
} from "@/lib/structured-data";
import {
  getSellCarPage,
  sellCarPages,
  sellCarPath,
} from "@/lib/seo/sell-car-pages";
import { searchIntentPath } from "@/lib/seo/search-intent-pages";

type Props = { params: Promise<{ lang: string; slug: string }> };
type SellCarPageData = NonNullable<ReturnType<typeof getSellCarPage>>;

export const revalidate = 3600;

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    sellCarPages.map((page) => ({ lang, slug: page.slug })),
  );
}

function pageTitle(model: string) {
  return `Sell My ${model} in Kenya — Free Listing, No Broker`;
}

function pageDescription(page: SellCarPageData) {
  return `Sell your ${page.model} in Kenya: see what other owners are asking, list it free on Shopi and deal with buyers directly. No broker, no commission.`;
}

function priceLabel(listing: {
  price?: { amount: number; currency: string } | null;
}) {
  if (!listing.price || listing.price.amount === 0) return null;
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
  const page = getSellCarPage(slug);
  if (!page) return {};

  return {
    ...publicPageMetadata({
      lang: safeLang,
      path: sellCarPath(page.slug),
      title: pageTitle(page.model),
      description: pageDescription(page),
    }),
    keywords: [
      ...page.keywords,
      `sell my car Kenya`,
      `${page.model} for sale Kenya`,
      "sell car without broker Kenya",
      "sell car online Kenya",
      "Shopi",
    ],
  };
}

export default async function SellCarLandingPage({ params }: Props) {
  const { lang, slug } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const page = getSellCarPage(slug);
  if (!page) notFound();

  const path = sellCarPath(page.slug);
  const pageUrl = `${siteConfig.url}/${safeLang}${path}`;

  // Live comparables are the whole conversion mechanic here. A seller's real
  // question is "what is mine worth?", and the honest answer is what comparable
  // cars are actually being asked for right now — not a number we invent.
  const comparables = await fetchRecentListings(9, undefined, page.model);
  const relatedPages = page.related
    .map((relatedSlug) => getSellCarPage(relatedSlug))
    .filter((related): related is SellCarPageData => Boolean(related));

  const faq = [
    {
      q: `How much is my ${page.model} worth in Kenya?`,
      a: `The most reliable answer is what comparable ${page.model} listings are being advertised for right now. Filter for the same year, grade and mileage, then price slightly inside that range if you want a fast sale. Condition, logbook status and service history move the figure more than mileage alone.`,
    },
    {
      q: `Where can I sell my ${page.model} in Kenya?`,
      a: `You can list your ${page.model} free on Shopi and reach buyers directly. Post photos or a walkaround video, add the year, grade, mileage, price and location, and interested buyers message you inside the app.`,
    },
    {
      q: `Do I need a broker to sell my ${page.model}?`,
      a: `No. Brokers take a cut and slow the process down by sitting between you and the buyer. On Shopi you list free, buyers message you directly, and you keep the full sale price. Shopi takes no commission and does not handle payment.`,
    },
    {
      q: `What documents do I need to sell a car in Kenya?`,
      a: `You need the logbook in your name, your ID and KRA PIN, and a signed sale agreement. Transfer of ownership is done through the NTSA TIMS portal, and both buyer and seller need active TIMS accounts. Clear any outstanding financing before you advertise.`,
    },
    {
      q: `How fast will my ${page.model} sell?`,
      a: `That depends mostly on price and presentation. Listings with a walkaround video, honest photos including any wear, a clear asking price and a stated logbook status get more genuine enquiries and far fewer time-wasters.`,
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
              name: pageTitle(page.model),
              description: pageDescription(page),
              keywords: [...page.keywords],
            }),
            faqSchema(faq),
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/${safeLang}` },
              {
                name: "Sell a car in Kenya",
                url: `${siteConfig.url}/${safeLang}/sell-car-kenya`,
              },
              { name: `Sell my ${page.model}`, url: pageUrl },
            ]),
          ),
        }}
      />
      <LegalNav lang={safeLang} />
      <BreadcrumbJsonLd
        lang={safeLang}
        trail={[
          { name: "Sell a Car in Kenya", path: "/sell-car-kenya" },
          { name: `Sell my ${page.model}`, path },
        ]}
      />

      <main>
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="px-5 pt-24 pb-14">
          <div className="mx-auto max-w-190">
            <p className="mb-4 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Sell your car in Kenya
            </p>
            <h1 className="max-w-175 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold tracking-normal leading-[1.08] text-foreground">
              Sell my {page.model} in Kenya
            </h1>
            <p className="mt-5 max-w-150 text-[1.05rem] leading-[1.75] text-muted">
              {page.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${safeLang}/upload`}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline"
              >
                List your {page.model} free
              </Link>
              <Link
                href={`/${safeLang}/search?q=${encodeURIComponent(page.model)}`}
                className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground no-underline"
              >
                See what others are asking
              </Link>
            </div>
            <p className="mt-5 text-[0.85rem] text-muted">
              Free to list · No commission · You deal with the buyer directly
            </p>
          </div>
        </section>

        {/* ── Live comparables — the "what is it worth" answer ────────── */}
        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-190">
            <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Price your car
            </p>
            <h2 className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-bold tracking-normal leading-tight text-foreground">
              What {page.model} owners are asking right now
            </h2>
            <p className="mt-4 max-w-150 text-[0.95rem] leading-[1.7] text-muted">
              These are live asking prices from Shopi listings, not a valuation.
              Compare against the same year, grade and mileage as yours, then
              decide whether you want to price for speed or hold out for the top
              of the range.
            </p>

            {comparables.length > 0 ? (
              <ul className="mt-7 grid list-none gap-3 p-0 sm:grid-cols-2">
                {comparables.map((listing) => {
                  const detail = [priceLabel(listing), placeLabel(listing)]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={listing.id}>
                      <Link
                        href={contentPath(safeLang, listing)}
                        className="flex flex-col gap-1.5 rounded-lg border border-border bg-elevated p-4 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
                      >
                        <span className="text-sm font-bold text-foreground">
                          {listing.title ?? page.model}
                        </span>
                        {detail && (
                          <span className="text-[0.8rem] text-muted">
                            {detail}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-7 rounded-lg border border-border bg-elevated p-6">
                <p className="text-[0.95rem] leading-[1.7] text-muted">
                  No {page.model} listings are live on Shopi at the moment —
                  which means yours would be the one buyers searching for it
                  find.{" "}
                  <Link href={`/${safeLang}/upload`} className="text-primary">
                    Post it free
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Who buys this car ──────────────────────────────────────── */}
        <section className="mx-auto max-w-190 px-5 py-16">
          <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
                Know your buyer
              </p>
              <h2 className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-bold tracking-normal leading-tight text-foreground">
                Who buys a {page.model} in Kenya
              </h2>
            </div>
            <div>
              <p className="text-[1rem] leading-[1.8] text-muted">
                {page.buyerProfile}
              </p>
            </div>
          </div>
        </section>

        {/* ── Price factors + buyer questions ────────────────────────── */}
        <section className="bg-surface px-5 py-14">
          <div className="mx-auto grid max-w-190 gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-display text-[clamp(1.45rem,3vw,2.1rem)] font-bold tracking-normal text-foreground">
                What moves the price
              </h2>
              <ul className="mt-5 grid gap-3 p-0">
                {page.priceFactors.map((factor) => (
                  <li
                    key={factor}
                    className="list-none rounded-lg border border-border bg-elevated p-4 text-sm leading-[1.65] text-muted"
                  >
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-[clamp(1.45rem,3vw,2.1rem)] font-bold tracking-normal text-foreground">
                Answer these in your listing
              </h2>
              <p className="mt-3 text-[0.9rem] leading-[1.7] text-muted">
                Every {page.model} buyer asks these. Answering them up front
                cuts the time-wasting messages dramatically.
              </p>
              <ul className="mt-5 grid gap-3 p-0">
                {page.buyerQuestions.map((question) => (
                  <li
                    key={question}
                    className="list-none rounded-lg border border-border bg-elevated p-4 text-sm leading-[1.65] text-muted"
                  >
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Listing tips ───────────────────────────────────────────── */}
        <section className="mx-auto max-w-190 px-5 py-16">
          <h2 className="mb-7 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Getting your {page.model} listing right
          </h2>
          <ol className="grid gap-4 p-0 md:grid-cols-3">
            {page.listingTips.map((tip, index) => (
              <li
                key={tip}
                className="list-none rounded-lg border border-border bg-elevated p-5"
              >
                <span className="text-xs font-bold uppercase text-primary">
                  Tip {index + 1}
                </span>
                <p className="mt-3 text-sm leading-[1.65] text-muted">{tip}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────── */}
        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-170">
            <h2 className="mb-8 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
              Selling a {page.model}: common questions
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
          </div>
        </section>

        {/* ── Cross-links ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-190 px-5 py-16">
          <h2 className="mb-7 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Selling something else?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {relatedPages.map((related) => (
              <Link
                key={related.slug}
                href={`/${safeLang}${sellCarPath(related.slug)}`}
                className="rounded-lg border border-border bg-elevated p-5 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
              >
                <h3 className="font-display text-[1.05rem] font-bold text-foreground">
                  Sell my {related.model}
                </h3>
                <p className="mt-2 text-[0.875rem] leading-[1.6] text-muted">
                  {related.intro}
                </p>
              </Link>
            ))}
            <Link
              href={`/${safeLang}/sell-car-kenya`}
              className="rounded-lg border border-border bg-elevated p-5 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
            >
              <h3 className="font-display text-[1.05rem] font-bold text-foreground">
                Selling any car in Kenya
              </h3>
              <p className="mt-2 text-[0.875rem] leading-[1.6] text-muted">
                Pricing, logbook transfer through NTSA TIMS, avoiding brokers
                and staying safe when meeting buyers.
              </p>
            </Link>
            <Link
              href={`/${safeLang}${searchIntentPath(page.buyerSlug)}`}
              className="rounded-lg border border-border bg-elevated p-5 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
            >
              <h3 className="font-display text-[1.05rem] font-bold text-foreground">
                Buying a {page.model} instead
              </h3>
              <p className="mt-2 text-[0.875rem] leading-[1.6] text-muted">
                Browse {page.model} listings on Shopi and message sellers
                directly.
              </p>
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter lang={safeLang} />
    </>
  );
}
