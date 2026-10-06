import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { GuideLinks } from "@/components/seo/GuideLinks";
import { siteConfig } from "@/config/site";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import { faqSchema, jsonLd, marketplaceSchema } from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string }> };

const faq = [
  {
    q: "Where can I buy and sell online in Kenya?",
    a: "You can buy and sell online in Kenya on Shopi, a free local marketplace where sellers post photos or videos, buyers discover items in a feed or search, and both sides message directly inside Shopi.",
  },
  {
    q: "Is Shopi free for buying and selling in Kenya?",
    a: "Yes. Shopi is free to browse and free to post. Shopi does not charge listing fees, does not take commission, and does not process payments or hold money.",
  },
  {
    q: "What can I buy and sell on Shopi?",
    a: "People use Shopi for cars, phones, electronics, furniture, fashion, beauty products, farm produce, livestock, land, plots, rentals, services and other legal everyday items.",
  },
  {
    q: "How do buyers and sellers talk on Shopi?",
    a: "Every listing has built-in messaging. Buyers ask questions, negotiate and arrange inspection, pickup or delivery directly with the seller inside Shopi.",
  },
  {
    q: "Does Shopi work across Kenya?",
    a: "Yes. Shopi is built for Kenya and supports local discovery across all 47 counties, with nearby listings shown first where location is available.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/buy-and-sell-in-kenya",
    title: "Buy and Sell in Kenya — Free Local Marketplace",
    description:
      "Buy and sell in Kenya on Shopi. Find cars, phones, electronics, furniture, land, beauty products and more, or post items free with no commission.",
  });
}

export default async function BuyAndSellInKenyaPage({ params }: Props) {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const pageUrl = `${siteConfig.url}/${safeLang}/buy-and-sell-in-kenya`;

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#page`,
    url: pageUrl,
    name: "Buy and sell in Kenya on Shopi",
    description:
      "A guide to buying and selling locally in Kenya on Shopi, including categories, fees, chat, safety and current marketplace links.",
    inLanguage: safeLang === "sw" ? "sw-KE" : "en-KE",
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    about: { "@id": `${siteConfig.url}/#app` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(marketplaceSchema, collectionSchema, faqSchema(faq)),
        }}
      />
      <LegalNav lang={safeLang} />
      <BreadcrumbJsonLd
        lang={safeLang}
        trail={[
          { name: "Buy and sell in Kenya", path: "/buy-and-sell-in-kenya" },
        ]}
      />

      <main>
        <section className="px-5 pt-24 pb-14">
          <div className="mx-auto max-w-190">
            <p className="mb-4 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Buy and sell in Kenya
            </p>
            <h1 className="max-w-175 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1.08] tracking-normal text-foreground">
              Buy and sell locally in Kenya, without listing fees or commission.
            </h1>
            <p className="mt-5 max-w-150 text-[1.05rem] leading-[1.75] text-muted">
              Shopi is a Kenyan marketplace where people find real items nearby,
              post their own items for free, and chat directly with buyers and
              sellers. Browse the live feed, search by category, or let Shopi
              Agent help turn a photo into a complete listing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${safeLang}/for-you`}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline"
              >
                Browse live listings
              </Link>
              <Link
                href={`/${safeLang}/upload`}
                className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground no-underline"
              >
                Post an item free
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-surface px-5 py-14">
          <div className="mx-auto grid max-w-190 gap-5 md:grid-cols-3">
            {[
              {
                title: "Buy from local sellers",
                body: "Find cars, phones, furniture, fashion, beauty products, farm produce, property and more from sellers across Kenya.",
              },
              {
                title: "Sell without fees",
                body: "Create a listing with photos or video, price, category and location. Shopi charges no listing fee and no commission.",
              },
              {
                title: "Chat before the deal",
                body: "Ask questions, agree on price, arrange inspection, and decide pickup or delivery directly inside Shopi messaging.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-border bg-elevated p-6"
              >
                <h2 className="font-display text-[1.15rem] font-bold text-foreground">
                  {item.title}
                </h2>
                <p className="mt-3 text-[0.95rem] leading-[1.7] text-muted">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-190 px-5 py-16">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
                Marketplace categories
              </p>
              <h2 className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-bold leading-tight tracking-normal text-foreground">
                Things Kenyans can buy and sell on Shopi.
              </h2>
            </div>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
              {[
                "Cars, motorbikes and vehicle parts",
                "Phones, laptops, TVs and electronics",
                "Furniture, appliances and home items",
                "Fashion, shoes, beauty and cosmetics",
                "Land, plots, houses and rentals",
                "Farm produce, livestock and services",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-border bg-elevated px-4 py-3 text-sm font-semibold text-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-170">
            <h2 className="mb-7 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
              How buying and selling works
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                {
                  title: "Browse or search",
                  body: "Use the feed, Explore, Search, county pages or category pages to find current listings.",
                },
                {
                  title: "Open the listing",
                  body: "Check photos, price, location, seller details and description before starting a conversation.",
                },
                {
                  title: "Message directly",
                  body: "Ask questions, negotiate and agree the practical details with the other person.",
                },
                {
                  title: "Inspect and pay safely",
                  body: "Meet safely, inspect the item, and only pay once you are comfortable with the deal.",
                },
              ].map((step) => (
                <article
                  key={step.title}
                  className="rounded-lg border border-border bg-elevated p-5"
                >
                  <h3 className="font-display text-[1rem] font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-[1.65] text-muted">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <GuideLinks
          lang={safeLang}
          heading="Guides for buying and selling in Kenya"
          intro="Read more before you list, buy or compare marketplace options in Kenya."
          slugs={[
            "where-to-sell-used-items-in-kenya",
            "how-to-sell-on-shopi-complete-guide-for-kenyan-sellers",
            "how-nairobi-local-sellers-are-winning-online-with-short-videos",
          ]}
        />

        <section className="mx-auto max-w-170 px-5 py-16">
          <h2 className="mb-8 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Buy and sell in Kenya: common questions
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

        <CategoryCrossLinks
          lang={safeLang}
          currentPath="/buy-and-sell-in-kenya"
        />
      </main>
      <LandingFooter lang={safeLang} />
    </>
  );
}
