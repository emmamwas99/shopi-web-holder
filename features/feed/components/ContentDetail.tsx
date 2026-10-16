/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import {
  BadgeCheck,
  Download,
  Bookmark,
  Send,
  X,
  MoreHorizontal,
  Link2,
  Flag,
  MessageCircle,
  MapPin,
  Phone,
  Maximize2,
  ChevronLeft,
  Forward,
  ShieldCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { gql } from "@apollo/client";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useFollow } from "../hooks/useFollow";
import { useQuery, useMutation, useApolloClient } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { SHIMMER, SHIMMER_AVATAR, SHIMMER_PORTRAIT } from "@/lib/shimmer";
import {
  ShareContentDocument,
  ViewContentDocument,
} from "@/types/__generated__/graphql";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { useVideoDownload } from "../hooks/useVideoDownload";
import { useAppBack } from "@/lib/useAppBack";
import { useSellerPhone } from "../hooks/useSellerPhone";
import { formatStoredPhone } from "@/lib/phone";
import { useHlsVideo } from "@/lib/useHlsVideo";
import { Skeleton } from "@/components/ui/skeleton";
import { DrawerLoadingIndicator } from "@/components/ui/drawer-loading-indicator";
import { BufferSpinner } from "./BufferSpinner";
import { useFeedPreferencesStore } from "@/stores/feedPreferences";
import { InlineChatPanel } from "@/features/messaging/components/InlineChatPanel";
import { CommentThread, CommentList, useCommentThread } from "./CommentThread";
import { fmtCompact as fmt } from "@/lib/format";
import { avatarGradient as avatarColors } from "@/lib/avatar";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { VideoProgressBar } from "./VideoProgressBar";
import { usePageFocused } from "../hooks/usePageFocused";
import { shouldFire } from "@/lib/interactionDedup";
import { timeAgoLong as timeAgo } from "@/lib/time";
import { absoluteContentUrl , slugifyContentTitle} from "@/lib/content-url";
import { ContentDetailDocument } from "../queries/contentDetail";
import { ListingSeoSummary } from "./ListingSeoSummary";
import { profileHref } from "@/lib/profile-url";
import { trackSellerEvent } from "@/lib/seller-analytics";
import {
  BuyingSteps,
  DetailRows,
  ListingSection,
  OverlayButton,
  SectionGap,
} from "./ListingParts";

const MediaCarouselDialog = dynamic(() =>
  import("./MediaCarouselDialog").then((mod) => mod.MediaCarouselDialog),
);

type DetailPost = ContentCardFieldsFragment & {
  slug?: string | null;
  categoryId?: string | null;
  category?: {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
  } | null;
  specs?: Array<{ key: string; value: string }>;
  aiClassification?: {
    categoryId?: string | null;
    confidence?: number | null;
    level1?: string | null;
    level2?: string | null;
    level3?: string | null;
    rawLabel?: string | null;
  } | null;
  location?:
    | (ContentCardFieldsFragment["location"] & {
        country?: string | null;
      })
    | null;
};

// ─── helpers ──────────────────────────────────────────────────────────────────
// Shared utilities (fmt, avatarColors/initials, useIsDesktop) now live in
// @/lib and @/hooks; imported above and aliased to keep call sites unchanged.
function isMongoObjectId(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

// ─── MobileImageCarousel ──────────────────────────────────────────────────────

type MediaItem = NonNullable<DetailPost["media"]>[number];

function MobileImageCarousel({
  media,
  title,
  idx,
  onIdx,
  onOpen,
}: {
  media: MediaItem[];
  title: string;
  idx: number;
  onIdx: (i: number) => void;
  onOpen: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Snap to idx imperatively so we don't fight browser scroll-snap
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }, [idx]);

  // Update idx when user swipes natively
  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) onIdx(i);
  }

  return (
    <div
      ref={trackRef}
      onScroll={handleScroll}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      className="flex h-full cursor-pointer overflow-x-auto snap-x snap-mandatory no-scroll-indicator"
      style={{ scrollSnapType: "x mandatory" }}
    >
      {media.map((item, i) => {
        const src =
          item.r2Variants?.find((v) => v.variant === "large")?.url ??
          item.r2Variants?.[0]?.url ??
          item.imageUrl ??
          item.thumbnailUrl ??
          "";
        return (
          <div
            key={i}
            className="relative h-full shrink-0 w-full snap-center bg-surface"
          >
            {src && (
              <Image
                src={src}
                alt={`${title} ${i + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
                priority={i === 0}
                placeholder="blur"
                blurDataURL={SHIMMER_PORTRAIT}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The file to save for an image post.
 *
 * Videos deliberately don't go through here. Their only client-side URL is the
 * HLS manifest, which is a playlist rather than a file — saving it produces a
 * useless `.m3u8`. Video downloads go via useVideoDownload, which asks the API
 * for a real MP4.
 */
function imageDownloadSrc(post: DetailPost): string | null {
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

function ContentVideo({
  hlsUrl,
  thumbnailUrl,
  muted,
  setMuted,
  fill = false,
  showMuteButton = false,
  showSpinner = false,
  fullscreenOpen = false,
  resumeTime = 0,
  fullscreenSide = "right",
  controlsAt = "top",
  onFullscreen,
  onVideoCompleted,
  onVideoReplayed,
}: {
  hlsUrl: string;
  thumbnailUrl?: string | null;
  muted: boolean;
  setMuted?: (muted: boolean) => void;
  fill?: boolean;
  showMuteButton?: boolean;
  showSpinner?: boolean;
  fullscreenOpen?: boolean;
  resumeTime?: number;
  fullscreenSide?: "left" | "right";
  /**
   * "bottom" groups mute and full screen at the bottom-right, just above the
   * progress bar — for the phone layout, whose top edge carries back, save
   * and share.
   */
  controlsAt?: "top" | "bottom";
  onFullscreen?: (time: number) => void;
  onVideoCompleted?: (completionRate: number, watchDuration: number) => void;
  onVideoReplayed?: () => void;
}) {
  const pageFocused = usePageFocused();
  const [manualPaused, setManualPaused] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [actualMuted, setActualMuted] = useState(muted);
  const shouldPlay = pageFocused && !manualPaused && !fullscreenOpen;
  // Browser autoplay fallback can force this element muted. Keep that local so
  // it does not overwrite the user's global sound preference.
  const onMutedChange = useCallback(
    (forcedMuted: boolean) => setActualMuted(forcedMuted),
    [],
  );
  const { videoRef, buffering } = useHlsVideo(
    hlsUrl,
    true,
    videoEnded || manualPaused || !pageFocused || fullscreenOpen,
    onMutedChange,
  );

  // Authoritative mute toggle — apply to the element AND the store in one tap.
  const toggleMuted = useCallback(() => {
    const video = videoRef.current;
    const next = !(video?.muted ?? actualMuted);
    if (video) {
      video.muted = next;
      video.defaultMuted = next;
      if (!next) video.play().catch(() => {});
    }
    setActualMuted(next);
    setMuted?.(next);
  }, [actualMuted, videoRef, setMuted]);
  const [playing, setPlaying] = useState(false);
  const endedCountRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || fullscreenOpen || resumeTime <= 0) return;
    video.currentTime = resumeTime;
  }, [fullscreenOpen, resumeTime, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = muted;
    video.defaultMuted = muted;
    video.playsInline = true;
    setActualMuted(video.muted);
    // Unmuting requires the user gesture's activation to actually emit audio;
    // re-issue play so a video that autoplayed muted starts sounding on one tap
    // (covers the parent-chrome mute button which only flips the store).
    if (!muted && shouldPlay) video.play().catch(() => {});

    const markPlaying = () => setPlaying(true);
    const markStopped = () => setPlaying(false);
    const syncActualMuted = () => setActualMuted(video.muted);
    const handleEnded = () => {
      setPlaying(false);
      setVideoEnded(true);
      const duration = video.duration || 0;
      const watched = video.currentTime || duration;
      const completionRate = duration > 0 ? Math.min(watched / duration, 1) : 1;
      endedCountRef.current += 1;
      if (endedCountRef.current === 1) {
        onVideoCompleted?.(completionRate, watched);
      } else {
        onVideoReplayed?.();
      }
    };

    video.addEventListener("playing", markPlaying);
    video.addEventListener("pause", markStopped);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("volumechange", syncActualMuted);

    return () => {
      video.removeEventListener("playing", markPlaying);
      video.removeEventListener("pause", markStopped);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("volumechange", syncActualMuted);
    };
  }, [hlsUrl, muted, shouldPlay, videoRef, onVideoCompleted, onVideoReplayed]);

  function handleReplay() {
    const video = videoRef.current;
    if (!video) return;
    endedCountRef.current += 1;
    setVideoEnded(false);
    setManualPaused(false);
    video.currentTime = 0;
    video.play().catch(() => {});
    onVideoReplayed?.();
  }

  const objectClass = "object-contain";
  const videoClassName = fill
    ? `absolute inset-0 w-full h-full ${objectClass}`
    : `max-w-full max-h-full ${objectClass}`;
  const showPlayOverlay =
    manualPaused || (!playing && !buffering && pageFocused);

  function togglePlayback() {
    const video = videoRef.current;

    if (manualPaused || video?.paused) {
      setManualPaused(false);
      video?.play().catch(() => {});
      return;
    }

    setManualPaused(true);
    video?.pause();
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          aria-hidden
          className={`absolute inset-0 w-full h-full ${objectClass} transition-opacity duration-500 pointer-events-none z-10 ${playing && !buffering ? "opacity-0" : "opacity-100"}`}
        />
      )}

      <video
        ref={videoRef}
        muted={actualMuted}
        playsInline
        preload="auto"
        poster={thumbnailUrl ?? undefined}
        className={videoClassName}
        style={fill ? undefined : { maxHeight: "100vh" }}
      />

      {/* Replay overlay — shown when video finishes */}
      {videoEnded ? (
        <button
          type="button"
          onClick={handleReplay}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
          aria-label="Replay video"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white ">
            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={togglePlayback}
          className="absolute inset-0 z-20 flex items-center justify-center"
          aria-label={manualPaused || !playing ? "Play video" : "Pause video"}
        >
          <span
            className={[
              "flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white  transition-opacity duration-200",
              showPlayOverlay ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            {manualPaused || !playing ? (
              <svg
                className="ml-1 h-7 w-7"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
              </svg>
            )}
          </span>
        </button>
      )}

      {showSpinner && buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <BufferSpinner />
        </div>
      )}

      <VideoProgressBar videoRef={videoRef} active={playing} showTime={!fill} />

      {controlsAt === "bottom" ? (
        // Above the progress bar's touch strip, never on it.
        <div className="absolute bottom-7 right-3 z-50 flex items-center gap-2">
          {showMuteButton && setMuted && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMuted();
              }}
              aria-label={actualMuted ? "Unmute video" : "Mute video"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-transform active:scale-95"
            >
              {actualMuted ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}
            </button>
          )}
          {onFullscreen && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onFullscreen(videoRef.current?.currentTime ?? 0);
              }}
              aria-label="Open video full screen"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-transform active:scale-95"
            >
              <Maximize2 className="h-4 w-4" strokeWidth={2.2} />
            </button>
          )}
        </div>
      ) : (
        <>
      {showMuteButton && setMuted && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMuted();
          }}
          aria-label={actualMuted ? "Unmute video" : "Mute video"}
          className="absolute bottom-12 right-4 z-50 w-9 h-9 rounded-full bg-black/60  flex items-center justify-center text-white"
        >
          {actualMuted ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.146 5.146a5 5 0 010 9.708v-1.717a3.001 3.001 0 000-6.274V5.146zm2.829-2.83a9 9 0 010 15.37l-.708-1.225a7 7 0 000-12.92l.708-1.225z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      )}

      {onFullscreen && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onFullscreen(videoRef.current?.currentTime ?? 0);
          }}
          aria-label="Open video fullscreen"
          className={[
            "absolute top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white  transition-transform active:scale-95",
            fullscreenSide === "left" ? "left-4" : "right-4",
          ].join(" ")}
        >
          <Maximize2 className="h-5 w-5" strokeWidth={2.2} />
        </button>
      )}
        </>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  id: string;
  lang: string;
  desktopMode?: "page" | "sheet";
  onRequestClose?: () => void;
  /** Sheet mode: notifies the host so it can widen the panel for the chat column. */
  onChatOpenChange?: (open: boolean) => void;
  /**
   * Server-fetched listing used for the very first render.
   *
   * The listing route runs the same PDP query on the server and passes the
   * result here. Without it the first render (server HTML *and* the client's
   * hydration render) is the loading skeleton, so crawlers that don't execute
   * JavaScript — every AI/answer engine, and Bing to a large extent — see a
   * page with no title, price, description or images. It also removes a
   * client round trip from LCP.
   */
  initialPost?: DetailPost | null;
  categoryTrail?: Array<{ name: string; slug: string }>;
  /**
   * Server-rendered related listings (ListingRelated), from the listing route
   * only. Placed inside whichever layout is showing, above the mobile layout's
   * fixed action bar.
   */
  related?: ReactNode;
}

export function ContentDetail({
  id,
  lang,
  desktopMode = "page",
  onRequestClose,
  onChatOpenChange,
  initialPost,
  categoryTrail = [],
  related,
}: Props) {
  const router = useRouter();
  // A listing link shared into WhatsApp opens with no app history behind it,
  // so a plain back() leaves the user stuck on the page. Land on the feed.
  const backOrFeed = useAppBack(`/${lang}/for-you`);
  const goBack = onRequestClose ?? backOrFeed;
  // Desktop PDP breadcrumb back: previous page, or Browse when arrived directly.
  const backOrBrowse = useAppBack(`/${lang}/explore`);
  const { requireAuth } = useAuthGuard(lang);
  const isSheet = desktopMode === "sheet";
  // Stored in state (not a ref) so the Popover portal target is stable across
  // renders and available the first time the menu opens.
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const closeChat = useCallback(() => {
    setChatOpen(false);
    onChatOpenChange?.(false);
  }, [onChatOpenChange]);

  // ── Content query ──────────────────────────────────────────────────────────
  // Opening from the feed seeds Query.content(slug) before navigation. With
  // cache-first + partial data, the detail sheet paints from that clicked card
  // immediately and only fetches when PDP-only fields are genuinely missing.
  const { data, loading } = useQuery(ContentDetailDocument as any, {
    variables: { id },
    fetchPolicy: "cache-first",
    returnPartialData: true,
  }) as {
    data?: { content?: DetailPost | null };
    loading: boolean;
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  // Comments are handled by the shared CommentThread / useCommentThread.
  const client = useApolloClient();
  const [trackInteractionMutation] = useMutation(gql`
    mutation TrackInteractionDetail(
      $contentId: String!
      $type: InteractionType!
      $watchDuration: Float
      $completionRate: Float
    ) {
      trackInteraction(
        input: {
          contentId: $contentId
          type: $type
          watchDuration: $watchDuration
          completionRate: $completionRate
        }
      )
    }
  `);
  const [shareMutation] = useMutation(ShareContentDocument);
  const [viewMutation] = useMutation(ViewContentDocument);
  const [toggleSaveMutation] = useMutation(gql`
    mutation ToggleSaveDetail($contentId: String!, $collectionId: String) {
      toggleSave(contentId: $contentId, collectionId: $collectionId) {
        saved
        saveCount
        collectionId
      }
    }
  `) as any;
  const [reportMutation] = useMutation(gql`
    mutation ReportContentDetail($contentId: String!) {
      reportContent(contentId: $contentId)
    }
  `);

  // ── Local state ────────────────────────────────────────────────────────────
  // `initialPost` covers the window before the client query resolves — on the
  // server, and on the client's hydration render — so the listing renders as
  // real HTML instead of a skeleton. Once the query has data it wins, since it
  // carries the viewer-specific fields (isLikedByMe, isFollowedByMe,
  // isMyContent) that the unauthenticated server fetch cannot see.
  const post = data?.content ?? initialPost ?? undefined;
  const resolvedContentId = post?.id ?? (isMongoObjectId(id) ? id : "");
  const {
    phone: sellerPhone,
    reveal: revealSellerPhone,
    dial: dialSeller,
    loading: sellerPhoneLoading,
    unavailable: sellerPhoneUnavailable,
  } = useSellerPhone(resolvedContentId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [fullscreenVideoTime, setFullscreenVideoTime] = useState(0);
  const muted = useFeedPreferencesStore((s) => s.videoMuted);
  const setVideoMuted = useFeedPreferencesStore((s) => s.setVideoMuted);
  const isDesktop = useIsDesktop();
  /** Conversion intent: counted at the tap, before any sign-in prompt. */
  const trackMessageIntent = useCallback(() => {
    if (resolvedContentId) {
      trackSellerEvent({ type: "MESSAGE_CLICK", contentId: resolvedContentId });
    }
  }, [resolvedContentId]);
  const openChat = useCallback(() => {
    if (!resolvedContentId) return;
    trackMessageIntent();
    if (!requireAuth({ contentId: resolvedContentId })) return;
    setChatOpen(true);
    onChatOpenChange?.(true);
  }, [requireAuth, resolvedContentId, onChatOpenChange, trackMessageIntent]);
  const openMessageRoute = useCallback(() => {
    if (!resolvedContentId) return;
    // A client-side push on every viewport. This was a full page load on
    // phones, from when the listing was an intercepted @modal route; it threw
    // away the app behind the chat, so Back reloaded the listing and then the
    // feed under it — re-ranked, at the top.
    router.push(`/${lang}/notifications/${resolvedContentId}?source=content`, {
      scroll: false,
    });
  }, [lang, resolvedContentId, router]);
  const resolvedSaved =
    (post as typeof post & { isSavedByMe?: boolean })?.isSavedByMe ?? false;
  const resolvedSaveCount = post?.stats?.saves ?? 0;
  const [commentCountOverride, setCommentCountOverride] = useState<
    number | null
  >(null);
  const resolvedCommentCount =
    commentCountOverride ?? post?.stats?.comments ?? 0;

  // Shared comment thread (list + replies + optimistic posting). The mobile PDP
  // renders its list inline and drives the composer from the fixed bottom bar.
  const mobileThread = useCommentThread({
    contentId: resolvedContentId,
    onCommentAdded: () => setCommentCountOverride(null),
    lang,
  });
  const {
    text: mobileCommentText,
    setText: setMobileCommentText,
    replyingTo: mobileReplyingTo,
    setReplyingTo: setMobileReplyingTo,
    handleSend: handleMobileSend,
    inputRef: mobileCommentInputRef,
  } = mobileThread;

  const [captionExpanded, setCaptionExpanded] = useState(false);
  // Images save straight from their R2 URL; videos go through the API, which
  // resolves them to a Mux MP4 and may have to wait on the encode.
  const [isDownloading, setIsDownloading] = useState(false);
  const videoDownload = useVideoDownload(post?.id ?? "");
  const { error: videoDownloadError, clearError: clearVideoDownloadError } =
    videoDownload;
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoDownloadError) return;
    toast.error(videoDownloadError);
    clearVideoDownloadError();
  }, [videoDownloadError, clearVideoDownloadError]);

  const isVideo = post?.type === "VIDEO";
  const media = [...(post?.media ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const mux = media[0]?.muxMeta;
  const hlsUrl = mux?.playbackId
    ? `https://stream.mux.com/${mux.playbackId}.m3u8`
    : null;
  const videoThumbnail =
    media[0]?.thumbnailUrl ??
    (mux?.playbackId
      ? `https://image.mux.com/${mux.playbackId}/thumbnail.jpg?time=0&width=900&fit_mode=smartcrop`
      : null);

  useEffect(() => {
    if (!post?.id || !isVideo || !hlsUrl) return;
    setVideoMuted(false);
  }, [hlsUrl, isVideo, post?.id, setVideoMuted]);

  // Fire view on mount
  useEffect(() => {
    if (!resolvedContentId) return;
    viewMutation({ variables: { contentId: resolvedContentId } }).catch(
      () => {},
    );
  }, [resolvedContentId, viewMutation]);

  // Seller funnel analytics (featured sellers): one listing view per listing,
  // with the session's traffic source. Skipped on the seller's own listing.
  const funnelViewTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!post?.id || post.isMyContent || funnelViewTrackedRef.current === post.id)
      return;
    funnelViewTrackedRef.current = post.id;
    trackSellerEvent({ type: "LISTING_VIEW", contentId: post.id });
  }, [post?.id, post?.isMyContent]);

  // ── Video completion / replay tracking ────────────────────────────────────
  const handleVideoCompleted = useCallback(
    (completionRate: number, watchDuration: number) => {
      if (
        resolvedContentId &&
        shouldFire(resolvedContentId, "VIDEO_COMPLETED")
      ) {
        trackInteractionMutation({
          variables: {
            contentId: resolvedContentId,
            type: "VIDEO_COMPLETED",
            completionRate,
            watchDuration,
          },
        }).catch(() => {});
      }
    },
    [resolvedContentId, trackInteractionMutation],
  );

  const handleVideoReplayed = useCallback(() => {
    if (!resolvedContentId) return;
    // VIDEO_REPLAYED is always allowed (not in SESSION_ONCE)
    trackInteractionMutation({
      variables: { contentId: resolvedContentId, type: "VIDEO_REPLAYED" },
    }).catch(() => {});
  }, [resolvedContentId, trackInteractionMutation]);

  // ── Cache writer — keeps feed cards + detail in sync ─────────────────────
  function writeSaveToCache(saved: boolean, saveCount: number) {
    if (!resolvedContentId) return;
    client.cache.modify({
      id: client.cache.identify({
        __typename: "Content",
        id: resolvedContentId,
      }),
      fields: {
        isSavedByMe: () => saved,
        stats: (existing: any) => ({ ...existing, saves: saveCount }),
      },
    });
  }

  // ── Save handler ───────────────────────────────────────────────────────────
  async function handleSave(collectionId?: string) {
    if (!resolvedContentId) return;
    if (!requireAuth({ contentId: resolvedContentId, action: "save" })) return;
    const wasSaved = resolvedSaved;
    const newSaved = !wasSaved;
    const newCount = resolvedSaveCount + (wasSaved ? -1 : 1);
    writeSaveToCache(newSaved, newCount);
    try {
      const { data: res } = await toggleSaveMutation({
        variables: {
          contentId: resolvedContentId,
          collectionId: collectionId ?? null,
        },
      });
      if (res?.toggleSave)
        writeSaveToCache(res.toggleSave.saved, res.toggleSave.saveCount);
    } catch {
      writeSaveToCache(wasSaved, resolvedSaveCount);
    }
  }

  function handleShare() {
    if (resolvedContentId) {
      shareMutation({ variables: { contentId: resolvedContentId } }).catch(
        () => {},
      );
    }
    if (navigator.share && post) {
      const url = absoluteContentUrl(window.location.origin, lang, post);
      navigator.share({ title: post.title, url }).catch(() => {});
    }
  }

  async function handleCopyLink() {
    try {
      const url =
        typeof window !== "undefined"
          ? absoluteContentUrl(window.location.origin, lang, {
              id: resolvedContentId || id,
              title: post?.title ?? null,
              slug: post?.slug ?? null,
            })
          : "";
      await navigator.clipboard?.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  async function handleReport() {
    if (!resolvedContentId) return;
    await reportMutation({ variables: { contentId: resolvedContentId } });
  }

  async function handleDownload() {
    if (!post || typeof document === "undefined") return;

    // Videos have no usable client-side file URL — the API resolves them to a
    // Mux MP4, and may need a moment to encode one.
    if (post.type === "VIDEO") {
      await videoDownload.download();
      return;
    }

    const src = imageDownloadSrc(post);
    if (!src) return;

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

  // ── Phone layout: compact header once the media has scrolled away ─────────
  // The media carries floating back/save/share; when it leaves the screen a
  // slim header takes over with the title and price, so the buyer never loses
  // what they're looking at. Observed, not scroll-listened, to stay cheap.
  const mediaRef = useRef<HTMLElement | null>(null);
  const [mediaInView, setMediaInView] = useState(true);
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setMediaInView(entry.isIntersecting),
      { rootMargin: "-56px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [post?.id, isDesktop]);

  // ── Follow — must be called unconditionally before any early returns ───────
  // Creator includes follow state when the detail query resolves.
  const postCreatorForFollow = data?.content?.creator;
  const { following, toggle: handleFollow } = useFollow({
    userId: postCreatorForFollow?.id ?? data?.content?.creatorId ?? "",
    initialFollowing: postCreatorForFollow?.isFollowedByMe ?? false,
    initialFollowerCount: postCreatorForFollow?.followerCount ?? 0,
    lang,
  });

  // ── Loading state — full-screen TikTok skeleton ───────────────────────────
  // Only show the skeleton on the FIRST load (no data yet). With
  // cache-and-network, `loading` flips true on every background refresh too —
  // gating on `!post` keeps cached content on screen instead of flashing the
  // skeleton each time the query refetches.
  if (loading && !post) {
    if (isSheet) {
      return <DrawerLoadingIndicator className="h-full min-h-0 bg-app" />;
    }

    return (
      <>
        <div
          className={[
            "hidden md:flex overflow-hidden bg-app",
            isSheet ? "h-full" : "h-screen",
          ].join(" ")}
        >
          {/* Left: media */}
          <div className="flex-1 bg-surface p-8">
            <Skeleton className="h-full w-full rounded-2xl bg-foreground/10" />
          </div>
          {/* Right: info + actions + comments + composer */}
          <div
            className="flex shrink-0 flex-col border-l border-default bg-app"
            style={{ width: isSheet ? 420 : 380 }}
          >
            {/* Header */}
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-default px-3">
              <Skeleton className="h-8 w-8 rounded-full bg-foreground/10" />
              <Skeleton className="h-3.5 w-40 rounded-full bg-foreground/10" />
            </div>

            {/* Meta: creator + title + caption */}
            <div className="space-y-4 border-b border-default p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-foreground/10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32 rounded-full bg-foreground/10" />
                  <Skeleton className="h-3 w-20 rounded-full bg-foreground/10" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full bg-foreground/10" />
              </div>
              <Skeleton className="h-7 w-36 rounded-full bg-foreground/10" />
              <Skeleton className="h-4 w-full rounded-full bg-foreground/10" />
              <Skeleton className="h-4 w-4/5 rounded-full bg-foreground/10" />
            </div>

            {/* Action pills — Save / Comment / Message */}
            <div className="flex items-center gap-2 border-b border-default px-4 py-3">
              <Skeleton className="h-10 w-20 rounded-full bg-foreground/10" />
              <Skeleton className="h-10 w-24 rounded-full bg-foreground/10" />
              <Skeleton className="h-10 flex-1 rounded-full bg-foreground/10" />
            </div>

            {/* Comments list */}
            <div className="flex-1 space-y-4 overflow-hidden p-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-foreground/10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24 rounded-full bg-foreground/10" />
                    <Skeleton className="h-3.5 w-full rounded-full bg-foreground/10" />
                    <Skeleton className="h-3.5 w-2/3 rounded-full bg-foreground/10" />
                  </div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="flex items-center gap-2 border-t border-default p-3">
              <Skeleton className="h-10 flex-1 rounded-2xl bg-foreground/10" />
              <Skeleton className="h-9 w-9 rounded-full bg-foreground/10" />
            </div>
          </div>
        </div>
        <div className="relative min-h-svh overflow-x-clip bg-app md:hidden">
          {/* Mirrors the phone layout: media with floating controls, the
              summary, then sections separated by soft bands. */}
          <div className="relative h-[58svh] min-h-80 max-h-160 bg-surface">
            <Skeleton className="h-full w-full rounded-none bg-foreground/10" />
            <div
              className="absolute inset-x-0 top-0 flex justify-between px-3"
              style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}
            >
              <div className="h-10 w-10 rounded-full bg-black/20" />
              <div className="flex gap-2">
                <div className="h-10 w-10 rounded-full bg-black/20" />
                <div className="h-10 w-10 rounded-full bg-black/20" />
              </div>
            </div>
          </div>

          <div className="space-y-2.5 px-4 py-4">
            <Skeleton className="h-7 w-32 rounded-full bg-foreground/10" />
            <Skeleton className="h-5 w-4/5 rounded-full bg-foreground/10" />
            <Skeleton className="h-4 w-1/2 rounded-full bg-foreground/10" />
          </div>
          <div className="h-2 bg-surface" />

          <div className="space-y-3 px-4 py-4">
            <Skeleton className="h-5 w-16 rounded-full bg-foreground/10" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full bg-foreground/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 rounded-full bg-foreground/10" />
                <Skeleton className="h-3 w-40 rounded-full bg-foreground/10" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-[10px] bg-foreground/10" />
          </div>
          <div className="h-2 bg-surface" />

          <div className="space-y-3 px-4 py-4">
            <Skeleton className="h-5 w-20 rounded-full bg-foreground/10" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20 rounded-full bg-foreground/10" />
                <Skeleton className="h-4 w-28 rounded-full bg-foreground/10" />
              </div>
            ))}
          </div>

          <div
            className="fixed inset-x-0 bottom-0 border-t border-default bg-app px-3 pt-2.5"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
          >
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Skeleton className="h-12 w-24 rounded-[12px] bg-foreground/10" />
              <Skeleton className="h-12 rounded-[12px] bg-foreground/10" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-4xl">😕</div>
        <p className="text-default font-semibold">Post not found</p>
        <button onClick={goBack} className="text-primary text-sm font-semibold">
          Go back
        </button>
      </div>
    );
  }

  const caption = post.caption ?? "";
  const isLongCaption = caption.length > 180;
  const displayCaption =
    isLongCaption && !captionExpanded ? caption.slice(0, 180) + "…" : caption;
  // Use the creator returned with the post; it includes follow state.
  // Reads through `post` (not `data`) so the seller's name and avatar render
  // from the server-supplied listing too — otherwise the crawled HTML would
  // carry the item but not who is selling it.
  const postCreator = post.creator;
  const creatorName = postCreator?.profile?.firstName
    ? `${postCreator.profile.firstName} ${postCreator.profile.lastName ?? ""}`.trim()
    : postCreator === null
      ? `Seller ${post.creatorId.slice(-6)}` // resolver returned, still no profile
      : ""; // resolver still in-flight — don't flash garbage
  const avatarUrl = postCreator?.profile?.avatar;
  // isMyContent is resolved server-side — authoritative, no client-side ID comparison
  const isOwnPost = post.isMyContent ?? false;

  const CreatorRow = (
    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
      {/* Avatar + name open the shop. The Follow button is a sibling, not a
          child, so it keeps its own tap target. */}
      <Link
        href={profileHref(lang, { username: postCreator?.username, id: post.creatorId })}
        className="flex min-w-0 flex-1 items-center gap-3"
        aria-label={creatorName ? `View ${creatorName}'s profile` : "View seller profile"}
      >
      <div
        className={`w-10 h-10 rounded-full shrink-0  relative overflow-hidden ${avatarUrl ? "bg-surface" : `bg-linear-to-br ${avatarColors(post.creatorId)}`} flex items-center justify-center`}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={creatorName}
            className="w-full h-full object-cover"
            fill
            sizes="40px"
            placeholder="blur"
            blurDataURL={SHIMMER_AVATAR}
          />
        ) : (
          <span className="text-white text-xs font-bold">
            {post.creatorId.slice(-2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {creatorName ? (
          /* The verified mark belongs here more than anywhere else in the app.
             Every other surface (feed card, seller card) already shows it, but
             this row was name-and-timestamp only — and this is the screen where
             someone decides whether to trust a stranger enough to message them
             about a six-figure item. */
          <p className="flex items-center gap-1 font-semibold text-sm text-default">
            <span className="truncate">{creatorName}</span>
            {postCreator?.isVerified && (
              <BadgeCheck
                size={15}
                className="shrink-0 text-primary"
                aria-label="Verified seller"
              />
            )}
          </p>
        ) : (
          <div className="h-3.5 w-28 rounded-full bg-surface animate-pulse" />
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {timeAgo(post.createdAt)}
        </p>
      </div>
      </Link>
      {!isOwnPost && (
        <button
          onClick={handleFollow}
          className={[
            "text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all",
            following
              ? "border-border text-muted-foreground bg-surface"
              : "border-primary text-primary hover:bg-primary/5",
          ].join(" ")}
        >
          {following ? "Following" : "+ Follow"}
        </button>
      )}

      {/* More options — matches PostCard's 3-dot menu beside Follow */}
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-8 h-8 lg:cursor-pointer flex items-center justify-center rounded-full hover:bg-surface text-muted-foreground transition-colors"
            aria-label="Post options"
          >
            <MoreHorizontal className="w-5 h-5" strokeWidth={2.6} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          container={isSheet ? rootEl : undefined}
          className="w-52 p-1.5 rounded-2xl border border-border bg-elevated shadow-lg z-80"
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              void handleCopyLink();
            }}
            className="flex lg:cursor-pointer w-full text-sm items-center gap-3 px-4 py-3 rounded-xl font-semibold text-default hover:bg-surface transition-colors"
          >
            <Link2
              className="w-4 h-4 shrink-0 text-muted-foreground"
              strokeWidth={2.2}
            />
            Copy link
          </button>

          {post.allowDownload && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading || videoDownload.isDownloading}
              className="flex lg:cursor-pointer w-full text-sm items-center gap-3 px-4 py-3 rounded-xl font-semibold text-default hover:bg-surface transition-colors disabled:opacity-60"
            >
              <Download className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              {videoDownload.isPreparing
                ? "Preparing…"
                : isDownloading || videoDownload.isDownloading
                  ? "Downloading…"
                  : "Download"}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              handleShare();
            }}
            className="flex lg:cursor-pointer w-full text-sm items-center gap-3 px-4 py-3 rounded-xl font-semibold text-default hover:bg-surface transition-colors"
          >
            <Send className="w-4 h-4 shrink-0 text-muted-foreground" />
            Share content
          </button>

          <button
            type="button"
            onClick={() => {
              if (!resolvedContentId) return;
              if (!requireAuth({ contentId: resolvedContentId })) return;
              setMenuOpen(false);
              void handleReport().then(() => toast.success("Report submitted"));
            }}
            className="flex lg:cursor-pointer w-full text-sm items-center gap-3 px-4 py-3 rounded-xl font-semibold text-default hover:bg-surface transition-colors"
          >
            <Flag
              className="w-4 h-4 shrink-0 text-muted-foreground"
              strokeWidth={2.2}
            />
            Report listing
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );

  const PostInfo = (
    <div className="px-4 pb-4 border-b border-default">
      {post.price && (
        <div className="mb-2.5">
          <span
            className="text-xl font-bold"
            style={{ color: "rgb(var(--brand-primary))" }}
          >
            {post.price.amount === 0
              ? "Free"
              : `${post.price.currency} ${post.price.amount.toLocaleString()}`}
          </span>
          {post.price.negotiable && (
            <span className="text-xs text-muted-foreground font-normal ml-2">
              · Negotiable
            </span>
          )}
        </div>
      )}
      <h1 className="text-default font-bold text-base leading-snug mb-2">
        {post.title}
      </h1>
      {caption && (
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          {displayCaption}
          {isLongCaption && (
            <button
              onClick={() => setCaptionExpanded((v) => !v)}
              className="text-primary font-medium ml-1"
            >
              {captionExpanded ? " less" : " more"}
            </button>
          )}
        </p>
      )}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-muted-foreground text-xs font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      {post.location?.placeName && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clipRule="evenodd"
            />
          </svg>
          {post.location.placeName}
          {post.location.county && `, ${post.location.county}`}
        </div>
      )}
    </div>
  );

  // Prefer the AI-classified hierarchy, then the resolved category name.
  // Never fall back to `categoryId` — it is a raw ObjectId, not a label.
  const categoryLabel =
    [
      post.aiClassification?.level1,
      post.aiClassification?.level2,
      post.aiClassification?.level3,
    ]
      .filter(Boolean)
      .join(" / ") ||
    post.category?.name ||
    "";
  const specs = (post.specs ?? []).filter((spec) => spec.key && spec.value);
  const fullLocation = [
    post.location?.placeName,
    post.location?.subregion,
    post.location?.county,
    post.location?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const DetailMeta = (categoryLabel || fullLocation || specs.length > 0) && (
    <div className="border-b border-default px-4 py-4">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-normal text-muted-foreground">
        Details
      </h2>
      <div className="grid gap-3 text-sm">
        {categoryLabel && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              Category
            </p>
            <p className="mt-0.5 text-default">{categoryLabel}</p>
          </div>
        )}
        {fullLocation && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              Location
            </p>
            <p className="mt-0.5 text-default">{fullLocation}</p>
          </div>
        )}
        {specs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Specs</p>
            <dl className="mt-2 grid grid-cols-2 gap-2">
              {specs.map((spec) => (
                <div
                  key={`${spec.key}-${spec.value}`}
                  className="rounded-lg border border-default bg-surface px-3 py-2"
                >
                  <dt className="truncate text-[11px] font-semibold text-muted-foreground">
                    {spec.key}
                  </dt>
                  <dd className="mt-0.5 truncate text-xs font-semibold text-default">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );

  // Desktop inline action row
  const DesktopActions = (
    <div className="hidden md:flex items-center gap-2 px-4 py-3 border-b border-default">
      {/* Save pill — outlined, active = filled primary (matches PostCard) */}
      <button
        onClick={() => handleSave()}
        className="flex lg:cursor-pointer items-center gap-1.5 px-4 py-2.5 rounded-full border text-xs font-semibold transition-all active:scale-95"
        style={{
          borderColor: resolvedSaved
            ? "rgb(var(--brand-primary))"
            : "rgb(var(--color-border))",
          color: resolvedSaved
            ? "rgb(var(--brand-primary))"
            : "rgb(var(--color-text-default))",
          backgroundColor: resolvedSaved
            ? "rgb(var(--brand-primary) / 0.08)"
            : "transparent",
        }}
      >
        <Bookmark
          className="w-4 h-4"
          fill={resolvedSaved ? "rgb(var(--brand-primary))" : "none"}
          strokeWidth={1.8}
        />
        <span>{resolvedSaveCount > 0 ? fmt(resolvedSaveCount) : "Save"}</span>
      </button>

      {/* Comment pill — scrolls to the comments section below */}
      <button
        onClick={() =>
          commentsRef.current?.scrollIntoView({ behavior: "smooth" })
        }
        className="flex lg:cursor-pointer items-center gap-1.5 px-4 py-2.5 rounded-full border border-border text-xs font-semibold text-default transition-all active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
          />
        </svg>
        {resolvedCommentCount > 0 ? (
          <span>{fmt(resolvedCommentCount)}</span>
        ) : (
          <span>Comment</span>
        )}
      </button>

      {/* Message — primary, takes remaining width (matches PostCard).
          In the desktop sheet this opens an in-place chat column instead of
          navigating away; on mobile/page it routes to the full chat screen. */}
      {!isOwnPost && (
        <button
          onClick={() => {
            if (isSheet) {
              openChat();
              return;
            }
            if (!resolvedContentId) return;
            trackMessageIntent();
            if (!requireAuth({ contentId: resolvedContentId })) return;
            openMessageRoute();
          }}
          className="flex-1 lg:cursor-pointer flex items-center justify-center gap-1.5 px-8 py-2.5 rounded-full bg-primary/90 text-xs font-semibold text-[#f1f1f1] transition-all active:scale-95"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Message
        </button>
      )}
    </div>
  );

  return (
    <div
      ref={setRootEl}
      className={[
        "flex flex-col bg-app",
        isSheet ? "h-full min-h-0" : "min-h-svh",
      ].join(" ")}
    >
      {/* Pre-measurement render (server + hydration): the crawlable listing.
          Replaced by one of the two layouts below as soon as useIsDesktop()
          resolves. See ListingSeoSummary for why this exists. */}
      {/* Gated on `initialPost`, not just the null viewport: only the
          server-rendered listing route supplies it. Client-side entries (the
          feed's intercepted sheet, in-app navigation) render from cache and
          would otherwise flash this summary for a frame before the viewport
          resolves. */}
      {isDesktop === null && initialPost && (
        <>
          <ListingSeoSummary post={post} lang={lang} />
          {related}
        </>
      )}

      {/* ════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (md+)
          Left col: media (sticky)   Right col: info + comments
          Inspired by Facebook/Instagram post detail
      ════════════════════════════════════════════════════════ */}
      {isDesktop === true && isSheet && (
        <div
          className={[
            "flex overflow-hidden",
            isSheet ? "h-full min-h-0" : "h-screen",
          ].join(" ")}
        >
          {/* ── Left: media ────────────────────────────────────────────────────── */}
          <div
            className="flex-1 bg-black flex items-center justify-center overflow-hidden"
            style={{ minWidth: 0 }}
          >
            {isVideo && hlsUrl ? (
              <ContentVideo
                hlsUrl={hlsUrl}
                thumbnailUrl={videoThumbnail}
                muted={muted}
                setMuted={setVideoMuted}
                showMuteButton
                fullscreenOpen={showMediaDialog}
                resumeTime={fullscreenVideoTime}
                onFullscreen={(time) => {
                  setFullscreenVideoTime(time);
                  setShowMediaDialog(true);
                }}
                onVideoCompleted={handleVideoCompleted}
                onVideoReplayed={handleVideoReplayed}
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                {media[imgIdx] && (
                  <Image
                    src={
                      media[imgIdx].r2Variants?.find(
                        (v) => v.variant === "large",
                      )?.url ??
                      media[imgIdx].r2Variants?.[0]?.url ??
                      media[imgIdx].imageUrl ??
                      media[imgIdx].thumbnailUrl ??
                      ""
                    }
                    alt={post.title}
                    fill
                    sizes={isSheet ? "58vw" : "65vw"}
                    className="object-contain"
                    priority
                    placeholder="blur"
                    blurDataURL={SHIMMER}
                  />
                )}
                {/* Prev/next arrows for multi-image */}
                {media.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIdx((i) => Math.max(0, i - 1))}
                      disabled={imgIdx === 0}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        setImgIdx((i) => Math.min(media.length - 1, i + 1))
                      }
                      disabled={imgIdx === media.length - 1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {media.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setImgIdx(i)}
                          className={[
                            "rounded-full transition-all",
                            i === imgIdx
                              ? "w-4 h-1.5 bg-white"
                              : "w-1.5 h-1.5 bg-white/50",
                          ].join(" ")}
                        />
                      ))}
                    </div>
                  </>
                )}
                {media.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMediaDialog(true)}
                    aria-label="Open image fullscreen"
                    className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white  transition-transform active:scale-95"
                  >
                    <Maximize2 className="h-5 w-5" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Right: info + comments + input ─────────────────────────────────── */}
          <div
            className="flex flex-col border-l border-default bg-app overflow-hidden"
            style={{ width: isSheet ? 420 : 380, flexShrink: 0 }}
          >
            {/* Header row */}
            <div className="flex items-center gap-2 h-12 border-b border-default shrink-0 px-2">
              <button
                onClick={goBack}
                aria-label={isSheet ? "Close post" : "Go back"}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface transition-colors"
              >
                {isSheet ? (
                  <X className="h-5 w-5 text-default" strokeWidth={2.2} />
                ) : (
                  <svg
                    className="w-5 h-5 text-default"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                )}
              </button>
              <span className="font-semibold text-default text-sm truncate flex-1">
                {post.title}
              </span>
            </div>

            {/* Post meta — scrolls internally if tall, but caps so the comment
                thread below always has room. */}
            <div className="max-h-[55%] shrink-0 overflow-y-auto">
              {CreatorRow}
              {PostInfo}
              {DetailMeta}
              {DesktopActions}
            </div>

            {/* Comments + replies + reply-aware composer (shared thread) */}
            <div className="flex min-h-0 flex-1 flex-col border-t border-default">
              {resolvedContentId && (
                <CommentThread
                  contentId={resolvedContentId}
                  contentCreatorId={post.creatorId}
                  lang={lang}
                />
              )}
            </div>
          </div>

          {/* ── Chat column (sheet only) — in-place messaging, no navigation.
              Rendered unconditionally so InlineChatPanel can animate its exit;
              contentId=null keeps it collapsed. ─── */}
          {isSheet && (
            <InlineChatPanel
              lang={lang}
              contentId={
                chatOpen && resolvedContentId ? resolvedContentId : null
              }
              onClose={closeChat}
              // The post's creator row beside this column already shows the
              // seller's name + avatar, so hide them in the chat header to
              // avoid repeating the same identity right next to it.
              hideParticipantHeader
              className="flex flex-col border-l border-default bg-app overflow-hidden h-full w-[400px] shrink-0"
            />
          )}
        </div>
      )}
      {isDesktop === true && !isSheet && (
        <main className="mx-auto w-full max-w-[1440px] px-5 pb-12 pt-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 flex min-w-0 items-center gap-2 overflow-hidden text-sm">
            <button
              type="button"
              onClick={backOrBrowse}
              aria-label="Go back"
              title="Go back"
              className="mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-default text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <Link href={`/${lang}/for-you`} className="shrink-0 font-medium text-muted-foreground transition-colors hover:text-default">Home</Link>
            <span aria-hidden className="text-muted-foreground/50">/</span>
            <Link href={`/${lang}/explore`} className="shrink-0 font-medium text-muted-foreground transition-colors hover:text-default">Explore</Link>
            {categoryTrail.map((category, index) => (
              <span key={category.slug} className="flex min-w-0 shrink items-center gap-2">
                <span aria-hidden className="shrink-0 text-muted-foreground/50">/</span>
                <Link
                  href={index === 0
                    ? `/${lang}/explore?category=${encodeURIComponent(category.slug)}`
                    : `/${lang}/explore/${categoryTrail[0].slug}/${slugifyContentTitle(category.name)}`}
                  className="truncate font-medium text-muted-foreground transition-colors hover:text-default"
                  title={category.name}
                >
                  {category.name}
                </Link>
              </span>
            ))}
            <span aria-hidden className="shrink-0 text-muted-foreground/50">/</span>
            <span aria-current="page" className="min-w-0 truncate font-semibold text-default">{post.title}</span>
          </nav>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-8 xl:gap-10">
            <section className="min-w-0 self-start lg:sticky lg:top-[calc(var(--desktop-top-nav-height,68px)+24px)]">
              <div className="relative aspect-[4/3] max-h-[760px] overflow-hidden rounded-3xl border border-default bg-[#111318] shadow-sm">
                {isVideo && hlsUrl ? (
                  <ContentVideo
                    hlsUrl={hlsUrl}
                    thumbnailUrl={videoThumbnail}
                    muted={muted}
                    setMuted={setVideoMuted}
                    showMuteButton
                    fullscreenOpen={showMediaDialog}
                    resumeTime={fullscreenVideoTime}
                    onFullscreen={(time) => {
                      setFullscreenVideoTime(time);
                      setShowMediaDialog(true);
                    }}
                    onVideoCompleted={handleVideoCompleted}
                    onVideoReplayed={handleVideoReplayed}
                  />
                ) : (
                  <div className="absolute inset-0">
                    {media[imgIdx] && (
                      <Image
                        src={
                          media[imgIdx].r2Variants?.find((variant) => variant.variant === "large")?.url ??
                          media[imgIdx].r2Variants?.[0]?.url ??
                          media[imgIdx].imageUrl ??
                          media[imgIdx].thumbnailUrl ??
                          ""
                        }
                        alt={post.title}
                        fill
                        sizes="(max-width: 1280px) 55vw, 720px"
                        className="object-contain"
                        priority
                        placeholder="blur"
                        blurDataURL={SHIMMER}
                      />
                    )}
                  </div>
                )}

                {!isVideo && media.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setImgIdx((index) => Math.max(0, index - 1))}
                      disabled={imgIdx === 0}
                      aria-label="Previous photo"
                      className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg  transition hover:bg-black/75 disabled:opacity-35"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImgIdx((index) => Math.min(media.length - 1, index + 1))}
                      disabled={imgIdx === media.length - 1}
                      aria-label="Next photo"
                      className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg  transition hover:bg-black/75 disabled:opacity-35"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                    <span className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white ">
                      {imgIdx + 1} / {media.length}
                    </span>
                  </>
                )}

                {!isVideo && media.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMediaDialog(true)}
                    aria-label="View photo fullscreen"
                    className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white  transition hover:bg-black/75"
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>

              {!isVideo && media.length > 1 && (
                <div className="mt-3 grid grid-cols-6 gap-2 xl:grid-cols-7">
                  {media.slice(0, 7).map((item, index) => {
                    const thumbnail = item.r2Variants?.find((variant) => variant.variant === "small")?.url ??
                      item.r2Variants?.[0]?.url ?? item.imageUrl ?? item.thumbnailUrl ?? "";
                    return (
                      <button
                        key={`${item.url}-${index}`}
                        type="button"
                        onClick={() => setImgIdx(index)}
                        aria-label={`View photo ${index + 1}`}
                        aria-pressed={imgIdx === index}
                        className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-surface transition ${imgIdx === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
                      >
                        {thumbnail && <Image src={thumbnail} alt="" fill sizes="96px" className="object-cover" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="min-w-0 space-y-5">
              <article className="overflow-hidden rounded-3xl border border-default bg-elevated shadow-sm">
                <div className="border-b border-default">{CreatorRow}</div>
                <div className="px-6 py-6">
                  {post.price && (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="font-display text-3xl font-extrabold tracking-tight text-primary">
                        {post.price.amount === 0 ? "Free" : `${post.price.currency} ${post.price.amount.toLocaleString()}`}
                      </span>
                      {post.price.negotiable && (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Negotiable</span>
                      )}
                    </div>
                  )}
                  <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-default xl:text-3xl">{post.title}</h1>
                  {post.location && (post.location.placeName || post.location.county) && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {[post.location.placeName, post.location.county].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {caption && (
                    <div className="mt-5 border-t border-default pt-5">
                      <p className="whitespace-pre-line text-sm leading-6 text-default/85">
                        {displayCaption}
                        {isLongCaption && (
                          <button type="button" onClick={() => setCaptionExpanded((expanded) => !expanded)} className="ml-1 font-semibold text-primary hover:underline">
                            {captionExpanded ? "Show less" : "Read more"}
                          </button>
                        )}
                      </p>
                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {post.hashtags.map((tag) => (
                            <span key={tag} className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {specs.length > 0 && (
                    <section className="mt-5 border-t border-default pt-5" aria-labelledby="listing-specs-heading">
                      <h2 id="listing-specs-heading" className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Item details</h2>
                      <dl className="grid grid-cols-2 gap-2.5">
                        {specs.map((spec) => (
                          <div key={`${spec.key}-${spec.value}`} className="min-w-0 rounded-xl bg-surface px-3 py-2.5">
                            <dt className="truncate text-[11px] font-medium text-muted-foreground">{spec.key}</dt>
                            <dd className="mt-1 truncate text-sm font-semibold text-default">{spec.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}
                </div>
                {DesktopActions}
              </article>

              {!isOwnPost && (
                <aside className="rounded-2xl border border-default bg-surface px-5 py-4">
                  <h2 className="text-sm font-bold text-default">Shop safely</h2>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    Confirm availability and condition with the seller. Inspect the item before paying and agree on pickup or delivery directly.
                  </p>
                </aside>
              )}
            </div>
          </div>

          <section ref={commentsRef} className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]" aria-labelledby="listing-comments-heading">
            <div className="flex h-[560px] min-h-0 flex-col overflow-hidden rounded-3xl border border-default bg-elevated shadow-sm">
              <header className="shrink-0 border-b border-default px-6 py-4">
                <h2 id="listing-comments-heading" className="font-display text-lg font-bold text-default">Questions and comments</h2>
                <p className="mt-1 text-xs text-muted-foreground">Ask the seller or see what other buyers have asked.</p>
              </header>
              <div className="flex min-h-0 flex-1 flex-col">
                {resolvedContentId && (
                  <CommentThread contentId={resolvedContentId} contentCreatorId={post.creatorId} lang={lang} />
                )}
              </div>
            </div>
            <aside className="self-start rounded-3xl border border-default bg-elevated p-6">
              <h2 className="font-display text-base font-bold text-default">Buying on Shopi</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Message the seller to confirm availability, condition and the final price. Meet in a public place when possible, inspect before paying, and agree on pickup or delivery directly.
              </p>
            </aside>
          </section>
        </main>
      )}

      {/* Below the full-height listing, reached by scrolling the page. */}
      {isDesktop === true && !isSheet && related && (
        <div className="border-t border-default">{related}</div>
      )}

      {/* ════════════════════════════════════════════════════════
          MOBILE LAYOUT  (< md)
          Scrolls the window like every other screen, so a return to the
          listing (Back from the seller, a related listing, the chat) lands
          where it was left — RouteScrollRestoration only tracks the window.
          It used to be a fixed overlay with its own scroller, from when it
          was drawn over the feed; that position was lost on every return.
          `overflow-x-clip`, not hidden: hidden would make this the scroll
          container and the sticky header would stop sticking.
      ════════════════════════════════════════════════════════ */}
      {isDesktop === false && (() => {
        const hasPrice = Boolean(post.price && post.price.amount > 0);
        const priceText = hasPrice
          ? `${post.price!.currency} ${post.price!.amount.toLocaleString()}`
          : "Price on request";
        // Area + county for the summary line; the full address is in Details.
        const place = [
          post.location?.subregion || post.location?.placeName,
          post.location?.county,
        ]
          .filter((part, i, all): part is string => Boolean(part) && all.indexOf(part) === i)
          .join(", ");
        const memberSince = (postCreator as { createdAt?: string | null } | null | undefined)?.createdAt;
        const followerCount = postCreator?.followerCount ?? 0;
        const detailRows = [
          ...(categoryLabel ? [{ label: "Category", value: categoryLabel }] : []),
          ...specs.map((spec) => ({ label: spec.key, value: spec.value })),
          ...(fullLocation ? [{ label: "Location", value: fullLocation }] : []),
        ];
        const shopHref = profileHref(lang, { username: postCreator?.username, id: post.creatorId });
        const startMessage = () => {
          if (!resolvedContentId) return;
          trackMessageIntent();
          if (!requireAuth({ contentId: resolvedContentId })) return;
          openMessageRoute();
        };

        return (
        <div className="relative min-h-svh overflow-x-clip bg-app">
          {/* ── Compact header: slides in once the media has scrolled away ── */}
          <header
            aria-hidden={mediaInView}
            className={[
              "fixed inset-x-0 top-0 z-40 flex items-center gap-1 border-b border-default bg-app px-2 pb-2 transition-all duration-200",
              mediaInView ? "pointer-events-none -translate-y-full opacity-0" : "translate-y-0 opacity-100",
            ].join(" ")}
            style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 8px)" }}
          >
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              tabIndex={mediaInView ? -1 : 0}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-main active:bg-surface"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold leading-5 text-main">{post.title}</p>
              <p className="truncate text-[12px] leading-4 text-muted">{priceText}</p>
            </div>
            <button
              type="button"
              onClick={() => handleSave()}
              aria-label={resolvedSaved ? "Remove saved listing" : "Save listing"}
              tabIndex={mediaInView ? -1 : 0}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-main active:bg-surface"
            >
              <Bookmark
                className="h-5 w-5"
                fill={resolvedSaved ? "rgb(var(--brand-primary))" : "none"}
                stroke={resolvedSaved ? "rgb(var(--brand-primary))" : "currentColor"}
                strokeWidth={2}
              />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share listing"
              tabIndex={mediaInView ? -1 : 0}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-main active:bg-surface"
            >
              <Forward className="h-5 w-5" strokeWidth={2} />
            </button>
          </header>

          {/* ── Media: full width, nothing overlaps it ───────────────────────
              The details used to be pulled up over the media's bottom edge
              (-mt-4 + rounded corners), which hid the video's progress bar and
              the image dots. The media now ends cleanly where the page begins. */}
          <section
            ref={mediaRef}
            className={["relative h-[58svh] min-h-80 max-h-160", isVideo ? "bg-black" : "bg-surface"].join(" ")}
          >
            {isVideo && hlsUrl ? (
              <ContentVideo
                hlsUrl={hlsUrl}
                thumbnailUrl={videoThumbnail}
                muted={muted}
                setMuted={setVideoMuted}
                fill
                showSpinner
                showMuteButton
                controlsAt="bottom"
                fullscreenOpen={showMediaDialog}
                resumeTime={fullscreenVideoTime}
                onFullscreen={(time) => {
                  setFullscreenVideoTime(time);
                  setShowMediaDialog(true);
                }}
                onVideoCompleted={handleVideoCompleted}
                onVideoReplayed={handleVideoReplayed}
              />
            ) : (
              <MobileImageCarousel
                media={media}
                title={post.title}
                idx={imgIdx}
                onIdx={setImgIdx}
                onOpen={() => setShowMediaDialog(true)}
              />
            )}

            {/* Floating controls over the media, clear of the status bar. */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-between px-3"
              style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}
            >
              <div className="pointer-events-auto">
                <OverlayButton label="Go back" onClick={goBack}>
                  <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
                </OverlayButton>
              </div>
              <div className="pointer-events-auto flex items-center gap-2">
                <OverlayButton
                  label={resolvedSaved ? "Remove saved listing" : "Save listing"}
                  pressed={resolvedSaved}
                  onClick={() => void handleSave()}
                >
                  <Bookmark
                    className="h-5 w-5"
                    fill={resolvedSaved ? "rgb(var(--brand-primary))" : "none"}
                    stroke={resolvedSaved ? "rgb(var(--brand-primary))" : "currentColor"}
                    strokeWidth={2}
                  />
                </OverlayButton>
                <OverlayButton label="Share listing" onClick={handleShare}>
                  <Forward className="h-5 w-5" strokeWidth={2} />
                </OverlayButton>
              </div>
            </div>

            {!isVideo && media.length > 1 && (
              <span className="pointer-events-none absolute bottom-3 right-3 z-30 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-white backdrop-blur-md">
                {imgIdx + 1} / {media.length}
              </span>
            )}
          </section>

          <main
            className={isOwnPost ? "pb-8" : ""}
            style={isOwnPost ? undefined : { paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
          >
            {/* ── What it is ───────────────────────────────────────────── */}
            <section className="px-4 pb-4 pt-4">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {hasPrice ? (
                  <span className="text-[24px] font-bold leading-7 tracking-[-0.02em] text-main tabular-nums">
                    {priceText}
                  </span>
                ) : (
                  <span className="text-[18px] font-semibold leading-7 text-muted">{priceText}</span>
                )}
                {hasPrice && post.price?.negotiable && (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium text-muted">
                    Negotiable
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-[18px] font-semibold leading-6 text-main">{post.title}</h1>
              <p className="mt-2 flex min-w-0 items-center gap-1 text-[13px] leading-5 text-muted">
                {place && (
                  <>
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{place}</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span className="shrink-0">Listed {timeAgo(post.createdAt)}</span>
              </p>
              {/* Interest as one quiet line. Views are the seller's figure: a
                  low count tells a buyer the listing is being ignored, which
                  discourages the contact we want. Zeros are never shown. */}
              {((isOwnPost && post.stats.views > 0) || resolvedSaveCount > 0) && (
                <p className="mt-1 text-[13px] leading-5 text-muted">
                  {[
                    isOwnPost && post.stats.views > 0 ? `${fmt(post.stats.views)} views` : null,
                    resolvedSaveCount > 0
                      ? `${fmt(resolvedSaveCount)} ${resolvedSaveCount === 1 ? "person" : "people"} saved this`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </section>

            <SectionGap />

            {/* ── Who sells it ─────────────────────────────────────────── */}
            <ListingSection title="Seller">
              <div className="flex items-center gap-3">
                <Link
                  href={shopHref}
                  className="flex min-w-0 flex-1 items-center gap-3 no-underline"
                  aria-label={creatorName ? `View ${creatorName}'s shop` : "View seller's shop"}
                >
                  <div
                    className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ${avatarUrl ? "bg-surface" : `bg-linear-to-br ${avatarColors(post.creatorId)}`}`}
                  >
                    {avatarUrl ? (
                      <Image
                        // Decorative: the name sits beside it, and a failed
                        // load would otherwise print the name in the circle.
                        src={avatarUrl}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL={SHIMMER_AVATAR}
                      />
                    ) : (
                      <span className="text-[13px] font-bold text-white">
                        {post.creatorId.slice(-2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {creatorName ? (
                      <p className="flex items-center gap-1 text-[15px] font-semibold leading-5 text-main">
                        <span className="truncate">{creatorName}</span>
                        {postCreator?.isVerified && (
                          <BadgeCheck size={16} className="shrink-0 text-[#1D9BF0]" aria-label="Verified seller" />
                        )}
                      </p>
                    ) : (
                      <div className="h-4 w-28 animate-pulse rounded-full bg-surface" />
                    )}
                    <p className="mt-0.5 truncate text-[13px] leading-5 text-muted">
                      {[
                        memberSince
                          ? `On Shopi since ${new Date(memberSince).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                          : null,
                        followerCount > 0 ? `${fmt(followerCount)} follower${followerCount === 1 ? "" : "s"}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "View shop"}
                    </p>
                  </div>
                </Link>
                {!isOwnPost && (
                  <button
                    type="button"
                    onClick={handleFollow}
                    className={[
                      "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors active:scale-95",
                      following
                        ? "bg-surface text-muted"
                        : "bg-primary-soft text-primary-strong dark:text-primary",
                    ].join(" ")}
                  >
                    {following ? "Following" : "Follow"}
                  </button>
                )}
              </div>
              <Link
                href={shopHref}
                className="mt-3 flex h-10 items-center justify-center rounded-[10px] border border-default text-[14px] font-semibold text-main no-underline active:bg-surface"
              >
                Visit shop
              </Link>
            </ListingSection>

            {detailRows.length > 0 && (
              <>
                <SectionGap />
                <ListingSection title="Details">
                  <DetailRows rows={detailRows} />
                </ListingSection>
              </>
            )}

            {caption && (
              <>
                <SectionGap />
                <ListingSection title="Description">
                  <p className="whitespace-pre-line text-[14px] leading-6 text-main">
                    {displayCaption}
                  </p>
                  {isLongCaption && (
                    <button
                      type="button"
                      onClick={() => setCaptionExpanded((v) => !v)}
                      className="mt-1 text-[14px] font-semibold text-main underline-offset-2 hover:underline"
                    >
                      {captionExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <p className="mt-2 text-[13px] leading-5 text-muted">
                      {post.hashtags.map((tag) => `#${tag}`).join("  ")}
                    </p>
                  )}
                </ListingSection>
              </>
            )}

            {!isOwnPost && (
              <>
                <SectionGap />
                <ListingSection title="Buying on Shopi">
                  <BuyingSteps />
                  <p className="mt-4 flex items-start gap-2 rounded-[10px] bg-surface px-3 py-2.5 text-[13px] leading-5 text-muted">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>
                      Shopi will never ask you to pay through a link. Don&apos;t share M-Pesa PINs or
                      codes with anyone.
                    </span>
                  </p>
                </ListingSection>
              </>
            )}

            <SectionGap />

            {/* ── Questions & comments ─────────────────────────────────── */}
            <ListingSection
              sectionRef={commentsRef}
              title="Questions & comments"
              aside={
                resolvedCommentCount > 0 ? (
                  <span className="text-[13px] text-muted">{fmt(resolvedCommentCount)}</span>
                ) : undefined
              }
            >
              <CommentList thread={mobileThread} contentCreatorId={post.creatorId} className="" />
              {mobileReplyingTo && (
                <div className="mt-3 flex items-center justify-between rounded-[10px] bg-surface px-3 py-2 text-[13px] text-muted">
                  <span>
                    Replying to{" "}
                    <span className="font-medium text-main">
                      {mobileReplyingTo.author?.profile?.firstName ??
                        `User ${mobileReplyingTo.creatorId.slice(-6)}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileReplyingTo(null)}
                    className="ml-2 flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-main"
                    aria-label="Cancel reply"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={mobileCommentInputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={mobileCommentText}
                  onChange={(e) => setMobileCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleMobileSend();
                    }
                  }}
                  onFocus={() => {
                    if (
                      !resolvedContentId ||
                      !requireAuth({ contentId: resolvedContentId, action: "comment" })
                    )
                      mobileCommentInputRef.current?.blur();
                  }}
                  placeholder={mobileReplyingTo ? "Write a reply…" : "Ask the seller a question…"}
                  maxLength={500}
                  className="h-11 min-w-0 flex-1 rounded-full border border-default bg-surface px-4 text-[14px] text-main outline-none transition-colors placeholder:text-muted focus:border-primary"
                />
                {mobileCommentText.trim() && (
                  <button
                    type="button"
                    onClick={handleMobileSend}
                    aria-label="Send comment"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-transform active:scale-95"
                  >
                    <Send className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            </ListingSection>

            {related && (
              <>
                <SectionGap />
                <div>{related}</div>
              </>
            )}

            {/* ── Housekeeping, out of the way ─────────────────────────── */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-default px-4 py-5 text-[13px] text-muted">
              <button type="button" onClick={() => void handleCopyLink()} className="flex items-center gap-1.5 active:text-main">
                <Link2 className="h-4 w-4" /> Copy link
              </button>
              {post.allowDownload && (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading || videoDownload.isDownloading}
                  className="flex items-center gap-1.5 active:text-main disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {videoDownload.isPreparing
                    ? "Preparing…"
                    : isDownloading || videoDownload.isDownloading
                      ? "Downloading…"
                      : "Download"}
                </button>
              )}
              {!isOwnPost && (
                <button
                  type="button"
                  onClick={() => {
                    if (!resolvedContentId) return;
                    if (!requireAuth({ contentId: resolvedContentId })) return;
                    void handleReport().then(() => toast.success("Thanks — we'll review this listing"));
                  }}
                  className="flex items-center gap-1.5 active:text-main"
                >
                  <Flag className="h-4 w-4" /> Report listing
                </button>
              )}
            </div>
          </main>

          {/* ── Contact bar ─────────────────────────────────────────────── */}
          {!isOwnPost && (
            <div
              className="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-app px-3 pt-2.5"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
            >
              <div className="mx-auto grid w-full max-w-xl grid-cols-[auto_1fr] gap-2">
                <button
                  type="button"
                  disabled={sellerPhoneLoading}
                  onClick={async () => {
                    if (!resolvedContentId) return;
                    if (!requireAuth({ contentId: resolvedContentId })) return;
                    if (sellerPhone) {
                      dialSeller();
                      return;
                    }
                    const revealed = await revealSellerPhone();
                    if (!revealed) toast("This seller hasn't added a phone number");
                  }}
                  aria-label={sellerPhone ? "Call seller" : "Show seller phone number"}
                  className="flex h-12 min-w-24 items-center justify-center gap-2 rounded-[12px] border border-default bg-elevated px-4 text-[15px] font-semibold text-main transition-colors active:bg-surface disabled:opacity-60"
                >
                  <Phone className="h-[18px] w-[18px] shrink-0" strokeWidth={2.2} />
                  <span className="max-w-32 truncate">
                    {sellerPhoneLoading
                      ? "Loading…"
                      : sellerPhone
                        ? formatStoredPhone(sellerPhone)
                        : sellerPhoneUnavailable
                          ? "No number"
                          : "Call"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={startMessage}
                  className="flex h-12 items-center justify-center gap-2 rounded-[12px] bg-primary px-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
                >
                  <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  Message seller
                </button>
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {showMediaDialog && media.length > 0 && (
        <MediaCarouselDialog
          open
          onOpenChange={setShowMediaDialog}
          media={media}
          title={post.title}
          startIndex={imgIdx}
          videoStartTime={fullscreenVideoTime}
          onVideoTimeChange={setFullscreenVideoTime}
        />
      )}
    </div>
  );
}
