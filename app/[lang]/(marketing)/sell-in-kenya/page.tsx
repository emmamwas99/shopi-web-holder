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

// Questions are phrased as the queries Search Console shows people actually
// typing ("where to sell used items", "where can i sell", "sell online"), not
// as marketing copy — an FAQPage entry only earns an answer-engine citation
// when it restates the question close to verbatim.
const faq = [
  {
    q: "Where can I sell items online in Kenya?",
    a: "You can sell items on Shopi by creating a free post with photos or video, a price, category and location. Buyers discover your item in the feed or search, then message you directly.",
  },
  {
    q: "How do I start selling online in Kenya?",
    a: "Create a free Shopi account, tap upload, add photos or a video of your item, then set a price, category and location. Your listing goes live immediately and buyers message you inside the app. You do not need a website, a shop, a business licence or any starting capital.",
  },
  {
    q: "Where can I sell used items in Kenya?",
    a: "Shopi is built for second-hand selling. Used phones, laptops, furniture, cars, clothes, shoes and home items are among the most traded categories. Post the item with honest photos and a clear price, and buyers near you will find it in the local feed.",
  },
  {
    q: "Can I sell online for free without paying commission?",
    a: "Yes. Shopi is free to browse and free to post, and takes no commission on sales. Shopi does not process payments, hold money or sit between the buyer and seller, so whatever the buyer pays you is yours in full.",
  },
  {
    q: "What can I sell on Shopi?",
    a: "You can sell everyday legal items such as cars, phones, electronics, furniture, fashion, farm produce, livestock and home items. Prohibited or unsafe items are not allowed.",
  },
  {
    q: "How do buyers contact me?",
    a: "Buyers message you inside Shopi. From there you answer questions, negotiate, agree on pickup or delivery, and decide payment directly with the buyer.",
  },
  // The questions people actually type when choosing where to list. Someone
  // comparing sites is further down the decision than someone asking how to
  // start, and the page had nothing for them.
  {
    q: "What is the best site to sell online in Kenya?",
    a: "It depends on what you are selling. Classifieds sites such as Jiji and PigiaMe reach people already searching a category, Facebook Marketplace and WhatsApp groups reach people you are loosely connected to, and Shopi puts your listing in a local discovery feed where buyers come across it without searching for it. The practical questions to compare are: what does it cost to list, does the platform take a cut of the sale, and do you speak to the buyer directly. On Shopi listing is free, there is no commission, and the conversation is between the two of you.",
  },
  {
    q: "Is there a free alternative to Jiji or PigiaMe in Kenya?",
    a: "Shopi is free to list on and takes no commission on sales. You can post the same item on more than one site — nothing stops you listing on Shopi alongside anywhere else, and many sellers do exactly that to widen their reach.",
  },
  {
    q: "How much does it cost to sell online in Kenya?",
    a: "On Shopi, nothing. Posting is free, there are no listing fees, and Shopi takes no percentage of what you sell. Costs to plan for are the ones outside the platform: transport or courier if the buyer is not local, and your time answering messages and meeting buyers.",
  },
  {
    q: "Do I need a business or a licence to sell online in Kenya?",
    a: "No. You can sell as an individual on Shopi with no registered business, no shop, no website and no starting capital. A phone with a camera and something to sell is enough.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/sell-in-kenya",
    // Leads with the exact head term rather than the long tail.
    //
    // The old title opened "How to Sell Online in Kenya Free", which reads as
    // an answer to "…for free" — and that is the query it ranked for, while
    // the shorter, much larger "sell online in Kenya" went elsewhere. A "How
    // to" prefix also narrows the page to instructional intent, when most of
    // that traffic is deciding WHERE to sell, not asking for a tutorial.
    title: "Sell Online in Kenya — Free Marketplace, No Commission",
    description:
      "Sell online in Kenya free on Shopi. List cars, phones, furniture, fashion or land in minutes and message buyers directly. No fees, no commission.",
  });
}

export default async function SellInKenyaPage({ params }: Props) {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";

  const pageUrl = `${siteConfig.url}/${safeLang}/sell-in-kenya`;
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${pageUrl}#howto`,
    name: "How to sell online in Kenya on Shopi",
    description:
      "Create a free Shopi listing, add price and location, then chat directly with buyers in Kenya.",
    step: [
      {
        "@type": "HowToStep",
        name: "Create a free account",
        text: "Sign in to Shopi and set up your seller profile.",
      },
      {
        "@type": "HowToStep",
        name: "Post your item",
        text: "Add photos or video, title, price, category, description and location.",
      },
      {
        "@type": "HowToStep",
        name: "Reply to buyers",
        text: "Buyers message you directly inside Shopi to ask questions and negotiate.",
      },
      {
        "@type": "HowToStep",
        name: "Agree on the deal",
        text: "You and the buyer agree on price, payment, pickup or delivery directly.",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(marketplaceSchema, howToSchema, faqSchema(faq)),
        }}
      />
      <LegalNav lang={safeLang} />
      <BreadcrumbJsonLd
        lang={safeLang}
        trail={[{ name: "Sell in Kenya", path: "/sell-in-kenya" }]}
      />

      <main>
        <section className="px-5 pt-24 pb-14">
          <div className="mx-auto max-w-190">
            <p className="mb-4 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Sell online in Kenya
            </p>
            {/* The H1 carries the exact target phrase ("sell online in Kenya")
                — the old one led with "A free site to sell…", which matched no
                query anyone actually types. */}
            <h1 className="max-w-170 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold tracking-normal leading-[1.08] text-foreground">
              Sell online in Kenya — free, and you keep the whole sale.
            </h1>
            <p className="mt-5 max-w-145 text-[1.05rem] leading-[1.75] text-muted">
              Wondering where to sell used items online in Kenya? Shopi is a
              free local marketplace where you post in minutes, buyers nearby
              discover what you are selling, and they message you directly. No
              commission, no checkout, no middleman.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${safeLang}/upload`}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline"
              >
                Start selling free
              </Link>
              <Link
                href={`/${safeLang}/for-you`}
                className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground no-underline"
              >
                Open For You
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-surface px-5 py-14">
          <div className="mx-auto grid max-w-190 gap-5 md:grid-cols-3">
            {[
              {
                title: "Free listings",
                body: "Post your item with real photos or video, price and location. Shopi does not charge sellers to publish.",
              },
              {
                title: "Local discovery",
                body: "Buyers nearby can find your post in the feed or search across Kenya, including Nairobi, Mombasa, Kisumu and other towns.",
              },
              {
                title: "Direct buyer chat",
                body: "Interested buyers message you inside Shopi, then you agree on price, payment and pickup or delivery between yourselves.",
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
                What to sell
              </p>
              <h2 className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-bold tracking-normal leading-tight text-foreground">
                Built for the things Kenyans already buy and sell every day.
              </h2>
            </div>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
              {[
                "Cars for sale in Kenya",
                "Used phones and electronics",
                "Furniture and home items",
                "Fashion, shoes and accessories",
                "Farm produce and livestock",
                "Local services and small-business stock",
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
              How to sell online in Kenya, step by step
            </h2>
            <ol className="grid gap-4 p-0 md:grid-cols-4">
              {[
                "Create your Shopi account.",
                "Upload photos or video of the item.",
                "Add price, category and location.",
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

        <GuideLinks
          lang={safeLang}
          heading="Seller guides"
          intro="Go deeper before you post: where each kind of used item sells best in Kenya, and every step of selling on Shopi from first listing to first sale."
          slugs={[
            "where-to-sell-used-items-in-kenya",
            "how-to-sell-on-shopi-complete-guide-for-kenyan-sellers",
            "how-nairobi-local-sellers-are-winning-online-with-short-videos",
          ]}
        />

        <section className="mx-auto max-w-170 px-5 py-16">
          <h2 className="mb-8 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Selling online in Kenya: common questions
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
        <CategoryCrossLinks lang={safeLang} currentPath="/sell-in-kenya" />
      </main>
      <LandingFooter lang={safeLang} />
    </>
  );
}
