"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, BarChart3, Bookmark, Eye, MessageCircle, Share2 } from "lucide-react";
import { SHIMMER_PORTRAIT } from "@/lib/shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { MuxVideo } from "@/components/ui/MuxVideo";
import { contentPath } from "@/lib/content-url";
import { BackLink } from "@/components/layout/BackLink";
import { useMyManagedPost } from "../hooks/useManagedPosts";

function formatPrice(amount: number, currency: string) {
  if (amount <= 0) return "Custom";
  return `${currency} ${Math.round(amount).toLocaleString("en-KE")}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getThumb(
  post: NonNullable<ReturnType<typeof useMyManagedPost>["data"]>["myManagedContentDetail"],
) {
  const firstMedia = post?.media?.[0];
  if (post?.type === "IMAGE") {
    return (
      firstMedia?.r2Variants?.find((variant) => variant.variant === "original")
        ?.url ??
      firstMedia?.r2Variants?.find((variant) => variant.variant === "large")
        ?.url ??
      firstMedia?.r2Variants?.find((variant) => variant.variant === "medium")
        ?.url ??
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
    firstMedia?.r2Variants?.find((variant) => variant.variant === "medium")
      ?.url ??
    firstMedia?.r2Variants?.[0]?.url ??
    firstMedia?.url ??
    muxDerivedThumb ??
    null
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Eye;
}) {
  return (
    <div
      className="rounded-[20px] border p-3 sm:rounded-[24px] sm:p-4"
      style={{
        borderColor: "rgb(var(--color-border))",
        backgroundColor: "rgb(var(--color-bg-elevated))",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          style={{
            fontSize: "12px",
            color: "rgb(var(--color-text-muted))",
          }}
        >
          {label}
        </p>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--color-bg-subtle))]">
          <Icon size={18} />
        </span>
      </div>
      <p
        className="mt-4 font-bold"
        style={{
          fontSize: "clamp(1.15rem, 4.6vw, 2rem)",
          color: "rgb(var(--color-text))",
        }}
      >
        {value.toLocaleString("en-KE")}
      </p>
    </div>
  );
}

export function ManagedPostInsightsPage({
  lang,
  contentId,
}: {
  lang: string;
  contentId: string;
}) {
  const { data, loading } = useMyManagedPost(contentId);
  const post = data?.myManagedContentDetail;
  const thumb = post ? getThumb(post) : null;
  const firstMedia = post?.media?.[0];
  const playbackId = firstMedia?.muxMeta?.playbackId ?? undefined;
  const isVideo = post?.type === "VIDEO";
  const videoSrc = firstMedia?.url ?? undefined;

  if (loading && !post) {
    return (
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <div className="w-full space-y-4">
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-48 w-full rounded-[28px]" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-[24px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full rounded-[24px] border px-6 py-10 text-center">
          <h1 className="text-lg font-bold">Post not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This post may have been deleted or is no longer in your inventory.
          </p>
          <Link
            href={`/${lang}/profile`}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border px-4 font-semibold"
          >
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="w-full space-y-5">
        <div className="flex items-center justify-between gap-2 sm:flex-wrap sm:justify-start sm:gap-3">
          <BackLink
            href={`/${lang}/profile`}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors hover:bg-surface sm:h-11 sm:gap-2 sm:rounded-xl sm:px-3.5 sm:text-sm sm:font-semibold"
            style={{ borderColor: "rgb(var(--color-border))" }}
          >
            <ChevronLeft size={16} />
            Back
          </BackLink>

          <Link
            href={contentPath(lang, post)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors sm:h-11 sm:gap-2 sm:rounded-xl sm:px-3.5 sm:text-sm sm:font-semibold"
            style={{
              borderColor: "rgb(var(--brand-primary) / 0.2)",
              backgroundColor: "rgb(var(--brand-primary) / 0.1)",
              color: "rgb(var(--brand-primary))",
            }}
          >
            Visit listing
          </Link>
        </div>

        <div
          className="grid gap-4 overflow-hidden rounded-[24px] border p-3.5 sm:p-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:p-5"
          style={{
            borderColor: "rgb(var(--color-border))",
            backgroundColor: "rgb(var(--color-bg-elevated))",
          }}
        >
          <div className="relative aspect-[0.92] overflow-hidden rounded-[20px] bg-black">
            {isVideo && (playbackId || videoSrc) ? (
              <MuxVideo
                muxPlaybackId={playbackId}
                src={videoSrc}
                className="h-full w-full"
                poster={thumb ?? undefined}
                muted={false}
                playsInline
                controls
                objectFit="cover"
              />
            ) : thumb ? (
              <Image
                src={thumb}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 340px"
                placeholder="blur"
                blurDataURL={SHIMMER_PORTRAIT}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[rgb(var(--color-bg-subtle))] text-sm text-muted-foreground">
                No preview
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-[rgb(var(--brand-primary)_/_0.1)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--brand-primary))] sm:text-xs sm:tracking-[0.16em]">
                Seller insights
              </div>
              <h1
                className="mt-2.5 font-bold leading-tight"
                style={{
                  fontSize: "clamp(1rem, 3.8vw, 2.2rem)",
                  color: "rgb(var(--color-text))",
                }}
              >
                {post.title || "Untitled post"}
              </h1>
              {post.caption && (
                <p
                  className="mt-2.5 max-w-3xl leading-relaxed"
                  style={{
                    fontSize: "12px",
                    color: "rgb(var(--color-text-muted))",
                  }}
                >
                  {post.caption}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              <MetricCard label="Views" value={post.stats.views} icon={Eye} />
              <MetricCard
                label="Saves"
                value={post.stats.saves}
                icon={Bookmark}
              />
              <MetricCard
                label="Comments"
                value={post.stats.comments}
                icon={MessageCircle}
              />
              <MetricCard
                label="Shares"
                value={post.stats.shares}
                icon={Share2}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div
            className="rounded-[24px] border p-4 sm:p-5"
            style={{
              borderColor: "rgb(var(--color-border))",
              backgroundColor: "rgb(var(--color-bg-elevated))",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--color-bg-subtle))]">
                <BarChart3 size={18} />
              </span>
              <div>
                <h2 className="font-semibold">Listing performance</h2>
                <p className="text-sm text-muted-foreground">
                  Quick read on how this post is doing right now.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[rgb(var(--color-bg-subtle))] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Price
                </p>
                <p className="mt-2 text-base font-bold text-foreground sm:text-lg">
                  {formatPrice(post.price.amount, post.price.currency)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {post.price.negotiable ? "Negotiable" : "Fixed price"}
                </p>
              </div>

              <div className="rounded-2xl bg-[rgb(var(--color-bg-subtle))] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Status
                </p>
                <p className="mt-2 text-base font-bold text-foreground sm:text-lg">
                  {post.status.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {post.visibility === "PUBLIC"
                    ? "Visible in the marketplace"
                    : "Hidden from buyers"}
                </p>
              </div>
            </div>
          </div>

          <div
            className="rounded-[24px] border p-4 sm:p-5"
            style={{
              borderColor: "rgb(var(--color-border))",
              backgroundColor: "rgb(var(--color-bg-elevated))",
            }}
          >
            <h2 className="font-semibold">Timeline</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl bg-[rgb(var(--color-bg-subtle))] p-4">
                <p className="font-semibold text-foreground">Created</p>
                <p className="mt-1 text-muted-foreground">
                  {formatDate(post.createdAt)}
                </p>
              </div>
              <div className="rounded-2xl bg-[rgb(var(--color-bg-subtle))] p-4">
                <p className="font-semibold text-foreground">Last updated</p>
                <p className="mt-1 text-muted-foreground">
                  {formatDate(post.updatedAt)}
                </p>
              </div>
              {post.approval?.rejectionReason ? (
                <div className="rounded-2xl bg-rose-50 p-4 text-rose-700">
                  <p className="font-semibold">Latest rejection reason</p>
                  <p className="mt-1 leading-relaxed">
                    {post.approval.rejectionReason}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
