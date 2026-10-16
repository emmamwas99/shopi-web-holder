"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

/**
 * A /explore/{category}/{subcategory} URL that isn't a real subcategory — a
 * typo or an old link. Served as a 404 so engines drop it; the shell's own
 * not-found copy is about listings, so this one points back to browsing.
 */
export default function ExploreSubcategoryNotFound() {
  const { lang } = useParams<{ lang: string }>();

  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-4xl">😕</div>
      <p className="text-default font-semibold">We couldn&apos;t find that category</p>
      <Link href={`/${lang}/explore`} className="text-primary text-sm font-semibold">
        Browse all categories
      </Link>
    </div>
  );
}
