import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import {
  faqSchema,
  jsonLd,
  marketplaceSchema,
  marketplaceWebPageSchema,
} from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string }> };

const faq = [
  {
    q: "Can I buy beauty and cosmetics products on Shopi?",
    a: "Yes. Buyers can discover beauty products, skincare, hair products, makeup, perfumes and cosmetics from sellers in Kenya, then message sellers directly.",
  },
  {
    q: "Can I sell cosmetics on Shopi in Kenya?",
    a: "Yes. Beauty sellers can post products with photos or video, prices, location, brand details and delivery or pickup options. Posting on Shopi is free.",
  },
  {
    q: "What should beauty sellers include in a listing?",
    a: "Include clear photos, shade or scent, size, brand, expiry date where relevant, price in Kenyan Shillings, location and whether delivery is available.",
  },
  {
    q: "Does Shopi process payments for cosmetics orders?",
    a: "No. Shopi does not process payments or take commission. Buyers and sellers agree on price, payment and delivery directly.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/beauty-cosmetics-kenya",
    title: "Beauty and Cosmetics Marketplace in Kenya",
    description:
      "Buy and sell beauty products, skincare, hair products, makeup, perfumes and cosmetics in Kenya on Shopi. Post free and chat directly.",
  });
}

export default async function BeautyCosmeticsKenyaPage({ params }: Props) {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const pageUrl = `${siteConfig.url}/${safeLang}/beauty-cosmetics-kenya`;
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${pageUrl}#howto`,
    name: "How to sell beauty and cosmetics products in Kenya on Shopi",
    description:
      "Create a free Shopi post for beauty products with photos, price, brand details and location.",
    step: [
      {
        "@type": "HowToStep",
        name: "Prepare product details",
        text: "Collect brand, shade, scent, size, expiry date where relevant, price and location.",
      },
      {
        "@type": "HowToStep",
        name: "Create a beauty listing",
        text: "Upload clear photos or video and describe the cosmetics, skincare, perfume or hair product.",
      },
      {
        "@type": "HowToStep",
        name: "Chat with buyers",
        text: "Answer buyer questions about availability, delivery, pickup and product details.",
      },
      {
        "@type": "HowToStep",
        name: "Agree directly",
        text: "Buyer and seller agree on payment and delivery directly. Shopi does not take commission.",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            marketplaceSchema,
            marketplaceWebPageSchema({
              url: pageUrl,
              name: "Beauty and Cosmetics Marketplace in Kenya",
              description:
                "Buy and sell beauty products, skincare, hair products, makeup, perfumes and cosmetics in Kenya on Shopi.",
              keywords: [
                "beauty products Kenya",
                "cosmetics Kenya",
                "skincare products Kenya",
                "body lotion Kenya",
                "hair products Kenya",
                "perfumes Kenya",
              ],
            }),
            howToSchema,
            faqSchema(faq),
          ),
        }}
      />
      <LegalNav lang={safeLang} />
      <BreadcrumbJsonLd
        lang={safeLang}
        trail={[
          { name: "Beauty and Cosmetics", path: "/beauty-cosmetics-kenya" },
        ]}
      />

      <main>
        <section className="px-5 pt-24 pb-14">
          <div className="mx-auto max-w-190">
            <p className="mb-4 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Beauty and cosmetics in Kenya
            </p>
            <h1 className="max-w-175 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold tracking-normal leading-[1.08] text-foreground">
              Buy and sell skincare, makeup, perfumes and hair products in
              Kenya.
            </h1>
            <p className="mt-5 max-w-150 text-[1.05rem] leading-[1.75] text-muted">
              Shopi helps beauty sellers reach local buyers with real product
              posts. Discover cosmetics, skincare, hair care, makeup, perfumes
              and beauty accessories, then message the seller directly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${safeLang}/search?q=beauty%20cosmetics`}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline"
              >
                Search beauty products
              </Link>
              <Link
                href={`/${safeLang}/upload`}
                className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground no-underline"
              >
                Sell cosmetics
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-surface px-5 py-14">
          <div className="mx-auto grid max-w-190 gap-5 md:grid-cols-3">
            {[
              {
                title: "Skincare and body care",
                body: "List cleansers, serums, lotions, sunscreen, oils and body care with price, size and product condition.",
              },
              {
                title: "Makeup and cosmetics",
                body: "Post foundation, lip products, lashes, powders, palettes and accessories with shades and clear photos.",
              },
              {
                title: "Hair and fragrance",
                body: "Sell wigs, braids, hair products, perfumes, mists and grooming items to buyers who can chat directly.",
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
                Popular searches
              </p>
              <h2 className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-bold tracking-normal leading-tight text-foreground">
                A local feed for beauty buyers and sellers.
              </h2>
            </div>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
              {[
                "Beauty products in Kenya",
                "Cosmetics in Nairobi",
                "Skincare products Kenya",
                "Makeup for sale in Kenya",
                "Hair products and wigs",
                "Perfumes and body mists",
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
              How beauty sellers can post on Shopi
            </h2>
            <ol className="grid gap-4 p-0 md:grid-cols-4">
              {[
                "Take clear photos or video in natural light.",
                "Add brand, shade, scent, size and price.",
                "Mention location, delivery or pickup options.",
                "Reply to buyers and agree directly.",
              ].map((step, index) => (
                <li
                  key={step}
                  className="list-none rounded-lg border border-border bg-elevated p-5"
                >
                  <span className="text-xs font-bold uppercase text-primary">
                    Step {index + 1}
                  </span>
                  <p className="mt-3 text-sm leading-[1.65] text-muted">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-170 px-5 py-16">
          <h2 className="mb-8 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Questions about beauty and cosmetics
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
          currentPath="/beauty-cosmetics-kenya"
        />
      </main>
      <LandingFooter lang={safeLang} />
    </>
  );
}
