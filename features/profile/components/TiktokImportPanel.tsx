"use client";

import { useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GetTiktokConnectStatusDocument,
  GetTiktokConnectUrlDocument,
  GetMyTiktokVideosDocument,
} from "@/types/__generated__/graphql";
import type { GetMyTiktokVideosQuery } from "@/types/__generated__/graphql";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  RefreshCw,
  Tv2,
  Video,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type TiktokVideo = GetMyTiktokVideosQuery["myTiktokVideos"]["videos"][number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(ts: unknown) {
  const d = ts instanceof Date ? ts : new Date(Number(ts) * 1000);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConnectGate({ lang }: { lang: string }) {
  const [getConnectUrl, { loading }] = useMutation(GetTiktokConnectUrlDocument);

  async function handleConnect() {
    const returnUrl = `${window.location.origin}/${lang}/profile`;
    const { data } = await getConnectUrl({ variables: { returnUrl } });
    if (data?.tiktokConnectUrl) {
      window.open(
        data.tiktokConnectUrl,
        "_blank",
        "width=600,height=700,noopener",
      );
    }
  }

  return (
    <section className="px-4 py-12">
      <div className="mx-auto flex min-h-80 max-w-xl flex-col items-center justify-center text-center">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg border"
          style={{
            backgroundColor: "rgb(var(--color-bg-elevated))",
            borderColor: "rgb(var(--color-border))",
            color: "rgb(var(--brand-primary))",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Tv2 size={26} strokeWidth={2} />
        </div>
        <h2
          className="font-bold"
          style={{
            color: "rgb(var(--color-text))",
            fontSize: "var(--text-lg)",
          }}
        >
          Connect TikTok
        </h2>
        <p
          className="mt-2 max-w-sm leading-snug"
          style={{
            color: "rgb(var(--color-text-muted))",
            fontSize: "var(--text-base)",
          }}
        >
          Link your TikTok account to see your videos here.
        </p>
        <Button
          onClick={handleConnect}
          disabled={loading}
          className="mt-5 gap-2 px-6 font-semibold text-white"
          style={{
            background:
              "linear-gradient(135deg, rgb(var(--brand-primary)), rgb(var(--brand-highlight)))",
            boxShadow: "0 10px 24px rgb(var(--brand-primary) / 0.24)",
            fontSize: "var(--text-sm)",
            height: 40,
            borderRadius: "var(--radius-md)",
          }}
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <ExternalLink size={15} />
          )}
          Connect TikTok
        </Button>
      </div>
    </section>
  );
}

function VideoCard({ video }: { video: TiktokVideo }) {
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: "rgb(var(--color-border))",
        backgroundColor: "rgb(var(--color-bg-elevated))",
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-9/10">
        <Image
          src={video.coverImageUrl}
          alt={video.title}
          fill
          className="object-cover"
          sizes="(max-width: 430px) 50vw, 215px"
          unoptimized
        />
        {/* Duration pill */}
        <div
          className="absolute bottom-1.5 right-1.5 rounded-md px-1.5 py-0.5 text-white"
          style={{
            fontSize: "var(--text-xs)",
            backgroundColor: "rgba(0,0,0,0.65)",
            fontWeight: 600,
          }}
        >
          {formatDuration(video.duration)}
        </div>
      </div>

      {/* Meta */}
      <div className="p-2.5">
        {video.title && (
          <p
            className="line-clamp-2 leading-tight"
            style={{
              fontSize: "var(--text-sm)",
              color: "rgb(var(--color-text))",
              fontWeight: 500,
            }}
          >
            {video.title}
          </p>
        )}

        {/* Stats row — only render counts the API returned */}
        {(video.viewCount != null || video.likeCount != null) && (
          <div
            className="mt-1 flex items-center gap-3"
            style={{
              fontSize: "var(--text-xs)",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            {video.viewCount != null && (
              <span className="flex items-center gap-1">
                <Eye size={12} /> {formatCount(video.viewCount)}
              </span>
            )}
            {video.likeCount != null && (
              <span className="flex items-center gap-1">
                <Heart size={12} /> {formatCount(video.likeCount)}
              </span>
            )}
          </div>
        )}

        <p
          className="mt-1"
          style={{
            fontSize: "var(--text-xs)",
            color: "rgb(var(--color-text-muted))",
          }}
        >
          {formatDate(video.createTime)}
        </p>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  lang: string;
}

export function TiktokImportPanel({ lang }: Props) {
  // ── Auth / connect status ──────────────────────────────────────────────────
  const {
    data: statusData,
    loading: statusLoading,
    refetch: refetchStatus,
  } = useQuery(GetTiktokConnectStatusDocument, {
    fetchPolicy: "cache-and-network",
  });

  const isTiktokConnected = statusData?.me?.authProviders?.tiktok === true;

  // ── TikTok videos list (infinite scroll) ────────────────────────────────────
  const {
    data: videosData,
    loading: videosLoading,
    refetch: refetchVideos,
    fetchMore: fetchMoreVideos,
  } = useQuery(GetMyTiktokVideosDocument, {
    variables: { cursor: undefined },
    skip: !isTiktokConnected,
    notifyOnNetworkStatusChange: true,
  });

  const allVideos: TiktokVideo[] = videosData?.myTiktokVideos.videos ?? [];
  const hasMore = videosData?.myTiktokVideos.hasMore ?? false;
  const nextCursor = videosData?.myTiktokVideos.nextCursor ?? null;
  const videosFetchingMore = useRef(false);

  const loadMoreVideos = useCallback(() => {
    if (!hasMore || !nextCursor || videosFetchingMore.current) return;
    videosFetchingMore.current = true;
    fetchMoreVideos({
      variables: { cursor: nextCursor },
      updateQuery(prev, { fetchMoreResult }) {
        videosFetchingMore.current = false;
        if (!fetchMoreResult) return prev;
        return {
          myTiktokVideos: {
            ...fetchMoreResult.myTiktokVideos,
            videos: [
              ...prev.myTiktokVideos.videos,
              ...fetchMoreResult.myTiktokVideos.videos,
            ],
          },
        };
      },
    }).catch(() => {
      videosFetchingMore.current = false;
    });
  }, [hasMore, nextCursor, fetchMoreVideos]);

  const videosSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = videosSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreVideos();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMoreVideos]);

  // Refresh TikTok connect status after returning from OAuth popup
  useEffect(() => {
    function handleFocus() {
      if (!isTiktokConnected) refetchStatus();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isTiktokConnected, refetchStatus]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (statusLoading && !statusData) {
    return (
      <div className="flex flex-col gap-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="rounded-xl"
              style={{ aspectRatio: "9/16" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isTiktokConnected) {
    return (
      <div className="p-4">
        <ConnectGate lang={lang} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <p
            className="font-bold"
            style={{
              fontSize: "var(--text-md)",
              color: "rgb(var(--color-text))",
            }}
          >
            My TikTok Videos
          </p>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            {allVideos.length > 0
              ? `${allVideos.length} video${allVideos.length !== 1 ? "s" : ""}`
              : "Browse your videos"}
          </p>
        </div>
        <button
          onClick={() => {
            refetchVideos({ cursor: undefined });
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors active:opacity-60"
          style={{
            backgroundColor: "rgb(var(--color-bg-subtle))",
            color: "rgb(var(--color-text-muted))",
          }}
          title="Refresh"
        >
          <RefreshCw
            size={14}
            className={videosLoading ? "animate-spin" : ""}
          />
        </button>
      </div>

      {/* ── Video grid (2-up) ───────────────────────────────────────────── */}
      {videosLoading && allVideos.length === 0 ? (
        <div className="grid grid-cols-2 gap-2 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="rounded-xl"
              style={{ aspectRatio: "9/16" }}
            />
          ))}
        </div>
      ) : allVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center px-6">
          <Video
            size={32}
            style={{ color: "rgb(var(--color-text-placeholder))" }}
          />
          <p
            className="font-semibold"
            style={{
              fontSize: "var(--text-base)",
              color: "rgb(var(--color-text))",
            }}
          >
            No videos found
          </p>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            Your TikTok videos will appear here once loaded.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-4">
          {allVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={videosSentinelRef} className="h-px" />
      {hasMore && (
        <div className="flex justify-center px-4 pt-3 pb-1">
          <Loader2
            size={18}
            className="animate-spin"
            style={{ color: "rgb(var(--color-text-muted))" }}
          />
        </div>
      )}
    </div>
  );
}
