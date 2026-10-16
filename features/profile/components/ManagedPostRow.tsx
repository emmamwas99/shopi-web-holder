"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ChevronRight, ImageIcon, Play } from "lucide-react";
import { fmtCompact } from "@/lib/format";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ManagedPost } from "../hooks/useManagedPosts";
import {
  isHidden,
  postPriceLabel,
  postProblem,
  postStatus,
  postThumb,
  TONE_CLASSES,
  type StatusTone,
} from "../lib/managedPost";

/** The admin's badge: a small tinted rectangle, 12px, an optional icon. */
export function StatusBadge({
  tone,
  className,
  children,
}: {
  tone: StatusTone | "outline";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[6px] px-2 py-0.5 text-xs font-medium [&_svg]:size-3",
        tone === "outline" ? "border border-default text-muted" : TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * One post in the seller's list on a phone — the admin's post row: cover,
 * title, listing number and price, then the status line. The whole row opens
 * the post sheet.
 */
export function ManagedPostRow({
  post,
  onOpen,
  priority,
}: {
  post: ManagedPost;
  onOpen: (post: ManagedPost) => void;
  priority?: boolean;
}) {
  const thumb = postThumb(post);
  const status = postStatus(post);
  const problem = postProblem(post);
  const hidden = isHidden(post);

  return (
    <li data-scroll-anchor={post.id}>
      <button
        type="button"
        onClick={() => onOpen(post)}
        className="flex w-full items-center gap-3 py-3 text-left transition-colors active:bg-surface"
        aria-label={`${post.title || "Untitled post"}, ${postPriceLabel(post)}, ${status.label}`}
      >
        <span className="relative size-12 shrink-0 overflow-hidden rounded-[8px] border border-default bg-surface">
          {thumb ? (
            <Image src={thumb} alt="" fill sizes="48px" priority={priority} className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-muted">
              <ImageIcon size={16} aria-hidden />
            </span>
          )}
          {hidden && <span className="absolute inset-0 bg-black/40" aria-hidden />}
          {post.type === "VIDEO" && thumb && (
            <span className="absolute bottom-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white">
              <Play size={8} fill="currentColor" strokeWidth={0} className="ml-px" aria-hidden />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-main">
              {post.title || "Untitled post"}
            </span>
            <span className="shrink-0 text-xs text-muted">{timeAgo(post.createdAt)}</span>
          </span>
          <span className="block truncate text-xs text-muted">
            {post.listingNumber && <span className="font-mono">{post.listingNumber} · </span>}
            {postPriceLabel(post)}
            {post.price.negotiable && post.price.amount > 0 && " · Negotiable"}
          </span>
          <span className="mt-1.5 flex min-w-0 items-center gap-1.5">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {problem ? (
              <span className="truncate text-xs text-rose-600 dark:text-rose-400">{problem}</span>
            ) : (
              <span className="truncate text-xs text-muted">
                {fmtCompact(post.stats.views)} {post.stats.views === 1 ? "view" : "views"}
                {post.stats.saves > 0 && ` · ${fmtCompact(post.stats.saves)} saved`}
              </span>
            )}
          </span>
        </span>

        <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
      </button>
    </li>
  );
}
