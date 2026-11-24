"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { ArrowRight, MapPin, Sparkles, Users, type LucideIcon } from "lucide-react";
import { DISCOVERY_CATEGORIES, type CategoryFacet } from "@/features/discover/categories";
import { CategoryGlyph } from "@/features/discover/components/CategoryGlyph";
import type { DesktopFeedTab } from "./DesktopFeed";

/**
 * The desktop For You page's left rail: other ways into the marketplace from
 * the feed — the post filters the top bar doesn't carry (For you, Following,
 * Nearby: the phone feed's sub-tabs, switched in place like them) and the
 * categories with live stock, each opening Explore filtered to it.
 *
 * With it the page fills the same frame as Market and Stores (rail · posts ·
 * rail) instead of a narrow centred column, and the posts keep a readable
 * width in the middle. Uses the same cached category query as the top bar's
 * category picker, so it adds no request of its own once that has run.
 */

const FILTERS: { tab: DesktopFeedTab; label: string; icon: LucideIcon }[] = [
  { tab: "for-you", label: "For you", icon: Sparkles },
  { tab: "following", label: "Following", icon: Users },
  { tab: "nearby", label: "Nearby", icon: MapPin },
];

/** Enough to scan without scrolling the rail; the rest are one click away. */
const CATEGORIES_SHOWN = 9;

export function DesktopFeedNav({
  lang,
  tab,
  onSelect,
}: {
  lang: string;
  tab: DesktopFeedTab;
  onSelect: (tab: DesktopFeedTab) => void;
}) {
  const { data, loading } = useQuery(DISCOVERY_CATEGORIES, {
    variables: {},
    fetchPolicy: "cache-first",
    nextFetchPolicy: "cache-first",
  });
  const categories = (data?.discoveryFacets?.categories ?? [])
    .filter(
      (category): category is CategoryFacet =>
        typeof category?.slug === "string" && (category.count ?? 0) > 0,
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, CATEGORIES_SHOWN);

  return (
    <nav aria-label="Browse" className="flex flex-col gap-4">
      <section className="rounded-2xl border border-default bg-elevated p-2">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {FILTERS.map(({ tab: value, label, icon: Icon }) => {
            const active = tab === value;
            return (
              <li key={value}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    onSelect(value);
                    if (active) window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-semibold transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-main hover:bg-surface"
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${
                      active ? "bg-primary text-white" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="size-4.5" strokeWidth={2.2} aria-hidden />
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-default bg-elevated px-2 pb-2 pt-4">
        <h2 className="mb-1.5 px-2.5 text-base font-black text-default">Shop by category</h2>
        <ul className="m-0 list-none p-0">
          {loading && !data
            ? Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex animate-pulse items-center gap-3 px-2.5 py-2" aria-hidden>
                  <span className="size-9 shrink-0 rounded-full bg-black/10 dark:bg-white/10" />
                  <span className="h-3 flex-1 rounded-full bg-black/10 dark:bg-white/10" />
                </li>
              ))
            : categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/${lang}/explore?category=${encodeURIComponent(category.slug)}`}
                    className="group flex items-center gap-3 rounded-xl px-2.5 py-2 no-underline transition-colors hover:bg-surface"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-main transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <CategoryGlyph slug={category.slug} className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-main">
                      {category.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {category.count.toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
        <Link
          href={`/${lang}/explore`}
          className="mt-1 flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-primary no-underline transition-colors hover:bg-surface"
        >
          See all in Market
          <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
        </Link>
      </section>
    </nav>
  );
}
