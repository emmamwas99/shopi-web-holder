import Link from "next/link";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { TiktokSaverTool } from "@/components/tools/TiktokSaverTool";
import { TiktokToolCtaLink } from "@/components/tools/TiktokToolCtaLink";
import {
  TOOL_BODY,
  TOOL_H2,
  ToolSectionBlock,
  toolPageSchemas,
} from "@/components/tools/ToolPageParts";
import type { Dictionary } from "@/i18n/getDictionary";
import { canonicalUrl } from "@/lib/metadata";
import { facebookToolPages, facebookToolPath } from "@/lib/seo/facebook-tools";
import {
  TIKTOK_TOOLS_UPDATED,
  tiktokToolPages,
  tiktokToolPath,
  type TiktokToolPageData,
} from "@/lib/seo/tiktok-tools";
import { breadcrumbSchema, faqSchema, jsonLd } from "@/lib/structured-data";

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            ...toolPageSchemas(page, canonical, TIKTOK_TOOLS_UPDATED),
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
          <nav aria-label="More free tools" className="mt-5 mb-12 flex flex-wrap gap-2">
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
            {/* The Facebook page links back to these; counted as a CTA so the
                admin shows how many TikTok visitors go on to it. */}
            {facebookToolPages.map((tool) => (
              <TiktokToolCtaLink
                key={tool.slug}
                href={`/${lang}${facebookToolPath(tool.slug)}`}
                cta={`tool:${tool.slug}`}
                mode={page.mode}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground no-underline"
              >
                {tool.shortName}
              </TiktokToolCtaLink>
            ))}
          </nav>

          {/* ── How to ─────────────────────────────────────────────── */}
          <section id="how-to" className="mb-12 scroll-mt-24">
            <h2 className={`${TOOL_H2} mb-5`}>{page.howToName}</h2>
            <ol className="flex flex-col gap-5">
              {page.steps.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">{step.title}</h3>
                    <p className={TOOL_BODY}>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {page.sections.map((section) => (
            <ToolSectionBlock key={section.id} section={section} />
          ))}

          {/* ── The bridge back into Shopi ─────────────────────────── */}
          <section className="mb-12 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
            <h2 className="mb-2 font-display text-[1.15rem] font-bold text-foreground">
              Selling on TikTok already? Put it on Shopi too.
            </h2>
            <p className={`mb-5 ${TOOL_BODY}`}>
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
            <p className={`mb-3 ${TOOL_BODY}`}>
              These tools are meant for your own posts, and for posts a creator has said you can
              use. Downloading someone else&apos;s video, photos or sound and reposting them as your
              own can infringe their copyright and goes against TikTok&apos;s terms. On Shopi, using
              photos or videos that aren&apos;t yours without permission breaks our{" "}
              <Link href={`/${lang}/community-guidelines`} className="text-primary underline">
                Community Guidelines
              </Link>
              .
            </p>
            <p className={TOOL_BODY}>
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
            <h2 className={`${TOOL_H2} mb-5`}>{page.faqHeading}</h2>
            <div className="flex flex-col gap-6">
              {page.faq.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="mb-1.5 font-semibold text-foreground">{q}</h3>
                  <p className={TOOL_BODY}>{a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="mb-3 font-display text-[1.15rem] font-bold text-foreground">
              More free tools
            </h2>
            <ul className="flex flex-col gap-2 text-[0.98rem]">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link href={`/${lang}${tiktokToolPath(other.slug)}`} className="text-primary underline">
                    {other.h1}
                  </Link>
                </li>
              ))}
              {facebookToolPages.map((tool) => (
                <li key={tool.slug}>
                  <Link href={`/${lang}${facebookToolPath(tool.slug)}`} className="text-primary underline">
                    {tool.h1}
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
