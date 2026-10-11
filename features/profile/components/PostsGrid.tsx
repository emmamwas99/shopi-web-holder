"use client";

import { useEffect, useRef } from "react";
import { Bookmark } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DISCOVER_GRID,
  DiscoverGridCard,
} from "@/features/discover/components/DiscoverGridCard";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";

/**
 * The profile's Saved tab.
 *
 * Renders the same tile as /explore rather than a bespoke one. A saved post is
 * a thing the user is still deciding about, so it should present exactly as it
 * did in the grid they saved it from — same cover ratio, same price-first
 * hierarchy, and the same save button, which here doubles as un-save without
 * leaving the tab. Two different-looking cards for the same listing was just a
 * second thing to maintain.
 *
 * The grid and skeleton deliberately copy /explore's column and gap classes so
 * rows line up identically across the two surfaces.
 *
 * This used to carry a second `variant: "posts"` layout for the user's own
 * listings. That moved to ManagedPostsGrid long ago and the branch was dead,
 * so it is gone along with its own empty state.
 */
interface Props {
  posts: ContentCardFieldsFragment[];
  hasMore: boolean;
  onLoadMore: () => void;
  loading: boolean;
  lang: string;
  hideHeading?: boolean;
}

export function PostsGrid({
  posts,
  hasMore,
  onLoadMore,
  loading,
  lang,
  hideHeading = false,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Keep the latest onLoadMore without re-subscribing the observer each render.
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  // Guard against firing again while a page is in flight (the observer can keep
  // intersecting until new rows push the sentinel out of view).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMoreRef.current();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, posts.length]);

  // Initial load — the Saved query is deferred until the tab is opened, so this
  // is the common first paint rather than an edge case.
  if (posts.length === 0 && loading) {
    return (
      <section className="px-4 py-5 sm:px-6 lg:px-8">
        <div className={DISCOVER_GRID}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-3/4 w-full rounded-xl" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-80 max-w-xl flex-col items-center justify-center text-center">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              backgroundColor: "rgb(var(--brand-primary) / 0.1)",
              color: "rgb(var(--brand-primary))",
            }}
          >
            <Bookmark size={24} strokeWidth={2} />
          </div>
          <h2
            className="font-bold"
            style={{
              fontSize: "var(--text-lg)",
              color: "rgb(var(--color-text))",
            }}
          >
            No saved posts yet
          </h2>
          <p
            className="mt-2 max-w-sm leading-snug"
            style={{
              fontSize: "var(--text-sm)",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            Tap the bookmark on any listing and it will wait for you here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-5 sm:px-6 lg:px-8">
      {!hideHeading && <div className="mb-4">
        <h2
          className="font-bold leading-tight"
          style={{
            fontSize: "var(--text-base)",
            color: "rgb(var(--color-text))",
          }}
        >
          Saved
        </h2>
        <p
          className="mt-1"
          style={{
            fontSize: "var(--text-sm)",
            color: "rgb(var(--color-text-muted))",
          }}
        >
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      </div>}

      <div className={DISCOVER_GRID}>
        {posts.map((post, index) => (
          <DiscoverGridCard
            key={post.id}
            post={post}
            lang={lang}
            priority={index < 4}
            // No save button here. Everything in this tab is saved, so the
            // control has nothing to say and is only a target to mis-tap.
            // Un-saving happens from the listing itself.
            showSave={false}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel + loader */}
      <div ref={sentinelRef} className="h-px" />
      {hasMore && loading && (
        <div
          className="flex justify-center py-6"
          style={{
            fontSize: "var(--text-sm)",
            color: "rgb(var(--color-text-muted))",
          }}
        >
          Loading…
        </div>
      )}
    </section>
  );
}
