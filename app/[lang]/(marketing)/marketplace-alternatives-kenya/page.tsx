import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalNav } from "@/components/legal/LegalNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import {
  breadcrumbSchema,
  faqSchema,
  marketplaceSchema,
  jsonLd,
} from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string }> };

const TITLE = "Online Marketplaces in Kenya — How Shopi Compares";
const DESCRIPTION =
  "Comparing the ways Kenyans buy and sell online: Jiji, PigiaMe and other classifieds, Facebook Marketplace, WhatsApp groups and TikTok. How Shopi differs — a local discovery feed, AI listings, direct chat and zero commission.";
// DESCRIPTION is also the on-page intro; the meta version is trimmed to fit
// the ~155 characters a results page shows.
const META_DESCRIPTION =
  "Online marketplaces in Kenya compared: Jiji, PigiaMe, Facebook Marketplace, WhatsApp groups and TikTok — and how Shopi differs, with zero commission.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/marketplace-alternatives-kenya",
    title: TITLE,
    description: META_DESCRIPTION,
  });
}

/**
 * Deliberately describes categories of alternative (classifieds sites, social
 * platforms, messaging groups) rather than making claims about named
 * competitors' current fees or policies — those change without notice and
 * stating them wrongly is both a legal and a trust problem. Everything said
 * about Shopi here is verifiable on Shopi.
 */
const COMPARISONS = [
  {
    // Named, not just described. Someone searching "Jiji alternative" or
    // "sites like PigiaMe" is looking for the name they already know; a page
    // that only says "classifieds marketplaces" never meets that query.
    channel: "Classifieds sites (Jiji, PigiaMe)",
    how: "You search a category tree, filter, and contact sellers through the platform. Discovery is driven by what you already know to look for.",
    shopi:
      "Shopi leads with a feed instead of a search box. You come across things you weren't searching for, ranked by what's near you and what you've shown interest in — and you can still search when you know exactly what you want.",
  },
  {
    channel: "Facebook Marketplace and buy/sell groups",
    how: "Discovery is social and local, but listings sit inside a general-purpose social network alongside everything else, and structure varies wildly between posts.",
    shopi:
      "Shopi is only a marketplace, so every post carries a price, a location, a category and a way to message the seller. Nothing competes with the listing for attention.",
  },
  {
    channel: "WhatsApp and Telegram selling groups",
    how: "Fast and trusted within the group, but items scroll away, there is no search, and reach stops at the group's membership.",
    shopi:
      "A Shopi listing stays live, is searchable, and reaches buyers beyond anyone you already know — while the conversation still happens in chat, the way it does in a group.",
  },
  {
    channel: "TikTok and Instagram selling",
    how: "Excellent for reach and for showing an item in motion, but the platforms aren't built to carry a price, a location or a listing that a buyer can find again next week.",
    shopi:
      "Shopi keeps the video-first format and adds the marketplace layer underneath it — price, location, seller profile and direct messaging. You can also share a Shopi post straight to TikTok.",
  },
];

const DIFFERENCES = [
  {
    title: "No commission, ever",
    body: "Shopi does not take a percentage of your sale. It has no checkout and never holds your money, so there is nothing to deduct — you agree a price with the buyer and that is what you receive.",
  },
  {
    title: "The deal stays between two people",
    body: "No cart, no escrow, no Shopi agent in the middle. Buyer and seller settle price, payment method and pickup or delivery directly.",
  },
  {
    title: "AI does the typing",
    body: "Shopi Agent turns a photo into a full listing and finds products from a plain-language description, so posting doesn't mean filling a long form.",
  },
  {
    title: "Local first, across all 47 counties",
    body: "Nearby listings surface first, from your neighbourhood outward, so what you see is something you can realistically go and collect.",
  },
];

const FAQ = [
  {
    q: "What is the best free marketplace in Kenya?",
    a: "It depends on what you are selling and how you want to reach buyers. Shopi is free to browse and free to post, takes no commission and no listing fees, and combines a local discovery feed with direct buyer-to-seller chat and AI-assisted listings.",
  },
  {
    q: "Is there a Kenyan marketplace with no commission?",
    a: "Yes. Shopi charges no commission and no listing fees. Because Shopi does not process payments or hold money, the full amount you agree with the buyer goes to you.",
  },
  {
    q: "How is Shopi different from other online marketplaces in Kenya?",
    a: "Three things: discovery happens in a personalized local feed rather than only through search, Shopi Agent creates listings from a photo and finds products from a description, and there is no checkout or commission — buyers and sellers deal directly.",
  },
  {
    q: "Do I need a business to sell on Shopi?",
    a: "No. You do not need a registered business, a website, a bank account or a verified phone number. A phone camera and something to sell is enough.",
  },
  {
    q: "Can I use Shopi alongside other selling channels?",
    a: "Yes, and many sellers do. A Shopi post can be shared straight to TikTok, and nothing stops you listing the same item in a WhatsApp group or on another platform at the same time.",
  },
];

export default async function AlternativesPage({ params }: Props) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const canonical = `${siteConfig.url}/${lang}/marketplace-alternatives-kenya`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            marketplaceSchema,
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/${lang}` },
              { name: "Marketplace alternatives", url: canonical },
            ]),
            faqSchema(FAQ),
          ),
        }}
      />

      <LegalNav lang={lang} />

      <main className="px-5 pt-20 pb-16">
        <div className="mx-auto max-w-190">
          <h1 className="mb-5 font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
            How Kenyans buy and sell online — and where Shopi fits
          </h1>
          <p className="mb-12 max-w-184 text-[1.1rem] leading-[1.7] text-muted">
            {DESCRIPTION}
          </p>

          <section className="mb-14">
            <h2 className="mb-6 font-display text-[1.5rem] font-bold text-foreground">
              The main ways people sell today
            </h2>
            <div className="flex flex-col gap-8">
              {COMPARISONS.map((c) => (
                <div key={c.channel}>
                  <h3 className="mb-2 font-semibold text-foreground">
                    {c.channel}
                  </h3>
                  <p className="mb-2 text-[0.98rem] leading-[1.7] text-muted">
                    <span className="font-semibold text-foreground">
                      How it works:{" "}
                    </span>
                    {c.how}
                  </p>
                  <p className="text-[0.98rem] leading-[1.7] text-muted">
                    <span className="font-semibold text-foreground">
                      On Shopi:{" "}
                    </span>
                    {c.shopi}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Hub → spoke: the per-competitor pages own "jiji alternative" and
              "pigiame alternative"; this hub owns the broader comparison. */}
          <section className="mb-14 rounded-2xl border border-border bg-elevated p-6">
            <h2 className="mb-2 font-display text-[1.25rem] font-bold text-foreground">
              Looking for a Jiji or PigiaMe alternative?
            </h2>
            <p className="mb-4 text-[0.98rem] leading-[1.7] text-muted">
              Side-by-side guides for the two classifieds sites Kenyan sellers ask about most:
              what each offers, what&apos;s different on Shopi, and when the other site may suit
              you better.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${lang}/jiji-alternative-kenya`}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground no-underline"
              >
                Jiji alternative in Kenya
              </Link>
              <Link
                href={`/${lang}/pigiame-alternative-kenya`}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground no-underline"
              >
                PigiaMe alternative in Kenya
              </Link>
            </div>
          </section>

          <section className="mb-14">
            <h2 className="mb-6 font-display text-[1.5rem] font-bold text-foreground">
              What Shopi does differently
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {DIFFERENCES.map((d) => (
                <div key={d.title}>
                  <h3 className="mb-1.5 font-semibold text-foreground">
                    {d.title}
                  </h3>
                  <p className="text-[0.98rem] leading-[1.7] text-muted">
                    {d.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-5 font-display text-[1.5rem] font-bold text-foreground">
              Common questions
            </h2>
            <div className="flex flex-col gap-6">
              {FAQ.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="mb-1.5 font-semibold text-foreground">{q}</h3>
                  <p className="text-[0.98rem] leading-[1.7] text-muted">{a}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${lang}/for-you`}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Try For You
            </Link>
            <Link
              href={`/${lang}/sell-in-kenya`}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground"
            >
              Start selling free
            </Link>
          </div>
        </div>

        <CategoryCrossLinks
          lang={lang}
          currentPath="/marketplace-alternatives-kenya"
        />
      </main>

      <LandingFooter dict={dict} lang={lang} />
    </>
  );
}
