import Link from "next/link";
import { categoryPages } from "@/lib/seo/category-hubs";
import {
  searchIntentPath,
  topSearchIntentPages,
} from "@/lib/seo/search-intent-pages";
import { whereToSellPages, whereToSellPath } from "@/lib/seo/where-to-sell";

// Re-exported so existing imports (BrowseHub) keep working; the data itself
// lives in lib/seo/category-hubs.ts, where the blog's link resolver reads it.
export { categoryPages };

/**
 * Cross-links between the category landing pages.
 *
 * Each of these pages earns its own search traffic, so a visitor arriving on
 * Property from Google previously had no route to Cars or Phones — the pages
 * were orphans of each other. This block is the single source of truth for
 * that link set: add a page to lib/seo/category-hubs.ts once and every sibling
 * picks it up.
 */

export function CategoryCrossLinks({
  lang,
  currentPath,
}: {
  lang: string;
  /** Path of the page rendering this block, so it never links to itself. */
  currentPath: string;
}) {
  const others = categoryPages.filter((page) => page.path !== currentPath);
  const popularSearches = topSearchIntentPages.filter(
    (page) => searchIntentPath(page.slug) !== currentPath,
  );

  return (
    <section className="bg-surface px-5 py-16">
      <div className="mx-auto max-w-190">
        <h2 className="mb-7 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
          Browse other categories on Shopi
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {others.map(({ path, title, body }) => (
            <Link
              key={path}
              href={`/${lang}${path}`}
              className="rounded-lg border border-border bg-elevated p-5 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
            >
              <h3 className="font-display text-[1.05rem] font-bold text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-[0.9rem] leading-[1.7] text-muted">
                {body}
              </p>
            </Link>
          ))}
        </div>
        <h2 className="mt-12 mb-5 font-display text-[clamp(1.25rem,2.4vw,1.7rem)] font-bold tracking-normal text-foreground">
          Popular product searches
        </h2>
        <div className="flex flex-wrap gap-3">
          {popularSearches.map((page) => (
            <Link
              key={page.slug}
              href={`/${lang}${searchIntentPath(page.slug)}`}
              className="rounded-full border border-border bg-elevated px-4 py-2 text-sm font-semibold text-foreground no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
            >
              {page.label} for sale
            </Link>
          ))}
        </div>
        {/* Seller pages: the other half of the marketplace. Without this
            row they'd be reachable only from the sitemap and each other. */}
        <h2 className="mt-12 mb-5 font-display text-[clamp(1.25rem,2.4vw,1.7rem)] font-bold tracking-normal text-foreground">
          Where to sell in Kenya
        </h2>
        <div className="flex flex-wrap gap-3">
          {whereToSellPages
            .filter((page) => whereToSellPath(page.slug) !== currentPath)
            .map((page) => (
              <Link
                key={page.slug}
                href={`/${lang}${whereToSellPath(page.slug)}`}
                className="rounded-full border border-border bg-elevated px-4 py-2 text-sm font-semibold text-foreground no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
              >
                {page.h1.replace(/ in Kenya$/, "")}
              </Link>
            ))}
        </div>
      </div>
    </section>
  );
}
