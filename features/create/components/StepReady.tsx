/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useState, useRef, useEffect } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import Image from "next/image";
import MuxPlayer from "@mux/mux-player-react";
import { useRouter } from "next/navigation";
import { useCreateStore } from "@/stores/create";
import { CreateErrorDialog } from "./CreateErrorDialog";
import { PublishDraftDocument } from "@/types/__generated__/graphql";
import { gql } from "@apollo/client";
import { invalidatePublishedContentCache } from "@/lib/apollo/feedCache";
import { trackPostJourney, trackPostPublished } from "@/lib/analytics";
import {
  awaitDraftAutosaves,
  blockDraftAutosave,
  unblockDraftAutosave,
} from "@/features/create/utils/draftAutosave";

const POST_TO_TIKTOK = gql`
  mutation PostToTiktok($contentId: String!) {
    postToTiktok(contentId: $contentId)
  }
`;

const TIKTOK_CONNECT_URL = gql`
  mutation TiktokConnectUrlReady($returnUrl: String) {
    tiktokConnectUrl(returnUrl: $returnUrl)
  }
`;
import type MuxPlayerElement from "@mux/mux-player";
import {
  getMediaPreviewSrc,
  shouldUnoptimizeMedia,
} from "@/features/create/utils/mediaPreview";

const SHOW_TIKTOK_CROSSPOST = process.env.NODE_ENV !== "production";

interface StepReadyProps {
  lang: string;
}

export function StepReady({ lang }: StepReadyProps) {
  const {
    draftId,
    title,
    caption,
    hashtags,
    mediaItems,
    contentType,
    categoryName,
    tiktokEmbed,
    price,
    isFree,
    currency,
    visibilityMode,
    postOnTiktok,
    reset,
    setStep,
    setError,
    error,
  } = useCreateStore();

  const router = useRouter();
  const apollo = useApolloClient();
  const [publishing, setPublishing] = useState(false);
  const [tiktokReconnectNeeded, setTiktokReconnectNeeded] = useState(false);
  const saving = false;
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  const [published, setPublished] = useState(false);

  // MuxPlayer ref — gives us the custom element which has .media (inner <video>)
  const playerRef = useRef<MuxPlayerElement>(null);
  const scrubBarRef = useRef<HTMLDivElement>(null);

  const [publishDraft] = useMutation(PublishDraftDocument);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [postToTiktok] = useMutation(POST_TO_TIKTOK) as any;
  const [getTiktokConnectUrl] = useMutation(TIKTOK_CONNECT_URL) as any;

  const cover = mediaItems[0];
  const coverSrc = getMediaPreviewSrc(cover);
  const isVideo = contentType === "video";

  // ── Helpers that reach inside MuxPlayer's shadow DOM ─────────────────────
  /** Returns the inner <video> element MuxPlayer manages */
  function mediaEl(): HTMLVideoElement | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player = playerRef.current as any;
    // @mux/mux-player exposes .media on the custom element
    return player?.media ?? player?.shadowRoot?.querySelector("video") ?? null;
  }

  function togglePlay() {
    const el = mediaEl();
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  function handleMuteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setMuted((m) => !m);
  }

  function seekTo(clientX: number) {
    const bar = scrubBarRef.current;
    const el = mediaEl();
    if (!bar || !el || !el.duration) return;
    const { left, width } = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
    el.currentTime = ratio * el.duration;
    setProgress(ratio);
    setCurrentTime(ratio * el.duration);
  }

  function onScrubStart(clientX: number) {
    scrubbingRef.current = true;
    setScrubbing(true);
    seekTo(clientX);
  }
  function onScrubMove(clientX: number) {
    if (scrubbingRef.current) seekTo(clientX);
  }
  function onScrubEnd() {
    scrubbingRef.current = false;
    setScrubbing(false);
  }

  // ── Poll inner <video> for time/duration after player mounts ─────────────
  // MuxPlayer's shadow DOM events don't bubble to React handlers reliably on
  // iOS. Polling is more robust and has negligible cost at 250 ms.
  useEffect(() => {
    if (!isVideo) return;
    const id = setInterval(() => {
      const el = mediaEl();
      if (!el) return;
      if (el.duration && !isNaN(el.duration)) setDuration(el.duration);
      if (!scrubbingRef.current) {
        setCurrentTime(el.currentTime);
        setProgress(el.duration ? el.currentTime / el.duration : 0);
      }
      setPaused(el.paused);
    }, 250);
    return () => clearInterval(id);
  }, [isVideo]);

  // ── Publish ───────────────────────────────────────────────────────────────
  async function handlePublish() {
    if (!draftId || publishing) return;
    setPublishing(true);
    setError(null);
    trackPostJourney("post_publish_started", {
      method: useCreateStore.getState().creationMode ?? "unknown",
      category: categoryName ?? "unknown",
      content_type: contentType ?? "unknown",
    });

    // Publishing moves the draft out of ACTIVE — stop any debounced autosave
    // from firing mid-publish, and let in-flight ones settle first.
    blockDraftAutosave(draftId);
    let didPublish = false;

    try {
      await awaitDraftAutosaves(draftId);

      const { data, error: publishError } = await publishDraft({
        variables: { id: draftId },
      });
      if (publishError) {
        setError(publishError.message ?? "Failed to publish");
        return;
      }
      if (data?.publishDraft) {
        invalidatePublishedContentCache(apollo.cache);
        const contentId = data.publishDraft.id as string;
        didPublish = true;
        setPublished(true);
        trackPostPublished("create", { category: categoryName, contentType });

        if (SHOW_TIKTOK_CROSSPOST && postOnTiktok && contentId) {
          // Await so we can show the reconnect banner before auto-redirect
          try {
            const tiktokResult = await postToTiktok({
              variables: { contentId },
            });
            const tiktokErrors = tiktokResult?.errors ?? [];
            const needsReconnect = tiktokErrors.some(
              (e: { message?: string }) =>
                (e.message ?? "").includes("TIKTOK_RECONNECT_REQUIRED"),
            );
            if (needsReconnect) {
              setTiktokReconnectNeeded(true);
              return; // don't auto-redirect — let user see the reconnect banner
            }
          } catch {
            // network error — still redirect normally
          }
        }

        setTimeout(() => {
          reset();
          router.push(`/${lang}/for-you`);
        }, 1800);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setPublishing(false);
      // Publish failed — the draft is still ACTIVE, so let autosave resume.
      if (!didPublish) {
        trackPostJourney("post_publish_failed", {
          method: useCreateStore.getState().creationMode ?? "unknown",
          category: categoryName ?? "unknown",
          content_type: contentType ?? "unknown",
        });
        unblockDraftAutosave(draftId);
      }
    }
  }

  async function handleSaveDraft() {
    if (saving) return;
    reset();
    router.push(`/${lang}/for-you`);
  }

  // ── Published success ─────────────────────────────────────────────────────
  if (published) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-5 px-6 pb-16">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgb(var(--brand-primary)),rgb(var(--brand-highlight)))] shadow-[0_8px_32px_rgb(var(--brand-primary)/0.4)]"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="mb-1 text-xl font-bold text-foreground">
            Published! 🎉
          </h2>
          <p className="text-base text-muted">Your post is live on the feed</p>
        </div>

        {tiktokReconnectNeeded && (
          <div
            className="w-full max-w-xs rounded-xl border border-border bg-surface px-4 py-3 text-center"
          >
            <p className="mb-1 text-sm font-semibold text-foreground">
              TikTok cross-post needs reconnect
            </p>
            <p className="mb-3 text-xs text-muted">
              Your TikTok connection needs the posting permission. Reconnect
              once and it will work automatically next time.
            </p>
            <button
              onClick={async () => {
                try {
                  const { data: urlData } = await getTiktokConnectUrl({
                    variables: { returnUrl: undefined },
                  });
                  const url = urlData?.tiktokConnectUrl;
                  if (url)
                    window.open(url, "tiktok-connect", "width=520,height=680");
                } catch {
                  /* ignore */
                }
              }}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
            >
              Reconnect TikTok
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── VIDEO — fullscreen TikTok-style layout ────────────────────────────────
  if (isVideo) {
    return (
      <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black">
        {/* Dimmed side panels on desktop */}
        <div className="hidden flex-1 bg-black/70 md:block" />

        {/* ── Main column ─────────────────────────────────────────────────── */}
        <div className="relative w-full max-w-107.5 shrink-0 overflow-hidden bg-black">
          {/* ── MuxPlayer fills column, contain keeps aspect ratio ─────── */}
          {tiktokEmbed ? (
            // Embed-backed post: we don't host the video. Show the TikTok cover
            // as the publish preview; the live embed renders in the feed.
            <>
              {tiktokEmbed.coverImageUrl && (
                <Image
                  src={tiktokEmbed.coverImageUrl}
                  alt={tiktokEmbed.title ?? "TikTok video"}
                  fill
                  sizes="430px"
                  className="object-contain"
                  unoptimized
                />
              )}
              <span className="absolute right-3 top-3 z-10 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white ">
                TikTok
              </span>
            </>
          ) : cover?.muxPlaybackId ? (
            <MuxPlayer
              ref={playerRef}
              playbackId={cover.muxPlaybackId}
              streamType="on-demand"
              autoPlay="muted"
              loop
              muted={muted}
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full"
              poster={
                cover.thumbnailUrl ??
                `https://image.mux.com/${cover.muxPlaybackId}/thumbnail.webp?time=0&width=720`
              }
              style={
                {
                  // contain = letterbox; video fills as much as possible without cropping
                  "--media-object-fit": "contain",
                  "--media-object-position": "center center",
                  // hide MuxPlayer's own chrome — we draw our own controls
                  "--controls": "none",
                } as never
              }
            />
          ) : cover?.localUri ? (
            // Blob fallback (regular upload still processing)
            <video
              src={cover.localUri}
              className="absolute inset-0 h-full w-full object-contain"
              autoPlay
              loop
              muted={muted}
              playsInline
            />
          ) : (
            <div className="absolute inset-0 bg-[#111]" />
          )}

          {/* ── Tap overlay — play/pause (z:10) ─────────────────────────── */}
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay} />

          {/* ── Pause icon flash (z:20, no pointer events) ───────────────── */}
          {showPauseIcon && paused && (
            <div
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              onTransitionEnd={() => setShowPauseIcon(false)}
            >
              <div className="flex h-18 w-18 items-center justify-center rounded-full bg-black/50 ">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </div>
            </div>
          )}

          {/* ── Gradients (z:20, no pointer events) ─────────────────────── */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-30 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6),transparent)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-65 bg-[linear-gradient(to_top,rgba(0,0,0,0.85),transparent)]" />

          {/* ── Mute button (z:30) ──────────────────────────────────────── */}
          <button
            onClickCapture={handleMuteClick}
            aria-label={muted ? "Unmute" : "Mute"}
            className="absolute top-[calc(44px+env(safe-area-inset-top))] right-4 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-black/50 text-white "
          >
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 5L6 9H2v6h4l5 4V5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M23 9l-6 6M17 9l6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 5L6 9H2v6h4l5 4V5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.54 8.46a5 5 0 0 1 0 7.07"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M19.07 4.93a10 10 0 0 1 0 14.14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>

          {/* ── Back button (z:30) ──────────────────────────────────────── */}
          <button
            onClick={() => setStep("options")}
            className="absolute top-[calc(48px+env(safe-area-inset-top))] left-4 z-30 flex cursor-pointer items-center gap-1 border-none bg-transparent text-sm text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>

          {/* ── Caption (z:30) ──────────────────────────────────────────── */}
          <div className="absolute right-15 bottom-[calc(168px+env(safe-area-inset-bottom))] left-4 z-30">
            {title && (
              <p className="mb-1 text-md font-semibold text-white">{title}</p>
            )}
            {caption && (
              <p className="line-clamp-2 text-sm text-white/80">{caption}</p>
            )}
            {hashtags.length > 0 && (
              <p className="mt-1 text-sm text-primary">
                {hashtags.map((t) => `#${t}`).join(" ")}
              </p>
            )}
          </div>

          {/* ── Progress scrubber (z:30) ─────────────────────────────────── */}
          <div className="absolute right-4 bottom-[calc(124px+env(safe-area-inset-bottom))] left-4 z-30">
            {/* Time labels */}
            <div className="mb-1.5 flex justify-between text-[10px] text-white/70">
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </div>
            {/* Track — 20px tall for easy touch, 3px visual bar */}
            <div
              ref={scrubBarRef}
              className="relative flex h-5 w-full cursor-pointer items-center"
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLDivElement).setPointerCapture(
                  e.pointerId,
                );
                onScrubStart(e.clientX);
              }}
              onPointerMove={(e) => {
                e.stopPropagation();
                onScrubMove(e.clientX);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onScrubEnd();
              }}
            >
              {/* Track bg */}
              <div className="absolute right-0 left-0 h-[3px] rounded-[99px] bg-white/30">
                {/* Fill */}
                <div
                  className="absolute top-0 left-0 h-full rounded-[99px] bg-white"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              {/* Thumb */}
              <div
                className={`absolute z-1 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.5)] ${
                  scrubbing
                    ? "h-3.5 w-3.5"
                    : "h-2.5 w-2.5 transition-[width,height] duration-100"
                }`}
                style={{ left: `calc(${progress * 100}% - ${scrubbing ? 7 : 5}px)` }}
              />
            </div>
          </div>

          {/* ── Action buttons (z:30) ────────────────────────────────────── */}
          <div className="absolute inset-x-0 bottom-[calc(36px+env(safe-area-inset-bottom))] z-30 flex gap-3 px-4">
            <button
              onClick={handleSaveDraft}
              disabled={saving || publishing}
              className="flex h-13 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 text-base font-semibold text-white "
            >
              <SaveIcon /> Save draft
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePublish();
              }}
              disabled={publishing || saving}
              className={`flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl border-none text-base font-semibold text-white ${
                publishing
                  ? "cursor-default bg-white/20 opacity-70"
                  : "cursor-pointer bg-[linear-gradient(135deg,rgb(var(--brand-primary)),rgb(var(--brand-highlight)))] shadow-[0_4px_20px_rgb(var(--brand-primary)/0.5)]"
              }`}
            >
              {publishing ? (
                <MiniSpinner />
              ) : (
                <>
                  <SendIcon /> Post
                </>
              )}
            </button>
          </div>

          <CreateErrorDialog
            message={error}
            title="Couldn’t publish your post"
            onClose={() => setError(null)}
          />
        </div>

        {/* Dimmed right panel on desktop */}
        <div className="hidden flex-1 bg-black/70 md:block" />
      </div>
    );
  }

  // ── IMAGES — card layout ───────────────────────────────────────────────────
  return (
    <div className="md:fixed md:inset-0 md:z-50 md:flex md:items-center md:justify-center md:bg-black/50 md:">
      <div className="create-flow-card flex flex-col md:flex-row bg-app w-full md:rounded-2xl md:shadow-2xl md:overflow-hidden">
        {/* Desktop left — image preview */}
        <div
          className="hidden w-105 shrink-0 border-r border-border bg-surface md:flex md:flex-col md:justify-center md:items-center md:p-8 md:gap-4"
        >
          <div
            className="relative aspect-square w-full max-w-80 overflow-hidden rounded-2xl border border-border bg-background"
          >
            {cover && coverSrc ? (
              <Image
                src={coverSrc}
                alt={title}
                fill
                sizes="100vw"
                className="object-contain"
                unoptimized={shouldUnoptimizeMedia(coverSrc)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted">
                <PlaceholderIcon />
              </div>
            )}
            {mediaItems.length > 1 && <CountBadge count={mediaItems.length} />}
          </div>
          {title && (
            <p className="line-clamp-2 max-w-80 text-center text-base font-semibold text-foreground">
              {title}
            </p>
          )}
          {hashtags.length > 0 && (
            <p className="max-w-80 text-center text-sm text-primary">
              {hashtags.map((t) => `#${t}`).join(" ")}
            </p>
          )}
        </div>

        {/* Right / mobile — header + meta + actions */}
        <div className="flex flex-col flex-1 h-full min-h-0">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
            <button
              onClick={() => setStep("options")}
              className="flex items-center gap-1 text-sm text-muted"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>
            <h2 className="text-lg font-semibold text-foreground">Preview</h2>
            <div className="w-12.5" />
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {/* Mobile preview card */}
            <div className="overflow-hidden rounded-2xl border border-border bg-elevated md:hidden">
              <div className="relative aspect-square w-full">
                {cover && coverSrc ? (
                  <Image
                    src={coverSrc}
                    alt={title}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    unoptimized={shouldUnoptimizeMedia(coverSrc)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface">
                    <span className="text-sm text-muted">No preview</span>
                  </div>
                )}
                {mediaItems.length > 1 && (
                  <CountBadge count={mediaItems.length} />
                )}
              </div>
              <div className="px-4 py-3">
                <h3 className="mb-1 text-md font-semibold text-foreground">
                  {title || "Untitled"}
                </h3>
                {caption && (
                  <p className="line-clamp-2 text-base leading-[1.5] text-muted">
                    {caption}
                  </p>
                )}
                {hashtags.length > 0 && (
                  <p className="mt-1.5 text-sm text-primary">
                    {hashtags.map((t) => `#${t}`).join(" ")}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop title block */}
            <div className="hidden md:block mb-4">
              <h3 className="mb-1 text-xl font-bold text-foreground">
                {title || "Untitled"}
              </h3>
              {caption && (
                <p className="text-base leading-[1.6] text-muted">{caption}</p>
              )}
            </div>

            {/* Meta rows */}
            <div className="mt-4 flex flex-col gap-2">
              <MetaRow
                icon="👁"
                label="Audience"
                value={
                  visibilityMode === "public"
                    ? "Everyone"
                    : visibilityMode === "friends_only"
                      ? "Friends only"
                      : "Only me"
                }
              />
              <MetaRow
                icon="💰"
                label="Price"
                value={isFree ? "Free" : `${currency} ${price}`}
              />
              <MetaRow
                icon="🖼"
                label="Media"
                value={`${mediaItems.length} ${mediaItems.length === 1 ? "photo" : "photos"}`}
              />
            </div>

            <CreateErrorDialog
              message={error}
              title="Couldn’t publish your post"
              onClose={() => setError(null)}
            />
          </div>

          {/* Bottom actions */}
          <div className="flex shrink-0 gap-3 border-t border-border px-4 pt-3 pb-6">
            <button
              onClick={handleSaveDraft}
              disabled={saving || publishing}
              className={`flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-elevated text-base font-semibold text-foreground transition-transform active:scale-[0.98] ${
                saving ? "opacity-60" : ""
              }`}
            >
              {saving ? (
                <MiniSpinnerDark />
              ) : (
                <>
                  <SaveIcon dark /> Save draft
                </>
              )}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || saving}
              className={`flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white transition-transform active:scale-[0.98] ${
                publishing
                  ? "bg-border"
                  : "bg-[linear-gradient(135deg,rgb(var(--brand-primary)),rgb(var(--brand-highlight)))] shadow-[0_6px_20px_rgb(var(--brand-primary)/0.4)]"
              }`}
            >
              {publishing ? (
                <MiniSpinner />
              ) : (
                <>
                  <SendIcon /> Post
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CountBadge({ count }: { count: number }) {
  return (
    <div
      className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 "
    >
      <span className="text-xs font-semibold text-white">1/{count}</span>
    </div>
  );
}

function PlaceholderIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <path
        d="M3 15l5-5 4 4 3-3 6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="text-[16px]">{icon}</span>
        <span className="text-sm text-muted">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function SaveIcon({ dark }: { dark?: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={dark ? "currentColor" : "white"}
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path
        d="M22 2L11 13"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22l-4-9-9-4 20-7Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function fmt(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MiniSpinner() {
  return <InterlockingBalls size={18} />;
}

function MiniSpinnerDark() {
  return <InterlockingBalls size={18} />;
}
