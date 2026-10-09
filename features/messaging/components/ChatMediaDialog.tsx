"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { useHlsVideo } from "@/lib/useHlsVideo";
import { VideoProgressBar } from "@/features/feed/components/VideoProgressBar";

type ImageDialog = { kind: "image"; src: string };
type VideoDialog = {
  kind: "video";
  playbackId: string;
  poster?: string | null;
};

type Props = (ImageDialog | VideoDialog) & {
  onClose: () => void;
};

/**
 * Full-screen viewer for a chat image or video.
 *  - Image: shown `contain` (whole image, no crop).
 *  - Video: autoplays unmuted via the shared HLS hook, with a scrubber, a
 *    mute/unmute toggle, and a tap-to-play/pause overlay icon.
 * The browser Back button closes the dialog instead of navigating the page.
 */
export function ChatMediaDialog(props: Props) {
  const { onClose } = props;

  // ── Back-button → close (not navigate) ──────────────────────────────────────
  // We push one history entry on open and remove it on close, so Back always
  // lands cleanly on the chat. Setup is deferred to a macrotask so React's
  // dev strict-mode throwaway mount (which unmounts synchronously, before the
  // timer fires) never installs the history hooks — this is what stops the
  // open-then-instantly-close flicker.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    // Update the ref after render to avoid mutating refs during render.
    onCloseRef.current = onClose;
  }, [onClose]);

  const closeRef = useRef<() => void>(() => onCloseRef.current());

  useEffect(() => {
    let pushed = false;
    let closedByPop = false;

    const onPop = () => {
      // Our entry was popped by a real user Back → close, history already clean.
      closedByPop = true;
      onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };

    // Defer setup so strict-mode's throwaway pass (unmounts before this fires)
    // never pushes state or attaches listeners.
    const t = setTimeout(() => {
      window.history.pushState({ chatMediaDialog: true }, "");
      pushed = true;
      window.addEventListener("popstate", onPop);
      window.addEventListener("keydown", onKey);
    }, 0);

    // X / Esc: pop our entry (fires popstate → onClose). Net-zero history.
    closeRef.current = () => {
      if (pushed && !closedByPop) {
        closedByPop = true; // our own back() shouldn't re-trigger work
        window.history.back();
      } else {
        onCloseRef.current();
      }
    };

    return () => {
      clearTimeout(t);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      // Closed by the parent (not via Back / our close): pop the entry we added.
      if (pushed && !closedByPop) {
        window.history.back();
      }
    };
  }, []);

  const handleClose = useCallback(() => closeRef.current(), []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close"
        className="absolute right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
        style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <X size={22} />
      </button>

      {props.kind === "image" ? (
        <ImageViewer src={props.src} />
      ) : (
        <VideoViewer playbackId={props.playbackId} poster={props.poster} />
      )}
    </div>,
    document.body,
  );
}

function ImageViewer({ src }: { src: string }) {
  return (
    <div className="relative flex flex-1 items-center justify-center p-4">
      {/* contain — show the whole image, no crop */}
      <Image
        src={src}
        alt="Image"
        fill
        className="object-contain"
        sizes="100vw"
        unoptimized={src.startsWith("blob:") || src.startsWith("data:")}
      />
    </div>
  );
}

function VideoViewer({
  playbackId,
  poster,
}: {
  playbackId: string;
  poster?: string | null;
}) {
  const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;
  const { videoRef, buffering } = useHlsVideo(hlsUrl, true, false);

  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  // Briefly show the play/pause icon after a tap, then fade it.
  const [showIcon, setShowIcon] = useState(false);
  const iconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autoplay unmuted: signal intent before the manifest parses.
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = false;
  }, [videoRef]);

  // Mirror the real element state into our controls.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => {
      setPlaying(!v.paused);
      setMuted(v.muted);
    };
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    v.addEventListener("volumechange", sync);
    return () => {
      v.removeEventListener("play", sync);
      v.removeEventListener("pause", sync);
      v.removeEventListener("volumechange", sync);
    };
  }, [videoRef]);

  const flashIcon = useCallback(() => {
    setShowIcon(true);
    if (iconTimer.current) clearTimeout(iconTimer.current);
    iconTimer.current = setTimeout(() => setShowIcon(false), 600);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
    flashIcon();
  }, [flashIcon, videoRef]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, [videoRef]);

  useEffect(
    () => () => {
      if (iconTimer.current) clearTimeout(iconTimer.current);
    },
    [],
  );

  return (
    <>
      {/* Mute / unmute */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute left-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
        style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      <div className="relative flex flex-1 items-center justify-center">
        <video
          ref={videoRef}
          className="max-h-full max-w-full"
          playsInline
          autoPlay
          controls={false}
          poster={poster ?? undefined}
          onClick={togglePlay}
        />

        {/* Tap feedback + buffering */}
        {buffering ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <InterlockingBalls size={40} />
          </div>
        ) : showIcon || !playing ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white">
              {playing ? (
                <Pause size={26} fill="currentColor" />
              ) : (
                <Play size={26} fill="currentColor" className="ml-1" />
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Scrubber */}
      <div
        className="px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
      >
        <VideoProgressBar videoRef={videoRef} active showTime />
      </div>
    </>
  );
}
