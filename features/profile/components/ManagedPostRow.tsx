"use client";

import Image from "next/image";
import { Bookmark, ChevronRight, Eye, ImageIcon, Play } from "lucide-react";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ManagedPost } from "../hooks/useManagedPosts";
import {
  isHidden,
  postPriceLabel,
  postProblem,
  postStatus,
  postThumb,
  shortDate,
  TONE_CLASSES,
  type StatusTone,
} from "../lib/managedPost";

export function StatusPill({
  label,
  tone,
  className,
}: {
  label: string;
  tone: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4",
        TONE_CLASSES[tone].pill,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", TONE_CLASSES[tone].dot)} aria-hidden />
      {label}
    </span>
  );
}

/**
 * One post in the seller's list on a phone — the admin's post row, sized for
 * a thumb: photo, title, price, then status with either the numbers or the
 * problem. The whole row opens the post sheet; there is no second control to
 * miss.
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
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface">
          {thumb ? (
            <Image
              src={thumb}
              alt=""
              fill
              sizes="64px"
              priority={priority}
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted">
              <ImageIcon size={20} aria-hidden />
            </span>
          )}
          {/* Dimmed: "not on the store" reads faster than any label. */}
          {hidden && <span className="absolute inset-0 bg-black/40" aria-hidden />}
          {post.type === "VIDEO" && (
            <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
              <Play size={9} fill="currentColor" strokeWidth={0} className="ml-px" aria-hidden />
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold leading-5 text-main">
            {post.title || "Untitled post"}
          </span>
          <span className="flex items-baseline gap-1.5 leading-5">
            <span
              className={cn(
                "text-[14px] font-bold",
                post.price.amount > 0 ? "text-main" : "text-muted",
              )}
            >
              {postPriceLabel(post)}
            </span>
            {post.price.negotiable && post.price.amount > 0 && (
              <span className="text-[12px] text-muted">· Negotiable</span>
            )}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[12px] text-muted">
            <StatusPill label={status.label} tone={status.tone} />
            {problem ? (
              // The reason to act, instead of numbers that don't matter yet.
              <span className="truncate font-medium text-rose-600 dark:text-rose-400">
                {problem}
              </span>
            ) : (
              <>
                <span className="flex shrink-0 items-center gap-1">
                  <Eye size={12} aria-hidden />
                  {fmtCompact(post.stats.views)}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Bookmark size={12} aria-hidden />
                  {fmtCompact(post.stats.saves)}
                </span>
                <span className="ml-auto shrink-0">{shortDate(post.createdAt)}</span>
              </>
            )}
          </span>
        </span>

        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
      </button>
    </li>
  );
}
