"use client";

/**
 * VideoBubble — a floating, auto-playing video greeter for the landing page.
 *
 * Collapsed it is a small circle in the bottom-right that loops MUTED (the only
 * autoplay every browser allows). Tapping it expands the same <video> element
 * into a portrait card with sound, our custom progress bar, and replay/mute
 * controls. The element is never unmounted between the two states — only
 * restyled — so expanding doesn't tear down and re-buffer the HLS player.
 *
 * Dismissal is per-session (sessionStorage): once closed it stays gone for the
 * rest of the tab's life, and comes back on a fresh visit.
 */

import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Volume2, VolumeX, X, Play, Pause } from "lucide-react";
import { useHlsVideo } from "@/lib/useHlsVideo";
import { VideoProgressBar } from "@/features/feed/components/VideoProgressBar";
import { BufferSpinner } from "@/features/feed/components/BufferSpinner";
import { cn } from "@/lib/utils";

const PLAYBACK_ID = "Gg00rZ00giHUSR1y8W02kKKOMDv02PyePxVwyA1z0100TzD3s";
const HLS_URL = `https://stream.mux.com/${PLAYBACK_ID}.m3u8`;
const POSTER = `https://image.mux.com/${PLAYBACK_ID}/thumbnail.webp?time=1&width=320`;
const DISMISSED_KEY = "shopi_video_bubble_dismissed";
/** Let the hero paint and settle before the bubble slides in. */
const APPEAR_DELAY_MS = 1500;

export function VideoBubble() {
  // `mounted` gates the whole thing behind a client-side sessionStorage read, so
  // the server never renders a bubble the user already dismissed this session.
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  // `active` stays true for the whole mounted life: flipping it off would tear
  // the hls.js player down and strip the <video> src, so Replay would then have
  // nothing to seek. Reaching the end is expressed as "paused" instead.
  const { videoRef, buffering, playing } = useHlsVideo(
    mounted ? HLS_URL : null,
    mounted,
    userPaused || ended,
    setMuted,
  );

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY) === "1") return;
    const timer = setTimeout(() => setMounted(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Collapsed is a silent teaser, so it loops forever. Expanded is a real watch,
  // so it plays through once and offers replay.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = !expanded;
  }, [expanded, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.defaultMuted = muted;
  }, [muted, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => {
      // Only the expanded state parks on an end card; collapsed loops instead.
      if (video.loop) return;
      setEnded(true);
    };
    video.addEventListener("ended", onEnded);
    return () => video.removeEventListener("ended", onEnded);
  }, [videoRef, mounted]);

  const dismiss = useCallback(() => {
    videoRef.current?.pause();
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setMounted(false);
    setExpanded(false);
  }, [videoRef]);

  const replay = useCallback(() => {
    const video = videoRef.current;
    setEnded(false);
    setUserPaused(false);
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }, [videoRef]);

  function handleExpand() {
    setExpanded(true);
    setEnded(false);
    setUserPaused(false);
    const video = videoRef.current;
    if (!video) return;
    // Restart from the top with sound — the click is fresh user activation, so
    // unmuting here is always permitted.
    video.currentTime = 0;
    video.muted = false;
    setMuted(false);
    void video.play().catch(() => {});
  }

  function handleCollapse() {
    setExpanded(false);
    setEnded(false);
    setUserPaused(false);
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    setMuted(true);
    void video.play().catch(() => {});
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setUserPaused(false);
      void video.play().catch(() => {});
    } else {
      setUserPaused(true);
      video.pause();
    }
  }

  if (!mounted) return null;

  return (
    <div
      className={cn(
        // Sits above page content but below modals/toasts.
        "fixed z-40 flex flex-col items-end",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500",
        expanded
          ? // Expanded on a phone is a bottom sheet: edge to edge, flush with
            // the bottom. From sm+ it returns to the corner-anchored card.
            cn(
              "inset-x-0 bottom-0",
              "sm:inset-x-auto sm:right-[calc(1.5rem+env(safe-area-inset-right))]",
              "sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]",
            )
          : // Collapsed: corner bubble, insets clear the iOS home indicator.
            cn(
              "right-[calc(1.5rem+env(safe-area-inset-right))]",
              "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]",
            ),
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-black shadow-[0_8px_40px_rgba(0,0,0,0.35)]",
          "transition-[width,height,border-radius] duration-300 ease-out",
          expanded
            ? // Phone (the bulk of traffic): a full-width sheet at 80dvh, only
              // the top corners rounded since it's flush with the bottom edge.
              // sm+ becomes a floating portrait card that grows with the screen.
              cn(
                "h-[80dvh] w-full rounded-t-2xl",
                "sm:h-136 sm:w-88 sm:rounded-2xl sm:ring-1 sm:ring-white/15",
                "lg:h-200 lg:w-120",
              )
            : // Bubble — big enough that a face actually reads at a glance.
              "h-24 w-24 rounded-full ring-2 ring-primary/70 sm:h-32 lg:h-32 lg:w-32",
        )}
      >
        <video
          ref={videoRef}
          muted={muted}
          playsInline
          poster={POSTER}
          className={cn(
            "absolute inset-0 h-full w-full",
            // The circle has to be filled edge to edge or it letterboxes into
            // black slivers; the expanded sheet shows the whole frame instead.
            expanded ? "object-contain" : "object-cover",
          )}
        />

        {/* Collapsed: the whole circle is the open affordance. */}
        {!expanded && (
          <button
            type="button"
            onClick={handleExpand}
            aria-label="Play welcome video"
            className="absolute inset-0 z-30 cursor-pointer"
          >
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent pb-2 pt-5 text-xs font-semibold text-white">
              Hello 👋
            </span>
          </button>
        )}

        {buffering && !ended && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <BufferSpinner />
          </div>
        )}

        {expanded && (
          <>
            {/* Tap the video body to pause/resume, like the feed. */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause video" : "Play video"}
              className="absolute inset-0 z-10 cursor-pointer"
            />

            {!playing && !buffering && !ended && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 ">
                  <Play className="h-6 w-6 translate-x-px fill-white text-white" />
                </span>
              </div>
            )}

            <div className="absolute left-2 top-2 z-30 flex flex-col gap-2">
              <ControlButton onClick={replay} label="Replay video">
                <RotateCcw className="h-4 w-4" />
              </ControlButton>
              <ControlButton
                onClick={() => setMuted((m) => !m)}
                label={muted ? "Unmute video" : "Mute video"}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </ControlButton>
              <ControlButton
                onClick={togglePlay}
                label={playing ? "Pause video" : "Play video"}
              >
                {playing ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </ControlButton>
            </div>

            {/* Collapse back to the bubble; the X below the fold dismisses. */}
            <div className="absolute right-2 top-2 z-30">
              <ControlButton onClick={handleCollapse} label="Minimise video">
                <X className="h-4 w-4" />
              </ControlButton>
            </div>

            {ended && (
              <button
                type="button"
                onClick={replay}
                className="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center gap-2 bg-black/55 text-white"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ">
                  <RotateCcw className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium">Watch again</span>
              </button>
            )}

            <VideoProgressBar
              videoRef={videoRef}
              active={playing}
              // The sheet is flush with the bottom edge on phones, so the bar
              // has to clear the iOS home indicator to stay grabbable.
              className="z-30 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-1"
              showTime
            />
          </>
        )}
      </div>

      {/* Permanent dismiss — kills the bubble for the rest of the session.
          Collapsed only: while expanded, the in-card X owns the corner and two
          different X buttons side by side is just a coin-flip for the user. */}
      {!expanded && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss welcome video"
          className={cn(
            "absolute -top-1 -right-1 z-40 flex h-7 w-7 items-center justify-center",
            "rounded-full bg-neutral-900 text-white ring-1 ring-white/25",
            "transition-transform hover:scale-110",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white  transition-colors hover:bg-black/65"
    >
      {children}
    </button>
  );
}
