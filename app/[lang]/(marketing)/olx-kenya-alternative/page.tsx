import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import { fetchRecentListingsAcross } from "@/features/discover/queries/recentListings";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale } from "@/i18n/config";
import { contentPath } from "@/lib/content-url";
import { listingPriceText } from "@/lib/format";
import { listingPlace } from "@/lib/listingPlace";
import { canonicalUrl, publicPageMetadata } from "@/lib/metadata";
import { OLX_KENYA } from "@/lib/seo/marketplace-platforms";
import { whereToSellPath } from "@/lib/seo/where-to-sell";
import { breadcrumbSchema, faqSchema, jsonLd, marketplaceSchema } from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string }> };

export const revalidate = 86400;

const PATH = "/olx-kenya-alternative";

/**
 * People still search "olx kenya app", "olx kenya phones", "olx kenya cars
 * for sale", "olx kenya furniture" and "olx kenya jobs" (Google autocomplete,
 * gl=ke, 4 Nov 2026), years after OLX left. The honest answer is what
 * happened, where each of those searches goes now, and live listings for the
 * people who came to buy. Facts and sources: OLX_KENYA in
 * lib/seo/marketplace-platforms.ts. Names are used descriptively; Shopi is
 * not affiliated with OLX or Jiji.
 */
const TITLE = "OLX Kenya: What Happened and Where to Buy & Sell Now";
const DESCRIPTION =
  "OLX Kenya closed, and its business went to Jiji in 2019. Where Kenyans buy and sell phones, cars, furniture and more now, including free options.";

const NOW = [
  {
    title: "Phones and electronics",
    body: "Jiji, Facebook Marketplace and Shopi all carry used phones, laptops and TVs. Shopi is free to post on, with no commission.",
    links: [
      { label: "Phones for sale", path: "/for-sale/phones" },
      { label: "Where to sell your phone", path: whereToSellPath("phones") },
    ],
  },
  {
    title: "Cars",
    body: "Jiji and PigiaMe have large car sections. On Shopi, owners list free and deal with buyers directly, with no broker.",
    links: [
      { label: "Cars for sale", path: "/for-sale/cars" },
      { label: "Sell a car in Kenya", path: "/sell-car-kenya" },
    ],
  },
  {
    title: "Furniture and household items",
    body: "These sell best locally: Facebook Marketplace, estate WhatsApp groups and Shopi, where buyers near you see your listing first.",
    links: [
      { label: "Furniture for sale", path: "/for-sale/furniture" },
      { label: "Where to sell used furniture", path: whereToSellPath("furniture") },
    ],
  },
  {
    title: "Property",
    body: "PigiaMe and Jiji have property sections, and specialist property sites list rentals and land. Shopi lists land, houses and rentals too.",
    links: [{ label: "Property for sale in Kenya", path: "/property-for-sale-kenya" }],
  },
  {
    title: "Jobs",
    body: "OLX's jobs section has no single replacement. Jiji and PigiaMe both have jobs and CV sections.",
    links: [],
  },
];

const FAQ = [
  {
    q: "Is OLX still in Kenya?",
    a: "No. OLX closed its Kenya office in 2018, and in 2019 its owner Naspers agreed to sell the Kenyan classifieds business to Jiji. Today olx.co.ke redirects to OLX's global website.",
  },
  {
    q: "What replaced OLX in Kenya?",
    a: "OLX's Kenyan users were moved to Jiji in 2019. Other places Kenyans now buy and sell second-hand include PigiaMe, Facebook Marketplace and Shopi.",
  },
  {
    q: "Is there an OLX Kenya app?",
    a: "No. There's no OLX marketplace app for Kenya any more, so be wary of anything offered as an \"OLX Kenya APK\". Apps that do the same job include Jiji, PigiaMe and Facebook; Shopi runs in your phone's browser with nothing to install.",
  },
  {
    q: "Where can I buy second-hand phones now that OLX is gone?",
    a: "On Jiji, Facebook Marketplace and Shopi. Check the phone in person, confirm it's signed out of the previous owner's Google or Apple account, and pay only once you're happy.",
  },
  {
    q: "Is Shopi like OLX?",
    a: "Shopi is a free Kenyan marketplace like OLX was, but built around a local feed of photo and video posts. Posting is free, there's no commission, and buyers message sellers directly. Shopi isn't connected to OLX or Jiji.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    ...publicPageMetadata({ lang, path: PATH, title: TITLE, description: DESCRIPTION }),
    keywords: [
      "OLX Kenya",
      "OLX Kenya app",
      "OLX Kenya phones",
      "OLX Kenya cars for sale",
      "OLX Kenya furniture",
      "what happened to OLX Kenya",
      "OLX alternative Kenya",
      "sites like OLX Kenya",
    ],
  };
}

const H2 =
  "mb-4 font-display text-[1.35rem] font-bold leading-tight text-foreground md:text-[1.6rem]";
const BODY = "text-[0.95rem] leading-[1.7] text-muted md:text-[0.98rem]";

export default async function OlxKenyaPage({ params }: Props) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const canonical = canonicalUrl(lang, PATH);
  const [dict, listings] = await Promise.all([
    getDictionary(lang),
    fetchRecentListingsAcross(["Phones", "Cars", "Furniture", "Laptops", "Televisions"], 8),
  ]);
  const checked = new Date(OLX_KENYA.checkedOn).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "en-KE",
    dateModified: OLX_KENYA.checkedOn,
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    // Distinct entities, so engines don't read OLX or Jiji as Shopi.
    mentions: [
      { "@type": "Organization", name: "OLX", url: "https://www.olx.com" },
      { "@type": "Organization", name: "Jiji", url: "https://jiji.co.ke" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            webPageSchema,
            marketplaceSchema,
            breadcrumbSchema([
              { name: "Home", url: canonicalUrl(lang, "") },
              {
                name: "Best online selling sites in Kenya",
                url: canonicalUrl(lang, "/marketplace-alternatives-kenya"),
              },
              { name: "OLX Kenya", url: canonical },
            ]),
            faqSchema(FAQ),
          ),
        }}
      />

      <LegalNav lang={lang} />

      <main className="px-4 pt-20 pb-16 md:px-5">
        <div className="mx-auto max-w-190">
          <p className="mb-3 text-[0.78rem] font-bold tracking-widest text-primary uppercase">
            OLX Kenya
          </p>
          <h1 className="mb-4 font-display text-[clamp(1.85rem,5vw,3rem)] leading-[1.1] font-bold tracking-[-0.03em] text-foreground">
            OLX Kenya closed. Here&apos;s where to buy and sell now
          </h1>
          <p className="mb-7 text-[1rem] leading-[1.7] text-muted md:text-[1.1rem]">
            OLX no longer runs a marketplace in Kenya. It closed its Kenya office in 2018, its
            owner Naspers sold the Kenyan classifieds business to Jiji in 2019, and olx.co.ke now
            redirects to OLX&apos;s global site. For the things people used OLX for (phones, cars,
            furniture and electronics), Kenyans now use Jiji, PigiaMe, Facebook Marketplace and
            Shopi.
          </p>
          <div className="mb-12 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${lang}/explore`}
              className="rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-white no-underline"
            >
              Browse listings near you
            </Link>
            <Link
              href={`/${lang}/upload`}
              className="rounded-full border border-border px-6 py-3 text-center text-sm font-semibold text-foreground no-underline"
            >
              Post an item free
            </Link>
          </div>

          <section id="what-happened" className="mb-12 scroll-mt-24 rounded-2xl border border-border bg-elevated p-5 sm:p-6">
            <h2 className="mb-3 font-display text-[1.25rem] font-bold text-foreground">
              What happened to OLX Kenya
            </h2>
            <ul className={`flex flex-col gap-2.5 pl-5 ${BODY} [&>li]:list-disc`}>
              {OLX_KENYA.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-normal text-muted">
              Checked <time dateTime={OLX_KENYA.checkedOn}>{checked}</time>:{" "}
              {OLX_KENYA.sources.map((source, i) => (
                <span key={source.url}>
                  {i > 0 && " · "}
                  <a href={source.url} target="_blank" rel="nofollow noopener noreferrer" className="underline">
                    {source.label}
                  </a>
                </span>
              ))}
              . Shopi is not affiliated with OLX or Jiji.
            </p>
          </section>

          <section id="where-now" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Where OLX&apos;s buyers and sellers go now</h2>
            <div className="flex flex-col gap-3">
              {NOW.map((category) => (
                <div key={category.title} className="rounded-2xl border border-border bg-elevated p-4 sm:p-5">
                  <h3 className="mb-1.5 font-semibold text-foreground">{category.title}</h3>
                  <p className="text-[0.92rem] leading-[1.65] text-muted">{category.body}</p>
                  {category.links.length > 0 ? (
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.92rem]">
                      {category.links.map((link) => (
                        <Link key={link.path} href={`/${lang}${link.path}`} className="text-primary underline">
                          {link.label}
                        </Link>
                      ))}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section id="olx-app" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Is there still an OLX Kenya app?</h2>
            <p className={BODY}>
              No. Any &quot;OLX Kenya APK&quot; you find online isn&apos;t an official app, and
              installing apps from outside the Play Store is a common way to get malware. The apps
              Kenyans use instead include Jiji, PigiaMe and Facebook. Shopi works in your
              phone&apos;s browser at shopi.co.ke, so there&apos;s nothing to install.
            </p>
          </section>

          <section id="latest" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Latest phones, cars and furniture on Shopi</h2>
            {listings.length > 0 ? (
              <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
                {listings.map((listing) => {
                  const detail = [listingPriceText(listing.price), listingPlace(listing.location)]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={listing.id}>
                      <Link
                        href={contentPath(lang, listing)}
                        className="flex flex-col gap-1.5 rounded-lg border border-border bg-elevated p-4 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
                      >
                        <span className="text-sm font-bold text-foreground">{listing.title ?? "Listing"}</span>
                        {detail ? <span className="text-[0.8rem] text-muted">{detail}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={BODY}>
                <Link href={`/${lang}/explore`} className="text-primary underline">
                  Browse everything for sale on Shopi
                </Link>
              </p>
            )}
          </section>

          <section id="faq" className="mb-12 scroll-mt-24">
            <h2 className={H2}>OLX Kenya: common questions</h2>
            <div className="flex flex-col gap-6">
              {FAQ.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="mb-1.5 font-semibold text-foreground">{q}</h3>
                  <p className={BODY}>{a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="mb-3 font-display text-[1.15rem] font-bold text-foreground">
              Keep comparing
            </h2>
            <ul className="flex flex-col gap-2 text-[0.98rem]">
              <li>
                <Link href={`/${lang}/marketplace-alternatives-kenya`} className="text-primary underline">
                  Best online selling sites in Kenya, compared
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/jiji-alternative-kenya`} className="text-primary underline">
                  Apps and sites like Jiji in Kenya
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/pigiame-alternative-kenya`} className="text-primary underline">
                  PigiaMe alternative in Kenya
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/sell-in-kenya`} className="text-primary underline">
                  How to sell online in Kenya for free
                </Link>
              </li>
            </ul>
          </section>
        </div>

        <CategoryCrossLinks lang={lang} currentPath={PATH} />
      </main>

      <LandingFooter dict={dict} lang={lang} />
    </>
  );
}
