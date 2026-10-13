"use client";

/**
 * MediaCarouselDialog — full-screen viewer for post images and Mux videos.
 * Swipe / arrow through media, tap the scrim or the ✕ to close.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SHIMMER_PORTRAIT } from "@/lib/shimmer";
import { useHlsVideo } from "@/lib/useHlsVideo";
import { useFeedPreferencesStore } from "@/stores/feedPreferences";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { BufferSpinner } from "./BufferSpinner";
import { VideoProgressBar } from "./VideoProgressBar";

type MediaItem = NonNullable<ContentCardFieldsFragment["media"]>[number];

function srcOf(item: MediaItem): string {
  return (
    item.r2Variants?.find((v) => v.variant === "large")?.url ??
    item.r2Variants?.[0]?.url ??
    item.imageUrl ??
    item.thumbnailUrl ??
    ""
  );
}

export function MediaCarouselDialog({
  open,
  onOpenChange,
  media,
  title,
  startIndex = 0,
  videoStartTime = 0,
  onVideoTimeChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: MediaItem[];
  title: string;
  startIndex?: number;
  videoStartTime?: number;
  onVideoTimeChange?: (time: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(startIndex);

  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const closeRef = useRef<() => void>(() => onOpenChangeRef.current(false));

  // Jump to the starting image once the dialog (and its track) is mounted.
  // Deferred so we don't setState synchronously inside the effect body.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setIdx(startIndex);
      const el = trackRef.current;
      if (el)
        el.scrollTo({
          left: startIndex * el.clientWidth,
          behavior: "instant" as ScrollBehavior,
        });
    }, 0);
    return () => clearTimeout(t);
  }, [open, startIndex]);

  // Native back-button / browser-back closes the dialog instead of leaving the
  // feed. Setup is deferred so React Strict Mode's throwaway effect pass cannot
  // push and immediately pop history, which used to close the dialog on open.
  useEffect(() => {
    if (!open) return;

    let pushed = false;
    let closedByPop = false;

    const onPop = () => {
      closedByPop = true;
      onOpenChangeRef.current(false);
    };

    const t = setTimeout(() => {
      window.history.pushState(
        { ...window.history.state, mediaCarousel: true },
        "",
      );
      pushed = true;
      window.addEventListener("popstate", onPop);
    }, 0);

    closeRef.current = () => {
      if (pushed && !closedByPop) {
        closedByPop = true;
        window.history.back();
      } else {
        onOpenChangeRef.current(false);
      }
    };

    return () => {
      clearTimeout(t);
      window.removeEventListener("popstate", onPop);
      if (pushed && !closedByPop) window.history.back();
    };
  }, [open]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) onOpenChangeRef.current(true);
    else closeRef.current();
  }, []);

  function go(next: number) {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(media.length - 1, next));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setIdx(clamped);
  }

  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="z-[100]"
        className="z-[100] h-svh w-screen max-w-none translate-x-[-50%] translate-y-[-50%] gap-0 border-0 bg-black p-0 sm:rounded-none [&>button:last-of-type]:hidden"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {/* Close — our own visible ✕. The parent only hides the *last* direct
            button (Radix's built-in close), so this one stays visible. */}
        <button
          type="button"
          onClick={() => closeRef.current()}
          aria-label="Close"
          className="absolute right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white  active:scale-95"
          style={{ top: "max(env(safe-area-inset-top, 0px), 16px)" }}
        >
          <X className="h-6 w-6" />
        </button>

        {/* Counter — only when there's more than one image */}
        {media.length > 1 && (
          <div
            className="absolute left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white "
            style={{ top: "max(env(safe-area-inset-top, 0px), 18px)" }}
          >
            {idx + 1} / {media.length}
          </div>
        )}

        {/* Swipeable track */}
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex h-svh w-screen snap-x snap-mandatory overflow-x-auto no-scroll-indicator"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {media.map((item, i) => {
            const src = srcOf(item);
            const playbackId = item.muxMeta?.playbackId;
            return (
              <div
                key={i}
                className="relative h-svh w-screen shrink-0 snap-center bg-black"
              >
                {playbackId ? (
                  <FullscreenVideo
                    playbackId={playbackId}
                    poster={src}
                    active={i === idx}
                    startTime={videoStartTime}
                    onTimeChange={onVideoTimeChange}
                  />
                ) : src ? (
                  <Image
                    src={src}
                    alt={`${title} ${i + 1}`}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    priority={i === startIndex}
                    placeholder="blur"
                    blurDataURL={SHIMMER_PORTRAIT}
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Desktop arrows */}
        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(idx - 1)}
              disabled={idx === 0}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30 md:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(idx + 1)}
              disabled={idx === media.length - 1}
              aria-label="Next image"
              className="absolute right-3 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30 md:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots — only when there's more than one image */}
        {media.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-1.5">
          {media.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to image ${i + 1}`}
              className={[
                "rounded-full transition-all",
                i === idx ? "h-1.5 w-4 bg-white" : "h-1.5 w-1.5 bg-white/50",
              ].join(" ")}
            />
          ))}
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FullscreenVideo({
  playbackId,
  poster,
  active,
  startTime,
  onTimeChange,
}: {
  playbackId: string;
  poster?: string | null;
  active: boolean;
  startTime: number;
  onTimeChange?: (time: number) => void;
}) {
  const muted = useFeedPreferencesStore((s) => s.videoMuted);
  const setMuted = useFeedPreferencesStore((s) => s.setVideoMuted);
  const [actualMuted, setActualMuted] = useState(muted);
  const onMutedChange = useCallback(
    (nextMuted: boolean) => setActualMuted(nextMuted),
    [],
  );
  const { videoRef, buffering, playing } = useHlsVideo(
    `https://stream.mux.com/${playbackId}.m3u8`,
    active,
    !active,
    onMutedChange,
  );
  const onTimeChangeRef = useRef(onTimeChange);
  const didSeekRef = useRef(false);
  const latestTimeRef = useRef(startTime);

  useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.defaultMuted = muted;
    setActualMuted(video.muted);
    if (!muted && active) video.play().catch(() => {});
  }, [active, muted, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const syncActualMuted = () => setActualMuted(video.muted);
    syncActualMuted();
    video.addEventListener("volumechange", syncActualMuted);
    return () => video.removeEventListener("volumechange", syncActualMuted);
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || didSeekRef.current || startTime <= 0) return;
    const seek = () => {
      if (didSeekRef.current) return;
      video.currentTime = Math.min(startTime, video.duration || startTime);
      latestTimeRef.current = video.currentTime;
      didSeekRef.current = true;
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
    return () => video.removeEventListener("loadedmetadata", seek);
  }, [startTime, videoRef]);

  useEffect(
    () => () => {
      onTimeChangeRef.current?.(latestTimeRef.current);
    },
    [],
  );

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, [videoRef]);

  const toggleMuted = useCallback(() => {
    const video = videoRef.current;
    const next = !(video?.muted ?? actualMuted);
    if (video) {
      video.muted = next;
      video.defaultMuted = next;
      if (!next) video.play().catch(() => {});
    }
    setActualMuted(next);
    setMuted(next);
  }, [actualMuted, setMuted, videoRef]);

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <video
        ref={videoRef}
        muted={actualMuted}
        playsInline
        poster={poster ?? undefined}
        className="max-h-full max-w-full object-contain"
        onClick={togglePlayback}
        onTimeUpdate={(event) => {
          latestTimeRef.current = event.currentTarget.currentTime;
        }}
      />

      {buffering ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <BufferSpinner />
        </div>
      ) : !playing ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white ">
            <Play className="ml-1 h-7 w-7" fill="currentColor" />
          </span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? "Pause video" : "Play video"}
        className="absolute inset-0 z-10"
      >
        <span className="sr-only">{playing ? "Pause video" : "Play video"}</span>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          toggleMuted();
        }}
        aria-label={actualMuted ? "Unmute video" : "Mute video"}
        className="absolute left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white "
        style={{ top: "max(env(safe-area-inset-top, 0px), 16px)" }}
      >
        {actualMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <div className="absolute inset-x-4 bottom-5 z-30">
        <VideoProgressBar videoRef={videoRef} active={active} showTime />
      </div>
    </div>
  );
}
