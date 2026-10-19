"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  className?: string;
  showTime?: boolean;
  timeClassName?: string;
}

export function VideoProgressBar({
  videoRef,
  active,
  className = "",
  showTime = false,
  timeClassName = "",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);

  const syncProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const pct = Math.max(0, Math.min(100, (video.currentTime / video.duration) * 100));
    if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    if (thumbRef.current) thumbRef.current.style.left = `calc(${pct}% - 5px)`;
    if (timeRef.current) timeRef.current.textContent = fmtTime(video.currentTime);

    // Buffered (loaded) chunks: width of the buffered range covering the current
    // playhead. Mirrors YouTube's lighter "loaded" bar ahead of the played part.
    if (bufferRef.current) {
      let bufferedEnd = 0;
      const ranges = video.buffered;
      for (let i = 0; i < ranges.length; i++) {
        if (ranges.start(i) <= video.currentTime && video.currentTime <= ranges.end(i)) {
          bufferedEnd = ranges.end(i);
          break;
        }
        // fall back to the furthest buffered point if no range covers the playhead
        bufferedEnd = Math.max(bufferedEnd, ranges.end(i));
      }
      const bufPct = Math.max(0, Math.min(100, (bufferedEnd / video.duration) * 100));
      bufferRef.current.style.width = `${bufPct}%`;
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleMetadata = () => {
      setDuration(video.duration || 0);
      syncProgress();
    };
    const handleSeeked = () => syncProgress();
    // `progress` fires as new chunks finish loading (even while paused) — keeps
    // the buffered bar growing without needing the rAF loop to be running.
    const handleProgress = () => syncProgress();

    // Seed from the element's CURRENT state before subscribing. When this bar
    // mounts onto a video that is already playing (e.g. it appears only once a
    // player is expanded), `loadedmetadata` fired long ago and would never fire
    // again — leaving the total time stuck at 0:00.
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) handleMetadata();

    video.addEventListener("loadedmetadata", handleMetadata);
    video.addEventListener("durationchange", handleMetadata);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("progress", handleProgress);
    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("durationchange", handleMetadata);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("progress", handleProgress);
    };
  }, [syncProgress, videoRef]);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      syncProgress();
      return;
    }

    function tick() {
      syncProgress();
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, syncProgress, videoRef]);

  function seekTo(clientX: number) {
    const video = videoRef.current;
    const track = trackRef.current;
    if (!video || !track || !video.duration) return;

    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = pct * video.duration;
    syncProgress();
  }

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-40 px-0 pb-0 pt-6 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {showTime && (
        <div className={`mx-3 mb-1 flex items-center justify-between text-xs font-medium tabular-nums text-white/80 drop-shadow pointer-events-none ${timeClassName}`}>
          <span ref={timeRef}>0:00</span>
          <span>{fmtTime(duration)}</span>
        </div>
      )}

      <div
        ref={trackRef}
        className="group relative flex h-4 cursor-pointer touch-none items-end"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setSeeking(true);
          seekTo(e.clientX);
        }}
        onPointerMove={(e) => {
          if (seeking) seekTo(e.clientX);
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setSeeking(false);
          seekTo(e.clientX);
        }}
        onPointerCancel={() => setSeeking(false)}
      >
        <div
          className="relative h-[3px] w-full overflow-visible rounded-full bg-white/20 transition-[height]"
          style={{ height: seeking ? 5 : 3 }}
        >
          {/* Buffered / loaded chunks — brighter than the track, dimmer than
              played. Mirrors YouTube: white-ish "loaded" ahead of the playhead. */}
          <div
            ref={bufferRef}
            className="absolute left-0 top-0 h-full rounded-full bg-white/55"
            style={{ width: "0%" }}
          />
          {/* Played — primary colour, sits on top of the buffered layer. */}
          <div
            ref={fillRef}
            className="absolute left-0 top-0 h-full rounded-full bg-primary"
            style={{ width: "0%" }}
          />
          <div
            ref={thumbRef}
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow-[0_1px_8px_rgba(0,0,0,0.55)] transition-opacity group-hover:opacity-100"
            style={{
              left: "-5px",
              opacity: seeking ? 1 : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
