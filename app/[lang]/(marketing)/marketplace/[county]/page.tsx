import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalNav } from "@/components/legal/LegalNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale, locales } from "@/i18n/config";
import { COUNTIES, getCounty } from "@/lib/counties";
import { contentPath } from "@/lib/content-url";
import { publicPageMetadata } from "@/lib/metadata";
import { fetchRecentListings } from "@/features/discover/queries/recentListings";
import {
  countyPageSchema,
  listingItemListSchema,
  breadcrumbSchema,
  faqSchema,
  jsonLd,
} from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string; county: string }> };

// Counties gain and lose listings continuously, but the page's value is its
// copy and links, not live inventory — revalidate hourly rather than per hit.
export const revalidate = 3600;

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    COUNTIES.map((county) => ({ lang, county: county.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, county: slug } = await params;
  const county = getCounty(slug);
  if (!county) return {};

  return publicPageMetadata({
    lang,
    path: `/marketplace/${county.slug}`,
    title: `Buy & Sell in ${county.label} — Free Marketplace`,
    // Kept under 155 chars for every county, so engines show it untruncated.
    description: `Buy and sell in ${county.label}, Kenya. Browse local listings from ${county.towns.slice(0, 2).join(" to ")} and message sellers directly. Free to post, zero commission.`,
  });
}

export default async function CountyPage({ params }: Props) {
  const { lang, county: slug } = await params;
  if (!isValidLocale(lang)) notFound();

  const county = getCounty(slug);
  if (!county) notFound();

  const listings = await fetchRecentListings(24, county.name);
  const canonical = `${siteConfig.url}/${lang}/marketplace/${county.slug}`;
  const others = COUNTIES.filter((c) => c.slug !== county.slug);

  const faq = [
    {
      q: `Is it free to sell in ${county.label}?`,
      a: `Yes. Posting a listing on Shopi is free anywhere in Kenya, including ${county.label}, and Shopi takes no commission on what you sell. You keep the full price you agree with the buyer.`,
    },
    {
      q: `How do I meet buyers in ${county.label}?`,
      a: `Buyers near you see your listing in their feed and message you through Shopi's built-in chat. You agree on price, payment and where to meet or how to deliver — Shopi is not part of the transaction.`,
    },
    {
      q: `What sells well in ${county.label}?`,
      a: county.blurb,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            countyPageSchema({
              url: canonical,
              countyName: county.label,
              description: county.blurb,
              towns: county.towns,
            }),
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/${lang}` },
              {
                name: county.label,
                url: canonical,
              },
            ]),
            faqSchema(faq),
            // Only when the list actually renders below.
            ...(listings.length
              ? [
                  listingItemListSchema({
                    id: `${canonical}#listings`,
                    name: `Listings in ${county.label}`,
                    items: listings.map((l) => ({
                      name: l.title ?? "Listing",
                      url: `${siteConfig.url}${contentPath(lang, l)}`,
                    })),
                  }),
                ]
              : []),
          ),
        }}
      />

      <LegalNav lang={lang} />

      <main className="px-5 pt-20 pb-16">
        <div className="mx-auto max-w-190">
          <p className="mb-3 text-[0.8rem] font-bold uppercase tracking-widest text-primary">
            {county.label}, Kenya
          </p>
          <h1 className="mb-5 font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
            Buy and sell in {county.label}
          </h1>
          <p className="mb-4 max-w-[46rem] text-[1.05rem] leading-[1.7] text-muted">
            {county.blurb}
          </p>
          <p className="mb-10 max-w-[46rem] text-[1.05rem] leading-[1.7] text-muted">
            Shopi shows you what people near you are selling — in{" "}
            {county.towns.slice(0, -1).join(", ")} and {county.towns.at(-1)} —
            then puts you straight into a conversation with the seller. There is
            no checkout, no escrow and no commission: you agree the price,
            payment and handover between yourselves.
          </p>

          <div className="mb-12 flex flex-wrap gap-3">
            <Link
              href={`/${lang}/for-you`}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Browse listings
            </Link>
            <Link
              href={`/${lang}/upload`}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground"
            >
              Post something for sale
            </Link>
          </div>

          {listings.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-4 font-display text-[1.4rem] font-bold text-foreground">
                Latest listings in {county.label}
              </h2>
              <ul className="flex flex-col gap-2">
                {listings.map((listing) => {
                  const price = listing.price
                    ? listing.price.amount === 0
                      ? "Free"
                      : `${listing.price.currency} ${listing.price.amount.toLocaleString()}`
                    : null;
                  const place = listing.location?.placeName;
                  const detail = [price, place].filter(Boolean).join(" · ");
                  return (
                    <li key={listing.id} className="leading-relaxed">
                      <Link
                        href={contentPath(lang, listing)}
                        className="font-semibold text-primary underline"
                      >
                        {listing.title ?? "Listing"}
                      </Link>
                      {detail && (
                        <span className="text-muted"> — {detail}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="mb-12">
            <h2 className="mb-4 font-display text-[1.4rem] font-bold text-foreground">
              Common questions
            </h2>
            <div className="flex flex-col gap-6">
              {faq.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="mb-1.5 font-semibold text-foreground">{q}</h3>
                  <p className="text-[0.98rem] leading-[1.7] text-muted">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* County-to-county links: without these each county page is an
              orphan of its siblings and only reachable from the sitemap. */}
          <section className="mb-12">
            <h2 className="mb-4 font-display text-[1.4rem] font-bold text-foreground">
              Other counties on Shopi
            </h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {others.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/${lang}/marketplace/${c.slug}`}
                    className="text-primary underline"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <CategoryCrossLinks
          lang={lang}
          currentPath={`/marketplace/${county.slug}`}
        />
      </main>

      <LandingFooter dict={await getDictionary(lang)} lang={lang} />
    </>
  );
}
