"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import {
  memo,
  useRef,
  useEffect,
  useState,
  useCallback,
  useId,
  useMemo,
} from "react";
import type { CSSProperties } from "react";
import {
  Download,
  Bookmark,
  Forward,
  Heart,
  MessageCircle,
  Link2,
  Flag,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChatShellSkeleton } from "@/features/messaging/components/ChatShellSkeleton";
import Shimmer, {
  SHIMMER,
  SHIMMER_AVATAR,
  SHIMMER_PORTRAIT,
} from "@/lib/shimmer";
import { pauseAllVideos, registerVideo, updateRatio } from "@/lib/activeVideo";
import { useHlsVideo } from "@/lib/useHlsVideo";
import { useFeedPreferencesStore } from "@/stores/feedPreferences";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { VideoProgressBar } from "./VideoProgressBar";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { shouldFire } from "@/lib/interactionDedup";
import { useFeedChat } from "./FeedChatContext";
import { fmtCompact as fmt } from "@/lib/format";
import { avatarGradient, idInitials as initials } from "@/lib/avatar";
import { useInteractions } from "../hooks/useInteractions";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { useVideoDownload } from "../hooks/useVideoDownload";
import { useFollow } from "../hooks/useFollow";
import { BufferSpinner } from "./BufferSpinner";
import { TikTokIcon } from "@/components/ui/TikTokIcon";
import { usePageFocused } from "../hooks/usePageFocused";
import { useVideoAnalytics } from "../hooks/useVideoAnalytics";
import {
  saveFeedVideoTime,
  restoreFeedVideoTime,
  clearFeedVideoTime,
} from "../lib/videoResume";
import { setImmersiveHandoff } from "../lib/immersiveHandoff";
import { hlsUrlOf, posterOf } from "../lib/videoSource";
import toBase64, { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { absoluteContentUrl, contentPath, videoPath } from "@/lib/content-url";
import { rememberScrollBeforeNavigation } from "@/components/layout/RouteScrollRestoration";
import { profileHref } from "@/lib/profile-url";
import { CreatorStoryAvatar } from "@/features/stories/components/CreatorStoryAvatar";

const MediaCarouselDialog = dynamic(() =>
  import("./MediaCarouselDialog").then((mod) => mod.MediaCarouselDialog),
);
const CommentsDrawer = dynamic(() =>
  import("./CommentsDrawer").then((mod) => mod.CommentsDrawer),
);
const TikTokEmbedMedia = dynamic(() =>
  import("./TikTokEmbedMedia").then((mod) => mod.TikTokEmbedMedia),
);

interface Props {
  post: ContentCardFieldsFragment;
  lang: string;
  priority?: boolean;
  /**
   * Desktop feed: open the chat inline in the right rail instead of navigating
   * to the full-screen chat screen. When omitted (mobile / elsewhere) the
   * Message button keeps its default navigation behaviour. The card element is
   * passed so the host can auto-close the chat when the post scrolls away.
   */
  onMessage?: (contentId: string, anchor: HTMLElement | null) => void;
}

type FeedSocialUser = {
  id: string;
  username?: string | null;
  isVerified?: boolean | null;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  } | null;
};
type FeedPostSocialPreview = ContentCardFieldsFragment & {
  recentSavers?: FeedSocialUser[] | null;
};

// ── helpers ──────────────────────────────────────────────────────────────────
// fmt, initials, and the avatar gradient palette are shared from @/lib
// (imported above) so they don't drift across the feed components.

/**
 * Strip Google plus-codes (Open Location Codes) like "PVR+ER" or
 * "X3W4+H9G" out of a place string — they're machine codes, not human place
 * names, and can appear standalone OR prefixed to a real name (e.g.
 * "X3W4+H9G Baraka Shopping Center" → "Baraka Shopping Center"). Returns the
 * cleaned, trimmed remainder (empty string if the whole value was a code).
 */
function stripPlusCode(value: string): string {
  return value
    .replace(/\b[0-9A-Z]{2,}\+[0-9A-Z]+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Broad → specific location trail for a card, e.g. "Nyandarua › Nyahururu ›
 * Sudav Apartments": county, then the town (first segment of formattedAddress,
 * dropping the trailing country), then the place name. Blanks, duplicates, and
 * embedded plus-codes (e.g. "X3W4+H9G Baraka …") are removed so we never repeat,
 * show empty separators, or surface a machine code.
 */
function locationTrail(loc: {
  county?: string | null;
  placeName?: string | null;
  formattedAddress?: string | null;
}): string | null {
  // "Nyahururu, Kenya" → "Nyahururu" (first part, minus the country tail).
  const town = loc.formattedAddress?.split(",")[0]?.trim() || null;
  const seen = new Set<string>();
  const parts = [loc.county, town, loc.placeName]
    .map((p) => stripPlusCode(p?.trim() || ""))
    .filter((p) => {
      const key = p.toLowerCase();
      if (!p || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return parts.length ? parts.join(" › ") : null;
}

/**
 * The header's place, short enough to share a line with the time: the most
 * specific human place plus the county ("Nyahururu, Nyandarua"). The full
 * trail lives on the listing page.
 */
function shortLocation(loc: {
  county?: string | null;
  placeName?: string | null;
  formattedAddress?: string | null;
}): string | null {
  const town = stripPlusCode(loc.formattedAddress?.split(",")[0]?.trim() || "");
  const place = stripPlusCode(loc.placeName?.trim() || "");
  const county = stripPlusCode(loc.county?.trim() || "");
  const local = town || place;
  const parts = [local, county].filter(Boolean);
  const unique = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  return unique.length ? unique.join(", ") : null;
}

function userDisplayName(user?: FeedSocialUser | null): string {
  if (!user) return "";
  const profileName = [user.profile?.firstName, user.profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return profileName || user.username || `Shopi user`;
}

/**
 * Compact save proof for the engagement summary row.
 *
 * Deliberately short — "Wanjiru + 3.5K" rather than the old full sentence.
 * The summary row puts this on one line opposite the comment and share counts,
 * so a sentence long enough to wrap or truncate mid-phrase reads worse than a
 * name and a number, which is the shape people already parse on social feeds.
 */
function saveSummaryText(
  savers: FeedSocialUser[],
  saveCount: number,
): string | null {
  if (saveCount <= 0) return null;
  // First name only: the line shares its row with the comment count, and a
  // full name pushes "and N others" into an ellipsis on small phones.
  const leadName = savers
    .map((user) => user.profile?.firstName?.trim() || userDisplayName(user))
    .filter(Boolean)[0];
  if (!leadName) {
    return `${fmt(saveCount)} save${saveCount === 1 ? "" : "s"}`;
  }

  if (saveCount === 1) return `Saved by ${leadName}`;

  const remaining = Math.max(saveCount - 1, 0);
  return `Saved by ${leadName} and ${fmt(remaining)} other${remaining === 1 ? "" : "s"}`;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

interface AvatarProps {
  creatorId: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/** Blue verified check, inline after the seller's name. */
function VerifiedMark() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 20 20"
      fill="none"
      className="shrink-0"
      role="img"
      aria-label="Verified seller"
    >
      <circle cx="10" cy="10" r="10" fill="#1D9BF0" />
      <path
        d="M6 10.5l2.5 2.5 5.5-5.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniAvatar({ user, index }: { user: FeedSocialUser; index: number }) {
  const label = userDisplayName(user).slice(0, 1).toUpperCase() || "S";
  const color = avatarGradient(user.id);

  return (
    <span
      className={cn(
        "relative inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-[rgb(var(--color-bg-elevated))]",
        index > 0 && "-ml-2",
        !user.profile?.avatar && `bg-linear-to-br ${color}`,
      )}
    >
      {user.profile?.avatar ? (
        <Image
          src={user.profile.avatar}
          alt=""
          fill
          className="object-cover"
          sizes="24px"
        />
      ) : (
        <span className="text-[10px] font-bold text-white">{label}</span>
      )}
    </span>
  );
}

/* Facebook-style heart burst: one heart pops at the icon, a ring of smaller
   hearts flies outward along straight (linear) paths and fades. */
const HEART_BURST = [
  { x: -34, y: -46, size: 14, rotate: -18, delay: 0 },
  { x: 30, y: -52, size: 16, rotate: 14, delay: 40 },
  { x: -48, y: -14, size: 11, rotate: -26, delay: 80 },
  { x: 46, y: -18, size: 12, rotate: 22, delay: 60 },
  { x: -14, y: -62, size: 10, rotate: 6, delay: 100 },
  { x: 12, y: -66, size: 13, rotate: -8, delay: 20 },
];

const HEART_BURST_MS = 900;

function SaveBurst({ burstKey }: { burstKey: number }) {
  // Unmount the whole burst once it has played, so nothing can be left behind
  // on screen if an animationend event is missed (background tab, etc.).
  const [playedKey, setPlayedKey] = useState(0);

  useEffect(() => {
    if (burstKey === 0) return;
    const timer = window.setTimeout(
      () => setPlayedKey(burstKey),
      HEART_BURST_MS,
    );
    return () => window.clearTimeout(timer);
  }, [burstKey]);

  if (burstKey === 0 || playedKey === burstKey) return null;

  return (
    <span
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-0 w-0"
      aria-hidden
    >
      {/* Centring wrapper — the animated child then uses a plain translate,
          so the keyframes never fight a -50%/-50% offset. */}
      <span className="absolute left-0 top-0 block -translate-x-1/2 -translate-y-1/2">
        <span className="shopi-heart-pop block text-[rgb(var(--brand-primary))]">
          <Heart className="h-7 w-7" fill="currentColor" strokeWidth={0} />
        </span>
      </span>

      {HEART_BURST.map((heart, index) => (
        <span
          key={index}
          className="absolute left-0 top-0 block -translate-x-1/2 -translate-y-1/2"
        >
          <span
            className="shopi-heart-fly block text-[rgb(var(--brand-primary))]"
            style={
              {
                "--heart-x": `${heart.x}px`,
                "--heart-y": `${heart.y}px`,
                "--heart-rotate": `${heart.rotate}deg`,
                animationDelay: `${heart.delay}ms`,
              } as CSSProperties
            }
          >
            <Heart
              style={{ width: heart.size, height: heart.size }}
              fill="currentColor"
              strokeWidth={0}
            />
          </span>
        </span>
      ))}
    </span>
  );
}

function Avatar({ creatorId, avatarUrl, firstName, lastName }: AvatarProps) {
  const label = firstName
    ? `${firstName[0]}${lastName?.[0] ?? ""}`.toUpperCase()
    : initials(creatorId);

  if (avatarUrl) {
    return (
      <div className="w-10 h-10 rounded-full relative shrink-0 bg-surface">
        <div className="w-full h-full rounded-full overflow-hidden">
          <Image
            src={avatarUrl}
            alt={label}
            className="w-full h-full overflow-hidden rounded-full object-cover"
            fill
            sizes="40px"
            placeholder="blur"
            blurDataURL={SHIMMER_AVATAR}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
    </div>
  );
}

// ── Video media block ─────────────────────────────────────────────────────────

function VideoMedia({
  post,
  priority,
  onOpen,
}: {
  post: ContentCardFieldsFragment;
  priority?: boolean;
  /** Tapping the video hands off to the immersive viewer at this timestamp. */
  onOpen: (time: number, muted: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const muted = useFeedPreferencesStore((s) => s.videoMuted);
  const setVideoMuted = useFeedPreferencesStore((s) => s.setVideoMuted);
  const onThumbLoad = useCallback(() => setThumbLoaded(true), []);
  const pageFocused = usePageFocused();
  const id = useId();

  const media = post.media?.[0];
  const mux = media?.muxMeta;
  // Shared with the immersive viewer and the /video route so all three agree
  // on which posts can play and where the stream is.
  const hlsUrl = hlsUrlOf(post);
  const thumbnail = posterOf(post);

  const isLandscape = mux?.aspectRatio === "16:9";

  const durationFmt = mux?.duration
    ? mux.duration >= 60
      ? `${Math.floor(mux.duration / 60)}:${String(Math.round(mux.duration % 60)).padStart(2, "0")}`
      : `0:${String(Math.round(mux.duration)).padStart(2, "0")}`
    : null;

  const [ended, setEnded] = useState(false);
  const [actualMuted, setActualMuted] = useState(muted);

  // hls.js — fast ABR + buffering state.
  // Pausing is no longer a card concern: tapping the video opens the immersive
  // viewer (the Facebook gesture), and pause lives in there. The card only
  // stops for reasons outside the user's control — scrolled away, tab hidden,
  // or the video finished.
  const shouldPlay = active && pageFocused;
  // When the browser blocks unmuted autoplay, useHlsVideo may force only this
  // element muted. Keep that as local reality, not the persisted user preference.
  const onMutedChange = useCallback(
    (forcedMuted: boolean) => setActualMuted(forcedMuted),
    [],
  );
  // Only the PRIORITY (first / LCP) card waits for its poster before starting
  // playback work — there the poster is the LCP candidate and we don't want the
  // video manifest/hls.js competing with that critical image. Every other card
  // is scrolled to (its poster isn't the LCP), so gating it just adds latency to
  // first frame; those start HLS immediately, in parallel with the poster.
  const posterReady = !priority || !thumbnail || thumbLoaded;
  const { videoRef, buffering, playing } = useHlsVideo(
    hlsUrl,
    active && posterReady,
    ended || !pageFocused,
    onMutedChange,
  );

  // Single, authoritative mute toggle. Apply directly to the element AND the
  // store so one tap always takes effect — never relying on a store→effect round
  // trip that could lag a frame behind reality.
  const toggleMuted = useCallback(() => {
    const video = videoRef.current;
    const next = !(video?.muted ?? actualMuted);
    if (video) {
      video.muted = next;
      video.defaultMuted = next;
      // Unmuting needs the click's user activation to actually produce sound;
      // re-issue play so an autoplay-muted video starts emitting audio now.
      if (!next) video.play().catch(() => {});
    }
    setActualMuted(next);
    setVideoMuted(next);
  }, [actualMuted, videoRef, setVideoMuted]);

  // Tapping the video opens the immersive viewer, the way Facebook does. The
  // current position and sound state travel with it so the first slide picks
  // up mid-frame instead of restarting.
  const handleOpen = useCallback(() => {
    const video = videoRef.current;
    onOpen(video?.currentTime ?? 0, video?.muted ?? actualMuted);
  }, [onOpen, actualMuted, videoRef]);

  // Watch reporting lives in a shared hook so the card and the immersive
  // slide measure "completed" and "skipped" identically — these events feed
  // the server's seen-decay ranking, so a divergence would skew the feed.
  const handleVideoEnded = useCallback(() => setEnded(true), []);
  const { trackReplay } = useVideoAnalytics({
    videoRef,
    contentId: post.id,
    active,
    onEnded: handleVideoEnded,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const save = () => saveFeedVideoTime(post.id, video);
    const restore = () => restoreFeedVideoTime(post.id, video);
    video.addEventListener("timeupdate", save);
    video.addEventListener("pause", save);
    video.addEventListener("loadedmetadata", restore);
    video.addEventListener("canplay", restore);

    if (active) restore();

    return () => {
      save();
      video.removeEventListener("timeupdate", save);
      video.removeEventListener("pause", save);
      video.removeEventListener("loadedmetadata", restore);
      video.removeEventListener("canplay", restore);
    };
  }, [active, post.id, videoRef]);

  // Keep the element's muted property in sync when the USER preference changes.
  // Browser autoplay fallback is intentionally local so it does not flip the
  // global preference back to muted after the user has chosen sound on.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.defaultMuted = muted;
    setActualMuted(video.muted);
    if (!muted && shouldPlay && !ended) {
      video.play().catch(() => {});
    }
  }, [muted, shouldPlay, ended, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const syncActualMuted = () => setActualMuted(video.muted);
    syncActualMuted();
    video.addEventListener("volumechange", syncActualMuted);
    return () => video.removeEventListener("volumechange", syncActualMuted);
  }, [muted, videoRef]);

  // Scrolling away banks the position and clears `ended`, so re-entering the
  // card autoplays from where it left off. The SKIPPED event that used to live
  // here now fires from useVideoAnalytics on the same `active` transition.
  useEffect(() => {
    if (active) return;
    saveFeedVideoTime(post.id, videoRef.current);
    // Deferred so we don't setState synchronously inside the effect body.
    const t = setTimeout(() => setEnded(false), 0);
    return () => clearTimeout(t);
  }, [active, videoRef, post.id]);

  function handleReplay() {
    const video = videoRef.current;
    if (!video) return;
    clearFeedVideoTime(post.id);
    setEnded(false);
    video.currentTime = 0;
    video.play().catch(() => {});
    trackReplay();
  }

  // Register with the global video coordinator and report ratio changes.
  useEffect(() => {
    const unregister = registerVideo(id, setActive);
    const el = containerRef.current;
    if (!el) return unregister;
    const obs = new IntersectionObserver(
      ([e]) => updateRatio(id, e.intersectionRatio),
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] },
    );
    obs.observe(el);

    // Force an initial election after (re)mount. On a route return the tree can
    // be kept alive and the observer won't re-fire on its own (nothing scrolls),
    // so the in-view video would never be elected active → tap-to-play dead.
    // Re-measure on next frame and whenever the page is shown again.
    const remeasure = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const ratio = r.height > 0 ? visible / r.height : 0;
      updateRatio(id, ratio);
    };
    const raf = requestAnimationFrame(remeasure);
    window.addEventListener("pageshow", remeasure);
    document.addEventListener("visibilitychange", remeasure);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pageshow", remeasure);
      document.removeEventListener("visibilitychange", remeasure);
      obs.disconnect();
      unregister();
    };
  }, [id]);

  return (
    <div
      ref={containerRef}
      onClick={handleOpen}
      className="relative w-full bg-black overflow-hidden"
      style={{
        // Portrait videos get a taller budget (70svh) so they aren't squeezed;
        // landscape keep their natural 16:9 box. `object-contain` below then
        // shows the WHOLE frame letterboxed rather than cropping it.
        // NB: use svh (small viewport height), NOT dvh. dvh changes as iOS
        // Safari's toolbar collapses/expands during scroll, which resizes every
        // media box mid-scroll and makes the feed jump. svh is fixed.
        height: `min(${isLandscape ? "56.25vw" : "177.78vw"}, ${
          isLandscape ? "53svh" : "70svh"
        })`,
      }}
    >
      {/* Thumbnail — fades out once video is playing */}
      {thumbnail && (
        <FeedImage
          src={thumbnail}
          alt={post.title}
          sizes="100vw"
          className={`object-contain transition-opacity duration-500 ${
            hlsUrl && shouldPlay && playing && !buffering
              ? "opacity-0"
              : priority || thumbLoaded
                ? "opacity-100"
                : "opacity-0"
          }`}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          blurDataURL={SHIMMER_PORTRAIT}
          onLoad={onThumbLoad}
        />
      )}
      {/* HLS video — src managed by useHlsVideo hook, no loop so ended fires */}
      {hlsUrl && (
        <video
          ref={videoRef}
          muted={actualMuted}
          playsInline
          onLoadedMetadata={(event) =>
            restoreFeedVideoTime(post.id, event.currentTarget)
          }
          onCanPlay={(event) =>
            restoreFeedVideoTime(post.id, event.currentTarget)
          }
          onTimeUpdate={(event) =>
            saveFeedVideoTime(post.id, event.currentTarget)
          }
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}
      {/* Replay button — shown when video finishes */}
      {ended && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleReplay();
          }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
          aria-label="Replay video"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white ">
            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
          </span>
        </button>
      )}
      {/* TikTok-style buffer spinner */}
      {active && buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <BufferSpinner />
        </div>
      )}
      {/* Duration badge */}
      {durationFmt && (
        <div className="absolute bottom-5 right-2 bg-black/70 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-md">
          {durationFmt}
        </div>
      )}
      {hlsUrl && (
        <VideoProgressBar
          videoRef={videoRef}
          active={shouldPlay}
          className="opacity-90"
        />
      )}
      {/* No expand button: the whole video is the affordance now, so a second
          control opening the same viewer would only be a thing to drift. */}
      {/* Mute / unmute button — absolute, stops propagation so it doesn't open */}
      {active && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMuted();
          }}
          className="absolute bottom-5 left-2 z-50 bg-black/60  rounded-full p-1.5 text-white/90 active:scale-95 transition-transform"
          aria-label={actualMuted ? "Unmute" : "Mute"}
        >
          {actualMuted ? (
            // Muted — speaker with X
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            // Unmuted — speaker with sound waves
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.146 5.146a5 5 0 010 9.708v-1.717a3.001 3.001 0 000-6.274V5.146zm2.829-2.83a9 9 0 010 15.37l-.708-1.225a7 7 0 000-12.92l.708-1.225z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

// ── FeedImage — Next.js Image with error fallback + one auto-retry ───────────

function FeedImageInner({
  src,
  alt,
  sizes,
  className,
  priority,
  loading: loadingProp,
  blurDataURL,
  onLoad,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  blurDataURL?: string;
  onLoad?: () => void;
}) {
  const [retrySrc, setRetrySrc] = useState(src);
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const retried = useRef(false);

  function handleLoad() {
    setLoaded(true);
    onLoad?.();
  }

  function handleError() {
    if (!retried.current) {
      retried.current = true;
      setTimeout(() => setRetrySrc(`${src}?r=${Date.now()}`), 1500);
    } else {
      setErrored(true);
    }
  }

  if (errored) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-surface">
        <svg
          className="w-10 h-10 text-muted-foreground/20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={retrySrc}
      alt={alt}
      fill
      sizes={sizes}
      className={cn("w-full mx-0 px-0", className)}
      preload={priority}
      // `preload`/`priority` only emit the <link rel="preload"> and opt the
      // image out of lazy loading — neither sets fetchpriority on the <img>
      // (see next/dist/shared/lib/get-img-props). Without this the LCP
      // thumbnail was discovered early but still fetched at default priority,
      // queued behind the feed's scripts. Only the first card gets it: marking
      // every image high-priority is the same as marking none.
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? undefined : loadingProp}
      quality={priority ? 75 : 55}
      placeholder={blurDataURL ? "blur" : "empty"}
      blurDataURL={blurDataURL}
      onLoad={handleLoad}
      onError={handleError}
      // Fade the decoded bitmap in over the blur placeholder. Inline transition
      // so the global `transition: none` on <img> doesn't suppress it.
      style={{
        opacity: priority || loaded ? 1 : 0,
        transition: priority ? undefined : "opacity 0.3s ease",
      }}
    />
  );
}

// Wrap with key=src so state resets automatically when the image URL changes
function FeedImage(props: Parameters<typeof FeedImageInner>[0]) {
  return <FeedImageInner key={props.src} {...props} />;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function mediaSrc(
  item: NonNullable<ContentCardFieldsFragment["media"]>[number] | undefined,
  variant: "large" | "medium" = "large",
): string | null {
  if (!item) return null;
  return (
    item.r2Variants?.find((v) => v.variant === variant)?.url ??
    item.r2Variants?.find((v) => v.variant === "medium")?.url ??
    item.r2Variants?.[0]?.url ??
    item.imageUrl ??
    item.thumbnailUrl ??
    null
  );
}

type MediaEntry = NonNullable<ContentCardFieldsFragment["media"]>[number];

/**
 * Best-effort intrinsic aspect ratio (width / height) for an image media item.
 * Falls back to the largest r2 variant's dimensions, then to a sensible 4:5
 * portrait default when nothing is known — so the layout reserves space and
 * never collapses to zero height while the bitmap loads.
 */
function aspectRatioOf(item: MediaEntry | undefined): number {
  const w = item?.displayWidth ?? item?.r2Variants?.[0]?.width ?? 0;
  const h = item?.displayHeight ?? item?.r2Variants?.[0]?.height ?? 0;
  if (w > 0 && h > 0) return w / h;
  return 4 / 5; // unknown → portrait-ish placeholder
}

/**
 * The file to save for an image post.
 *
 * Videos deliberately don't go through here. Their only client-side URL is the
 * HLS manifest, which is a playlist rather than a file — saving it produces a
 * useless `.m3u8`. Video downloads go via useVideoDownload, which asks the API
 * for a real MP4.
 */
function imageDownloadSrc(post: ContentCardFieldsFragment): string | null {
  const first = post.media?.[0];
  if (!first) return null;

  const preferredVariant = post.hdEnabled ? "original" : "large";
  return (
    first.r2Variants?.find((v) => v.variant === preferredVariant)?.url ??
    first.r2Variants?.find((v) => v.variant === "large")?.url ??
    first.r2Variants?.find((v) => v.variant === "medium")?.url ??
    first.r2Variants?.[0]?.url ??
    first.imageUrl ??
    first.thumbnailUrl ??
    null
  );
}

// ── Image media block ─────────────────────────────────────────────────────────

function ImageMedia({
  post,
  priority,
  onNavigate,
}: {
  post: ContentCardFieldsFragment;
  priority?: boolean;
  /** Tap handler for the media. When omitted, tapping does nothing. */
  onNavigate?: () => void;
}) {
  const media = useMemo(
    () =>
      [...(post.media ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [post.media],
  );

  const nav = (e: React.MouseEvent) => {
    if (!onNavigate) return;
    e.stopPropagation();
    onNavigate();
  };

  // svh (not dvh): dvh changes as iOS Safari's toolbar shows/hides during
  // scroll, resizing every media box mid-scroll and making the feed jump.
  const GRID_H = "clamp(40svh, 72vw, 60svh)";
  const first = media[0];
  const firstSrc = mediaSrc(first, "large");

  if (!firstSrc) {
    return (
      <div
        className="w-full bg-surface flex items-center justify-center"
        style={{ height: GRID_H }}
      >
        <svg
          className="w-12 h-12 text-muted-foreground/20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  const count = media.length;

  if (count === 1) {
    // Reserve the box from the known intrinsic ratio so the height is correct
    // on first paint — no blank gap, no jump when the bitmap loads. The ratio
    // is clamped so very wide images keep a usable minimum height and very tall
    // ones don't exceed the viewport budget.
    const ratio = aspectRatioOf(first); // width / height
    // clamp displayed ratio between 4:5 (tall) and 16:9 (wide)
    const clamped = Math.min(Math.max(ratio, 4 / 5), 16 / 9);
    return (
      <div
        className="relative w-full cursor-pointer overflow-hidden bg-surface"
        style={{
          aspectRatio: String(clamped),
          // svh, not dvh — same reason as GRID_H above. Nearly every single
          // image binds one of these two clamps (a tall one hits the max, a wide
          // one hits the min), so with dvh their boxes resized on every frame of
          // iOS Safari's toolbar collapse and the whole feed jumped mid-scroll.
          maxHeight: "60dvh",
          minHeight: "40dvh",
        }}
        onClick={nav}
      >
        <FeedImage
          src={firstSrc}
          alt={post.title}
          sizes="100vw"
          className="object-contain h-auto"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          blurDataURL={`data:image/svg+xml;base64,${toBase64(Shimmer(700, 700))}`}
        />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="flex gap-0.5 overflow-hidden" style={{ height: GRID_H }}>
        {media.map((item, i) => {
          const src = mediaSrc(item, "large");
          return (
            <div
              key={i}
              className="relative flex-1 bg-black cursor-pointer"
              onClick={nav}
            >
              {src && (
                <FeedImage
                  src={src}
                  alt={post.title}
                  sizes="50vw"
                  className="object-cover"
                  priority={priority && i === 0}
                  loading={priority && i === 0 ? "eager" : "lazy"}
                  blurDataURL={SHIMMER}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="flex gap-0.5 overflow-hidden" style={{ height: GRID_H }}>
        <div className="relative flex-2 bg-black cursor-pointer" onClick={nav}>
          <FeedImage
            src={firstSrc}
            alt={post.title}
            sizes="66vw"
            className="object-cover"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            blurDataURL={SHIMMER}
          />
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          {media.slice(1, 3).map((item, i) => {
            const src = mediaSrc(item, "medium");
            return (
              <div
                key={i}
                className="relative flex-1 bg-black cursor-pointer"
                onClick={nav}
              >
                {src && (
                  <FeedImage
                    src={src}
                    alt={post.title}
                    sizes="33vw"
                    className="object-cover"
                    blurDataURL={SHIMMER}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Exactly 4 → clean 2×2 grid.
  if (count === 4) {
    return (
      <div
        className="grid grid-cols-2 gap-0.5 overflow-hidden"
        style={{ height: GRID_H }}
      >
        {media.slice(0, 4).map((item, i) => {
          const src = mediaSrc(item, i === 0 ? "large" : "medium");
          return (
            <div
              key={i}
              className="relative bg-black cursor-pointer overflow-hidden"
              onClick={nav}
            >
              {src && (
                <FeedImage
                  src={src}
                  alt={post.title}
                  sizes="50vw"
                  className="object-cover"
                  priority={priority && i === 0}
                  loading={priority && i === 0 ? "eager" : "lazy"}
                  blurDataURL={SHIMMER}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // 5+ → Facebook-style stack: 2 large tiles on top, 3 smaller below, with a
  // "+N" overlay on the final tile. Tapping any tile opens the full carousel.
  const top = media.slice(0, 2);
  const bottom = media.slice(2, 5);
  const overflow = count - 5;

  return (
    <div
      className="flex flex-col gap-0.5 overflow-hidden"
      style={{ height: GRID_H }}
    >
      <div className="flex gap-0.5 flex-3">
        {top.map((item, i) => {
          const src = mediaSrc(item, i === 0 ? "large" : "medium");
          return (
            <div
              key={i}
              className="relative flex-1 bg-black cursor-pointer overflow-hidden"
              onClick={nav}
            >
              {src && (
                <FeedImage
                  src={src}
                  alt={post.title}
                  sizes="50vw"
                  className="object-cover"
                  priority={priority && i === 0}
                  loading={priority && i === 0 ? "eager" : "lazy"}
                  blurDataURL={SHIMMER}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-0.5 flex-2">
        {bottom.map((item, i) => {
          const src = mediaSrc(item, "medium");
          const isLast = i === bottom.length - 1 && overflow > 0;
          return (
            <div
              key={i}
              className="relative flex-1 bg-black cursor-pointer overflow-hidden"
              onClick={nav}
            >
              {src && (
                <FeedImage
                  src={src}
                  alt={post.title}
                  sizes="33vw"
                  className="object-cover"
                  blurDataURL={SHIMMER}
                />
              )}
              {isLast && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center ">
                  <span className="text-white text-2xl font-bold">
                    +{overflow}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main PostCard ─────────────────────────────────────────────────────────────

function PostCardImpl({ post, lang, priority, onMessage }: Props) {
  const router = useRouter();
  const socialPost = post as FeedPostSocialPreview;
  // Desktop feed provides an inline-chat opener via context; an explicit
  // `onMessage` prop still wins if passed directly.
  const feedChatOpen = useFeedChat();
  const openMessage = onMessage ?? feedChatOpen ?? undefined;
  const { requireAuth } = useAuthGuard(lang);
  const { saved, saveCount, handleSave, handleShare, fireView, handleReport } =
    useInteractions(post, {
      requireAuth,
    });
  const cardRef = useRef<HTMLElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [captionOverflows, setCaptionOverflows] = useState(false);
  // Images save straight from their R2 URL; videos go through the API, which
  // resolves them to a Mux MP4 and may have to wait on the encode.
  const [isDownloading, setIsDownloading] = useState(false);
  const videoDownload = useVideoDownload(post.id);
  const { error: videoDownloadError, clearError: clearVideoDownloadError } =
    videoDownload;
  const [menuOpen, setMenuOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [saveBurstKey, setSaveBurstKey] = useState(0);
  // Paints the chat shell instantly when "Message" is tapped, covering the
  // route-transition gap so opening a chat never flashes a blank page. The
  // overlay unmounts with the PostCard once the conversation route takes over.
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  // The download button lives in a menu that closes on tap, so an inline error
  // there would never be read. A toast outlives the menu.
  useEffect(() => {
    if (!videoDownloadError) return;
    toast.error(videoDownloadError);
    clearVideoDownloadError();
  }, [videoDownloadError, clearVideoDownloadError]);

  const mediaCount = post.media?.length ?? 0;

  const [trackDetailViewed] = useMutation(gql`
    mutation TrackDetailViewed($contentId: String!) {
      trackInteraction(input: { contentId: $contentId, type: DETAIL_VIEWED })
    }
  `);
  const [trackCopyLink] = useMutation(gql`
    mutation CopyLinkPostCard($contentId: String!) {
      copyLink(contentId: $contentId)
    }
  `);
  // Fire viewContent only when the card is at least 50% visible
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.5) fireView();
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // fireView is stable (ref-based) — no need to list it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const creator = post.creator;
  // creator is a FieldResolver — it may arrive slightly after the content item.
  // Only fall back to the "Seller …" placeholder when we're sure the resolver
  // returned and still gave us nothing (i.e. creator is explicitly null/undefined
  // but the query has finished). While creator is genuinely absent we show
  // nothing so there's no flash of raw ObjectId tail.
  const creatorName = creator?.profile?.firstName
    ? `${creator.profile.firstName}${creator.profile.lastName ? " " + creator.profile.lastName : ""}`
    : creator === null
      ? `Seller ${post.creatorId.slice(-6)}` // resolver returned, but no profile — genuine fallback
      : ""; // resolver hasn't arrived yet — render nothing
  // isMyContent is resolved server-side — no client-side ID comparison needed
  const isOwnPost = post.isMyContent ?? false;

  const { following, toggle: handleFollow } = useFollow({
    userId: creator?.id ?? post.creatorId,
    initialFollowing: creator?.isFollowedByMe ?? false,
    initialFollowerCount: creator?.followerCount ?? 0,
    lang,
  });

  // Three actions — Save, Contact, Share — split evenly. Contact drops out on
  // your own posts, so the grid follows what's shown.
  const actionGridCols = isOwnPost ? "grid-cols-2" : "grid-cols-3";

  const caption = post.caption ?? "";
  // Sellers often open the caption with the title; repeating it under the
  // title is noise, so only show a caption that says something more.
  const showCaption =
    caption.trim().length > 0 &&
    caption.trim().toLowerCase() !== (post.title ?? "").trim().toLowerCase();
  const recentSavers = socialPost.recentSavers?.filter(Boolean) ?? [];
  const saveSummary = saveSummaryText(recentSavers, saveCount);
  const commentCount = post.stats?.comments ?? 0;
  const hasEngagement = Boolean(saveSummary) || commentCount > 0;
  const place = post.location ? shortLocation(post.location) : null;
  const hasPrice = Boolean(post.price && post.price.amount > 0);

  function handleSavePress() {
    if (!requireAuth({ contentId: post.id, action: "save" })) return;
    if (!saved) setSaveBurstKey((key) => key + 1);
    void handleSave();
  }

  function openComments() {
    setShowComments(true);
  }

  function openCreatorProfile() {
    if (!creator?.id) {
      handleOpen();
      return;
    }

    rememberScrollBeforeNavigation();
    router.push(profileHref(lang, creator), { scroll: false });
  }

  useEffect(() => {
    const el = captionRef.current;
    if (!el) {
      setCaptionOverflows(false);
      return;
    }

    // Measurement is left entirely to the ResizeObserver, which fires once for
    // the initial size the moment it observes. The explicit synchronous
    // measure() that used to run here forced a style+layout flush per card
    // inside a layout effect — with a full page of feed cards hydrating at
    // once that was the bulk of the reported forced-reflow time. The observer
    // does the same reads off the layout-flush path, so nothing looks different.
    const observer = new ResizeObserver(() => {
      setCaptionOverflows(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [caption, expanded]);

  function handleOpen() {
    if (shouldFire(post.id, "DETAIL_VIEWED")) {
      trackDetailViewed({ variables: { contentId: post.id } }).catch(() => {});
    }
    rememberScrollBeforeNavigation();
    router.push(contentPath(lang, post), { scroll: false });
  }

  async function handleCopyLink() {
    if (typeof window === "undefined") return;
    const url = absoluteContentUrl(window.location.origin, lang, post);
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setMenuOpen(false);
    toast.success("Link copied");
    if (shouldFire(post.id, "LINK_COPIED")) {
      trackCopyLink({ variables: { contentId: post.id } }).catch(() => {});
    }
  }

  /**
   * Tapping a video card enters the immersive viewer.
   *
   * Order matters. Every feed video is paused SYNCHRONOUSLY here, inside the
   * click handler, so the outgoing element is already stopped before the route
   * changes — on iOS that measurably improves the odds the viewer's first
   * `play()` is honoured. A plain pause, not a suspension: the viewer takes the
   * lock in its own mount effect and releases it on unmount, so suspending here
   * as well left the count permanently above zero and every card stuck
   * inactive once you came back. The handoff carries the frame and sound state
   * so the first slide resumes rather than restarting. `{ scroll: false }` plus
   * the remembered scroll position is what makes the back button land exactly
   * where we left.
   */
  const openVideo = useCallback(
    (time: number, videoMuted: boolean) => {
      setImmersiveHandoff(post.id, { time, muted: videoMuted });
      pauseAllVideos();
      rememberScrollBeforeNavigation();
      // Slug path, so the URL the user can copy straight out of the address
      // bar is already the canonical one. The handoff stays keyed by id.
      router.push(videoPath(lang, post), { scroll: false });
    },
    [post, lang, router],
  );

  async function handleDownload() {
    // Videos have no usable client-side file URL — the API resolves them to a
    // Mux MP4, and may need a moment to encode one.
    if (post.type === "VIDEO") {
      await videoDownload.download();
      return;
    }

    const src = imageDownloadSrc(post);
    if (!src || typeof document === "undefined") return;

    setIsDownloading(true);
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = post.title || "shopi-post";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement("a");
      a.href = src;
      a.download = post.title || "shopi-post";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setIsDownloading(false);
    }
  }

  const actionClass =
    "relative flex h-11 min-w-0 items-center justify-center gap-2 rounded-[10px] text-[14px] font-semibold transition-colors active:scale-[0.97] lg:cursor-pointer";

  return (
    // data-scroll-anchor: a return to the feed puts this card back exactly
    // where it was on screen (lib/scrollRestoration.ts).
    <article
      ref={cardRef}
      data-scroll-anchor={post.id}
      className="bg-elevated overflow-hidden"
    >
      {/* ── Header ───────────────────────────────────────────────────────
          Who, where, when — one name line and one quiet meta line, the
          pattern every social feed has trained people to read. Follow is a
          word beside the name rather than a pill, so the seller is the
          header's subject, not the button. */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-3 max-[360px]:gap-2.5 max-[360px]:px-3">
        {/* Unwatched story → pink ring, and the tap opens it (Facebook /
            TikTok). Otherwise the tap goes to the profile, as before. */}
        <CreatorStoryAvatar
          userId={creator?.id}
          lang={lang}
          name={creatorName || "Seller"}
          mode="unseen"
          onNoStory={openCreatorProfile}
          ringClassName="-inset-[5px]"
          ringThickness={4.5}
          className="shrink-0 rounded-full lg:cursor-pointer"
        >
          <Avatar
            creatorId={post.creatorId}
            avatarUrl={creator?.profile?.avatar}
            firstName={creator?.profile?.firstName}
            lastName={creator?.profile?.lastName}
          />
        </CreatorStoryAvatar>

        <div className="min-w-0 flex-1">
          {creatorName ? (
            <div className="flex min-w-0 items-center gap-1 text-[15px] leading-5 max-[360px]:text-[14px]">
              <button
                type="button"
                onClick={openCreatorProfile}
                className="min-w-0 truncate text-left font-semibold text-main hover:underline lg:cursor-pointer"
              >
                {creatorName}
              </button>
              {creator?.isVerified && <VerifiedMark />}
              {!isOwnPost && (
                <>
                  <span aria-hidden="true" className="shrink-0 text-muted">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={handleFollow}
                    className={cn(
                      "shrink-0 font-semibold transition-colors lg:cursor-pointer",
                      following
                        ? "text-muted hover:text-main"
                        : "text-primary-strong hover:text-primary dark:text-primary",
                    )}
                  >
                    {following ? "Following" : "Follow"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="h-4 w-28 rounded-full bg-surface animate-pulse" />
          )}
          <p
            className="mt-0.5 truncate text-[13px] leading-4 text-muted max-[360px]:text-[12px]"
            title={post.location ? (locationTrail(post.location) ?? undefined) : undefined}
          >
            {place ? `${place} · ` : ""}
            {timeAgo(post.createdAt)}
          </p>
        </div>

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-main lg:cursor-pointer",
                menuOpen && "bg-surface text-main",
              )}
              aria-label="Post options"
            >
              <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-52 rounded-[14px] border border-border bg-elevated p-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleCopyLink();
              }}
              className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-main transition-colors hover:bg-surface lg:cursor-pointer"
            >
              <Link2 className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
              Copy link
            </button>

            {post.allowDownload && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading || videoDownload.isDownloading}
                className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-main transition-colors hover:bg-surface disabled:opacity-70 lg:cursor-pointer"
              >
                {isDownloading || videoDownload.isDownloading ? (
                  <>
                    <InterlockingBalls size={16} />
                    {/* Mux encodes the MP4 on demand for older uploads, so a
                        video download can sit here for a few seconds. Saying
                        "Preparing" rather than "Downloading" is the difference
                        between a wait that looks intentional and one that
                        looks broken. */}
                    <span>
                      {videoDownload.isPreparing ? "Preparing…" : "Downloading…"}
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
                    <span>Download</span>
                  </>
                )}
              </button>
            )}

            <div className="mx-2 my-1 h-px bg-border" />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!requireAuth({ contentId: post.id })) return;
                setMenuOpen(false);
                void handleReport().then(() =>
                  toast.success("Report submitted"),
                );
              }}
              className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-main transition-colors hover:bg-surface lg:cursor-pointer"
            >
              <Flag className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
              Report listing
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Media ────────────────────────────────────────────────────────
          The photo or video is what stops the scroll, so it leads. Videos open
          the immersive viewer; images open the full-screen carousel. */}
      <div className="relative">
        {/* TikTok posts render native once the background re-host has populated
            `media` (the post is then live). Until then we fall back to the live
            embed — though pre-live posts are normally hidden from the feed, so
            this branch is mainly a safety net. */}
        {post.source === "TIKTOK_EMBED" && !post.media?.length ? (
          <TikTokEmbedMedia post={post} />
        ) : post.type === "VIDEO" ? (
          <VideoMedia post={post} priority={priority} onOpen={openVideo} />
        ) : (
          <ImageMedia
            post={post}
            priority={priority}
            onNavigate={
              mediaCount >= 1 ? () => setShowCarousel(true) : undefined
            }
          />
        )}

        {/* Attribution badge for native (re-hosted) TikTok posts. The embed
            block draws its own badge, so only add it for the native case. */}
        {post.source === "TIKTOK_EMBED" &&
          !!post.media?.length &&
          post.tiktokEmbed?.shareUrl && (
            <a
              href={post.tiktokEmbed.shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm lg:cursor-pointer"
            >
              <TikTokIcon size={14} className="h-3.5 w-3.5" />
              View on TikTok
            </a>
          )}
      </div>

      {/* ── Listing ──────────────────────────────────────────────────────
          Price, then what it is, directly under the picture — marketplace
          reading order. Media is capped at 60–70% of the viewport, so the
          price is on screen whenever the photo is: the reason it once moved
          above the media (it used to sit below the stats and actions) no
          longer applies. */}
      <div className="px-4 pt-3">
        <div className="flex items-baseline gap-2">
          {hasPrice ? (
            <span className="text-[20px] font-bold leading-6 tracking-[-0.015em] text-main tabular-nums">
              {`${post.price!.currency} ${post.price!.amount.toLocaleString()}`}
            </span>
          ) : (
            // No price is information too, but it shouldn't shout like one.
            <span className="text-[15px] font-semibold leading-6 text-muted">
              Price on request
            </span>
          )}
          {post.price?.negotiable && hasPrice && (
            <span className="rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium text-muted">
              Negotiable
            </span>
          )}
        </div>

        <Link
          href={contentPath(lang, post)}
          scroll={false}
          onClick={() => {
            if (shouldFire(post.id, "DETAIL_VIEWED")) {
              trackDetailViewed({ variables: { contentId: post.id } }).catch(() => {});
            }
            rememberScrollBeforeNavigation();
          }}
          className="mt-1 line-clamp-2 text-[15px] font-medium leading-5 text-main no-underline hover:underline md:text-[16px] md:leading-6"
        >
          {post.title}
        </Link>

        {showCaption && (
          <div className="mt-1 text-[14px] leading-5 text-muted">
            <p
              ref={captionRef}
              role="link"
              tabIndex={0}
              onClick={handleOpen}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleOpen();
                }
              }}
              className={cn("cursor-pointer whitespace-pre-line", !expanded && "line-clamp-2")}
            >
              {caption}
            </p>
            {(captionOverflows || expanded) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                className="font-semibold text-main hover:underline lg:cursor-pointer"
              >
                {expanded ? "Show less" : "More"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Social proof ─────────────────────────────────────────────────
          Who saved it on the left, the comment count on the right. Share
          counts stay out: they mean little to a buyer and crowd this line.
          Raw views stay out — "15 views" on a young listing discourages more
          than it persuades. Comments open from here; the action row keeps to
          the three moves that sell: Save, Contact, Share. */}
      {hasEngagement && (
        <div className="flex items-center justify-between gap-3 px-4 pt-2.5 text-[13px] text-muted">
          {saveSummary ? (
            <button
              type="button"
              onClick={handleSavePress}
              className="flex min-w-0 items-center gap-1.5 text-left lg:cursor-pointer"
            >
              {recentSavers.length > 0 ? (
                <span className="flex shrink-0 items-center">
                  {recentSavers.slice(0, 2).map((user, index) => (
                    <MiniAvatar key={user.id} user={user} index={index} />
                  ))}
                </span>
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                  <Bookmark className="h-2.5 w-2.5 text-white" fill="white" strokeWidth={2} />
                </span>
              )}
              <span className="min-w-0 truncate">{saveSummary}</span>
            </button>
          ) : (
            // Keeps the counts hard right when there is no save proof.
            <span aria-hidden="true" />
          )}

          {commentCount > 0 && (
            <button
              type="button"
              onClick={openComments}
              aria-label={`Open ${commentCount} comments`}
              className="shrink-0 hover:underline lg:cursor-pointer"
            >
              {fmt(commentCount)} comment{commentCount === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────
          One hairline, then three equal actions with the label beside the
          icon. Contact carries the brand colour: it is the move that turns a
          view into a sale. Save fills when active. */}
      <div className="mx-4 mt-3 border-t border-border" />
      <div className={cn("grid gap-1 px-2 py-1", actionGridCols)}>
        <button
          type="button"
          onClick={handleSavePress}
          aria-pressed={saved}
          className={cn(
            actionClass,
            "hover:bg-surface",
            saved ? "text-primary" : "text-muted hover:text-main",
          )}
        >
          <SaveBurst key={saveBurstKey} burstKey={saveBurstKey} />
          <Bookmark
            className={cn("h-5 w-5 shrink-0 transition-transform duration-300", saved && "scale-110")}
            fill={saved ? "rgb(var(--brand-primary))" : "none"}
            strokeWidth={1.9}
          />
          <span className="truncate">{saved ? "Saved" : "Save"}</span>
        </button>

        {!isOwnPost && (
          <button
            type="button"
            // Warm the conversation route's JS so the transition paints the chat
            // shell (loading.tsx) instantly instead of a blank frame on tap.
            onPointerEnter={() =>
              router.prefetch(`/${lang}/notifications/${post.id}`)
            }
            onClick={(e) => {
              e.stopPropagation();
              if (!requireAuth({ contentId: post.id })) return;
              // Desktop feed: open the chat inline in the right rail.
              if (openMessage) {
                openMessage(post.id, cardRef.current);
                return;
              }
              // Paint the chat shell immediately, before the navigation, so the
              // transition shows the chat (not a blank frame). Auto-clear in case
              // the user returns to the feed while this card stays mounted.
              setIsOpeningChat(true);
              window.setTimeout(() => setIsOpeningChat(false), 2500);
              // Go straight to the full-screen chat. `source=content` tells the
              // chat screen to ensure (create-or-reuse) the conversation in place,
              // so we never flash the inbox list.
              router.push(`/${lang}/notifications/${post.id}?source=content`);
            }}
            className={cn(
              actionClass,
              "text-primary-strong hover:bg-primary-soft dark:text-primary",
            )}
          >
            <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={1.9} />
            <span className="truncate">Contact</span>
          </button>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleShare();
          }}
          aria-label="Share listing"
          className={cn(actionClass, "text-muted hover:bg-surface hover:text-main")}
        >
          <Forward className="h-5 w-5 shrink-0" strokeWidth={1.9} />
          <span className="truncate">Share</span>
        </button>
      </div>

      <CommentsDrawer
        contentId={post.id}
        contentCreatorId={creator?.id ?? post.creatorId}
        onClose={() => setShowComments(false)}
        open={showComments}
        lang={lang}
      />

      <MediaCarouselDialog
        open={showCarousel}
        onOpenChange={setShowCarousel}
        media={[...(post.media ?? [])].sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        )}
        title={post.title}
      />

      {/* ── Instant chat-shell overlay while the conversation route loads ── */}
      {isOpeningChat &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-60">
            <ChatShellSkeleton />
          </div>,
          document.body,
        )}
    </article>
  );
}

// Feed lists re-render on every pagination/loading-state change; memo keeps
// the (heavy: video, observers, portals) cards from re-rendering unless their
// own post changes. Apollo cache results are referentially stable per item,
// so the shallow compare holds across page appends.
export const PostCard = memo(PostCardImpl);
