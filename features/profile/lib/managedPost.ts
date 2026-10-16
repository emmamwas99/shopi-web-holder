import type { ManagedPost } from "../hooks/useManagedPosts";

/**
 * Display rules for the seller's own posts, shared by the phone list row, the
 * desktop tile and the post sheet so the three never disagree about a status
 * or a price.
 */

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export type StatusFilter = "all" | "live" | "review" | "attention" | "hidden";

export type SortKey = "newest" | "oldest" | "views" | "priceHigh" | "priceLow";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "views", label: "Most viewed" },
  { key: "priceHigh", label: "Price: high to low" },
  { key: "priceLow", label: "Price: low to high" },
];

/** The cover to show for a post: the largest still for photos, the poster for video. */
export function postThumb(post: ManagedPost): string | null {
  const firstMedia = post.media?.[0];
  if (post.type === "IMAGE") {
    return (
      firstMedia?.r2Variants?.find((v) => v.variant === "large")?.url ??
      firstMedia?.r2Variants?.find((v) => v.variant === "medium")?.url ??
      firstMedia?.r2Variants?.find((v) => v.variant === "original")?.url ??
      firstMedia?.url ??
      firstMedia?.r2Variants?.[0]?.url ??
      firstMedia?.thumbnailUrl ??
      null
    );
  }

  const muxPlaybackId = firstMedia?.muxMeta?.playbackId;
  return (
    firstMedia?.muxMeta?.thumbnailUrl ??
    firstMedia?.thumbnailUrl ??
    firstMedia?.r2Variants?.find((v) => v.variant === "medium")?.url ??
    firstMedia?.r2Variants?.[0]?.url ??
    firstMedia?.url ??
    (muxPlaybackId
      ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=0&width=540&fit_mode=smartcrop`
      : null)
  );
}

/** Every still in the post, in order, for the sheet's gallery. */
export function postImages(post: ManagedPost): string[] {
  return [...(post.media ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (media) =>
        media.r2Variants?.find((v) => v.variant === "large")?.url ??
        media.r2Variants?.find((v) => v.variant === "medium")?.url ??
        media.url ??
        media.thumbnailUrl ??
        null,
    )
    .filter((url): url is string => Boolean(url));
}

/** "KES 30,000", or "No price" — 0 means the price was left blank, not free. */
export function postPriceLabel(post: ManagedPost): string {
  return post.price.amount > 0
    ? `${post.price.currency} ${Math.round(post.price.amount).toLocaleString("en-KE")}`
    : "No price";
}

export function isHidden(post: ManagedPost): boolean {
  return post.visibility !== "PUBLIC";
}

export function postStatus(post: ManagedPost): {
  label: string;
  tone: StatusTone;
  helper: string;
} {
  // Hidden IS the status when it applies: a hidden post is off the store
  // whatever its review state says.
  if (isHidden(post) && post.status === "ACTIVE") {
    return { label: "Hidden", tone: "neutral", helper: "Only you can see it" };
  }
  switch (post.status) {
    case "ACTIVE":
      return post.isLive
        ? { label: "Live", tone: "success", helper: "Visible to buyers" }
        : { label: "Approved", tone: "info", helper: "Going live once the media is ready" };
    case "PENDING_REVIEW":
      return { label: "In review", tone: "warning", helper: "Waiting for approval" };
    case "UNDER_REVIEW":
      return { label: "Under review", tone: "warning", helper: "Our team is checking it" };
    case "PROCESSING":
      return { label: "Processing", tone: "info", helper: "Preparing your media" };
    case "REJECTED":
      return { label: "Rejected", tone: "danger", helper: "Needs changes before it can go live" };
    case "FAILED":
      return { label: "Failed", tone: "danger", helper: "Upload didn't finish — post it again" };
    default:
      return { label: "Draft", tone: "neutral", helper: "Not visible yet" };
  }
}

/** The reason a seller must act, if there is one. */
export function postProblem(post: ManagedPost): string | null {
  if (post.status === "REJECTED") {
    return post.approval?.rejectionReason || postStatus(post).helper;
  }
  if (post.status === "FAILED") {
    return post.processingError || postStatus(post).helper;
  }
  return null;
}

export const TONE_CLASSES: Record<StatusTone, { pill: string; dot: string }> = {
  success: {
    pill: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  warning: {
    pill: "bg-amber-500/14 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  danger: {
    pill: "bg-rose-500/12 text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  info: {
    pill: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  neutral: {
    pill: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

export function matchesStatusFilter(post: ManagedPost, filter: StatusFilter): boolean {
  switch (filter) {
    case "live":
      return post.status === "ACTIVE" && !isHidden(post);
    case "review":
      return (
        post.status === "PENDING_REVIEW" ||
        post.status === "UNDER_REVIEW" ||
        post.status === "PROCESSING"
      );
    case "attention":
      return post.status === "REJECTED" || post.status === "FAILED";
    case "hidden":
      return isHidden(post);
    default:
      return true;
  }
}

export const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "review", label: "In review" },
  { key: "attention", label: "Needs attention" },
  { key: "hidden", label: "Hidden" },
];

/** Title, description and listing number, so "SH-EL-00012" finds its post. */
export function matchesSearch(post: ManagedPost, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [post.title, post.caption, post.listingNumber]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(needle));
}

function time(value: string): number {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function sortPosts(posts: ManagedPost[], sort: SortKey): ManagedPost[] {
  const copy = [...posts];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => time(a.createdAt) - time(b.createdAt));
    case "views":
      return copy.sort((a, b) => b.stats.views - a.stats.views);
    case "priceHigh":
      return copy.sort((a, b) => b.price.amount - a.price.amount);
    case "priceLow":
      // Unpriced posts last, not first: "cheapest" should not lead with blanks.
      return copy.sort(
        (a, b) =>
          (a.price.amount > 0 ? a.price.amount : Infinity) -
          (b.price.amount > 0 ? b.price.amount : Infinity),
      );
    default:
      return copy.sort((a, b) => time(b.createdAt) - time(a.createdAt));
  }
}

/** "12 Oct", or "12 Oct 2025" outside the current year. */
export function shortDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
