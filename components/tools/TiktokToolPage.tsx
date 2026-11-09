import Link from "next/link";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { TiktokSaverTool } from "@/components/tools/TiktokSaverTool";
import { TiktokToolCtaLink } from "@/components/tools/TiktokToolCtaLink";
import { siteConfig } from "@/config/site";
import type { Dictionary } from "@/i18n/getDictionary";
import { canonicalUrl } from "@/lib/metadata";
import {
  TIKTOK_TOOLS_UPDATED,
  tiktokToolPages,
  tiktokToolPath,
  type TiktokToolPageData,
  type ToolSection,
} from "@/lib/seo/tiktok-tools";
import { breadcrumbSchema, faqSchema, jsonLd } from "@/lib/structured-data";

const H2 =
  "mb-3 font-display text-[1.35rem] font-bold leading-tight text-foreground md:text-[1.5rem]";
const BODY = "text-[0.95rem] leading-[1.7] text-muted md:text-[0.98rem]";

function Section({ section }: { section: ToolSection }) {
  return (
    <section id={section.id} className="mb-12 scroll-mt-24">
      <h2 className={H2}>{section.heading}</h2>
      {section.intro ? <p className={`mb-5 max-w-176 ${BODY}`}>{section.intro}</p> : null}

      {section.kind === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {section.cards.map((card) => (
            <div key={card.title} className="rounded-lg border border-border bg-elevated p-4 sm:p-5">
              <h3 className="mb-1.5 font-semibold text-foreground">{card.title}</h3>
              <p className="text-[0.92rem] leading-[1.65] text-muted">{card.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      {section.kind === "table" ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-120 border-collapse text-left text-[0.9rem]">
              <thead className="bg-elevated">
                <tr>
                  {section.head.map((cell, i) => (
                    <th
                      key={`${cell}-${i}`}
                      scope="col"
                      className="border-b border-border px-3 py-2.5 font-semibold text-foreground"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map(([label, ...cells]) => (
                  <tr key={label} className="border-b border-border last:border-b-0">
                    <th scope="row" className="px-3 py-2.5 align-top font-semibold text-foreground">
                      {label}
                    </th>
                    {cells.map((cell, i) => (
                      <td key={i} className="px-3 py-2.5 align-top text-muted">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {section.note ? <p className={`mt-3 ${BODY}`}>{section.note}</p> : null}
        </>
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

/**
 * One TikTok tool page (video, MP3 or photos). The copy and the rules for it
 * live in lib/seo/tiktok-tools.ts; this lays it out tool-first, because the
 * searcher came to download, not to read.
 */
export function TiktokToolPage({
  page,
  lang,
  dict,
}: {
  page: TiktokToolPageData;
  lang: string;
  dict: Dictionary;
}) {
  const path = tiktokToolPath(page.slug);
  const canonical = canonicalUrl(lang, path);
  const hub = tiktokToolPages[0];
  const others = tiktokToolPages.filter((other) => other.slug !== page.slug);
  const updatedLabel = new Date(TIKTOK_TOOLS_UPDATED).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const trail = [
    { name: "Home", url: canonicalUrl(lang, "") },
    ...(page.slug === hub.slug
      ? []
      : [{ name: "TikTok Downloader", url: canonicalUrl(lang, tiktokToolPath(hub.slug)) }]),
    { name: page.shortName, url: canonical },
  ];

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: page.title,
    description: page.description,
    inLanguage: "en-KE",
    dateModified: TIKTOK_TOOLS_UPDATED,
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    mainEntity: { "@id": `${canonical}#app` },
  };

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${canonical}#app`,
    name: page.appName,
    url: canonical,
    description: page.description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (runs in a web browser)",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "KES" },
    featureList: page.featureList,
    provider: { "@id": `${siteConfig.url}/#organization` },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${canonical}#howto`,
    name: page.howToName,
    step: page.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.body,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            webPageSchema,
            appSchema,
            howToSchema,
            breadcrumbSchema(trail),
            faqSchema(page.faq),
          ),
        }}
      />

      <LegalNav lang={lang} />

      <main className="px-4 pt-20 pb-16 md:px-5">
        <div className="mx-auto max-w-190">
          {/* ── Tool first ─────────────────────────────────────────── */}
          <p className="mb-3 text-[0.78rem] font-bold tracking-widest text-primary uppercase">
            {page.eyebrow}
          </p>
          <h1 className="mb-4 font-display text-[clamp(1.85rem,5vw,3rem)] leading-[1.1] font-bold tracking-[-0.03em] text-foreground">
            {page.h1}
          </h1>
          <p className="mb-7 max-w-176 text-[1rem] leading-[1.7] text-muted md:text-[1.1rem]">
            {page.intro}
          </p>

          <TiktokSaverTool t={dict.tiktokSaver} mode={page.mode} />

          <p className="mt-4 text-xs text-muted">
            Updated <time dateTime={TIKTOK_TOOLS_UPDATED}>{updatedLabel}</time>
          </p>

          {/* ── Other modes, right under the tool ───────────────────── */}
          <nav aria-label="More TikTok tools" className="mt-5 mb-12 flex flex-wrap gap-2">
            {others.map((other) => (
              <TiktokToolCtaLink
                key={other.slug}
                href={`/${lang}${tiktokToolPath(other.slug)}`}
                cta={`tool:${other.slug}`}
                mode={page.mode}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground no-underline"
              >
                {other.shortName}
              </TiktokToolCtaLink>
            ))}
          </nav>

          {/* ── How to ─────────────────────────────────────────────── */}
          <section id="how-to" className="mb-12 scroll-mt-24">
            <h2 className={`${H2} mb-5`}>{page.howToName}</h2>
            <ol className="flex flex-col gap-5">
              {page.steps.map((step, i) => (
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
          </section>

          {page.sections.map((section) => (
            <Section key={section.id} section={section} />
          ))}

          {/* ── The bridge back into Shopi ─────────────────────────── */}
          <section className="mb-12 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
            <h2 className="mb-2 font-display text-[1.15rem] font-bold text-foreground">
              Selling on TikTok already? Put it on Shopi too.
            </h2>
            <p className={`mb-5 ${BODY}`}>
              Paste your TikTok link into a new Shopi listing and buyers near you can message you
              about the item directly. Posting is free and there&apos;s no commission on the sale.
            </p>
            <div className="flex flex-wrap gap-3">
              <TiktokToolCtaLink
                href={`/${lang}/upload`}
                cta="upload"
                mode={page.mode}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white no-underline"
              >
                List an item from TikTok
              </TiktokToolCtaLink>
              <TiktokToolCtaLink
                href={`/${lang}/sell-in-kenya`}
                cta="sell-in-kenya"
                mode={page.mode}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground no-underline"
              >
                How selling on Shopi works
              </TiktokToolCtaLink>
            </div>
          </section>

          {/* ── Responsible use, stated plainly ─────────────────────── */}
          <section className="mb-12 rounded-2xl border border-border bg-elevated p-5 sm:p-6">
            <h2 className="mb-3 font-display text-[1.2rem] font-bold text-foreground">
              Only save what you have the right to use
            </h2>
            <p className={`mb-3 ${BODY}`}>
              These tools are meant for your own posts, and for posts a creator has said you can
              use. Downloading someone else&apos;s video, photos or sound and reposting them as your
              own can infringe their copyright and goes against TikTok&apos;s terms. On Shopi, using
              photos or videos that aren&apos;t yours without permission breaks our{" "}
              <Link href={`/${lang}/community-guidelines`} className="text-primary underline">
                Community Guidelines
              </Link>
              .
            </p>
            <p className={BODY}>
              If your content is being used on Shopi without permission, send a copyright complaint
              through our{" "}
              <Link href={`/${lang}/contact`} className="text-primary underline">
                contact page
              </Link>
              .
            </p>
          </section>

          {/* ── FAQ — visible answers, mirrored in FAQPage schema ────── */}
          <section id="faq" className="mb-12 scroll-mt-24">
            <h2 className={`${H2} mb-5`}>{page.faqHeading}</h2>
            <div className="flex flex-col gap-6">
              {page.faq.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="mb-1.5 font-semibold text-foreground">{q}</h3>
                  <p className={BODY}>{a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="mb-3 font-display text-[1.15rem] font-bold text-foreground">
              More free TikTok tools
            </h2>
            <ul className="flex flex-col gap-2 text-[0.98rem]">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link href={`/${lang}${tiktokToolPath(other.slug)}`} className="text-primary underline">
                    {other.h1}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`/${lang}/blog/how-nairobi-local-sellers-are-winning-online-with-short-videos`}
                  className="text-primary underline"
                >
                  How Nairobi sellers win online with short videos
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
