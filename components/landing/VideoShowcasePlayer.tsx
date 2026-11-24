"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play, Volume2, VolumeX } from "lucide-react";
import { useHlsVideo } from "@/lib/useHlsVideo";

/**
 * The homepage video section's phone: one real Shopi video listing, playing
 * muted on a loop the way it plays in the feed.
 *
 * Fast start, small cost:
 * - The poster is the video's own first frame (a Mux still), so the frame is
 *   there from the first paint and the video takes over without a jump.
 * - It streams as HLS through the feed's player (useHlsVideo): small chunks,
 *   lowest rendition first, the first chunk fetched straight away, then it
 *   steps up in quality. The page preconnects to Mux and preloads the
 *   manifest, so the first chunk is one request away when this mounts.
 * - It starts loading a little before it scrolls into view, loads once, and
 *   pauses (without discarding what it has) while it's off screen.
 * - No autoplay for people who ask for reduced motion or less data: they get
 *   the still and a play button.
 */
export type VideoShowcaseCopy = {
  seller: string;
  title: string;
  price: string;
  badge: string;
  play: string;
  mute: string;
  unmute: string;
  watch: string;
};

export function VideoShowcasePlayer({
  playbackId,
  href,
  copy,
}: {
  playbackId: string;
  href: string;
  copy: VideoShowcaseCopy;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  // Entered the loading zone at least once: from then on the stream stays.
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  // null until we know whether autoplay is welcome here.
  const [autoplay, setAutoplay] = useState<boolean | null>(null);
  const [userStarted, setUserStarted] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot read of browser preferences
    setAutoplay(!reduce && !saveData);
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setNear(true);
      },
      // Start a screen early, so it's already moving when it arrives.
      { rootMargin: "100% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const wanted = Boolean(autoplay) || userStarted;
  const { videoRef, playing } = useHlsVideo(
    `https://stream.mux.com/${playbackId}.m3u8`,
    near && wanted,
    !inView,
    setMuted,
  );

  const poster = `https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=540`;

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (video.paused) void video.play().catch(() => {});
  }

  return (
    <div
      ref={frameRef}
      className="relative mx-auto aspect-9/16 w-full max-w-[18rem] rounded-[2.4rem] bg-neutral-950 p-2 shadow-[0_40px_80px_-30px_rgb(var(--brand-primary)/0.55),0_18px_40px_-20px_rgb(0_0_0/0.45)] ring-1 ring-black/10 sm:max-w-[19.5rem]"
    >
      <div className="relative size-full overflow-hidden rounded-[1.95rem] bg-neutral-900">
        {/* eslint-disable-next-line @next/next/no-img-element -- a Mux still; next/image would re-encode an already-sized image */}
        <img
          src={poster}
          alt=""
          width={540}
          height={960}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
        <video
          ref={(el) => {
            videoRef.current = el;
            // React doesn't reliably set `muted` as a property; autoplay
            // needs the property, not the attribute.
            if (el) {
              el.muted = muted;
              el.defaultMuted = true;
            }
          }}
          muted
          loop
          playsInline
          preload="none"
          aria-label={copy.title}
          className={`absolute inset-0 size-full object-cover transition-opacity! duration-500! ${
            playing ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Feed-style chrome: who's selling, what it is, what it costs. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-linear-to-b from-black/55 to-transparent p-3.5 pb-10">
          <span className="grid size-8 place-items-center rounded-full bg-white/90 text-xs font-bold text-neutral-900">
            {copy.seller[0]?.toUpperCase()}
          </span>
          <span className="truncate text-sm font-semibold text-white drop-shadow">{copy.seller}</span>
          <span className="ml-auto rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {copy.badge}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/35 to-transparent p-4 pt-16">
          <p className="text-[1.375rem] font-black leading-none text-white">{copy.price}</p>
          <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug text-white/90">{copy.title}</p>
          <Link
            href={href}
            className="mt-3 inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-neutral-900 transition-colors hover:bg-white/90"
          >
            {copy.watch}
          </Link>
        </div>

        {autoplay === false && !userStarted ? (
          <button
            type="button"
            onClick={() => setUserStarted(true)}
            className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-neutral-900 shadow-lg transition-transform hover:scale-105"
            aria-label={copy.play}
          >
            <Play className="ml-1 size-7" fill="currentColor" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleSound}
            className="absolute right-3 top-14 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/60"
            aria-label={muted ? copy.unmute : copy.mute}
            aria-pressed={!muted}
          >
            {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}
