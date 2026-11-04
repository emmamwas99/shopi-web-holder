import Link from "next/link";
import { LegalNav } from "@/components/legal/LegalNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import type { Dictionary } from "@/i18n/getDictionary";
import { canonicalUrl } from "@/lib/metadata";
import {
  breadcrumbSchema,
  faqSchema,
  jsonLd,
  marketplaceSchema,
} from "@/lib/structured-data";
import {
  competitorAlternatives,
  type CompetitorAlternative,
} from "@/lib/seo/competitor-alternatives";

/**
 * One "{Competitor} alternative" page. Content and the rules for what may be
 * said about a competitor live in lib/seo/competitor-alternatives.ts.
 *
 * Layout is answer-first for AEO: the intro answers "what's an alternative to
 * X" in one paragraph an engine can quote, then the page backs it up with a
 * sourced summary of the competitor, Shopi's differences, an honest "when X
 * suits you better", switching steps and a visible FAQ mirrored in FAQPage.
 */
export function CompetitorAlternativePage({
  page,
  lang,
  dict,
}: {
  page: CompetitorAlternative;
  lang: string;
  dict: Dictionary;
}) {
  const canonical = canonicalUrl(lang, `/${page.slug}`);
  const checked = new Date(page.checkedOn).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const others = competitorAlternatives.filter((other) => other.slug !== page.slug);

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: page.title,
    description: page.metaDescription,
    inLanguage: "en-KE",
    dateModified: page.checkedOn,
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    about: { "@id": `${siteConfig.url}/#organization` },
    // Names the competitor as a distinct entity, so engines don't conflate the
    // two brands on a page that mentions both.
    mentions: {
      "@type": "Organization",
      name: page.competitor,
      url: page.competitorUrl,
    },
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
              { name: `${page.competitor} alternative`, url: canonical },
            ]),
            faqSchema(page.faq),
          ),
        }}
      />

      <LegalNav lang={lang} />

      <main className="px-5 pt-20 pb-16">
        <div className="mx-auto max-w-190">
          <p className="mb-3 text-[0.8rem] font-bold uppercase tracking-widest text-primary">
            {page.eyebrow}
          </p>
          <h1 className="mb-5 font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
            {page.h1}
          </h1>
          <p className="mb-8 max-w-176 text-[1.1rem] leading-[1.7] text-muted">{page.intro}</p>

          <div className="mb-14 flex flex-wrap gap-3">
            <Link
              href={`/${lang}/upload`}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white no-underline"
            >
              Post your first item — free
            </Link>
            <Link
              href={`/${lang}/for-you`}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground no-underline"
            >
              See what&apos;s selling near you
            </Link>
          </div>

          <section className="mb-14 rounded-2xl border border-border bg-elevated p-6">
            <h2 className="mb-3 font-display text-[1.25rem] font-bold text-foreground">
              {page.about.heading}
            </h2>
            <p className="mb-4 text-[0.98rem] leading-[1.7] text-muted">{page.about.body}</p>
            <p className="text-xs leading-normal text-muted">
              Based on {page.competitor}&apos;s own pages, checked{" "}
              <time dateTime={page.checkedOn}>{checked}</time>:{" "}
              {page.sources.map((source, i) => (
                <span key={source.url}>
                  {i > 0 && " · "}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="underline"
                  >
                    {source.label}
                  </a>
                </span>
              ))}
              . Terms change, so check {page.competitor} for current details. Shopi is not
              affiliated with {page.competitor}.
            </p>
          </section>

          <section className="mb-14">
            <h2 className="mb-6 font-display text-[1.5rem] font-bold text-foreground">
              {page.differencesHeading}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {page.differences.map((item) => (
                <div key={item.title}>
                  <h3 className="mb-1.5 font-semibold text-foreground">{item.title}</h3>
                  <p className="text-[0.98rem] leading-[1.7] text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-14">
            <h2 className="mb-4 font-display text-[1.5rem] font-bold text-foreground">
              {page.whenCompetitorFits.heading}
            </h2>
            <ul className="mb-4 flex flex-col gap-2.5 pl-5 text-[0.98rem] leading-[1.7] text-muted [&>li]:list-disc">
              {page.whenCompetitorFits.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className="text-[0.98rem] font-medium leading-[1.7] text-foreground">
              {page.whenCompetitorFits.closing}
            </p>
          </section>

          <section className="mb-14">
            <h2 className="mb-5 font-display text-[1.5rem] font-bold text-foreground">
              {page.otherOptions.heading}
            </h2>
            <ul className="flex flex-col gap-3">
              {page.otherOptions.items.map((item) => (
                <li key={item.name} className="rounded-lg border border-border bg-elevated p-4">
                  <h3 className="mb-1 font-semibold text-foreground">
                    {item.path ? (
                      <Link href={`/${lang}${item.path}`} className="text-foreground underline">
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                  </h3>
                  <p className="text-[0.95rem] leading-[1.65] text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.98rem]">
              <Link href={`/${lang}/marketplace-alternatives-kenya`} className="text-primary underline">
                Every option side by side: the best online selling sites in Kenya
              </Link>
            </p>
          </section>

          <section className="mb-14">
            <h2 className="mb-6 font-display text-[1.5rem] font-bold text-foreground">
              {page.steps.heading}
            </h2>
            <ol className="flex flex-col gap-5">
              {page.steps.items.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">{step.title}</h3>
                    <p className="text-[0.98rem] leading-[1.7] text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-12">
            <h2 className="mb-5 font-display text-[1.5rem] font-bold text-foreground">
              {page.competitor} alternative: common questions
            </h2>
            <div className="flex flex-col gap-6">
              {page.faq.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="mb-1.5 font-semibold text-foreground">{q}</h3>
                  <p className="text-[0.98rem] leading-[1.7] text-muted">{a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-3 font-display text-[1.15rem] font-bold text-foreground">
              Keep comparing
            </h2>
            <ul className="flex flex-col gap-2 text-[0.98rem]">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link href={`/${lang}/${other.slug}`} className="text-primary underline">
                    {other.competitor} alternative in Kenya
                  </Link>
                </li>
              ))}
              {page.guide ? (
                <li>
                  <Link href={`/${lang}${page.guide.path}`} className="text-primary underline">
                    {page.guide.label}
                  </Link>
                </li>
              ) : null}
              <li>
                <Link
                  href={`/${lang}/marketplace-alternatives-kenya`}
                  className="text-primary underline"
                >
                  Best online selling sites in Kenya, compared
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/olx-kenya-alternative`} className="text-primary underline">
                  What happened to OLX Kenya
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/where-to-sell/phones`} className="text-primary underline">
                  Where to sell your phone in Kenya
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/sell-in-kenya`} className="text-primary underline">
                  How to sell online in Kenya for free
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/sell-car-kenya`} className="text-primary underline">
                  Sell a car in Kenya without a broker
                </Link>
              </li>
            </ul>
          </section>
        </div>

        <CategoryCrossLinks lang={lang} currentPath={`/${page.slug}`} />
      </main>

      <LandingFooter dict={dict} lang={lang} />
    </>
  );
}
