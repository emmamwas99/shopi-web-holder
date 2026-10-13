"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useFragment } from "@apollo/client/react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useHlsVideo } from "@/lib/useHlsVideo";
import { timeAgo } from "@/lib/time";
import { profileHref } from "@/lib/profile-url";
import { type StoryItem, type StoryUser, type TrayRing } from "../hooks/useStoriesFeed";
import { useOverlayBehaviour } from "../hooks/useOverlayBehaviour";
import { storyUserName } from "../lib/storyUser";
import { IMAGE_STORY_MS, MAX_STORY_VIDEO_SECONDS } from "../constants";
import { StoryAvatar } from "./StoryAvatar";
import { StoryViewersSheet } from "./StoryViewersSheet";
import { StoryViewCountFragmentDoc } from "@/types/__generated__/graphql";
import { useAuthGuard } from "@/features/feed/hooks/useAuthGuard";

interface Props {
  lang: string;
  /** The rings to play through, in order. A snapshot — see StoriesBar. */
  rings: TrayRing[];
  initialRingIndex: number;
  viewerUserId: string | null;
  onClose: () => void;
  onSeen: (story: StoryItem) => void;
  onDelete: (storyId: string) => Promise<void>;
}

type Sheet = null | "viewers" | "menu" | "confirm-delete";

/** Hold this long and it's a pause, not a tap. */
const HOLD_MS = 200;
const SWIPE_CLOSE_PX = 90;
const SWIPE_RING_PX = 60;
/**
 * Only for a video that is dead, not slow: a phone on a weak network can take
 * a while to start, and a tap always skips anyway.
 */
const VIDEO_STALL_MS = 30_000;

const hlsUrl = (playbackId: string) => `https://stream.mux.com/${playbackId}.m3u8`;

// ── Video ────────────────────────────────────────────────────────────────────

/**
 * One <video> for the whole viewer, fed each video story in turn. Reusing the
 * element matters on iPhone: once a tap has allowed it to play with sound, it
 * keeps that permission, whereas a fresh element per story would start muted
 * every time.
 */
function StoryVideo({
  playbackId,
  poster,
  paused,
  muted,
  onMutedChange,
  onEnded,
  elementRef,
}: {
  playbackId: string | null;
  poster: string | null;
  paused: boolean;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  onEnded: () => void;
  elementRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const { videoRef, buffering, playing } = useHlsVideo(
    playbackId ? hlsUrl(playbackId) : null,
    !!playbackId,
    paused,
    onMutedChange,
  );

  useEffect(() => {
    elementRef.current = videoRef.current;
  }, [elementRef, videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted, videoRef]);

  return (
    <>
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-contain ${playbackId ? "" : "hidden"}`}
        poster={poster ?? undefined}
        playsInline
        muted={muted}
        preload="auto"
        onEnded={onEnded}
      />
      {playbackId && !paused && (buffering || !playing) && <Spinner />}
    </>
  );
}

function Spinner() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <InterlockingBalls size={36} />
    </div>
  );
}

// ── Viewer ───────────────────────────────────────────────────────────────────

export function StoryViewer({
  lang,
  rings: initialRings,
  initialRingIndex,
  viewerUserId,
  onClose,
  onSeen,
  onDelete,
}: Props) {
  const router = useRouter();
  const { requireAuth } = useAuthGuard(lang);
  const { requestClose, releaseHistory } = useOverlayBehaviour(onClose, "storyViewer");

  // Local copy so a deleted story can drop out without closing everything.
  const [rings, setRings] = useState(initialRings);
  // Watched during this viewing — the snapshot's `seen` flags don't update, and
  // coming back to a ring should resume after what was just watched.
  const watched = useRef(new Set<string>());
  const openingIndex = useCallback((ring: TrayRing) => {
    const i = ring.stories.findIndex((s) => !s.seen && !watched.current.has(s.id));
    return i === -1 ? 0 : i;
  }, []);

  const [pos, setPos] = useState(() => ({
    ring: initialRingIndex,
    story: Math.max(0, initialRings[initialRingIndex]?.stories.findIndex((s) => !s.seen) ?? 0),
    /** Bumped to replay the current story from the start. */
    replay: 0,
  }));

  const [held, setHeld] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [hidden, setHidden] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadedImage, setLoadedImage] = useState<string | null>(null);

  const ring = rings[pos.ring] as TrayRing | undefined;
  const story = ring?.stories[pos.story];
  const isVideo = story?.media.mediaType === "VIDEO" && !!story.media.muxPlaybackId;
  const isOwn = !!ring && !!viewerUserId && ring.user.id === viewerUserId;
  const paused = held || manualPause || sheet !== null || hidden || deleting;

  // Live from the cache, not the snapshot the viewer opened with: views that
  // arrive over the socket move "Seen by" while you're watching.
  const { data: liveViews } = useFragment({
    fragment: StoryViewCountFragmentDoc,
    from: story && isOwn ? `Story:${story.id}` : null,
  });
  const viewCount = liveViews?.viewCount ?? story?.viewCount ?? 0;
  const storyKey = story ? `${story.id}:${pos.replay}` : "";

  // ── Navigation ──────────────────────────────────────────────────────────
  // Past the last story of the last ring, the viewer closes.
  const nextRing = useCallback(() => {
    if (pos.ring < rings.length - 1) {
      setPos({ ring: pos.ring + 1, story: openingIndex(rings[pos.ring + 1]), replay: pos.replay });
    } else {
      requestClose();
    }
  }, [pos, rings, openingIndex, requestClose]);

  const next = useCallback(() => {
    const current = rings[pos.ring];
    if (current && pos.story < current.stories.length - 1) {
      setPos({ ...pos, story: pos.story + 1 });
    } else {
      nextRing();
    }
  }, [pos, rings, nextRing]);

  // Before the first story, back replays it from the start.
  const prev = useCallback(() => {
    if (pos.story > 0) {
      setPos({ ...pos, story: pos.story - 1 });
    } else if (pos.ring > 0) {
      const before = rings[pos.ring - 1];
      setPos({ ring: pos.ring - 1, story: before.stories.length - 1, replay: pos.replay });
    } else {
      setPos({ ...pos, replay: pos.replay + 1 });
    }
  }, [pos, rings]);

  const prevRing = useCallback(() => {
    if (pos.ring > 0) {
      setPos({ ring: pos.ring - 1, story: openingIndex(rings[pos.ring - 1]), replay: pos.replay });
    } else {
      setPos({ ...pos, replay: pos.replay + 1 });
    }
  }, [pos, rings, openingIndex]);

  // The timer and the video's `ended` can both fire for one showing of a
  // story; only the first moves on. Cleared each time a story starts (see the
  // progress effect), so coming back to a story can move on again.
  const advancedFor = useRef<string | null>(null);
  const advance = useCallback(() => {
    if (advancedFor.current === storyKey) return;
    advancedFor.current = storyKey;
    next();
  }, [next, storyKey]);
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  // ── Seen ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!story) return;
    watched.current.add(story.id);
    onSeen(story);
    // Once per story, not per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // ── Progress ────────────────────────────────────────────────────────────
  // Drives the active bar straight from a frame loop — a React state update 60
  // times a second would re-render the whole viewer. Photos count elapsed time
  // (only while shown and not paused); videos follow the video's own clock,
  // capped at the 60s story limit, so buffering stalls the bar with it.
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const pausedRef = useRef(paused);
  const imageReadyRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    imageReadyRef.current = !!story && loadedImage === story.id;
  }, [loadedImage, story]);

  useEffect(() => {
    if (!story) return;
    const cap = Math.min(story.media.duration ?? Infinity, MAX_STORY_VIDEO_SECONDS);
    if (isVideo && videoElRef.current && pos.replay > 0) videoElRef.current.currentTime = 0;

    advancedFor.current = null;

    // Every bar, not just the active one: the loop writes fills straight to
    // the DOM, and after going back a later bar would keep its partial fill.
    barsRef.current.forEach((bar, i) => {
      if (bar) bar.style.transform = `scaleX(${i < pos.story ? 1 : 0})`;
    });
    const activeBar = barsRef.current[pos.story];
    const setFill = (fraction: number) => {
      if (activeBar) activeBar.style.transform = `scaleX(${fraction})`;
    };

    let raf = 0;
    let elapsed = 0;
    let last = performance.now();
    // A video that never loads (dead network, broken asset) mustn't trap the
    // viewer: no progress for this long while playing, and it moves on.
    let stalledFor = 0;
    let lastTime = -1;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      let fraction = 0;
      if (isVideo) {
        const v = videoElRef.current;
        if (v && Number.isFinite(v.duration) && v.duration > 0) {
          fraction = v.currentTime / Math.min(v.duration, cap);
        }
        const time = v?.currentTime ?? 0;
        stalledFor = time !== lastTime || pausedRef.current ? 0 : stalledFor + dt;
        lastTime = time;
        if (stalledFor > VIDEO_STALL_MS) fraction = 1;
      } else {
        if (!pausedRef.current && imageReadyRef.current) elapsed += dt;
        fraction = elapsed / IMAGE_STORY_MS;
      }
      setFill(Math.min(fraction, 1));
      if (fraction >= 1) {
        // A longer video that couldn't be cut server-side stops here too.
        videoElRef.current?.pause();
        advanceRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Restart per story (and per replay), nothing else.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyKey, isVideo]);

  // ── Preload the next photo ──────────────────────────────────────────────
  useEffect(() => {
    if (!ring) return;
    const upcoming = ring.stories[pos.story + 1] ?? rings[pos.ring + 1]?.stories[0];
    const src = upcoming?.media.mediaType === "IMAGE" ? upcoming.media.imageUrl : null;
    if (src) new window.Image().src = src;
  }, [ring, rings, pos.ring, pos.story]);

  // ── Tab hidden → pause ──────────────────────────────────────────────────
  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ── Keyboard ────────────────────────────────────────────────────────────
  const sheetRef = useRef(sheet);
  useEffect(() => {
    sheetRef.current = sheet;
  }, [sheet]);
  const keysRef = useRef({ next, prev, requestClose });
  useEffect(() => {
    keysRef.current = { next, prev, requestClose };
  }, [next, prev, requestClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (sheetRef.current) setSheet(null);
        else keysRef.current.requestClose();
        return;
      }
      if (sheetRef.current) return;
      if (e.key === "ArrowRight") keysRef.current.next();
      else if (e.key === "ArrowLeft") keysRef.current.prev();
      else if (e.key === " ") {
        e.preventDefault();
        setManualPause((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Gestures ────────────────────────────────────────────────────────────
  // Tap left third → back, elsewhere → forward. Hold → pause (chrome hides, as
  // on Instagram). Swipe down → close; swipe sideways → next/previous person.
  const stageRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    held: boolean;
    timer: number;
  } | null>(null);

  const setDrag = (dy: number, animate: boolean) => {
    const el = stageRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 200ms ease-out" : "none";
    el.style.transform = dy > 0 ? `translateY(${dy}px) scale(${1 - dy / 2000})` : "";
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || sheet) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const timer = window.setTimeout(() => {
      if (!gesture.current) return;
      gesture.current.held = true;
      setHeld(true);
    }, HOLD_MS);
    gesture.current = { x: e.clientX, y: e.clientY, held: false, timer };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dy = e.clientY - g.y;
    const dx = e.clientX - g.x;
    if (dy > 10 && dy > Math.abs(dx)) setDrag(dy, false);
  };

  const endGesture = (e: React.PointerEvent, cancelled: boolean) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    clearTimeout(g.timer);
    if (g.held) setHeld(false);
    if (cancelled) {
      setDrag(0, true);
      return;
    }

    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (dy > SWIPE_CLOSE_PX && dy > Math.abs(dx)) {
      requestClose();
      return;
    }
    setDrag(0, true);
    if (Math.abs(dx) > SWIPE_RING_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) nextRing();
      else prevRing();
      return;
    }
    if (g.held || Math.abs(dx) > 10 || Math.abs(dy) > 10) return;

    const rect = stageRef.current?.getBoundingClientRect();
    if (rect && e.clientX - rect.left < rect.width * 0.3) prev();
    else next();
  };

  // ── Actions ─────────────────────────────────────────────────────────────
  const openProfile = (user: StoryUser) => {
    const href = profileHref(lang, user);
    if (releaseHistory()) router.replace(href);
    else router.push(href);
    onClose();
  };

  const enquireAboutStory = () => {
    if (!story || isOwn) return;
    const hadOverlayEntry = releaseHistory();
    if (!requireAuth({ storyId: story.id })) {
      onClose();
      return;
    }
    const href = `/${lang}/notifications/${story.id}?source=story`;
    if (hadOverlayEntry) router.replace(href);
    else router.push(href);
    onClose();
  };

  const deleteCurrent = async () => {
    if (!story || !ring) return;
    setDeleting(true);
    try {
      await onDelete(story.id);
      toast.success("Story deleted");
      const remaining = ring.stories.filter((s) => s.id !== story.id);
      if (remaining.length === 0) {
        requestClose();
        return;
      }
      setRings((all) =>
        all.map((r, i) => (i === pos.ring ? { ...r, stories: remaining } : r)),
      );
      setPos((p) => ({ ...p, story: Math.min(p.story, remaining.length - 1) }));
      setSheet(null);
    } catch {
      toast.error("Couldn't delete the story. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (!ring || !story) return null;

  const name = storyUserName(ring.user);
  const imageSrc = story.media.imageUrl ?? story.media.thumbnailUrl;
  const backdropSrc = isVideo ? story.media.muxThumbnailUrl : (story.media.thumbnailUrl ?? imageSrc);
  const chromeClass = `transition-opacity duration-200 ${held ? "opacity-0" : "opacity-100"}`;
  const hasPrev = pos.story > 0 || pos.ring > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black md:bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label={`${name}'s story`}
      onClick={(e) => {
        // Desktop: a click on the dim area around the card closes.
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      {/* Desktop arrows, outside the card */}
      <button
        type="button"
        onClick={prev}
        disabled={!hasPrev}
        aria-label="Previous story"
        className="mr-4 hidden h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-opacity hover:bg-white disabled:opacity-0 md:flex"
      >
        <ChevronLeft size={22} />
      </button>

      <div
        ref={stageRef}
        className="relative h-full w-full overflow-hidden bg-black md:aspect-9/16 md:h-[min(92svh,880px)] md:w-auto md:rounded-2xl"
      >
        {/* ── Media ────────────────────────────────────────────────────── */}
        {backdropSrc && (
          <Image
            key={`bg-${story.id}`}
            src={backdropSrc}
            alt=""
            fill
            unoptimized
            aria-hidden
            className="scale-110 object-cover opacity-40 blur-2xl"
          />
        )}

        {!isVideo && imageSrc && (
          <Image
            key={story.id}
            src={imageSrc}
            alt={story.caption ?? `${name}'s story`}
            fill
            unoptimized
            priority
            className="object-contain"
            onLoad={() => setLoadedImage(story.id)}
            // Still move on — a broken photo shouldn't trap the viewer.
            onError={() => setLoadedImage(story.id)}
          />
        )}
        {!isVideo && loadedImage !== story.id && <Spinner />}

        <StoryVideo
          playbackId={isVideo ? story.media.muxPlaybackId : null}
          poster={isVideo ? story.media.muxThumbnailUrl : null}
          paused={paused}
          muted={muted}
          onMutedChange={setMuted}
          onEnded={advance}
          elementRef={videoElRef}
        />

        {/* Legibility for the chrome over bright media */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/55 to-transparent" />
        {(story.caption || isOwn) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/60 to-transparent" />
        )}

        {/* ── Gestures ─────────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 z-10 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endGesture(e, false)}
          onPointerCancel={(e) => endGesture(e, true)}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* ── Top: progress + header ───────────────────────────────────── */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 z-20 px-2.5 pt-[max(env(safe-area-inset-top),10px)] ${chromeClass}`}
        >
          <div className="flex gap-1">
            {ring.stories.map((s, i) => (
              <div key={s.id} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/35">
                <div
                  ref={(el) => {
                    barsRef.current[i] = el;
                  }}
                  className="h-full w-full origin-left rounded-full bg-white"
                  style={{ transform: `scaleX(${i < pos.story ? 1 : 0})` }}
                />
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => openProfile(ring.user)}
              className="pointer-events-auto flex min-w-0 items-center gap-2.5 text-left"
            >
              <StoryAvatar
                id={ring.user.id}
                src={ring.user.profile?.avatar}
                name={name}
                size={34}
                state="none"
              />
              <span className="truncate text-sm font-semibold text-white drop-shadow">{name}</span>
              <span className="shrink-0 text-sm text-white/70 drop-shadow">
                {timeAgo(story.createdAt)}
              </span>
            </button>

            <div className="pointer-events-auto ml-auto flex items-center">
              {isVideo && (
                <IconButton label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </IconButton>
              )}
              <IconButton
                label={manualPause ? "Play" : "Pause"}
                onClick={() => setManualPause((v) => !v)}
                className="hidden md:flex"
              >
                {manualPause ? <Play size={20} /> : <Pause size={20} />}
              </IconButton>
              {isOwn && (
                <IconButton label="Story options" onClick={() => setSheet("menu")}>
                  <MoreHorizontal size={22} />
                </IconButton>
              )}
              <IconButton label="Close" onClick={requestClose}>
                <X size={24} />
              </IconButton>
            </div>
          </div>
        </div>

        {/* ── Bottom: caption, own-story views ─────────────────────────── */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(env(safe-area-inset-bottom),16px)] ${chromeClass}`}
        >
          {!isOwn && (
            <div className="pointer-events-auto mb-3 flex justify-center">
              <button
                type="button"
                onClick={enquireAboutStory}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-black shadow-lg transition-transform active:scale-95"
              >
                <MessageCircle size={14} strokeWidth={2} />
                Enquire
              </button>
            </div>
          )}
          {story.caption && (
            <p className="mb-3 line-clamp-4 whitespace-pre-line text-center text-[15px] leading-snug text-white drop-shadow-md">
              {story.caption}
            </p>
          )}
          {isOwn && (
            <button
              type="button"
              onClick={() => setSheet("viewers")}
              className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-sm font-semibold text-white "
            >
              <Eye size={16} />
              {viewCount > 0 ? `Seen by ${viewCount}` : "No views yet"}
            </button>
          )}
        </div>

        {/* ── Sheets ───────────────────────────────────────────────────── */}
        {sheet === "viewers" && (
          <StoryViewersSheet
            storyId={story.id}
            onClose={() => setSheet(null)}
            onOpenProfile={openProfile}
          />
        )}

        {(sheet === "menu" || sheet === "confirm-delete") && (
          <div
            className="absolute inset-0 z-30 flex items-end bg-black/50"
            onClick={() => !deleting && setSheet(null)}
          >
            <div
              className="w-full rounded-t-2xl bg-elevated px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15 dark:bg-white/20" />
              {sheet === "menu" ? (
                <button
                  type="button"
                  onClick={() => setSheet("confirm-delete")}
                  className="w-full rounded-xl py-3.5 text-center text-[15px] font-semibold text-red-600 active:bg-surface"
                >
                  Delete story
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-base font-bold text-default">Delete this story?</p>
                  <p className="mt-1 text-sm text-muted">It will be removed for everyone.</p>
                  <button
                    type="button"
                    onClick={deleteCurrent}
                    disabled={deleting}
                    className="mt-4 w-full rounded-xl bg-red-600 py-3 text-[15px] font-semibold text-white disabled:opacity-60"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSheet(null)}
                disabled={deleting}
                className="mt-1 w-full rounded-xl py-3.5 text-center text-[15px] font-medium text-default active:bg-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={next}
        aria-label="Next story"
        className="ml-4 hidden h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white md:flex"
      >
        <ChevronRight size={22} />
      </button>
    </div>,
    document.body,
  );
}

function IconButton({
  label,
  onClick,
  children,
  className = "flex",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`${className} h-10 w-10 items-center justify-center rounded-full text-white drop-shadow active:bg-white/10`}
    >
      {children}
    </button>
  );
}
