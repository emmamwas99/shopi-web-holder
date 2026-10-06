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
  jsonLdPlaceService,
} from "@/lib/structured-data";
import {
  getSellCarLocation,
  sellCarLocationPath,
  sellCarLocations,
  type SellCarLocationData,
} from "@/lib/seo/sell-car-locations";
import { sellCarPages, sellCarPath } from "@/lib/seo/sell-car-pages";

type Props = { params: Promise<{ lang: string; city: string }> };

export const revalidate = 3600;

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    sellCarLocations.map((location) => ({ lang, city: location.slug })),
  );
}

function pageTitle(location: SellCarLocationData) {
  return `Sell My Car in ${location.town} — Free Listing, No Broker`;
}

function pageDescription(location: SellCarLocationData) {
  return `Sell your car in ${location.town}: list free on Shopi, see what local sellers are asking and deal with buyers directly. No broker, no commission.`;
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
  const { lang, city } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const location = getSellCarLocation(city);
  if (!location) return {};

  return {
    ...publicPageMetadata({
      lang: safeLang,
      path: sellCarLocationPath(location.slug),
      title: pageTitle(location),
      description: pageDescription(location),
    }),
    keywords: [
      ...location.keywords,
      "sell my car Kenya",
      "sell car without broker Kenya",
      `car buyers ${location.county}`,
      "Shopi",
    ],
  };
}

export default async function SellCarLocationPage({ params }: Props) {
  const { lang, city } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const location = getSellCarLocation(city);
  if (!location) notFound();

  const path = sellCarLocationPath(location.slug);
  const pageUrl = `${siteConfig.url}/${safeLang}${path}`;

  // Local comparables are the conversion mechanic. A seller's real question is
  // "what will mine fetch here?", and live asking prices from their own county
  // answer it better than any figure we could hardcode — and keep answering it
  // correctly as the market moves.
  const comparables = await fetchRecentListings(8, location.county, "car");
  const relatedLocations = location.related
    .map((slug) => getSellCarLocation(slug))
    .filter((related): related is SellCarLocationData => Boolean(related));

  const faq = [
    {
      q: `How do I sell my car in ${location.town}?`,
      a: `List it free on Shopi with clear photos or a walkaround video, the year, grade, mileage, price in KES and your exact area within ${location.county}. Buyers in ${location.town} message you directly in the app, you arrange the viewing and inspection yourself, and you complete ownership transfer through the NTSA TIMS portal. There is no broker and no commission.`,
    },
    {
      q: `Where can I sell my car in ${location.town} without a broker?`,
      a: `You can sell privately on Shopi. Listing is free, buyers contact you directly, and you keep the full sale price instead of losing a commission or a markup to a broker. The trade-off is that you handle viewings and the NTSA transfer yourself.`,
    },
    {
      q: `How much is my car worth in ${location.town}?`,
      a: `The most reliable guide is what comparable cars are being advertised for in ${location.county} right now — same make, model, year, grade and mileage. Condition, accident history, logbook status and service records move the figure more than mileage alone. Prices differ between towns, so compare against local listings rather than national ones.`,
    },
    {
      q: `Where should I meet buyers in ${location.town}?`,
      // The first viewing spot is written as a full sentence in the data, so it
      // is quoted rather than spliced — lowercasing it would wreck the place
      // names, which are the part a local reader is actually looking for.
      a: `Meet in a public, busy place during daylight. ${location.viewingSpots[0] ?? "Petrol station forecourts and mall car parks work well."} Bring someone with you if you can, ask to see the buyer's ID and driving licence before any test drive, and go along for the drive rather than handing over the keys. Do not release the car until payment has cleared in your account.`,
    },
    {
      q: `How do I transfer car ownership in ${location.county}?`,
      a: `${location.ntsaNote} Both buyer and seller need active TIMS accounts linked to their KRA PINs. Until the transfer completes the car remains legally yours, so do not let this step drift. Confirm current requirements and fees on the NTSA TIMS portal, as they change.`,
    },
    {
      q: `Does Shopi charge commission on a car sale in ${location.town}?`,
      a: `No. Listing is free and Shopi takes no commission. Shopi does not process payment, hold money or provide escrow — you and the buyer agree price, inspection, payment and transfer between yourselves.`,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            marketplaceSchema,
            // Binds the page to a real Place entity, which is what lets an
            // engine connect "sell my car in Nakuru" to this page rather than
            // inferring the location from prose.
            jsonLdPlaceService({
              url: pageUrl,
              name: pageTitle(location),
              description: pageDescription(location),
              placeName: location.town,
              region: location.county,
              keywords: [...location.keywords],
            }),
            faqSchema(faq),
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/${safeLang}` },
              {
                name: "Sell a car in Kenya",
                url: `${siteConfig.url}/${safeLang}/sell-car-kenya`,
              },
              { name: `Sell my car in ${location.town}`, url: pageUrl },
            ]),
          ),
        }}
      />
      <LegalNav lang={safeLang} />
      <BreadcrumbJsonLd
        lang={safeLang}
        trail={[
          { name: "Sell a Car in Kenya", path: "/sell-car-kenya" },
          { name: `Sell my car in ${location.town}`, path },
        ]}
      />

      <main>
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="px-5 pt-24 pb-14">
          <div className="mx-auto max-w-190">
            <p className="mb-4 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Sell your car in {location.county}
            </p>
            <h1 className="max-w-175 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold tracking-normal leading-[1.08] text-foreground">
              Sell my car in {location.town}
            </h1>
            <p className="mt-5 max-w-150 text-[1.05rem] leading-[1.75] text-muted">
              {location.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${safeLang}/upload`}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline"
              >
                List your car free
              </Link>
              <Link
                href={`/${safeLang}/search?q=cars`}
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

        {/* ── What this market is actually like ──────────────────────── */}
        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-190">
            <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              The {location.town} market
            </p>
            <h2 className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-bold tracking-normal leading-tight text-foreground">
              Who buys cars in {location.town}
            </h2>
            <p className="mt-5 max-w-165 text-[1rem] leading-[1.8] text-muted">
              {location.marketNotes}
            </p>

            <h3 className="mt-10 mb-4 font-display text-[1.15rem] font-bold text-foreground">
              What moves here
            </h3>
            <ul className="grid list-none gap-3 p-0">
              {location.popularModels.map((model) => (
                <li
                  key={model}
                  className="rounded-lg border border-border bg-elevated px-5 py-4 text-[0.95rem] leading-[1.65] text-muted"
                >
                  {model}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Live local comparables — the "what is it worth here" answer ── */}
        <section className="mx-auto max-w-190 px-5 py-16">
          <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
            Price your car
          </p>
          <h2 className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-bold tracking-normal leading-tight text-foreground">
            What sellers in {location.county} are asking right now
          </h2>
          <p className="mt-4 max-w-150 text-[0.95rem] leading-[1.7] text-muted">
            These are live asking prices from Shopi listings in {location.county}
            , not a valuation. Compare against the same make, year, grade and
            mileage as yours, then decide whether to price for speed or hold out
            for the top of the range.
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
                      <span className="text-[0.95rem] font-semibold text-foreground">
                        {listing.title ?? "View listing"}
                      </span>
                      {detail ? (
                        <span className="text-[0.85rem] text-muted">
                          {detail}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-7 rounded-lg border border-border bg-elevated p-5 text-[0.95rem] leading-[1.7] text-muted">
              No car listings in {location.county} to compare against at the
              moment. That is an opening rather than a problem — a well-presented
              car listed now has no local competition.{" "}
              <Link
                href={`/${safeLang}/search?q=cars`}
                className="text-primary underline"
              >
                Browse cars across Kenya
              </Link>{" "}
              to sense-check your price.
            </p>
          )}
        </section>

        {/* ── Where to meet ──────────────────────────────────────────── */}
        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-190">
            <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Viewings
            </p>
            <h2 className="mb-5 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
              Where to meet buyers in {location.town}
            </h2>
            <ul className="grid list-none gap-3 p-0">
              {location.viewingSpots.map((spot) => (
                <li
                  key={spot}
                  className="rounded-lg border border-border bg-elevated px-5 py-4 text-[0.95rem] leading-[1.65] text-muted"
                >
                  {spot}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-150 text-[0.9rem] leading-[1.7] text-muted">
              Whichever you choose, meet in daylight, bring someone with you, and
              ask to see the buyer&apos;s ID and driving licence before any test
              drive. Go along for the drive — never hand the keys to a stranger
              and wait. Do not release the car until payment has actually cleared
              in your account.
            </p>
          </div>
        </section>

        {/* ── Local selling tips ─────────────────────────────────────── */}
        <section className="mx-auto max-w-190 px-5 py-16">
          <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
            Local advice
          </p>
          <h2 className="mb-7 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            What works specifically in {location.town}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {location.localTips.map((tip) => (
              <div
                key={tip}
                className="rounded-lg border border-border bg-elevated p-5 text-[0.95rem] leading-[1.7] text-muted"
              >
                {tip}
              </div>
            ))}
          </div>
        </section>

        {/* ── Paperwork ──────────────────────────────────────────────── */}
        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-190">
            <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Paperwork
            </p>
            <h2 className="mb-5 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
              Transferring ownership from {location.county}
            </h2>
            <p className="mb-7 max-w-155 text-[0.95rem] leading-[1.75] text-muted">
              {location.ntsaNote}
            </p>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
              {[
                "Logbook in your name, with no outstanding financing",
                "Your national ID and KRA PIN certificate",
                "An active NTSA TIMS account",
                "A signed sale agreement, with both parties' details",
                "Copies of the buyer's ID and KRA PIN at transfer",
                "Valid inspection certificate, where the class requires one",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-border bg-elevated px-4 py-3 text-sm font-semibold text-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[0.85rem] leading-[1.7] text-muted">
              Requirements and fees change — confirm the current process on the{" "}
              <a
                href="https://www.ntsa.go.ke"
                rel="noopener noreferrer"
                target="_blank"
                className="text-primary underline"
              >
                NTSA
              </a>{" "}
              TIMS portal before you transfer. Shopi does not handle payment,
              transfer or escrow.
            </p>
          </div>
        </section>

        {/* ── Model guides — pushes equity into /sell/* ──────────────── */}
        <section className="mx-auto max-w-190 px-5 py-16">
          <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
            By model
          </p>
          <h2 className="mb-5 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Selling a specific model in {location.town}?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {sellCarPages.map((page) => (
              <Link
                key={page.slug}
                href={`/${safeLang}${sellCarPath(page.slug)}`}
                className="rounded-lg border border-border bg-elevated p-5 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
              >
                <h3 className="font-display text-[1.05rem] font-bold text-foreground">
                  Sell my {page.model}
                </h3>
                <p className="mt-2 text-[0.875rem] leading-[1.6] text-muted">
                  {page.intro}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────── */}
        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-170">
            <h2 className="mb-8 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
              Selling a car in {location.town} — questions
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

        {/* ── Other towns ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-190 px-5 py-16">
          <h2 className="mb-5 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Selling somewhere else?
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {relatedLocations.map((related) => (
              <Link
                key={related.slug}
                href={`/${safeLang}${sellCarLocationPath(related.slug)}`}
                className="rounded-lg border border-border bg-elevated p-5 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
              >
                <h3 className="font-display text-[1.05rem] font-bold text-foreground">
                  Sell my car in {related.town}
                </h3>
                <p className="mt-2 text-[0.875rem] leading-[1.6] text-muted">
                  {related.county} County
                </p>
              </Link>
            ))}
          </div>
          <p className="mt-7 text-[0.95rem] leading-[1.7] text-muted">
            Selling from another part of Kenya? The{" "}
            <Link
              href={`/${safeLang}/sell-car-kenya`}
              className="text-primary underline"
            >
              national guide to selling a car in Kenya
            </Link>{" "}
            covers pricing, paperwork and the broker question wherever you are.
          </p>
        </section>
      </main>
      <LandingFooter lang={safeLang} />
    </>
  );
}
