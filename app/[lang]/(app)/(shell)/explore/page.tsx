import { Suspense } from "react";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { DiscoverPage } from "@/features/discover/components/DiscoverPage";
import { publicPageMetadata } from "@/lib/metadata";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscoverGridSkeleton } from "@/features/discover/components/DiscoverGridCard";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: siteConfig.routes.explore.path,
    title: siteConfig.routes.explore.title,
    description: siteConfig.routes.explore.description,
  });
}

export default async function ExplorePage({ params }: Props) {
  const { lang } = await params;
  // Suspense boundary: DiscoverPage reads useSearchParams() (?category= deep
  // links), which requires one during prerender. Keep the fallback shaped like
  // the interactive Explore UI so users don't see the crawl hub flash before
  // hydration replaces it.
  return (
    <Suspense fallback={<ExploreSkeleton />}>
      <DiscoverPage lang={lang} />
    </Suspense>
  );
}

// Mirrors DiscoverPage's frame: the phone-only search bar and category
// shortcuts, then the listing grid. The desktop filters live in the shared
// side nav, so nothing is reserved for them here.
function ExploreSkeleton() {
  return (
    <div className="min-h-svh bg-app pb-24 md:pb-8">
      <div className="mx-auto w-full lg:max-w-390 lg:px-8 lg:pt-4">
        <main className="min-w-0">
          <div className="sticky top-0 z-30 border-b border-default bg-app lg:hidden">
            <div className="flex items-center gap-1.5 px-4 py-3">
              <Skeleton className="h-11 min-w-0 flex-1 rounded-full" />
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            </div>
          </div>

          <div className="px-4 pb-3 pt-4 lg:hidden">
            <div className="grid grid-cols-4 grid-rows-2 gap-x-2 gap-y-4 md:gap-x-4 md:gap-y-5">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex flex-col items-center gap-1.5">
                  <Skeleton className="aspect-square w-full rounded-3xl" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
              <Skeleton className="h-1.5 w-4 rounded-full" />
              <Skeleton className="h-1.5 w-1.5 rounded-full" />
            </div>
          </div>

          <div className="px-4 pb-6 pt-3 lg:px-0">
            <div className="mb-4 border-t border-border/60" />
            <DiscoverGridSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}
