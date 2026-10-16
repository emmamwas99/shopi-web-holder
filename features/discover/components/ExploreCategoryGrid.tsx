"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryFacet } from "../categories";
import { CategoryGlyph } from "./CategoryGlyph";

const SKELETON_COUNT = 8;

/**
 * The category shortcuts at the top of Explore on phones and tablets: two rows
 * that scroll sideways with four whole columns to a screen, snapping to a
 * column whenever the row comes to rest. Columns used to be a fixed width, so
 * the row stopped wherever the swipe ran out, often with half a column cut off
 * at the edge (the clipped "…ve" of Automotive). A slim bar underneath says how
 * much more there is to the side.
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
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const available = useMemo(
    () => categories.filter((category) => category.count > 0),
    [categories],
  );

  // The indicator is driven straight from the scroll position — no state, so
  // scrolling never re-renders the row.
  const syncIndicator = useCallback(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!scroller || !track || !thumb) return;
    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    const hidden = scrollWidth - clientWidth;
    track.style.visibility = hidden > 1 ? "visible" : "hidden";
    if (hidden <= 1) return;
    const trackWidth = track.clientWidth;
    const thumbWidth = Math.max(10, trackWidth * (clientWidth / scrollWidth));
    const progress = Math.min(1, Math.max(0, scrollLeft / hidden));
    thumb.style.width = `${thumbWidth}px`;
    thumb.style.transform = `translateX(${progress * (trackWidth - thumbWidth)}px)`;
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    syncIndicator();
    const observer = new ResizeObserver(syncIndicator);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [syncIndicator, available.length, loading]);

  if (!loading && available.length === 0) return null;
  const showSkeleton = loading && available.length === 0;

  return (
    <section aria-label="Categories" className="pb-1 pt-3 lg:hidden">
      {/* Each column is an exact quarter of the visible width (a sixth from
          sm, a fixed 88px from md, where all of them fit), and the scroll
          snaps to column starts, so every resting position — the far end
          included — has whole columns at both edges. The side space is
          margin, not padding: a scroller paints its padding, so the next
          column showed through it as a sliver of label. */}
      <div
        ref={scrollerRef}
        onScroll={syncIndicator}
        className="no-scroll-indicator mx-3 grid snap-x snap-mandatory auto-cols-[calc((100%-12px)/4)] grid-flow-col grid-rows-2 gap-x-1 gap-y-3 overflow-x-auto overscroll-x-contain sm:auto-cols-[calc((100%-20px)/6)] md:auto-cols-[88px] md:justify-center"
      >
        {showSkeleton
          ? Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <div
                key={index}
                className="flex snap-start flex-col items-center gap-1.5 pt-px"
              >
                <Skeleton className="h-13 w-13 rounded-full" />
                {/* The height of a two-line label, so nothing moves on load. */}
                <div className="flex h-7 items-start pt-0.5">
                  <Skeleton className="h-2.5 w-14 rounded-full" />
                </div>
              </div>
            ))
          : available.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelect(category)}
                data-scroll-anchor={`category:${category.id}`}
                aria-label={`Show ${category.name} category`}
                className="group flex min-w-0 snap-start flex-col items-center gap-1.5 rounded-xl px-0.5 pt-px text-center outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-subtle text-main transition-transform duration-150 group-active:scale-95">
                  <CategoryGlyph slug={category.slug} className="h-[22px] w-[22px]" />
                </span>
                {/* 14px lines: at 13 the clamp's clipping box shaved the
                    descenders off a last line ("Gigs", "Beverages"). */}
                <span className="line-clamp-2 w-full text-[11px] font-medium leading-[14px] text-main">
                  {category.name}
                </span>
              </button>
            ))}
      </div>

      <div
        ref={trackRef}
        aria-hidden
        className="invisible mx-auto mt-3 h-[3px] w-9 overflow-hidden rounded-full bg-border"
      >
        <span
          ref={thumbRef}
          className="block h-full w-1/2 rounded-full bg-main will-change-transform"
        />
      </div>
    </section>
  );
}
