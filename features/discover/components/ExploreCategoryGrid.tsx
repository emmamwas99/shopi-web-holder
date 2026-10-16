"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryFacet } from "../categories";
import { CategoryGlyph } from "./CategoryGlyph";

const PAGE_COUNT = 2;
const CATEGORIES_PER_PAGE = 8;
const SKELETON_COUNT = CATEGORIES_PER_PAGE;

/**
 * The category shortcuts at the top of Explore on phones and tablets. The
 * categories are split into two two-row pages; the page itself is the snap
 * target, so a swipe always lands on a complete grid.
 *
 * Desktop leaves them out: its nav bar has the same categories in a menu.
 */
export function ExploreCategoryGrid({
  categories,
  loading = false,
  onSelect,
}: {
  categories: CategoryFacet[];
  loading?: boolean;
  onSelect: (category: CategoryFacet) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);
  const available = useMemo(
    () => categories.filter((category) => category.count > 0),
    [categories],
  );
  const pages = useMemo(() => {
    return [
      available.slice(0, CATEGORIES_PER_PAGE),
      available.slice(CATEGORIES_PER_PAGE),
    ];
  }, [available]);

  const syncActivePage = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const pageWidth = scroller.clientWidth;
    if (pageWidth <= 0) return;
    setActivePage(Math.min(PAGE_COUNT - 1, Math.round(scroller.scrollLeft / pageWidth)));
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    syncActivePage();
    const observer = new ResizeObserver(syncActivePage);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [syncActivePage, available.length, loading]);

  if (!loading && available.length === 0) return null;
  const showSkeleton = loading && available.length === 0;

  return (
    <section aria-label="Categories" className="pb-1 pt-3 lg:hidden">
      <div
        ref={scrollerRef}
        onScroll={syncActivePage}
        className="no-scroll-indicator mx-3 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {showSkeleton
          ? Array.from({ length: PAGE_COUNT }, (_, pageIndex) => (
              <div
                key={`skeleton-page-${pageIndex}`}
                className="grid w-full shrink-0 snap-start [scroll-snap-stop:always] grid-cols-4 gap-x-1 gap-y-3"
              >
                {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-1.5 pt-px"
                  >
                    <Skeleton className="h-13 w-13 rounded-full" />
                    <div className="flex h-7 items-start pt-0.5">
                      <Skeleton className="h-2.5 w-12 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ))
          : pages.map((page, pageIndex) => (
              <div
                key={`category-page-${pageIndex}`}
                className="grid w-full shrink-0 snap-start [scroll-snap-stop:always] grid-cols-4 gap-x-1 gap-y-3"
              >
                {page.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onSelect(category)}
                    data-scroll-anchor={`category:${category.id}`}
                    aria-label={`Show ${category.name} category`}
                    className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-0.5 pt-px text-center outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-subtle text-main transition-transform duration-150 group-active:scale-95">
                      <CategoryGlyph slug={category.slug} className="h-[22px] w-[22px]" />
                    </span>
                    <span className="line-clamp-2 w-full text-[11px] font-medium leading-[14px] text-main">
                      {category.name}
                    </span>
                  </button>
                ))}
              </div>
            ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5" role="group" aria-label="Category pages">
        {Array.from({ length: PAGE_COUNT }, (_, pageIndex) => (
          <button
            key={pageIndex}
            type="button"
            aria-label={`Go to category page ${pageIndex + 1}`}
            aria-current={activePage === pageIndex ? "true" : undefined}
            onClick={() => {
              const scroller = scrollerRef.current;
              if (!scroller) return;
              scroller.scrollTo({
                left: pageIndex * scroller.clientWidth,
                behavior: "smooth",
              });
            }}
            className={`size-2 rounded-full transition-colors ${
              activePage === pageIndex ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
