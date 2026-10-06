import { Suspense } from "react";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { locales, isValidLocale } from "@/i18n/config";
import { DiscoverPage } from "@/features/discover/components/DiscoverPage";
import { publicPageMetadata } from "@/lib/metadata";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { params: Promise<{ lang: string }> };

// Self-referencing canonical per locale + hreflang alternates (the bare
// /explore path is a redirect, not a page — see feed/page.tsx).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const path = siteConfig.routes.explore.path;
  const base = publicPageMetadata({
    lang: safeLang,
    path,
    title: siteConfig.routes.explore.title,
    description: siteConfig.routes.explore.description,
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
  };
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

function ExploreSkeleton() {
  return (
    <div className="min-h-svh bg-app pb-24 md:pb-8">
      <div className="mx-auto w-full lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:pt-6">
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4 rounded-3xl border border-default bg-app p-4">
            <div>
              <Skeleton className="h-6 w-28" />
              <Skeleton className="mt-3 h-4 w-56" />
            </div>
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <div>
              <Skeleton className="mb-3 h-4 w-24" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-24 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="sticky top-0 z-30 border-b border-default bg-app/92 backdrop-blur-md lg:static lg:border-b-0 lg:bg-transparent lg:backdrop-blur-none">
            <div className="flex items-center gap-2 px-4 pb-3 pt-3 lg:px-0 lg:pt-0">
              <Skeleton className="h-10 min-w-0 flex-1 rounded-full" />
              <Skeleton className="h-10 w-10 shrink-0 rounded-full lg:hidden" />
              <Skeleton className="h-10 w-10 shrink-0 rounded-full lg:hidden" />
            </div>
            <div className="scrollbar-none flex items-center gap-6 overflow-x-auto px-4 pb-3 lg:hidden">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-16 shrink-0 rounded-md" />
              ))}
            </div>
          </div>

          <div className="px-4 pb-6 pt-3 lg:px-0">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-44" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 md:gap-x-4 md:gap-y-6 xl:grid-cols-4 min-[90rem]:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index}>
                  <Skeleton className="aspect-3/4 w-full rounded-xl" />
                  <div className="mt-2 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
