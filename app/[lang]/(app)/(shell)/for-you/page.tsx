import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { siteConfig } from "@/config/site";
import { canonicalUrl, localeAlternates } from "@/lib/metadata";
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
// would point at a redirect. The feed isn't translated, so /sw/for-you
// canonicalises to /en/for-you (see canonicalUrl).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const path = siteConfig.routes.feed.path;
  const canonical = canonicalUrl(lang, path);
  const title = `${siteConfig.routes.feed.title} | ${siteConfig.name}`;
  const description = siteConfig.routes.feed.description;

  return {
    title: siteConfig.routes.feed.title,
    description,
    alternates: { canonical, ...localeAlternates(path) },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: siteConfig.name,
      title,
      description,
      locale: "en_KE",
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
  // Start the server query alongside PreloadQuery and pass its result as a
  // promise. The feed section unwraps it inside its own Suspense boundary, so
  // the header streams immediately while the server still renders real cards
  // as soon as the API responds. A failure falls back to the client query.
  let initialItemsPromise: Promise<ContentCardFieldsFragment[]> | undefined;
  if (!cookieStore.has("shopi-auth-hint")) {
    initialItemsPromise = query({
      query: ForYouFeedDocument,
      variables: { limit: FEED_PAGE_SIZE, seed: "initial" },
      context: FEED_CACHE,
    })
      .then(({ data }) =>
        (data?.forYouFeed?.items ?? []) as ContentCardFieldsFragment[],
      )
      .catch(() => []);
  }

  const feed = (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedPage lang={lang} initialItemsPromise={initialItemsPromise} />
    </Suspense>
  );

  // The server cannot safely preload a personalized query because auth tokens
  // live in the client store. The existing hint cookie lets authenticated users
  // keep their private cache path, while anonymous users (including search and
  // performance crawlers) receive the first feed response during SSR. The
  // unresolved initial-items promise is read inside the feed's own Suspense
  // boundary, so the header can stream before the API responds.
  if (cookieStore.has("shopi-auth-hint")) {
    return <AuthenticatedFeedPage lang={lang} />;
  }

  return (
    <PreloadQuery
      query={ForYouFeedDocument}
      variables={{ limit: FEED_PAGE_SIZE, seed: "initial" }}
      context={FEED_CACHE}
    >
      {feed}
    </PreloadQuery>
  );
}
