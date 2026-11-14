"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, Play, Plus } from "lucide-react";
import { SHIMMER_PORTRAIT } from "@/lib/shimmer";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { ManagedPost } from "../hooks/useManagedPosts";
import {
  isHidden,
  matchesSearch,
  matchesStatusFilter,
  postPriceLabel,
  postProblem,
  postStatus,
  postThumb,
  runningBoost,
  shortDate,
  sortPosts,
  SORT_OPTIONS,
  STATUS_FILTERS,
  type SortKey,
  type StatusFilter,
} from "../lib/managedPost";
import { InventoryControls } from "./InventoryControls";
import { useManagedPostActions } from "./ManagedPostActions";
import { BoostedBadge, ManagedPostRow, StatusBadge } from "./ManagedPostRow";
import { ManagedPostSheet } from "./ManagedPostSheet";

interface Props {
  posts: ManagedPost[];
  hasMore: boolean;
  onLoadMore: () => void | Promise<unknown>;
  loading: boolean;
  lang: string;
  onRefresh: () => Promise<unknown> | void;
}

const MANAGED_POSTS_GRID =
  "grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 md:gap-x-4 md:gap-y-6 xl:grid-cols-4 min-[90rem]:grid-cols-5";

/** Rows rendered per step. Big shops hold hundreds of posts. */
const RENDER_STEP = 40;

/**
 * One post as a desktop tile. The photo is the tile; status shows only when
 * the post is not live, so a grid of healthy posts stays quiet and the one
 * rejected post stands out. The whole tile opens the post panel.
 */
function InventoryTile({
  post,
  priority,
  onOpen,
}: {
  post: ManagedPost;
  priority: boolean;
  onOpen: (post: ManagedPost) => void;
}) {
  const thumb = postThumb(post);
  const status = postStatus(post);
  const problem = postProblem(post);
  const hidden = isHidden(post);
  const live = post.status === "ACTIVE" && post.isLive && !hidden;

  return (
    <article data-scroll-anchor={post.id} className="group flex flex-col">
      <button
        type="button"
        onClick={() => onOpen(post)}
        className="relative aspect-4/5 w-full overflow-hidden rounded-xl bg-surface text-left"
        aria-label={`Open ${post.title || "untitled post"}`}
      >
        {thumb ? (
          <Image
            src={thumb}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 1024px) 33vw, 20vw"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            placeholder="blur"
            blurDataURL={SHIMMER_PORTRAIT}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted">
            <ImageIcon size={22} aria-hidden />
          </span>
        )}
        {hidden && <span className="absolute inset-0 bg-black/35" aria-hidden />}
        {(!live || runningBoost(post)) && (
          <span className="absolute left-2 top-2 flex flex-wrap gap-1">
            {!live && (
              // Over a photo the badge needs a solid base under its tint.
              <span className="rounded-[6px] bg-app">
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </span>
            )}
            <BoostedBadge post={post} onPhoto />
          </span>
        )}
        {post.type === "VIDEO" && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white">
              <Play size={16} fill="currentColor" strokeWidth={0} className="ml-0.5" />
            </span>
          </span>
        )}
      </button>

      <div className="flex min-w-0 flex-col gap-0.5 px-0.5 pt-2">
        <p
          className={cn(
            "truncate text-[14px] font-bold",
            post.price.amount > 0 ? "text-main" : "text-muted",
          )}
        >
          {postPriceLabel(post)}
          {post.price.negotiable && post.price.amount > 0 && (
            <span className="ml-1 text-[11px] font-semibold text-muted">· neg</span>
          )}
        </p>
        <p className="truncate text-[12px] leading-snug text-muted">
          {post.title || "Untitled post"}
        </p>
        {problem ? (
          <p className="truncate text-[11px] font-medium leading-snug text-rose-600 dark:text-rose-400">
            {problem}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-[12px] text-muted">
            <span>
              {fmtCompact(post.stats.views)} {post.stats.views === 1 ? "view" : "views"}
            </span>
            <span className="ml-auto shrink-0">{shortDate(post.createdAt)}</span>
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * The seller's posts: a list on a phone, a tile grid on desktop, with status
 * chips, search and sort over the whole inventory. On a phone a post opens as
 * its own page (ManagedPostPage); on desktop, in a side panel
 * (ManagedPostSheet). Both use the same actions (useManagedPostActions).
 */
export function ManagedPostsGrid({
  posts,
  hasMore,
  onLoadMore,
  loading,
  lang,
  onRefresh,
}: Props) {
  const isDesktop = useIsDesktop({ ssrDefault: false });
  const onLoadMoreRef = useRef(onLoadMore);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingMoreRef = useRef(false);

  const router = useRouter();
  // Desktop only: the post open in the side panel. On a phone a post is its
  // own page (/profile/posts/[id]).
  const [openId, setOpenId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [renderCount, setRenderCount] = useState(RENDER_STEP);

  const actions = useManagedPostActions({
    desktop: isDesktop,
    onRefresh,
    onDeleted: () => setOpenId(null),
  });

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // The open post, read from the live list: after an edit or a hide the
  // mutation updates the cache, and the sheet shows the new state in place.
  const openPost = useMemo(
    () => (openId ? (posts.find((post) => post.id === openId) ?? null) : null),
    [openId, posts],
  );

  const chips = useMemo(
    () =>
      STATUS_FILTERS.map((filter) => ({
        ...filter,
        count: posts.filter((post) => matchesStatusFilter(post, filter.key)).length,
        countSuffix: hasMore ? "+" : "",
        attention: filter.key === "attention",
      })),
    [hasMore, posts],
  );

  const filteredPosts = useMemo(
    () =>
      sortPosts(
        posts.filter(
          (post) => matchesStatusFilter(post, statusFilter) && matchesSearch(post, search),
        ),
        sort,
      ),
    [posts, search, sort, statusFilter],
  );
  const renderedPosts = filteredPosts.slice(0, renderCount);

  // Render the next visible batch or fetch the next server page as the end of
  // the inventory comes into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (
      !sentinel ||
      (renderCount >= filteredPosts.length && (!hasMore || loading))
    ) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        if (renderCount < filteredPosts.length) {
          setRenderCount((count) => count + RENDER_STEP);
          return;
        }

        if (!hasMore || loading || fetchingMoreRef.current) return;
        fetchingMoreRef.current = true;
        void Promise.resolve(onLoadMoreRef.current())
          .catch(() => {})
          .finally(() => {
            fetchingMoreRef.current = false;
          });
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredPosts.length, hasMore, loading, posts.length, renderCount]);

  // A new view starts from its top.
  const changeFilter = (key: StatusFilter) => {
    setStatusFilter(key);
    setRenderCount(RENDER_STEP);
  };
  const changeSearch = (value: string) => {
    setSearch(value);
    setRenderCount(RENDER_STEP);
  };
  const changeSort = (key: SortKey) => {
    setSort(key);
    setRenderCount(RENDER_STEP);
  };

  const openPostSheet = useCallback((post: ManagedPost) => setOpenId(post.id), []);
  const closePostSheet = useCallback(() => setOpenId(null), []);
  const openPostPage = useCallback(
    (post: ManagedPost) => router.push(`/${lang}/profile/posts/${post.id}`),
    [lang, router],
  );

  const liveCount = chips.find((chip) => chip.key === "live")?.count ?? 0;

  const header = (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        {/* On a phone the screen's own top bar already says "My posts". */}
        <h2 className="hidden text-[15px] font-bold leading-tight text-main md:block">
          My posts
        </h2>
        <p className="hidden text-[13px] text-muted md:mt-1 md:block">
          {posts.length}{hasMore ? "+" : ""} {posts.length === 1 && !hasMore ? "post" : "posts"}
          {posts.length > 0 && ` · ${liveCount}${hasMore ? "+" : ""} live`}
        </p>
      </div>
      <Link
        href={`/${lang}/upload`}
        className="hidden h-9 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-primary px-3.5 text-sm font-medium text-white transition-opacity active:opacity-80 md:inline-flex"
      >
        <Plus className="size-4" />
        New post
      </Link>
    </div>
  );

  if (posts.length === 0 && loading) {
    return (
      <section className="px-4 py-4 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-4 w-28 rounded" />
        <Skeleton className="mb-3 h-10 w-full rounded-xl" />
        <div className="mb-3 flex gap-2">
          {[64, 56, 80, 112].map((width) => (
            <Skeleton key={width} className="h-8 shrink-0 rounded-full" style={{ width }} />
          ))}
        </div>
        {isDesktop ? (
          <div className={MANAGED_POSTS_GRID}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col">
                <Skeleton className="aspect-4/5 w-full rounded-xl" />
                <div className="space-y-1.5 px-0.5 pt-2">
                  <Skeleton className="h-3.5 w-2/3 rounded" />
                  <Skeleton className="h-3 w-4/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="size-12 shrink-0 rounded-[8px]" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <Skeleton className="h-4 w-16 rounded-[6px]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-72 max-w-sm flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface text-primary">
            <Plus size={24} />
          </div>
          <h3 className="text-[17px] font-bold text-main">No posts yet</h3>
          <p className="mt-2 text-[14px] leading-6 text-muted">
            Post your first item and manage its price, visibility and views from here.
          </p>
          <Link
            href={`/${lang}/upload`}
            className="mt-5 hidden h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-white transition-transform active:scale-[0.98] md:inline-flex"
          >
            <Plus size={17} />
            New post
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="px-4 py-4 sm:px-6 lg:px-8">
        {header}

        <InventoryControls
          search={search}
          onSearchChange={changeSearch}
          searchPlaceholder="Search title or listing no."
          chips={chips}
          filter={statusFilter}
          onFilterChange={changeFilter}
          sortOptions={SORT_OPTIONS}
          sort={sort}
          onSortChange={changeSort}
        />

        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <p className="text-[15px] font-semibold text-main">
              {search ? `Nothing matches “${search.trim()}”` : "Nothing here"}
            </p>
            <p className="mt-1 text-[14px] text-muted">
              {search ? "Try another word or listing number." : "No posts have this status."}
            </p>
            <button
              type="button"
              onClick={() => {
                changeSearch("");
                changeFilter("all");
              }}
              className="mt-4 h-9 rounded-full bg-surface px-4 text-[14px] font-semibold text-main active:opacity-70"
            >
              Show all posts
            </button>
          </div>
        ) : isDesktop ? (
          <div className={MANAGED_POSTS_GRID}>
            {renderedPosts.map((post, index) => (
              <InventoryTile
                key={post.id}
                post={post}
                priority={index < 6}
                onOpen={openPostSheet}
              />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {renderedPosts.map((post, index) => (
              <ManagedPostRow
                key={post.id}
                post={post}
                priority={index < 8}
                onOpen={openPostPage}
              />
            ))}
          </ul>
        )}

        <div ref={sentinelRef} className="h-px" />
        {hasMore && loading && (
          <div className="flex justify-center py-6 text-[13px] text-muted">
            Loading more posts…
          </div>
        )}
      </section>

      <ManagedPostSheet
        post={isDesktop ? openPost : null}
        lang={lang}
        desktop={isDesktop}
        busy={actions.busy}
        onClose={closePostSheet}
        onEdit={actions.openEdit}
        onToggleHidden={actions.toggleHidden}
        onDelete={actions.requestDelete}
      />

      {actions.surfaces}
    </>
  );
}
