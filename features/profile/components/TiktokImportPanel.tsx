"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useEffect, useRef, useCallback, useState } from "react";
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
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Tv2,
  Video,
} from "lucide-react";
import { downloadTiktokVideo } from "@/features/create/utils/tiktokDownload";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBackDismiss } from "@/hooks/useBackDismiss";

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
    const returnPath = window.location.pathname || `/${lang}/profile`;
    const returnUrl = `${window.location.origin}${returnPath}${window.location.search}`;
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
            <InterlockingBalls size={15} />
          ) : (
            <ExternalLink size={15} />
          )}
          Connect TikTok
        </Button>
      </div>
    </section>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  lang: string;
  /** Local-file selection for flows that upload the selected video. */
  onSelectVideo?: (video: TiktokVideo, file: File) => void | Promise<void>;
  /** API-backed selection for flows that can reuse an existing Mux import. */
  onUseSelectedVideo?: (video: TiktokVideo) => void | Promise<void>;
}

export function TiktokImportPanel({
  lang,
  onSelectVideo,
  onUseSelectedVideo,
}: Props) {
  const [selectingVideoId, setSelectingVideoId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<TiktokVideo | null>(null);
  const { requestClose: closePreview } = useBackDismiss(
    Boolean(previewVideo),
    () => setPreviewVideo(null),
  );

  async function selectVideo() {
    const selectedVideo = allVideos.find(
      (item) => item.id === selectedVideoId,
    );
    if ((!onSelectVideo && !onUseSelectedVideo) || !selectedVideo || selectingVideoId) return;
    setSelectionError(null);
    setSelectingVideoId(selectedVideo.id);
    try {
      if (onUseSelectedVideo) {
        await onUseSelectedVideo(selectedVideo);
      } else if (onSelectVideo) {
        const { blob } = await downloadTiktokVideo(selectedVideo.shareUrl);
        const file = new File([blob], `shopi-tiktok-${selectedVideo.id}.mp4`, {
          type: blob.type || "video/mp4",
        });
        await onSelectVideo(selectedVideo, file);
      }
    } catch {
      setSelectionError(
        "Couldn't add that TikTok video. Check your connection and try again.",
      );
    } finally {
      setSelectingVideoId(null);
    }
  }

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
        <ul className="divide-y divide-border px-4" aria-label="Loading TikTok videos">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex min-h-[76px] items-center gap-3 py-2.5">
              <Skeleton className="size-12 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!isTiktokConnected) {
    return <ConnectGate lang={lang} />;
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
            {onSelectVideo
              ? "Select one video for your post"
              : allVideos.length > 0
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
          {videosLoading ? (
            <InterlockingBalls size={14} />
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      </div>

      {selectionError && (
        <p
          role="alert"
          className="mx-4 mb-2 rounded-lg px-3 py-2 text-sm"
          style={{
            backgroundColor: "rgb(var(--color-error) / 0.08)",
            color: "rgb(var(--color-error))",
          }}
        >
          {selectionError}
        </p>
      )}

      {/* ── Compact video list ──────────────────────────────────────────── */}
      {videosLoading && allVideos.length === 0 ? (
        <ul className="divide-y divide-border px-4" aria-label="Loading TikTok videos">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex min-h-[76px] items-center gap-3 py-2.5">
              <Skeleton className="size-12 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </li>
          ))}
        </ul>
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
      ) : onSelectVideo ? (
          <RadioGroup
            value={selectedVideoId ?? ""}
            onValueChange={setSelectedVideoId}
            aria-label="Choose a TikTok video"
            className="w-full gap-0 divide-y divide-border px-4"
          >
            {allVideos.map((video) => (
              <div key={video.id} className="flex min-h-[76px] items-center gap-3 py-2.5">
                <RadioGroupItem
                  value={video.id}
                  aria-label={`Select ${video.title || "TikTok video"}`}
                  disabled={Boolean(selectingVideoId)}
                />
                <button
                  type="button"
                  onClick={() => setPreviewVideo(video)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left active:bg-surface"
                  aria-label={`Preview ${video.title || "TikTok video"}`}
                >
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface">
                    <Image
                      src={video.coverImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                      unoptimized
                    />
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/65 px-1 text-[10px] font-semibold text-white">
                      {formatDuration(video.duration)}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-main">
                      {video.title || "TikTok video"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {formatDate(video.createTime)}
                      {video.viewCount != null && ` · ${formatCount(video.viewCount)} views`}
                      {video.likeCount != null && ` · ${formatCount(video.likeCount)} likes`}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                </button>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <ul className="divide-y divide-border px-4" aria-label="TikTok videos">
            {allVideos.map((video) => (
              <li key={video.id}>
                <button
                  type="button"
                  onClick={() => setPreviewVideo(video)}
                  className="flex min-h-[76px] w-full items-center gap-3 py-2.5 text-left active:bg-surface"
                  aria-label={`Preview ${video.title || "TikTok video"}`}
                >
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface">
                    <Image src={video.coverImageUrl} alt="" fill sizes="48px" unoptimized className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-main">{video.title || "TikTok video"}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {formatDate(video.createTime)}
                      {video.viewCount != null && ` · ${formatCount(video.viewCount)} views`}
                      {video.likeCount != null && ` · ${formatCount(video.likeCount)} likes`}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

      {/* Infinite scroll sentinel */}
      <div ref={videosSentinelRef} className="h-px" />
      {hasMore && (
        <div className="flex justify-center px-4 pt-3 pb-1">
          <InterlockingBalls size={18} />
        </div>
      )}

      {(onSelectVideo || onUseSelectedVideo) && isTiktokConnected && allVideos.length > 0 && (
        <div className="sticky bottom-0 z-10 mt-auto border-t border-border bg-app px-4 py-3">
          <Button
            type="button"
            className="w-full text-white"
            onClick={() => void selectVideo()}
            disabled={!selectedVideoId || Boolean(selectingVideoId)}
          >
            {selectingVideoId ? <InterlockingBalls size={15} /> : null}
            {selectingVideoId ? "Preparing video…" : "Use selected video"}
          </Button>
        </div>
      )}

      <Dialog
        open={Boolean(previewVideo)}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent
          className="z-[95] max-w-md overflow-hidden p-0"
          overlayClassName="z-[90]"
        >
          <DialogTitle className="sr-only">
            {previewVideo?.title || "TikTok video preview"}
          </DialogTitle>
          <div className="border-b border-border px-4 py-3">
            <p className="truncate pr-3 text-sm font-semibold text-main">
              {previewVideo?.title || "TikTok video"}
            </p>
          </div>
          {previewVideo && (
            <div className="mx-auto aspect-[9/16] w-full max-w-[360px] bg-black">
              <iframe
                key={previewVideo.id}
                src={`https://www.tiktok.com/player/v1/${previewVideo.id}?autoplay=1`}
                title={previewVideo.title || "TikTok video"}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                className="size-full border-0"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
