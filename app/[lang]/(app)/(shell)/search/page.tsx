import { Suspense } from "react";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { DiscoverPage } from "@/features/discover/components/DiscoverPage";
import { publicPageMetadata } from "@/lib/metadata";
import { BrowseHub } from "@/components/seo/BrowseHub";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
};

// The route reuses the Discover UI, which reads ?q= for the search term (see
// DiscoverPage). The canonical drops ?q= and points at the bare /search.
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { lang } = await params;
  const { q } = await searchParams;
  const term = q?.trim();
  const title = term
    ? `${term} — Search`
    : siteConfig.routes.search.title;
  const description = term
    ? `Search results for "${term}" on ${siteConfig.name}. ${siteConfig.routes.search.description}`
    : siteConfig.routes.search.description;

  return {
    ...publicPageMetadata({
      lang,
      path: siteConfig.routes.search.path,
      title,
      description,
    }),
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
          intro="Search cars, phones, fashion, furniture, farm produce, livestock and other listings from sellers near you. Message any seller directly to agree on price, payment and delivery."
        />
      }
    >
      <DiscoverPage lang={lang} />
    </Suspense>
  );
}
