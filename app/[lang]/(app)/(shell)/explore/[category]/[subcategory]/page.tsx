import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscoverPage } from "@/features/discover/components/DiscoverPage";

type Props = {
  params: Promise<{
    lang: string;
    category: string;
    subcategory: string;
  }>;
};

export default async function ExploreSubcategoryPage({ params }: Props) {
  const { lang, category, subcategory } = await params;

  return (
    <Suspense fallback={<ExploreSubcategorySkeleton />}>
      <DiscoverPage
        lang={lang}
        initialCategorySlug={category}
        initialSubcategorySlug={subcategory}
      />
    </Suspense>
  );
}

function ExploreSubcategorySkeleton() {
  return (
    <div className="min-h-svh bg-app pb-0 md:pb-8">
      <div className="mx-auto w-full lg:max-w-390 lg:px-8 lg:pt-4">
        <div className="flex items-center gap-2 px-4 pb-3 pt-3 lg:px-0 lg:pt-0">
          <Skeleton className="h-11 min-w-0 flex-1 rounded-full" />
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
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
      </div>
    </div>
  );
}
