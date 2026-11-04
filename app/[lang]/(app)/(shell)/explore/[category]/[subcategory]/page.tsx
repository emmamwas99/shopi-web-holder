import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DISCOVER_GRID,
  DiscoverGridCard,
  DiscoverGridSkeleton,
} from "@/features/discover/components/DiscoverGridCard";
import { DiscoverPage } from "@/features/discover/components/DiscoverPage";
import {
  fetchBrowseCards,
  resolveBrowseRoute,
} from "@/features/discover/queries/browse.server";
import { siteConfig } from "@/config/site";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { contentPath } from "@/lib/content-url";
import { canonicalUrl, publicPageMetadata } from "@/lib/metadata";
import {
  browseHeading,
  browsePath,
  isIndexableBrowsePage,
} from "@/lib/seo/browse-pages";
import {
  breadcrumbSchema,
  jsonLd,
  listingItemListSchema,
} from "@/lib/structured-data";

type Props = {
  params: Promise<{
    lang: string;
    category: string;
    subcategory: string;
  }>;
};

// Rendered on first visit, then served from the ISR cache (refreshed on the
// shortest fetch revalidate) — see the same export on content/[id]/page.tsx.
export function generateStaticParams() {
  return [];
}

/**
 * A subcategory of Explore, e.g. /en/explore/electronics-technology/phones.
 *
 * Listing breadcrumbs link here, so these URLs get crawled. They used to carry
 * the site's default title, no canonical, and only a skeleton in the server
 * HTML — and any /explore/x/y answered 200. Now an unknown subcategory is a
 * 404, the page is titled for what it lists, its first page of listings is in
 * the HTML, and it's indexed only once it has enough inventory to be worth
 * landing on (see lib/seo/browse-pages.ts).
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, category, subcategory } = await params;
  const route = await resolveBrowseRoute(category, subcategory);
  if (!route) notFound();

  const heading = browseHeading(route.category.slug, route.subcategoryName);
  const indexable = isIndexableBrowsePage(
    route.category.slug,
    route.subcategorySlug,
    route.liveListings,
  );

  return {
    ...publicPageMetadata({
      lang,
      path: browsePath(route.category.slug, route.subcategorySlug),
      title: heading,
      description: `${heading} from local sellers on Shopi. Compare prices and photos, then message the seller directly. Free to use, no commission.`,
    }),
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function ExploreSubcategoryPage({ params }: Props) {
  const { lang, category, subcategory } = await params;
  const route = await resolveBrowseRoute(category, subcategory);
  if (!route) notFound();

  const posts = await fetchBrowseCards({
    categoryId: route.category.id,
    subcategory: route.subcategoryName,
  });
  const heading = browseHeading(route.category.slug, route.subcategoryName);
  const url = canonicalUrl(
    lang,
    browsePath(route.category.slug, route.subcategorySlug),
  );
  const exploreUrl = canonicalUrl(lang, "/explore");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbSchema([
              { name: "Home", url: canonicalUrl(lang, "") },
              { name: "Explore", url: exploreUrl },
              {
                name: route.category.name,
                url: `${exploreUrl}?category=${encodeURIComponent(route.category.slug)}`,
              },
              { name: route.subcategoryName, url },
            ]),
            // Only the cards the server HTML actually renders.
            ...(posts.length
              ? [
                  listingItemListSchema({
                    id: `${url}#listings`,
                    name: heading,
                    items: posts.map((post) => ({
                      name: post.title,
                      url: `${siteConfig.url}${contentPath("en", post)}`,
                    })),
                  }),
                ]
              : []),
          ),
        }}
      />
      {/* This route is ISR (generateStaticParams above), and DiscoverPage
          reads useSearchParams(), so a static render bails out to this
          fallback: it IS the server HTML crawlers get. It used to be a bare
          skeleton, which left every category page with no H1 and no listing
          links once the route became ISR on 31 Oct. It now carries the same
          heading and cards DiscoverPage renders, so the HTML has the content
          and visitors see real listings until the app hydrates. */}
      <Suspense
        fallback={
          <ExploreSubcategoryFallback
            lang={lang}
            title={route.subcategoryName}
            posts={posts}
          />
        }
      >
        <DiscoverPage
          lang={lang}
          initialCategorySlug={category}
          initialSubcategorySlug={subcategory}
          initialPosts={posts}
          initialTitle={route.subcategoryName}
        />
      </Suspense>
    </>
  );
}

// Mirrors DiscoverPage on a subcategory route: the phone-only back + search
// bar and filter chips, the results header, then the listing grid — with the
// real heading and the server-fetched cards rather than placeholders.
function ExploreSubcategoryFallback({
  lang,
  title,
  posts,
}: {
  lang: string;
  title: string;
  posts: ContentCardFieldsFragment[];
}) {
  return (
    <div className="min-h-svh bg-app pb-0 md:pb-8">
      <div className="mx-auto w-full lg:max-w-390 lg:px-8 lg:pt-4">
        <div className="sticky top-0 z-30 border-b border-default bg-app lg:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
            <Skeleton className="h-10 min-w-0 flex-1 rounded-full" />
          </div>
          <div className="flex gap-2 overflow-hidden px-4 pb-2.5">
            <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
            <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
            <Skeleton className="h-8 w-16 shrink-0 rounded-full" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 lg:px-0 lg:pt-2">
          <div className="min-w-0">
            {/* Same element and classes as DiscoverPage's results header. */}
            <h1 className="truncate text-[15px] font-semibold leading-5 text-main md:text-[17px] md:leading-6">
              {title}
            </h1>
            <Skeleton className="mt-1.5 h-2.5 w-40" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="px-4 pb-6 lg:px-0">
          {posts.length > 0 ? (
            <div className={DISCOVER_GRID}>
              {posts.map((post, i) => (
                <DiscoverGridCard key={post.id} post={post} lang={lang} priority={i < 4} />
              ))}
            </div>
          ) : (
            <DiscoverGridSkeleton />
          )}
        </div>
      </div>
    </div>
  );
}
