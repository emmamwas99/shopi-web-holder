"use client";

/**
 * MuxVideo — thin wrapper around @mux/mux-player-react.
 * Handles iOS Safari, HLS, autoplay-muted out of the box.
 */

import { useCallback, useRef } from "react";
import MuxPlayer from "@mux/mux-player-react";
import type MuxPlayerElement from "@mux/mux-player";

interface MuxVideoProps {
  /** Mux playback ID */
  muxPlaybackId?: string;
  /** Raw blob/mp4 src — used when no playbackId yet */
  src?: string;
  className?: string;
  style?: React.CSSProperties;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  poster?: string;
  objectFit?: "cover" | "contain" | "fill";
  controls?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: () => void;
  onLoadedMetadata?: () => void;
  onVolumeChange?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export function MuxVideo({
  muxPlaybackId,
  src,
  className,
  style,
  autoPlay = false,
  loop = false,
  muted = true,
  playsInline = true,
  poster,
  objectFit = "cover",
  controls = false,
  onPlay,
  onPause,
  onTimeUpdate,
  onLoadedMetadata,
  onVolumeChange,
  videoRef,
}: MuxVideoProps) {
  const playerRef = useRef<MuxPlayerElement | null>(null);
  const setPlayerRef = useCallback(
    (player: MuxPlayerElement | null) => {
      playerRef.current = player;
      if (videoRef) {
        videoRef.current = (player?.media as unknown as HTMLVideoElement | null) ?? null;
      }
    },
    [videoRef],
  );
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef) {
      videoRef.current =
        (playerRef.current?.media as unknown as HTMLVideoElement | null) ?? null;
    }
    onLoadedMetadata?.();
  }, [onLoadedMetadata, videoRef]);

  // If no Mux playback ID, fall back to a plain <video> (blob / local file)
  if (!muxPlaybackId) {
    return (
      <video
        ref={videoRef}
        src={src}
        className={className}
        style={{ ...style, objectFit }}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        poster={poster}
        controls={controls}
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onVolumeChange={onVolumeChange}
        preload="metadata"
      />
    );
  }

  return (
    <MuxPlayer
      playbackId={muxPlaybackId}
      className={className}
      ref={setPlayerRef}
      style={{
        ...style,
        "--media-object-fit": objectFit,
        "--media-object-position": "center",
        "--controls": controls ? undefined : "none",
        width: "100%",
        height: "100%",
      } as never}
      autoPlay={autoPlay ? "muted" : false}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      poster={poster ?? `https://image.mux.com/${muxPlaybackId}/thumbnail.webp?time=0&width=720`}
      streamType="on-demand"
      preload="auto"
      onPlay={onPlay}
      onPause={onPause}
      onTimeUpdate={onTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onVolumeChange={onVolumeChange}
    />
  );
}
