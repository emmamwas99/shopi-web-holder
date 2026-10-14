"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscoveryFeedDocument } from "@/types/__generated__/graphql";
import type { CategoryFacet } from "../categories";

const PAGE_SIZE = 8;

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
  const pages = useMemo(() => {
    const available = categories.filter((category) => category.count > 0);
    const chunks: CategoryFacet[][] = [];
    for (let index = 0; index < available.length; index += PAGE_SIZE) {
      chunks.push(available.slice(index, index + PAGE_SIZE));
    }
    return chunks;
  }, [categories]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, clientWidth } = event.currentTarget;
    if (clientWidth > 0) {
      setActivePage(Math.round(scrollLeft / clientWidth));
    }
  }, []);

  const showPage = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ left: index * scroller.clientWidth, behavior: "smooth" });
  }, []);

  if (!loading && pages.length === 0) return null;

  return (
    <section aria-label="Categories" className="px-4 pb-3 pt-4 lg:hidden">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="no-scroll-indicator flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {loading && pages.length === 0 ? (
          <div className="grid w-full shrink-0 grid-cols-4 grid-rows-2 gap-x-2 gap-y-4">
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <Skeleton className="h-14 w-14 rounded-full" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          pages.map((page, pageIndex) => (
            <div
              key={page[0]?.id ?? pageIndex}
              className="grid w-full shrink-0 snap-start grid-cols-4 grid-rows-2 gap-x-2 gap-y-4 md:gap-x-4 md:gap-y-5"
            >
              {page.map((category) => {
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onSelect(category)}
                    data-scroll-anchor={`category:${category.id}`}
                    className="flex min-w-0 cursor-pointer flex-col items-center gap-1.5 text-center text-foreground active:opacity-70"
                    aria-label={`Show ${category.name} category`}
                  >
                    <ExploreCategoryThumbnail
                      category={category}
                      enabled={pageIndex === activePage}
                    />
                    <span className="line-clamp-2 min-h-8 text-[11px] font-medium leading-[1.15]">
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {pages.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5" aria-label="Category pages">
          {pages.map((page, index) => (
            <button
              key={page[0]?.id ?? index}
              type="button"
              onClick={() => showPage(index)}
              className={`h-1.5 rounded-full transition-all ${
                activePage === index ? "w-4 bg-primary" : "w-1.5 bg-muted"
              }`}
              aria-label={`Show category page ${index + 1}`}
              aria-current={activePage === index ? "true" : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ExploreCategoryThumbnail({
  category,
  enabled,
}: {
  category: CategoryFacet;
  enabled: boolean;
}) {
  const { data, loading } = useQuery(DiscoveryFeedDocument, {
    variables: { categoryId: category.id, sort: "NEWEST", limit: 1 },
    skip: !enabled || Boolean(category.imageUrl),
    fetchPolicy: "cache-first",
  });
  const media = data?.discoveryFeed?.items?.[0]?.media?.[0];
  const listingImage =
    media?.thumbnailUrl ?? media?.imageUrl ?? media?.muxMeta?.thumbnailUrl;
  const categoryImage = category.imageUrl?.trim();

  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 p-1 text-primary">
      {categoryImage || listingImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={categoryImage ?? listingImage ?? ""}
          alt=""
          className="h-full w-full object-contain"
        />
      ) : loading ? (
        <Skeleton className="h-full w-full rounded-none" />
      ) : null}
    </span>
  );
}
