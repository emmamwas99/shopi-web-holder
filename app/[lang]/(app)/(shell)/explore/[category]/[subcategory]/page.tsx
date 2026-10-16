import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscoverGridSkeleton } from "@/features/discover/components/DiscoverGridCard";
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

// Mirrors DiscoverPage on a subcategory route: the phone-only back + search
// bar and filter chips, the results header, then the listing grid.
function ExploreSubcategorySkeleton() {
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
        <div className="flex items-center justify-between px-4 pb-3 pt-4 lg:px-0 lg:pt-2">
          <div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1.5 h-2.5 w-40" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="px-4 pb-6 lg:px-0">
          <DiscoverGridSkeleton />
        </div>
      </div>
    </div>
  );
}
