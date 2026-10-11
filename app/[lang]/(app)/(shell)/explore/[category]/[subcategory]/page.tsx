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
// bar, the subcategory heading, then the listing grid.
function ExploreSubcategorySkeleton() {
  return (
    <div className="min-h-svh bg-app pb-0 md:pb-8">
      <div className="mx-auto w-full lg:max-w-390 lg:px-8 lg:pt-4">
        <div className="sticky top-0 z-30 border-b border-default bg-app lg:hidden">
          <div className="flex items-center gap-1.5 px-4 py-3">
            <Skeleton className="h-9 w-7 shrink-0 rounded-full" />
            <Skeleton className="h-11 min-w-0 flex-1 rounded-full" />
          </div>
        </div>
        <div className="px-4 pb-6 pt-3 lg:px-0">
          <Skeleton className="mb-3 h-4 w-32" />
          <DiscoverGridSkeleton />
        </div>
      </div>
    </div>
  );
}
