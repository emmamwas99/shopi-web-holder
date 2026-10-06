import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalNav } from "@/components/legal/LegalNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale } from "@/i18n/config";
import { fullFaq } from "@/lib/faq";
import { publicPageMetadata } from "@/lib/metadata";
import {
  faqSchema,
  breadcrumbSchema,
  agentSchema,
  founderSchema,
  organizationSchema,
  marketplaceWebPageSchema,
  jsonLd,
} from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string }> };

const COPY = {
  en: {
    title: "Shopi FAQ — How Buying and Selling Works in Kenya",
    description:
      "Shopi FAQ: how to sell online in Kenya for free, what Shopi Agent does, how buyers and sellers chat, and why there is no checkout or commission.",
    heading: "Frequently asked questions",
    intro:
      "Everything about buying and selling on Shopi — fees, Shopi Agent, safety, messaging and coverage across Kenya. If something is not answered here, contact us.",
    stillStuck: "Still need help?",
    contact: "Contact Shopi",
    safety: "Safety Centre",
    guidelines: "Community Guidelines",
  },
  sw: {
    title: "Maswali Yanayoulizwa Mara kwa Mara — Shopi Kenya",
    description:
      "Maswali kuhusu Shopi: jinsi ya kuuza mtandaoni Kenya bure, Shopi Agent hufanya nini, wanunuzi na wauzaji huwasilianaje, na kwa nini hakuna commission.",
    heading: "Maswali yanayoulizwa mara kwa mara",
    intro:
      "Kila kitu kuhusu kununua na kuuza kwenye Shopi — ada, Shopi Agent, usalama, mawasiliano na maeneo tunayohudumia Kenya. Kama hujapata jibu hapa, wasiliana nasi.",
    stillStuck: "Bado unahitaji msaada?",
    contact: "Wasiliana na Shopi",
    safety: "Kituo cha Usalama",
    guidelines: "Miongozo ya Jamii",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const { title, description } = COPY[safeLang];
  return publicPageMetadata({
    lang: safeLang,
    path: "/faq",
    title,
    description,
  });
}

export default async function FaqPage({ params }: Props) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const copy = COPY[lang];
  const faq = fullFaq(lang);

  return (
    <>
      {/* The visible Q&A below is the same array this schema describes, so the
          two can never disagree. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            faqSchema(faq),
            agentSchema,
            // The FAQ below now visibly answers "who founded Shopi?" and
            // separates this company from the others sharing the name, so both
            // entity nodes belong here — this is the page most likely to be
            // retrieved for either question.
            organizationSchema,
            founderSchema,
            marketplaceWebPageSchema({
              url: `${siteConfig.url}/${lang}/faq`,
              name: copy.title,
              description: copy.description,
              keywords: [
                "Shopi FAQ",
                "sell online Kenya",
                "Shopi Agent",
                "buy and sell Kenya",
                "Kenya marketplace safety",
              ],
            }),
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/${lang}` },
              { name: "FAQ", url: `${siteConfig.url}/${lang}/faq` },
            ]),
          ),
        }}
      />

      <LegalNav lang={lang} />

      <main className="px-5 pt-20 pb-16">
        <div className="mx-auto max-w-170">
          <h1 className="mb-5 font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
            {copy.heading}
          </h1>
          <p className="mb-12 text-[1.05rem] leading-[1.7] text-muted">
            {copy.intro}
          </p>

          {/* Rendered open, not as <details>. Collapsed answers are still in
              the DOM for crawlers, but an expanded answer is what answer
              engines quote and what a visitor scanning the page reads. */}
          <div className="flex flex-col gap-8">
            {faq.map(({ q, a }) => (
              <section key={q}>
                <h2 className="mb-2 font-display text-[1.15rem] font-bold leading-snug text-foreground">
                  {q}
                </h2>
                <p className="text-[1rem] leading-[1.7] text-muted">{a}</p>
              </section>
            ))}
          </div>

          <section className="mt-16 rounded-2xl border border-border bg-elevated p-6">
            <h2 className="mb-3 font-display text-[1.15rem] font-bold text-foreground">
              {copy.stillStuck}
            </h2>
            <nav className="flex flex-wrap gap-4 text-sm font-semibold text-primary">
              <Link href={`/${lang}/contact`}>{copy.contact}</Link>
              <Link href={`/${lang}/safety-centre`}>{copy.safety}</Link>
              <Link href={`/${lang}/community-guidelines`}>
                {copy.guidelines}
              </Link>
            </nav>
          </section>

          <div className="mt-12">
            <CategoryCrossLinks lang={lang} currentPath="/faq" />
          </div>
        </div>
      </main>

      <LandingFooter dict={dict} lang={lang} />
    </>
  );
}
