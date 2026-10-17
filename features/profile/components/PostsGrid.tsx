"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, ChevronRight, ImageIcon, MapPin, Play } from "lucide-react";
import {
  DISCOVER_GRID,
  DiscoverGridCard,
  DiscoverGridSkeleton,
} from "@/features/discover/components/DiscoverGridCard";
import { contentPath } from "@/lib/content-url";
import { SHIMMER_PORTRAIT } from "@/lib/shimmer";
import { cn } from "@/lib/utils";
import { VerifiedIdBadge } from "@/components/verification/VerifiedIdBadge";
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
  /** Use compact saved rows on phones, keeping the discovery grid on desktop. */
  mobileList?: boolean;
}

function SavedPostRow({
  post,
  lang,
  priority,
}: {
  post: ContentCardFieldsFragment;
  lang: string;
  priority: boolean;
}) {
  const media = post.media.find((item) => item.mediaType === "IMAGE") ?? post.media[0];
  const thumbnail =
    media?.muxMeta?.thumbnailUrl ??
    media?.thumbnailUrl ??
    media?.r2Variants?.find((variant) => variant.variant === "medium")?.url ??
    media?.r2Variants?.[0]?.url ??
    media?.url ??
    media?.imageUrl ??
    null;
  const location = [post.location?.county, post.location?.placeName ?? post.location?.subregion]
    .filter((part, index, parts): part is string => Boolean(part) && parts.indexOf(part) === index)
    .join(", ");
  const price =
    post.price.amount > 0
      ? `${post.price.currency} ${Math.round(post.price.amount).toLocaleString("en-KE")}`
      : "Price on request";

  return (
    <li data-scroll-anchor={post.id}>
      <Link
        href={contentPath(lang, post)}
        scroll={false}
        className="flex w-full items-center gap-3 py-3 text-left transition-colors active:bg-surface"
        aria-label={`${post.title}, ${price}${
          post.creator?.isVerified ? ", Verified ID" : ""
        }${location ? `, ${location}` : ""}`}
      >
        <span className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-default bg-surface">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt=""
              fill
              sizes="64px"
              priority={priority}
              loading={priority ? "eager" : "lazy"}
              className="object-cover"
              placeholder="blur"
              blurDataURL={SHIMMER_PORTRAIT}
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted">
              <ImageIcon size={18} aria-hidden />
            </span>
          )}
          {post.type === "VIDEO" && (
            <span className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white">
              <Play size={9} fill="currentColor" strokeWidth={0} aria-hidden />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-main">
            {post.title || "Untitled post"}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-main">
              {price}
              {post.price.negotiable && post.price.amount > 0 ? " · Negotiable" : ""}
            </span>
            {post.creator?.isVerified ? (
              <VerifiedIdBadge className="px-1.5 py-0.5 text-[10px]" />
            ) : null}
          </span>
          {location ? (
            <span className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted">
              <MapPin size={12} className="shrink-0" aria-hidden />
              <span className="truncate">{location}</span>
            </span>
          ) : null}
        </span>

        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}

export function PostsGrid({
  posts,
  hasMore,
  onLoadMore,
  loading,
  lang,
  hideHeading = false,
  mobileList = false,
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
        {mobileList ? (
          <ul className="divide-y divide-border md:hidden" aria-label="Loading saved posts">
            {Array.from({ length: 6 }).map((_, index) => (
              <li key={index} className="flex items-center gap-3 py-3">
                <div className="size-16 shrink-0 animate-pulse rounded-lg bg-surface" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface" />
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-surface" />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <DiscoverGridSkeleton className={mobileList ? "hidden md:grid" : undefined} />
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
      {!hideHeading && <div className={cn("mb-4", mobileList && "hidden md:block")}>
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

      {mobileList ? (
        <ul className="divide-y divide-border md:hidden">
          {posts.map((post, index) => (
            <SavedPostRow key={post.id} post={post} lang={lang} priority={index < 4} />
          ))}
        </ul>
      ) : null}

      <div className={cn(DISCOVER_GRID, mobileList && "hidden md:grid")}>
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
