import { Suspense } from "react";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { locales, isValidLocale } from "@/i18n/config";
import { DiscoverPage } from "@/features/discover/components/DiscoverPage";
import { publicPageMetadata } from "@/lib/metadata";
import { BrowseHub } from "@/components/seo/BrowseHub";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
};

// Self-referencing canonical per locale + hreflang alternates. The route reuses
// the Discover UI, which reads ?q= for the search term (see DiscoverPage).
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { lang } = await params;
  const { q } = await searchParams;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const path = siteConfig.routes.search.path;
  const term = q?.trim();
  const title = term
    ? `${term} — Search`
    : siteConfig.routes.search.title;
  const description = term
    ? `Search results for "${term}" on ${siteConfig.name}. ${siteConfig.routes.search.description}`
    : siteConfig.routes.search.description;
  const base = publicPageMetadata({
    lang: safeLang,
    path,
    title,
    description,
  });

  return {
    ...base,
    alternates: {
      canonical: `${siteConfig.url}/${safeLang}${path}`,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [l, `${siteConfig.url}/${l}${path}`]),
        ),
        "x-default": `${siteConfig.url}/en${path}`,
      },
    },
    // A query-scoped results page isn't a canonical browse surface — keep the
    // parameterless /search indexable, but don't index every ?q= permutation.
    robots: term ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({ params }: Props) {
  const { lang } = await params;
  // Suspense boundary: DiscoverPage reads useSearchParams() (?q=, ?category=),
  // which requires one during prerender. The fallback is what the server
  // actually emits, so it carries the crawlable hub rather than null.
  return (
    <Suspense
      fallback={
        <BrowseHub
          lang={lang}
          heading="Search local listings across Kenya"
          intro="Search cars, phones, fashion, furniture, farm produce, livestock and thousands of other listings from sellers near you. Message any seller directly to agree on price, payment and delivery."
        />
      }
    >
      <DiscoverPage lang={lang} />
    </Suspense>
  );
}
