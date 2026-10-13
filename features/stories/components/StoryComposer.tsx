"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Scissors, Send, Volume2, VolumeX, X } from "lucide-react";
import { isAutoplayRefusal } from "@/lib/useHlsVideo";
import { useOverlayBehaviour } from "../hooks/useOverlayBehaviour";
import {
  MAX_STORY_CAPTION,
  MAX_STORY_VIDEO_SECONDS,
} from "../constants";

/** Container durations rarely land on a whole second; don't warn about 60.2s. */
const TRIM_WARNING_THRESHOLD = MAX_STORY_VIDEO_SECONDS + 0.5;

/**
 * Preview a picked photo or video before it goes up, WhatsApp-style: the media
 * as it will look, an optional caption, and one button to share. A video
 * longer than the story limit previews (and loops) only the part that will be
 * posted, with a note saying so — the API does the actual cut.
 */
export function StoryComposer({
  file,
  onClose,
  onShare,
}: {
  file: File;
  onClose: () => void;
  onShare: (caption: string) => void;
}) {
  const { requestClose } = useOverlayBehaviour(onClose, "storyComposer");
  const isVideo = file.type.startsWith("video/");

  const [caption, setCaption] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const willTrim = duration !== null && duration > TRIM_WARNING_THRESHOLD;

  // Each attach makes its own blob URL and revokes it on detach. A URL made
  // once (useMemo) and revoked in an effect cleanup breaks under Strict Mode:
  // the throwaway cleanup revokes it while the element still points at it.
  const mediaRef = useCallback(
    (el: HTMLVideoElement | HTMLImageElement | null) => {
      if (!el) return;
      const url = URL.createObjectURL(file);
      const onError = () => setPreviewFailed(true);
      el.addEventListener("error", onError);

      if (el instanceof HTMLVideoElement) {
        const onMetadata = () => setDuration(el.duration);
        // Preview only what will be posted.
        const onTime = () => {
          if (el.currentTime >= MAX_STORY_VIDEO_SECONDS) el.currentTime = 0;
        };
        el.addEventListener("loadedmetadata", onMetadata);
        el.addEventListener("timeupdate", onTime);
        el.src = url;
        videoRef.current = el;
        // With sound, as it will be posted — picking the file was a tap, so
        // most browsers allow it. Where one doesn't, play muted and let the
        // speaker button turn sound on.
        el.muted = false;
        el.play().catch((err: unknown) => {
          if (!isAutoplayRefusal(err)) return;
          el.muted = true;
          setMuted(true);
          el.play().catch(() => {});
        });
        return () => {
          videoRef.current = null;
          el.removeEventListener("error", onError);
          el.removeEventListener("loadedmetadata", onMetadata);
          el.removeEventListener("timeupdate", onTime);
          el.removeAttribute("src");
          el.load();
          URL.revokeObjectURL(url);
        };
      }

      el.src = url;
      return () => {
        el.removeEventListener("error", onError);
        URL.revokeObjectURL(url);
      };
    },
    [file],
  );

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    // A tap is permission to play, sound and all.
    if (v.paused) v.play().catch(() => {});
  };

  // The parent unmounts us on share; unmounting unwinds our history entry.
  const share = () => onShare(caption);

  return createPortal(
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black md:bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label="New story"
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-black md:aspect-9/16 md:h-[min(92svh,880px)] md:w-auto md:rounded-2xl">
        {/* ── Preview ──────────────────────────────────────────────────── */}
        <div className="relative min-h-0 flex-1">
          {previewFailed ? (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/70">
              This file can&apos;t be previewed here, but you can still share it.
            </div>
          ) : isVideo ? (
            <video
              ref={mediaRef}
              className="absolute inset-0 h-full w-full object-contain"
              loop
              playsInline
            />
          ) : (
            // A local blob — next/image can't optimize it and gains nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={mediaRef}
              alt="Story preview"
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black/55 to-transparent" />

          <div className="absolute inset-x-0 top-0 px-2 pt-[max(env(safe-area-inset-top),8px)]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={requestClose}
                aria-label="Discard"
                className="flex h-11 w-11 items-center justify-center rounded-full text-white drop-shadow active:bg-white/10"
              >
                <X size={26} />
              </button>
              <span className="text-[15px] font-semibold text-white drop-shadow">New story</span>
              {isVideo && !previewFailed ? (
                <button
                  type="button"
                  onClick={toggleSound}
                  aria-label={muted ? "Turn sound on" : "Turn sound off"}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white drop-shadow active:bg-white/10"
                >
                  {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
              ) : (
                <span className="w-11" />
              )}
            </div>

            {willTrim && (
              <div className="mt-1 flex justify-center px-2">
                <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white ">
                  <Scissors size={14} />
                  Only the first {MAX_STORY_VIDEO_SECONDS} seconds will be shared
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Caption + share ──────────────────────────────────────────── */}
        <form
          className="flex items-end gap-2 bg-black px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            share();
          }}
        >
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, MAX_STORY_CAPTION))}
            placeholder="Add a caption…"
            rows={1}
            maxLength={MAX_STORY_CAPTION}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-3xl bg-white/12 px-4 py-2.5 text-[15px] leading-snug text-white outline-none placeholder:text-white/55 focus:bg-white/16"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                share();
              }
            }}
          />
          <button
            type="submit"
            className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-semibold text-white active:opacity-90"
          >
            Share
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
