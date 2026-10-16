import { Suspense } from "react";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { DiscoverPage } from "@/features/discover/components/DiscoverPage";
import { fetchBrowseCards } from "@/features/discover/queries/browse.server";
import { publicPageMetadata } from "@/lib/metadata";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscoverGridSkeleton } from "@/features/discover/components/DiscoverGridCard";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: siteConfig.routes.explore.path,
    title: siteConfig.routes.explore.title,
    description: siteConfig.routes.explore.description,
  });
}

export default async function ExplorePage({ params, searchParams }: Props) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  // The unfiltered view — the canonical /explore — gets its first page of
  // cards from the server, so its HTML links to real listings instead of
  // shipping a skeleton. Filtered deep links (?q=, ?category=) keep the
  // skeleton: unfiltered cards under a filtered heading would be wrong.
  const initialPosts =
    Object.keys(query).length === 0 ? await fetchBrowseCards() : undefined;
  // Suspense boundary: DiscoverPage reads useSearchParams() (?category= deep
  // links), which requires one during prerender. Keep the fallback shaped like
  // the interactive Explore UI so users don't see the crawl hub flash before
  // hydration replaces it.
  return (
    <Suspense fallback={<ExploreSkeleton />}>
      <DiscoverPage lang={lang} initialPosts={initialPosts} />
    </Suspense>
  );
}

// Mirrors DiscoverPage's frame: the phone-only search bar and the two
// sideways-scrolling rows of category shortcuts, the results header, then the
// listing grid. The desktop filters live in the shared side nav, so nothing
// is reserved for them here.
function ExploreSkeleton() {
  return (
    <div className="min-h-svh bg-app pb-24 md:pb-8">
      <div className="mx-auto w-full lg:max-w-390 lg:px-8 lg:pt-4">
        <main className="min-w-0">
          <div className="sticky top-0 z-30 border-b border-default bg-app lg:hidden">
            <div className="flex h-14 items-center gap-2 px-4">
              <Skeleton className="h-10 min-w-0 flex-1 rounded-full" />
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            </div>
          </div>

          <div className="pb-1 pt-3 lg:hidden">
            <div className="mx-3 grid auto-cols-[calc((100%-12px)/4)] grid-flow-col grid-rows-2 gap-x-1 gap-y-3 overflow-hidden sm:auto-cols-[calc((100%-20px)/6)] md:auto-cols-[88px] md:justify-center">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex flex-col items-center gap-1.5 pt-px">
                  <Skeleton className="h-13 w-13 rounded-full" />
                  <div className="flex h-7 items-start pt-0.5">
                    <Skeleton className="h-2.5 w-14 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 h-[3px]" aria-hidden />
          </div>

          <div className="flex h-[60px] items-center justify-between px-4 pt-1 lg:h-auto lg:px-0 lg:pb-3 lg:pt-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="px-4 pb-6 lg:px-0">
            <DiscoverGridSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}
