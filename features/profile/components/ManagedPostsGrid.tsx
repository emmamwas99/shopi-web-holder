"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, Bookmark, CircleAlert, Eye, Globe, MoreHorizontal, Play, Plus, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { SHIMMER_PORTRAIT } from "@/lib/shimmer";
import { useIsDesktop } from "@/hooks/useIsDesktop";
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
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryPickerDrawer } from "@/features/create/components/CategoryPickerDrawer";
import { contentPath } from "@/lib/content-url";
import {
  useManagedPostMutations,
  type ManagedPost,
} from "../hooks/useManagedPosts";

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

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatPrice(amount: number, currency: string) {
  if (amount <= 0) return "Custom";
  return `${currency} ${Math.round(amount).toLocaleString("en-KE")}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
  });
}

function getPostThumb(post: ManagedPost) {
  const firstMedia = post.media?.[0];
  if (post.type === "IMAGE") {
    return (
      firstMedia?.r2Variants?.find((v) => v.variant === "original")?.url ??
      firstMedia?.r2Variants?.find((v) => v.variant === "large")?.url ??
      firstMedia?.r2Variants?.find((v) => v.variant === "medium")?.url ??
      firstMedia?.url ??
      firstMedia?.r2Variants?.[0]?.url ??
      firstMedia?.thumbnailUrl ??
      null
    );
  }

  const muxPlaybackId = firstMedia?.muxMeta?.playbackId;
  const muxDerivedThumb = muxPlaybackId
    ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=0&width=540&fit_mode=smartcrop`
    : null;

  return (
    firstMedia?.muxMeta?.thumbnailUrl ??
    firstMedia?.thumbnailUrl ??
    firstMedia?.r2Variants?.find((v) => v.variant === "medium")?.url ??
    firstMedia?.r2Variants?.[0]?.url ??
    firstMedia?.url ??
    muxDerivedThumb ??
    null
  );
}

function statusCopy(post: ManagedPost) {
  switch (post.status) {
    case "ACTIVE":
      return {
        label: post.isLive ? "Live" : "Approved",
        tone: "success",
        helper: post.isLive ? "Visible to buyers" : "Awaiting media ready",
      } as const;
    case "PENDING_REVIEW":
      return {
        label: "Pending review",
        tone: "warning",
        helper: "Waiting for approval",
      } as const;
    case "PROCESSING":
      return {
        label: "Processing",
        tone: "info",
        helper: "Preparing media",
      } as const;
    case "REJECTED":
      return {
        label: "Rejected",
        tone: "danger",
        helper: "Needs changes before relisting",
      } as const;
    case "FAILED":
      return {
        label: "Failed",
        tone: "danger",
        helper: "Needs a retry or update",
      } as const;
    case "UNDER_REVIEW":
      return {
        label: "Under review",
        tone: "warning",
        helper: "Moderation is checking it",
      } as const;
    default:
      return {
        label: "Draft",
        tone: "neutral",
        helper: "Not visible yet",
      } as const;
  }
}

function toneClasses(
  tone: "success" | "warning" | "danger" | "info" | "neutral",
) {
  switch (tone) {
    case "success":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "warning":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "danger":
      return "bg-rose-500/10 text-rose-700 border-rose-500/20";
    case "info":
      return "bg-sky-500/10 text-sky-700 border-sky-500/20";
    default:
      return "bg-slate-500/10 text-slate-700 border-slate-500/20";
  }
}

/**
 * One listing in the seller's inventory.
 *
 * Designed around the job: a seller scans this grid looking for problems, not
 * for reassurance. So the media stays clean and the chrome is spent on
 * exceptions — a status badge appears only when a post is NOT live, and the
 * helper line only when there is something to act on. A grid of green "Live"
 * pills told the seller nothing and buried the one rejected post.
 *
 * The previous card carried the same facts twice: a dark gradient over the
 * image with title, date and price, then another block below it with stat
 * chips, a helper sentence and an "Insights" button. That made every tile tall
 * and noisy, and the button was redundant because the whole card already opens
 * insights. Title and price now live below the image as ordinary type, which
 * reads faster and lets the photo be a photo.
 */
function InventoryCard({
  post,
  lang,
  priority,
  onOpenActions,
}: {
  post: ManagedPost;
  lang: string;
  priority: boolean;
  onOpenActions: (post: ManagedPost) => void;
}) {
  const thumb = getPostThumb(post);
  const isVideo = post.type === "VIDEO";
  const status = statusCopy(post);
  const isLive = post.status === "ACTIVE" && post.isLive;
  const isHidden = post.visibility !== "PUBLIC";
  // Rejection reasons are the one helper worth interrupting for; otherwise the
  // badge already says what the state is.
  const problem =
    post.status === "REJECTED" || post.status === "FAILED"
      ? (post.approval?.rejectionReason ?? status.helper)
      : null;

  return (
    <article
      data-scroll-anchor={post.id}
      className="group relative flex flex-col"
    >
      {/* Same shape as the Discover and Saved tiles: the photo IS the tile, no
          panel or border behind it, and the text sits underneath. A bordered
          card around forty small thumbnails reads as a spreadsheet. Only the
          seller chrome on top — status, the actions menu — is different, and it
          is different because this grid has a different job. */}
      <div
        className="relative aspect-3/4 w-full overflow-hidden rounded-xl md:aspect-4/5"
        style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
      >
        {/* The whole tile opens insights. Sits under the menu button's z-30. */}
        <Link
          href={`/${lang}/profile/posts/${post.id}`}
          className="absolute inset-0 z-10"
          aria-label={`Open insights for ${post.title || "untitled post"}`}
        />

        {thumb ? (
          <Image
            src={thumb}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            placeholder="blur"
            blurDataURL={SHIMMER_PORTRAIT}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
          >
            <span
              className="px-4 text-center font-medium"
              style={{
                fontSize: "var(--text-xs)",
                color: "rgb(var(--color-text-muted))",
              }}
            >
              No preview yet
            </span>
          </div>
        )}

        {/* Exceptions only, and only ever one of them. A tile carrying both a
            status pill and a "Hidden" pill spent its top edge explaining
            itself; hidden IS the status when it applies. A live, public post
            shows nothing at all. */}
        {(!isLive || isHidden) && (
          <div className="absolute inset-x-0 top-0 z-20 flex p-2 pr-11">
            <span
              className={cn(
                "truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold ",
                isHidden
                  ? "border-black/10 bg-white/85 text-slate-700"
                  : toneClasses(status.tone),
              )}
            >
              {isHidden ? "Hidden" : status.label}
            </span>
          </div>
        )}

        {/* A dimmed cover is the fastest read for "this is not on the store" —
            faster than any label, and it works down at thumbnail size. */}
        {isHidden && (
          <span
            className="pointer-events-none absolute inset-0 z-10 bg-black/35"
            aria-hidden
          />
        )}

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onOpenActions(post);
          }}
          // 36px, up from 32: this is the only control on the tile and it sat
          // under the 44px a thumb actually needs.
          className="absolute right-1.5 top-1.5 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white  transition-transform active:scale-90"
          aria-label={`Manage ${post.title || "post"}`}
        >
          <MoreHorizontal size={18} />
        </button>

        {isVideo && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white ">
              <Play size={16} fill="currentColor" strokeWidth={0} className="ml-0.5" />
            </span>
          </span>
        )}
      </div>

      {/* Price leads, because it is the field sellers check and change most.
          The block is a fixed three rows tall so tiles line up across the grid:
          it previously grew by a line whenever a title wrapped or a rejection
          note appeared, which left every row of the grid ragged and made the
          whole tab look unfinished. */}
      <div className="flex min-w-0 flex-col gap-0.5 px-0.5 pt-2">
        <div className="flex items-baseline gap-1.5">
          <p
            className="min-w-0 truncate font-bold"
            style={{
              fontSize: "var(--text-sm)",
              color: "rgb(var(--color-text))",
            }}
          >
            {post.price.amount > 0
              ? formatPrice(post.price.amount, post.price.currency)
              : "No price"}
          </p>
          {post.price.negotiable && (
            <span
              className="shrink-0 text-[10px] font-semibold"
              style={{ color: "rgb(var(--color-text-muted))" }}
            >
              · neg
            </span>
          )}
        </div>

        {/* One line, not two. At two columns on a phone a wrapped title pushed
            the stats out of alignment with the tile beside it for no gain —
            the photo already says what the thing is. */}
        <p
          className="truncate leading-snug"
          style={{
            fontSize: "var(--text-xs)",
            color: "rgb(var(--color-text-muted))",
          }}
        >
          {post.title || "Untitled post"}
        </p>

        {/* Either the numbers or the problem, never stacked. A rejected post
            has nothing worth reporting about its views. */}
        {problem ? (
          <p className="truncate text-[11px] font-medium leading-snug text-rose-600">
            {problem}
          </p>
        ) : (
          <div
            className="flex items-center gap-2.5"
            style={{
              fontSize: "var(--text-xs)",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            <span className="flex items-center gap-1">
              <Eye size={12} aria-hidden />
              {formatCompact(post.stats.views)}
            </span>
            <span className="flex items-center gap-1">
              <Bookmark size={12} aria-hidden />
              {formatCompact(post.stats.saves)}
            </span>
            <span className="ml-auto shrink-0 truncate">
              {formatDate(post.updatedAt)}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

function SectionShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2
              className="font-bold leading-tight"
              style={{
                fontSize: "15px",
                color: "rgb(var(--color-text))",
              }}
            >
              {title}
            </h2>
            <p
              className="mt-1"
              style={{
                fontSize: "13px",
                color: "rgb(var(--color-text-muted))",
              }}
            >
              {subtitle}
            </p>
          </div>
          {right}
        </div>
        {children}
      </div>
    </section>
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

type StatusFilter = "all" | "active" | "review" | "attention" | "hidden";
type SortKey = "recent" | "priceHigh" | "views";

function matchesStatusFilter(post: ManagedPost, filter: StatusFilter) {
  switch (filter) {
    case "active":
      return post.status === "ACTIVE";
    case "review":
      return (
        post.status === "PENDING_REVIEW" ||
        post.status === "UNDER_REVIEW" ||
        post.status === "PROCESSING"
      );
    case "attention":
      return post.status === "REJECTED" || post.status === "FAILED";
    case "hidden":
      return post.visibility !== "PUBLIC";
    default:
      return true;
  }
}

function sortPosts(posts: ManagedPost[], sortBy: SortKey) {
  const copy = [...posts];
  switch (sortBy) {
    case "priceHigh":
      return copy.sort((a, b) => b.price.amount - a.price.amount);
    case "views":
      return copy.sort((a, b) => b.stats.views - a.stats.views);
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }
}

export function ManagedPostsGrid({
  posts,
  hasMore,
  onLoadMore,
  loading,
  lang,
  onRefresh,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const isDesktop = useIsDesktop({ ssrDefault: false });
  const [actionsPost, setActionsPost] = useState<ManagedPost | null>(null);
  const [editingPost, setEditingPost] = useState<ManagedPost | null>(null);
  const [deletePost, setDeletePost] = useState<ManagedPost | null>(null);
  const [editState, setEditState] = useState<EditFormState | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const {
    updatePost,
    setHidden,
    deletePost: removePost,
    loading: mutationBusy,
  } = useManagedPostMutations();

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Eagerly load the full inventory so the status filter counts and the
  // filtered results reflect every post — not just the first page. Without
  // this, statuses further down the paginated list (e.g. "Needs attention")
  // read 0 until more pages happen to load in.
  useEffect(() => {
    if (hasMore && !loading) onLoadMoreRef.current();
  }, [hasMore, loading, posts.length]);

  const openEdit = (post: ManagedPost) => {
    setActionsPost(null);
    setEditingPost(post);
    setEditState({
      title: post.title ?? "",
      caption: post.caption ?? "",
      amount: String(post.price.amount ?? 0),
      currency: post.price.currency ?? "KES",
      negotiable: post.price.negotiable ?? false,
      categoryId: post.categoryId ?? null,
      categoryLabel: null,
    });
  };

  async function refreshAndClose() {
    await onRefresh();
    setActionsPost(null);
  }

  async function handleToggleHidden(post: ManagedPost) {
    try {
      const hidden = post.visibility === "PUBLIC";
      await setHidden({
        variables: { contentId: post.id, hidden },
      });
      toast.success(hidden ? "Post hidden" : "Post shown again");
      await refreshAndClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update visibility",
      );
    }
  }

  async function handleDelete() {
    if (!deletePost) return;
    try {
      await removePost({ variables: { contentId: deletePost.id } });
      toast.success("Post deleted");
      setDeletePost(null);
      setActionsPost(null);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    }
  }

  async function handleSaveEdit() {
    if (!editingPost || !editState) return;
    const parsedAmount = Number(editState.amount);
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
      setEditingPost(null);
      setEditState(null);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update");
    }
  }

  const createdCountLabel =
    posts.length === 1
      ? "1 post in your inventory"
      : `${posts.length} posts in your inventory`;

  const filterChips = useMemo(
    () => [
      { key: "all" as StatusFilter, label: "All", count: posts.length },
      {
        key: "active" as StatusFilter,
        label: "Active",
        count: posts.filter((p) => matchesStatusFilter(p, "active")).length,
      },
      {
        key: "review" as StatusFilter,
        label: "In review",
        count: posts.filter((p) => matchesStatusFilter(p, "review")).length,
      },
      {
        key: "attention" as StatusFilter,
        label: "Needs attention",
        count: posts.filter((p) => matchesStatusFilter(p, "attention")).length,
      },
      {
        key: "hidden" as StatusFilter,
        label: "Hidden",
        count: posts.filter((p) => matchesStatusFilter(p, "hidden")).length,
      },
    ],
    [posts],
  );

  const visiblePosts = useMemo(
    () =>
      sortPosts(
        posts.filter((post) => matchesStatusFilter(post, statusFilter)),
        "recent",
      ),
    [posts, statusFilter],
  );

  // Save stays disabled until something actually differs from what is stored,
  // and the discard prompt only fires when there is something to lose.
  const editDirty = useMemo(() => {
    if (!editingPost || !editState) return false;
    return (
      editState.title !== (editingPost.title ?? "") ||
      editState.caption !== (editingPost.caption ?? "") ||
      editState.amount !== String(editingPost.price.amount ?? 0) ||
      editState.negotiable !== (editingPost.price.negotiable ?? false) ||
      editState.categoryId !== (editingPost.categoryId ?? null)
    );
  }, [editingPost, editState]);

  const actionItems = useMemo(() => {
    if (!actionsPost) return [];
    return [
      {
        key: "insights",
        label: "Open insights",
        href: `/${lang}/profile/posts/${actionsPost.id}`,
        icon: BarChart3,
      },
      {
        key: "visit",
        label: "Visit listing",
        href: contentPath(lang, actionsPost),
        icon: Globe,
      },
    ];
  }, [actionsPost, lang]);

  if (posts.length === 0 && loading) {
    return (
      <SectionShell
        title="Manage posts"
        subtitle="Loading your seller inventory"
      >
        <div className={MANAGED_POSTS_GRID}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <Skeleton className="aspect-3/4 w-full rounded-xl md:aspect-4/5" />
              <div className="space-y-1.5 px-0.5 pt-2">
                <Skeleton className="h-3.5 w-2/3 rounded" />
                <Skeleton className="h-3 w-4/5 rounded" />
                <Skeleton className="h-3 w-3/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </SectionShell>
    );
  }

  if (posts.length === 0 && !loading) {
    return (
      <SectionShell
        title="Manage posts"
        subtitle="Edit pricing, manage visibility, and keep track of performance in one place."
      >
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted">
            <Plus size={22} />
          </div>
          <h3 className="text-base font-black text-main">
            No inventory yet
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            Create your first listing to manage price, visibility, and
            performance from here.
          </p>
          <Link
            href={`/${lang}/upload`}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
          >
            <Plus size={16} />
            Create post
          </Link>
        </div>
      </SectionShell>
    );
  }

  return (
    <>
      <SectionShell
        title="Manage posts"
        subtitle={createdCountLabel}
        right={
          <Link
            href={`/${lang}/upload`}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 font-semibold text-white transition-transform active:scale-[0.98]"
            style={{ fontSize: "13px" }}
          >
            <Plus size={15} strokeWidth={2.4} />
            Create
          </Link>
        }
      >
        <InventoryToolbar
          chips={filterChips}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />

        {visiblePosts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-[20px] border border-dashed px-6 py-14 text-center"
            style={{ borderColor: "rgb(var(--color-border))" }}
          >
            <p className="text-sm font-semibold text-foreground">
              Nothing in this view
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              No posts match this filter yet.
            </p>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="mt-4 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-surface"
              style={{ borderColor: "rgb(var(--color-border))" }}
            >
              Show all posts
            </button>
          </div>
        ) : (
          <div className={MANAGED_POSTS_GRID}>
            {visiblePosts.map((post, index) => (
              <InventoryCard
                key={post.id}
                post={post}
                lang={lang}
                priority={index < 6}
                onOpenActions={setActionsPost}
              />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-px" />
        {hasMore && loading && (
          <div className="flex justify-center py-6 text-sm text-muted-foreground">
            Loading more posts...
          </div>
        )}
      </SectionShell>

      <ActionSurface
        desktop={isDesktop}
        post={actionsPost}
        busy={mutationBusy}
        onClose={() => setActionsPost(null)}
      >
        {actionsPost && (
          // A native action list: full-bleed rows, label left, chevron right,
          // hairline between. The boxed cards with icon chips this replaces
          // read as five separate widgets stacked up; a phone user reads this
          // as one menu, which is what it is.
          <div className="flex flex-col">
            <ActionRow
              label="Edit post"
              onClick={() => actionsPost && openEdit(actionsPost)}
            />
            <ActionRow
              label={
                actionsPost.visibility === "PUBLIC"
                  ? "Hide from store"
                  : "Show in store"
              }
              disabled={mutationBusy}
              onClick={() => actionsPost && void handleToggleHidden(actionsPost)}
            />
            {actionItems.map((item) => (
              <ActionRow
                key={item.key}
                label={item.label}
                href={item.href}
                onNavigate={() => setActionsPost(null)}
              />
            ))}
            {/* Set apart, not just coloured: the gap is what stops a thumb
                travelling down the list from landing on it. */}
            <div className="h-2.5" />
            <ActionRow
              label="Remove from store"
              tone="danger"
              last
              onClick={() => {
                setDeletePost(actionsPost);
                setActionsPost(null);
              }}
            />
          </div>
        )}
      </ActionSurface>

      <EditSurface
        desktop={isDesktop}
        open={Boolean(editingPost && editState)}
        busy={mutationBusy}
        dirty={editDirty}
        onClose={() => {
          setEditingPost(null);
          setEditState(null);
        }}
        onSubmit={() => void handleSaveEdit()}
      >
        {editState && (
          // Price first: it is the field sellers open this sheet to change,
          // and putting it above the fold means the common edit needs no
          // scrolling at all.
          <div className="flex flex-col gap-5">
            <FieldBlock label="Price" hint={editState.currency}>
              <Input
                inputMode="decimal"
                value={editState.amount}
                placeholder="0"
                className="h-12 rounded-xl"
                onChange={(event) =>
                  setEditState((current) =>
                    current
                      ? { ...current, amount: event.target.value }
                      : current,
                  )
                }
              />
            </FieldBlock>

            {/* A settings row, not a labelled box with a switch shoved in the
                corner — the old layout put "Negotiable" above an empty
                bordered rectangle and left the control unexplained. */}
            <button
              type="button"
              onClick={() =>
                setEditState((current) =>
                  current
                    ? { ...current, negotiable: !current.negotiable }
                    : current,
                )
              }
              className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-default px-4 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-default">
                  Negotiable
                </span>
                <span className="block text-xs text-muted-foreground">
                  Buyers can make an offer
                </span>
              </span>
              <Switch
                checked={editState.negotiable}
                onCheckedChange={(checked) =>
                  setEditState((current) =>
                    current ? { ...current, negotiable: checked } : current,
                  )
                }
                // The whole row is the target; the switch itself must not
                // double-fire on top of it.
                onClick={(event) => event.stopPropagation()}
              />
            </button>

            <FieldBlock
              label="Title"
              hint={`${editState.title.length}/140`}
            >
              <Input
                value={editState.title}
                maxLength={140}
                className="h-12 rounded-xl"
                onChange={(event) =>
                  setEditState((current) =>
                    current
                      ? { ...current, title: event.target.value }
                      : current,
                  )
                }
              />
            </FieldBlock>

            <FieldBlock
              label="Description"
              hint={`${editState.caption.length}/2000`}
            >
              <Textarea
                value={editState.caption}
                maxLength={2000}
                rows={5}
                className="min-h-32 resize-none rounded-xl leading-relaxed"
                onChange={(event) =>
                  setEditState((current) =>
                    current
                      ? { ...current, caption: event.target.value }
                      : current,
                  )
                }
              />
            </FieldBlock>

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

            {/* One quiet line. This was a dashed callout box competing with
                the fields for attention, to say something nothing here can
                change anyway. */}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Photos and location stay as published, so buyers always see the
              same item and pickup point.
            </p>
          </div>
        )}
      </EditSurface>

      <DeleteSurface
        desktop={isDesktop}
        open={Boolean(deletePost)}
        busy={mutationBusy}
        onClose={() => setDeletePost(null)}
        onConfirm={() => void handleDelete()}
      >
        {deletePost && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm leading-relaxed">
                This removes <strong>{deletePost.title || "this post"}</strong>{" "}
                from your inventory. Buyers will no longer see it.
              </p>
            </div>
          </div>
        )}
      </DeleteSurface>
    </>
  );
}

function InventoryToolbar({
  chips,
  activeFilter,
  onFilterChange,
}: {
  chips: { key: StatusFilter; label: string; count: number }[];
  activeFilter: StatusFilter;
  onFilterChange: (key: StatusFilter) => void;
}) {
  const activeChip =
    chips.find((chip) => chip.key === activeFilter) ?? chips[0];

  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {activeChip.count === 1
          ? "1 post"
          : `${activeChip.count} posts`}
      </p>
      <Select
        value={activeFilter}
        onValueChange={(value) => onFilterChange(value as StatusFilter)}
      >
        <SelectTrigger className="h-9 w-44 rounded-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {chips.map((chip) => (
            <SelectItem key={chip.key} value={chip.key}>
              {chip.label} ({chip.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {hint && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

/**
 * One row of a native-style action list.
 *
 * Deliberately plain: a label, a chevron, and a hairline underneath. The
 * chevron is there because every row leads somewhere — a screen, a sheet, or a
 * confirmation — and it is the affordance a phone user already reads as "this
 * does something" without needing an icon to decode.
 */
function ActionRow({
  label,
  href,
  onClick,
  onNavigate,
  disabled,
  tone = "default",
  last,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  onNavigate?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  last?: boolean;
}) {
  const danger = tone === "danger";
  const className = cn(
    "flex min-h-14 w-full items-center justify-between gap-4 px-5 text-left transition-colors active:bg-surface disabled:opacity-50",
    !last && "border-b border-default",
    danger ? "text-rose-600" : "text-default",
  );
  const body = (
    <>
      <span className="min-w-0 truncate text-[15px] font-medium">{label}</span>
      <ChevronRight
        size={20}
        strokeWidth={2}
        className={cn("shrink-0", danger ? "text-rose-400" : "text-muted-foreground")}
        aria-hidden
      />
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onNavigate} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {body}
    </button>
  );
}

function ActionSurface({
  desktop,
  post,
  busy,
  onClose,
  children,
}: {
  desktop: boolean | null;
  post: ManagedPost | null;
  busy: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const title = post?.title || "Manage post";
  // No subtitle. The rows say what they do, and a paragraph of explanation
  // above a five-item menu is the opposite of the native feel this is after.

  if (desktop) {
    return (
      <Dialog open={Boolean(post)} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[min(92vw,520px)] rounded-[28px] border border-default bg-app p-0">
          <DialogHeader className="border-b border-default px-6 py-5 text-left">
            <DialogTitle className="pr-8">{title}</DialogTitle>
            <DialogDescription className="sr-only">
              Actions for this post
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">{children}</div>
          <DialogFooter className="border-t border-default px-6 py-4">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={Boolean(post)} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-w-107.5 rounded-t-[28px] border-default bg-app">
        <DrawerHeader className="px-5 pb-3 text-left">
          <DrawerTitle className="truncate pr-6 text-[15px]">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">
            Actions for this post
          </DrawerDescription>
        </DrawerHeader>
        <div className="pb-[max(env(safe-area-inset-bottom),1rem)]">{children}</div>
      </DrawerContent>
    </Drawer>
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

  // Swiping the sheet away used to bin the edits without a word. Anything
  // typed is worth one question.
  const requestClose = () => {
    if (busy) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const discardPrompt = (
    <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Discard changes?</DialogTitle>
          <DialogDescription>
            Your edits to this post will not be saved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmDiscard(false)}
            className="h-10 rounded-full border border-border px-4 text-sm font-semibold text-default"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmDiscard(false);
              onClose();
            }}
            className="h-10 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white"
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
          <DialogContent className="flex max-h-[86vh] w-[min(92vw,680px)] flex-col rounded-[28px] border border-default bg-app p-0">
            <DialogHeader className="shrink-0 border-b border-default px-6 py-5 text-left">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                Price, title, description and category. Photos and location stay
                as published.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>
            <DialogFooter className="shrink-0 border-t border-default px-6 py-4">
              <Button variant="outline" onClick={requestClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                className="text-white"
                onClick={onSubmit}
                disabled={busy || !dirty}
              >
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
        {/*
          A fixed-height sheet with its own scroller, rather than a drawer that
          grows to fit. The form is five fields plus a textarea, so on a phone
          the old version ran off the bottom of the screen and pushed Save out
          of reach the moment the keyboard opened. 88dvh leaves the tile grid
          visible behind it, which is what keeps it feeling like a sheet over
          the page instead of a second page.
        */}
        <DrawerContent className="mx-auto flex h-[88dvh] max-w-107.5 flex-col rounded-t-[28px] border-default bg-app">
          <DrawerHeader className="shrink-0 flex-row items-center justify-between gap-3 border-b border-default px-4 py-3 text-left">
            <div className="min-w-0">
              <DrawerTitle className="text-[16px] font-bold">{title}</DrawerTitle>
              <DrawerDescription className="sr-only">
                Update the price, title, description and category of this post
              </DrawerDescription>
            </div>
            <button
              type="button"
              onClick={requestClose}
              disabled={busy}
              aria-label="Close"
              className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-surface"
            >
              <X size={20} />
            </button>
          </DrawerHeader>

          {/* The only scrolling region. overscroll-contain stops a flick at the
              end of the form from dragging the page behind it. */}
          {/* pb-8 so the last field clears the sticky footer's edge instead of
              ending flush against it, which reads as content being cut off. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-4">
            {children}
          </div>

          {/* Sticky, full width, thumb height, and clear of the home
              indicator. Save is the only button here — Cancel is the X above
              and the swipe-down everyone already tries. */}
          <div
            className="shrink-0 border-t border-default px-4 pt-3"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
          >
            <Button
              className="h-12 w-full rounded-full text-[15px] font-bold text-white"
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

function DeleteSurface({
  desktop,
  open,
  busy,
  onClose,
  onConfirm,
  children,
}: {
  desktop: boolean | null;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  const title = "Delete post";
  const description = "This action cannot be undone.";

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="w-[min(92vw,460px)] rounded-[28px] border border-default bg-app p-0">
          <DialogHeader className="border-b border-default px-6 py-5 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">{children}</div>
          <DialogFooter className="border-t border-default px-6 py-4">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={busy}>
              {busy ? <InterlockingBalls size={20} /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent className="mx-auto max-w-107.5 rounded-t-[28px] border-default bg-app">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-[15px]">{title}</DrawerTitle>
          <DrawerDescription className="text-[12px] leading-relaxed">
            {description}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">{children}</div>
        <DrawerFooter className="border-t border-default px-4 pt-3">
          <Button
            variant="destructive"
            className="h-10 rounded-xl text-[13px]"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <InterlockingBalls size={20} /> : null}
            Delete
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-xl text-[13px]"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
