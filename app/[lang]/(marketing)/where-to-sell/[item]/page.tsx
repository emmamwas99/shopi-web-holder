import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import { fetchRecentListingsAcross } from "@/features/discover/queries/recentListings";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale, locales } from "@/i18n/config";
import { contentPath } from "@/lib/content-url";
import { listingPriceText } from "@/lib/format";
import { listingPlace } from "@/lib/listingPlace";
import { canonicalUrl, publicPageMetadata } from "@/lib/metadata";
import {
  getWhereToSellPage,
  isRelevantLiveListing,
  whereToSellPages,
  whereToSellPath,
  type WhereSection,
} from "@/lib/seo/where-to-sell";
import { breadcrumbSchema, faqSchema, jsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string; item: string }> };

// Daily, like the other seller pages: the copy is static and the live
// listings only need to be roughly current.
export const revalidate = 86400;

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    whereToSellPages.map((page) => ({ lang, item: page.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, item } = await params;
  const page = getWhereToSellPage(item);
  if (!page) return {};
  return {
    ...publicPageMetadata({
      lang,
      path: whereToSellPath(page.slug),
      title: page.title,
      description: page.description,
    }),
    keywords: page.keywords,
  };
}

const H2 =
  "mb-4 font-display text-[1.35rem] font-bold leading-tight text-foreground md:text-[1.6rem]";
const BODY = "text-[0.95rem] leading-[1.7] text-muted md:text-[0.98rem]";

function Section({ section }: { section: WhereSection }) {
  return (
    <section id={section.id} className="mb-12 scroll-mt-24">
      <h2 className={H2}>{section.heading}</h2>
      {section.intro ? <p className={`mb-5 ${BODY}`}>{section.intro}</p> : null}

      {section.kind === "steps" ? (
        <ol className="flex flex-col gap-5">
          {section.items.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="mb-1 font-semibold text-foreground">{step.title}</h3>
                <p className={BODY}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {section.kind === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {section.cards.map((card) => (
            <div key={card.title} className="rounded-lg border border-border bg-elevated p-4 sm:p-5">
              <h3 className="mb-1.5 font-semibold text-foreground">{card.title}</h3>
              <p className="text-[0.92rem] leading-[1.65] text-muted">{card.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      {section.kind === "list" ? (
        <>
          <ul className={`flex flex-col gap-2.5 pl-5 ${BODY} [&>li]:list-disc`}>
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {section.closing ? (
            <p className="mt-4 text-[0.98rem] font-medium leading-[1.7] text-foreground">
              {section.closing}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default async function WhereToSellPage({ params }: Props) {
  const { lang, item } = await params;
  if (!isValidLocale(lang)) notFound();
  const page = getWhereToSellPage(item);
  if (!page) notFound();

  const path = whereToSellPath(page.slug);
  const canonical = canonicalUrl(lang, path);
  const [dict, fetched] = await Promise.all([
    getDictionary(lang),
    // Fetch extra: the relevance filter drops misfiled and test listings.
    fetchRecentListingsAcross(page.live.subcategories, 30),
  ]);
  const listings = fetched
    .filter((listing) => isRelevantLiveListing(page.live, listing))
    .slice(0, 8);
  const others = whereToSellPages.filter((other) => other.slug !== page.slug);

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: page.title,
    description: page.description,
    inLanguage: "en-KE",
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            webPageSchema,
            breadcrumbSchema([
              { name: "Home", url: canonicalUrl(lang, "") },
              { name: "Sell online in Kenya", url: canonicalUrl(lang, "/sell-in-kenya") },
              { name: page.h1, url: canonical },
            ]),
            faqSchema(page.faq),
          ),
        }}
      />

      <LegalNav lang={lang} />

      <main className="px-4 pt-20 pb-16 md:px-5">
        <div className="mx-auto max-w-190">
          <p className="mb-3 text-[0.78rem] font-bold tracking-widest text-primary uppercase">
            {page.eyebrow}
          </p>
          <h1 className="mb-4 font-display text-[clamp(1.85rem,5vw,3rem)] leading-[1.1] font-bold tracking-[-0.03em] text-foreground">
            {page.h1}
          </h1>
          <p className="mb-7 text-[1rem] leading-[1.7] text-muted md:text-[1.1rem]">
            {page.intro}
          </p>
          <div className="mb-12 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${lang}/upload`}
              className="rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-white no-underline"
            >
              Post it on Shopi, free
            </Link>
            <a
              href="#live"
              className="rounded-full border border-border px-6 py-3 text-center text-sm font-semibold text-foreground no-underline"
            >
              See what sellers are asking
            </a>
          </div>

          {/* ── The options, compared ─────────────────────────────── */}
          <section id="options" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Your options, compared</h2>
            <div className="flex flex-col gap-3">
              {page.options.map((option) => (
                <div key={option.channel} className="rounded-2xl border border-border bg-elevated p-4 sm:p-5">
                  <h3 className="mb-2 font-semibold text-foreground">{option.channel}</h3>
                  <dl className="grid gap-x-5 gap-y-1.5 text-[0.9rem] sm:grid-cols-3">
                    {[
                      ["You get", option.youGet],
                      ["How fast", option.speed],
                      ["Best when", option.bestWhen],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs font-semibold tracking-wide text-primary uppercase">
                          {label}
                        </dt>
                        <dd className="leading-[1.55] text-muted">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>

          {page.sections.map((section) => (
            <Section key={section.id} section={section} />
          ))}

          {/* ── Live asking prices: the honest "what is it worth" ───── */}
          <section id="live" className="mb-12 scroll-mt-24">
            <h2 className={H2}>{page.live.heading}</h2>
            <p className={`mb-5 ${BODY}`}>{page.live.intro}</p>
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
                        <span className="text-sm font-bold text-foreground">
                          {listing.title ?? page.live.noun}
                        </span>
                        {detail ? <span className="text-[0.8rem] text-muted">{detail}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-lg border border-border bg-elevated p-5">
                <p className={BODY}>
                  Nothing like this is listed on Shopi at the moment, so yours would be the one
                  buyers nearby find.{" "}
                  <Link href={`/${lang}/upload`} className="text-primary underline">
                    Post it free
                  </Link>
                  .
                </p>
              </div>
            )}
          </section>

          {/* ── Selling on Shopi ────────────────────────────────────── */}
          <section className="mb-12 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
            <h2 className="mb-2 font-display text-[1.2rem] font-bold text-foreground">
              Sell it on Shopi in a few minutes
            </h2>
            <p className={`mb-5 ${BODY}`}>
              Take a photo or a short video and Shopi Agent drafts the title, description and
              specifications for you to check. Set your price and location, publish, and buyers
              near you message you directly. Posting is free, there&apos;s no commission, and
              Shopi never handles the money, so the full price is yours.
            </p>
            <Link
              href={`/${lang}/upload`}
              className="inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white no-underline"
            >
              Start selling free
            </Link>
          </section>

          {/* ── FAQ ─────────────────────────────────────────────────── */}
          <section id="faq" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Common questions</h2>
            <div className="flex flex-col gap-6">
              {page.faq.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="mb-1.5 font-semibold text-foreground">{q}</h3>
                  <p className={BODY}>{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Where next ──────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="mb-3 font-display text-[1.15rem] font-bold text-foreground">
              Keep going
            </h2>
            <ul className="flex flex-col gap-2 text-[0.98rem]">
              {page.related.map((link) => (
                <li key={link.path}>
                  <Link href={`/${lang}${link.path}`} className="text-primary underline">
                    {link.label}
                  </Link>
                </li>
              ))}
              {others.map((other) => (
                <li key={other.slug}>
                  <Link href={`/${lang}${whereToSellPath(other.slug)}`} className="text-primary underline">
                    {other.h1}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={`/${lang}/marketplace-alternatives-kenya`} className="text-primary underline">
                  Best online selling sites in Kenya, compared
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/blog/where-to-sell-used-items-in-kenya`} className="text-primary underline">
                  Where to sell used items in Kenya: a practical guide
                </Link>
              </li>
            </ul>
          </section>
        </div>

        <CategoryCrossLinks lang={lang} currentPath={path} />
      </main>

      <LandingFooter dict={dict} lang={lang} />
    </>
  );
}
