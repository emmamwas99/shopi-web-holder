"use client";

/**
 * TikTokEmbedMedia — feed media block for posts whose source = TIKTOK_EMBED.
 *
 * We do not host the video. The card shows our own chrome (cover image, price,
 * creator header live in PostCard) with a TikTok badge. On tap we lazily load
 * the `tiktok-video-element` web component and stream the video straight from
 * TikTok. A persistent "View on TikTok" badge links back to the original for
 * attribution.
 */

import {
  useState,
  useRef,
  useCallback,
} from "react";
import Image from "next/image";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";

let registerPromise: Promise<unknown> | null = null;
/** Register the custom element once, lazily, on first play. */
function ensureRegistered(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!registerPromise) registerPromise = import("tiktok-video-element");
  return registerPromise;
}

export function TikTokEmbedMedia({
  post,
}: {
  post: ContentCardFieldsFragment;
}) {
  const embed = post.tiktokEmbed;
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePlay = useCallback(async () => {
    await ensureRegistered();
    setReady(true);
    setPlaying(true);
  }, []);

  if (!embed) return null;

  const shareUrl = embed.shareUrl;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-black"
      style={{ aspectRatio: "9 / 16", maxHeight: "70vh" }}
    >
      {/* Live embed — mounted only after first tap */}
      {ready && (
        <tiktok-video
          src={shareUrl}
          controls
          className="absolute inset-0 h-full w-full"
          style={{ width: "100%", height: "100%" }}
        />
      )}

      {/* Cover + play affordance — shown until the user taps play */}
      {!playing && (
        <button
          type="button"
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Play TikTok video"
        >
          {embed.coverImageUrl && (
            <Image
              src={embed.coverImageUrl}
              alt={embed.title ?? "TikTok video"}
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
            />
          )}
          <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-black/55 ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
