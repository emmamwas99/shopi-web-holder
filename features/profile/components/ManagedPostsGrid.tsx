"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleAlert, ImageIcon, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";
import { SHIMMER_PORTRAIT } from "@/lib/shimmer";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useBackDismiss } from "@/hooks/useBackDismiss";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CategoryPickerDrawer } from "@/features/create/components/CategoryPickerDrawer";
import { changedListingTextProblems } from "@/lib/listingText";
import {
  useManagedPostMutations,
  type ManagedPost,
} from "../hooks/useManagedPosts";
import {
  isHidden,
  matchesSearch,
  matchesStatusFilter,
  postPriceLabel,
  postProblem,
  postStatus,
  postThumb,
  shortDate,
  sortPosts,
  SORT_OPTIONS,
  STATUS_FILTERS,
  type SortKey,
  type StatusFilter,
} from "../lib/managedPost";
import { ConfirmSheet } from "./ConfirmSheet";
import { InventoryControls } from "./InventoryControls";
import { ManagedPostRow, StatusBadge } from "./ManagedPostRow";
import { ManagedPostSheet } from "./ManagedPostSheet";

interface Props {
  posts: ManagedPost[];
  hasMore: boolean;
  onLoadMore: () => void;
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
        {!live && (
          // Over a photo the badge needs a solid base under its tint.
          <span className="absolute left-2 top-2 rounded-[6px] bg-app">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
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

type EditFormState = {
  title: string;
  caption: string;
  amount: string;
  currency: string;
  negotiable: boolean;
  categoryId: string | null;
  categoryLabel: string | null;
};

/**
 * The seller's posts: a list on a phone, a tile grid on desktop, with status
 * chips, search and sort over the whole inventory. Tapping a post opens its
 * sheet (ManagedPostSheet), where every action lives; Edit and Delete open
 * over the sheet. Back closes whichever is on top.
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

  const [openId, setOpenId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<ManagedPost | null>(null);
  const [editState, setEditState] = useState<EditFormState | null>(null);
  // Title/description problems show once Save has been tried, then follow the
  // typing (see lib/listingText — only text the seller changed is checked).
  const [editTried, setEditTried] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedPost | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [renderCount, setRenderCount] = useState(RENDER_STEP);

  const {
    updatePost,
    setHidden,
    deletePost: removePost,
    loading: mutationBusy,
  } = useManagedPostMutations();

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Load the whole inventory, so the chip counts, search and sort cover every
  // post rather than the first page — a rejected post on page three otherwise
  // read as "Needs attention 0".
  useEffect(() => {
    if (hasMore && !loading) onLoadMoreRef.current();
  }, [hasMore, loading, posts.length]);

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
        attention: filter.key === "attention",
      })),
    [posts],
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

  // Render more as the end of the list comes into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || renderCount >= filteredPosts.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRenderCount((count) => count + RENDER_STEP);
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredPosts.length, renderCount]);

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

  const openEdit = (post: ManagedPost) => {
    setEditTried(false);
    setEditingPost(post);
    setEditState({
      title: post.title ?? "",
      caption: post.caption ?? "",
      amount: post.price.amount > 0 ? String(post.price.amount) : "",
      currency: post.price.currency ?? "KES",
      negotiable: post.price.negotiable ?? false,
      categoryId: post.categoryId ?? null,
      categoryLabel: post.category?.name ?? null,
    });
  };

  const closeEdit = useCallback(() => {
    setEditingPost(null);
    setEditState(null);
  }, []);

  async function handleToggleHidden(post: ManagedPost) {
    const hidden = !isHidden(post);
    try {
      await setHidden({ variables: { contentId: post.id, hidden } });
      toast.success(hidden ? "Hidden from your store" : "Back in your store");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update visibility");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await removePost({ variables: { contentId: deleteTarget.id } });
      toast.success("Post deleted");
      // Both sheets close together; useBackDismiss drops both entries at once.
      setDeleteTarget(null);
      setOpenId(null);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    }
  }

  async function handleSaveEdit() {
    if (!editingPost || !editState) return;
    setEditTried(true);
    const textProblems = changedListingTextProblems(editingPost, editState);
    if (textProblems.title || textProblems.description) return;
    const parsedAmount = editState.amount.trim() === "" ? 0 : Number(editState.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      toast.error("Enter a valid price");
      return;
    }

    try {
      await updatePost({
        variables: {
          contentId: editingPost.id,
          input: {
            title: editState.title.trim(),
            caption: editState.caption.trim(),
            categoryId: editState.categoryId,
            price: {
              amount: parsedAmount,
              currency: editState.currency.trim() || "KES",
              negotiable: editState.negotiable,
            },
          },
        },
      });
      toast.success("Post updated");
      closeEdit();
      // Refreshes the category name, which the edit mutation doesn't return.
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update");
    }
  }

  const editTextProblems =
    editingPost && editState
      ? changedListingTextProblems(editingPost, editState)
      : { title: null, description: null };

  // Save stays disabled until something actually differs from what is stored,
  // and the discard prompt only fires when there is something to lose.
  const editDirty = useMemo(() => {
    if (!editingPost || !editState) return false;
    const storedAmount = editingPost.price.amount > 0 ? String(editingPost.price.amount) : "";
    return (
      editState.title !== (editingPost.title ?? "") ||
      editState.caption !== (editingPost.caption ?? "") ||
      editState.amount !== storedAmount ||
      editState.negotiable !== (editingPost.price.negotiable ?? false) ||
      editState.categoryId !== (editingPost.categoryId ?? null)
    );
  }, [editingPost, editState]);

  const liveCount = chips.find((chip) => chip.key === "live")?.count ?? 0;

  const header = (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        {/* On a phone the screen's own top bar already says "My posts". */}
        <h2 className="hidden text-[15px] font-bold leading-tight text-main md:block">
          My posts
        </h2>
        <p className="hidden text-[13px] text-muted md:mt-1 md:block">
          {posts.length === 1 ? "1 post" : `${posts.length} posts`}
          {posts.length > 0 && ` · ${liveCount} live`}
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
                onOpen={openPostSheet}
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
        post={openPost}
        lang={lang}
        desktop={isDesktop}
        busy={mutationBusy}
        onClose={closePostSheet}
        onEdit={openEdit}
        onToggleHidden={(post) => void handleToggleHidden(post)}
        onDelete={setDeleteTarget}
      />

      <EditSurface
        desktop={isDesktop}
        open={Boolean(editingPost && editState)}
        busy={mutationBusy}
        dirty={editDirty}
        onClose={closeEdit}
        onSubmit={() => void handleSaveEdit()}
      >
        {editState && (
          // Price first: it is the field sellers open this sheet to change,
          // and putting it above the fold means the common edit needs no
          // scrolling at all.
          <div className="flex flex-col gap-4 md:gap-5">
            <FieldBlock label="Price" hint={editState.currency}>
              <Input
                inputMode="decimal"
                value={editState.amount}
                placeholder="Leave empty for “price on request”"
                className="h-11 rounded-xl text-[14px] placeholder:text-[13px] md:h-12 md:text-base"
                onChange={(event) =>
                  setEditState((current) =>
                    current ? { ...current, amount: event.target.value } : current,
                  )
                }
              />
            </FieldBlock>

            {/* The whole row toggles, as a settings row does; the switch is
                the accessible control. A <div>, not a <button>: the switch is
                itself a button, and buttons can't nest. */}
            <div
              onClick={() =>
                setEditState((current) =>
                  current ? { ...current, negotiable: !current.negotiable } : current,
                )
              }
              className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-default px-4 text-left"
            >
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-main">Negotiable</span>
                <span className="block text-[12px] text-muted">Buyers can make an offer</span>
              </span>
              <Switch
                checked={editState.negotiable}
                onCheckedChange={(checked) =>
                  setEditState((current) =>
                    current ? { ...current, negotiable: checked } : current,
                  )
                }
                aria-label="Negotiable"
                // The row toggles too; the switch must not double-fire on it.
                onClick={(event) => event.stopPropagation()}
              />
            </div>

            <FieldBlock label="Title" hint={`${editState.title.length}/140`}>
              <Input
                value={editState.title}
                maxLength={140}
                className="h-11 rounded-xl text-[14px] md:h-12 md:text-base"
                aria-invalid={Boolean(editTried && editTextProblems.title)}
                onChange={(event) =>
                  setEditState((current) =>
                    current ? { ...current, title: event.target.value } : current,
                  )
                }
              />
              {editTried && editTextProblems.title ? (
                <span className="block text-[12px] font-medium text-error">
                  {editTextProblems.title}
                </span>
              ) : null}
            </FieldBlock>

            <FieldBlock label="Description" hint={`${editState.caption.length}/2000`}>
              <Textarea
                value={editState.caption}
                maxLength={2000}
                rows={5}
                className="min-h-28 resize-none rounded-xl text-[14px] leading-5 md:min-h-32 md:text-base md:leading-relaxed"
                aria-invalid={Boolean(editTried && editTextProblems.description)}
                onChange={(event) =>
                  setEditState((current) =>
                    current ? { ...current, caption: event.target.value } : current,
                  )
                }
              />
              {editTried && editTextProblems.description ? (
                <span className="block text-[12px] font-medium text-error">
                  {editTextProblems.description}
                </span>
              ) : null}
            </FieldBlock>

            {isDesktop ? (
              <FieldBlock label="Category">
                <CategoryPickerDrawer
                  value={editState.categoryId}
                  fallbackLabel={editState.categoryLabel}
                  onChange={(id, name) =>
                    setEditState((current) =>
                      current
                        ? { ...current, categoryId: id, categoryLabel: name }
                        : current,
                    )
                  }
                />
              </FieldBlock>
            ) : null}

            <p className="text-[12px] leading-relaxed text-muted">
              Photos and location stay as published, so buyers always see the same item
              and pickup point.
            </p>
          </div>
        )}
      </EditSurface>

      <ConfirmSheet
        open={Boolean(deleteTarget)}
        desktop={isDesktop}
        title="Delete this post?"
        description="This can't be undone."
        confirmLabel="Delete post"
        busy={mutationBusy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      >
        {deleteTarget && (
          <div className="flex items-start gap-3 rounded-2xl bg-rose-500/10 px-4 py-3 text-rose-700 dark:text-rose-300">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-[14px] leading-relaxed">
              <strong>{deleteTarget.title || "This post"}</strong> will be removed from your
              store. Buyers will no longer see it.
            </p>
          </div>
        )}
      </ConfirmSheet>
    </>
  );
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string;
  /** Right-aligned counter or unit, sitting on the label's own line. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold text-main">{label}</span>
        {hint && <span className="shrink-0 text-[12px] tabular-nums text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function EditSurface({
  desktop,
  open,
  busy,
  dirty,
  onClose,
  onSubmit,
  children,
}: {
  desktop: boolean | null;
  open: boolean;
  busy: boolean;
  /** Whether anything actually changed — gates Save and the discard prompt. */
  dirty: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  const title = "Edit post";
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Back, the X, swipe-down and Cancel all come here. Unsaved changes get one
  // question first; Back while the question is showing means "keep editing".
  // Returning false keeps the sheet (and its Back step) in place.
  const attemptClose = useCallback((): boolean => {
    if (busy) return false;
    if (confirmDiscard) {
      setConfirmDiscard(false);
      return false;
    }
    if (dirty) {
      setConfirmDiscard(true);
      return false;
    }
    onClose();
    return true;
  }, [busy, confirmDiscard, dirty, onClose]);

  const { requestClose } = useBackDismiss(open, attemptClose);

  const discardPrompt = (
    <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
      <DialogContent className="z-[95] w-[min(88vw,340px)] rounded-3xl border-default bg-app" overlayClassName="z-[90]">
        <DialogHeader>
          <DialogTitle>Discard changes?</DialogTitle>
          <DialogDescription>Your edits to this post will not be saved.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmDiscard(false)}
            className="h-10 rounded-full border border-border px-4 text-[14px] font-semibold text-main"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmDiscard(false);
              onClose();
            }}
            className="h-10 rounded-full bg-rose-600 px-4 text-[14px] font-semibold text-white"
          >
            Discard
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (desktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
          <DialogContent className="z-[85] flex max-h-[86vh] w-[min(92vw,680px)] flex-col rounded-[28px] border border-default bg-app p-0" overlayClassName="z-[82]">
            <DialogHeader className="shrink-0 border-b border-default px-6 py-5 text-left">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                Price, title, description and category. Photos and location stay as
                published.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            <DialogFooter className="shrink-0 border-t border-default px-6 py-4">
              <Button variant="outline" onClick={requestClose} disabled={busy}>
                Cancel
              </Button>
              <Button className="text-white" onClick={onSubmit} disabled={busy || !dirty}>
                {busy ? <InterlockingBalls size={20} /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {discardPrompt}
      </>
    );
  }

  return (
    <>
      <Drawer open={open} onOpenChange={(next) => !next && requestClose()}>
        {/* A fixed-height sheet with its own scroller, so the keyboard can't
            push Save out of reach. It opens over the post sheet, a little
            shorter, so the post stays visible behind it. */}
        <DrawerContent className="mx-auto flex h-[84svh] w-full max-w-[480px] flex-col rounded-t-[20px] border-default bg-app">
          <DrawerHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-default px-4 py-2.5 text-left">
            <div className="min-w-0">
              <DrawerTitle className="text-[15px] font-semibold">{title}</DrawerTitle>
              <DrawerDescription className="sr-only">
                Update the price, title, description and category of this post
              </DrawerDescription>
            </div>
            <button
              type="button"
              onClick={requestClose}
              disabled={busy}
              className="-mr-1 h-9 shrink-0 rounded-full px-3 text-[14px] font-semibold text-muted transition-colors active:bg-surface"
            >
              Cancel
            </button>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-3">
            {children}
          </div>

          <div
            className="shrink-0 border-t border-default px-4 pt-2.5"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.625rem)" }}
          >
            <Button
              className="h-11 w-full rounded-full text-[14px] font-semibold text-white"
              onClick={onSubmit}
              disabled={busy || !dirty}
            >
              {busy ? <InterlockingBalls size={20} /> : null}
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
      {discardPrompt}
    </>
  );
}
