import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { siteConfig } from "@/config/site";
import { locales, isValidLocale } from "@/i18n/config";
import { PreloadQuery, query } from "@/lib/apollo/ApolloClient";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { ForYouFeedDocument } from "@/types/__generated__/graphql";
import { FeedPage } from "@/features/feed/components/FeedPage";
import { FeedSkeleton } from "@/features/feed/components/FeedSkeleton";
import { AuthenticatedFeedPage } from "@/features/feed/components/AuthenticatedFeedPage";
import { FEED_PAGE_SIZE } from "@/features/feed/constants";

// New posts should reach the anonymous feed within seconds, so the feed opts
// out of the Apollo client's hourly default. The page is dynamic (it reads
// cookies), so this only sets how long the data cache is shared.
const FEED_CACHE = { fetchOptions: { next: { revalidate: 30 } } };

// The app serves every page under /[lang]; a canonical without the locale
// would point at a redirect. Self-referencing canonical + hreflang alternates
// keep engines from treating /en/for-you and /sw/for-you as duplicates.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const path = siteConfig.routes.feed.path;
  const canonical = `${siteConfig.url}/${safeLang}${path}`;
  const title = `${siteConfig.routes.feed.title} | ${siteConfig.name}`;
  const description = siteConfig.routes.feed.description;

  return {
    title: siteConfig.routes.feed.title,
    description,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [l, `${siteConfig.url}/${l}${path}`]),
        ),
        "x-default": `${siteConfig.url}/en${path}`,
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: siteConfig.name,
      title,
      description,
      locale: safeLang === "sw" ? "sw_KE" : "en_KE",
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title,
      description,
      images: [siteConfig.ogImage],
    },
  };
}

export default async function FeedPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const [{ lang }, cookieStore] = await Promise.all([params, cookies()]);

  // PreloadQuery streams the feed to the client but does not block the server
  // render, so the client's useSuspenseQuery could only resolve during SSR if
  // the API answered within the render. Against production (~2.4s for one
  // page) it never did: React abandoned the boundary and shipped a skeleton,
  // which is React error #419 and left every card — including the LCP image —
  // to be fetched and rendered on the client.
  //
  // Awaiting the same query here gives the server real items to render. It is
  // not an extra round trip in practice: it shares the Next data cache
  // (FEED_CACHE) with the PreloadQuery below, so the cost is amortised across
  // visitors rather than paid per request. A failure degrades to the old
  // behaviour (skeleton + client fetch) rather than breaking the route — the
  // feed's error boundary covers the rest.
  let initialItems: ContentCardFieldsFragment[] = [];
  if (!cookieStore.has("shopi-auth-hint")) {
    try {
      const { data } = await query({
        query: ForYouFeedDocument,
        variables: { limit: FEED_PAGE_SIZE },
        context: FEED_CACHE,
      });
      initialItems = (data?.forYouFeed?.items ??
        []) as ContentCardFieldsFragment[];
    } catch {
      initialItems = [];
    }
  }

  const feed = (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedPage lang={lang} initialItems={initialItems} />
    </Suspense>
  );

  // The server cannot safely preload a personalized query because auth tokens
  // live in the client store. The existing hint cookie lets authenticated users
  // keep their private cache path, while anonymous users (including search and
  // performance crawlers) receive the first feed response during SSR.
  if (cookieStore.has("shopi-auth-hint")) {
    return <AuthenticatedFeedPage lang={lang} />;
  }

  return (
    <PreloadQuery
      query={ForYouFeedDocument}
      variables={{ limit: FEED_PAGE_SIZE }}
      context={FEED_CACHE}
    >
      {feed}
    </PreloadQuery>
  );
}
