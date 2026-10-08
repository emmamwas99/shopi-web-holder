"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { isAutoplayRefusal, useHlsVideo } from "@/lib/useHlsVideo";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { BufferSpinner } from "../BufferSpinner";
import { VideoProgressBar } from "../VideoProgressBar";
import { useVideoAnalytics } from "../../hooks/useVideoAnalytics";
import {
  saveFeedVideoTime,
  restoreFeedVideoTime,
  clearFeedVideoTime,
} from "../../lib/videoResume";
import { takeImmersiveHandoff } from "../../lib/immersiveHandoff";
import { hlsUrlOf, posterOf } from "../../lib/videoSource";

/**
 * How much of a slide is materialised, by distance from the active one.
 *
 *  - `active`: hls.js attached and playing.
 *  - `near`:   the poster and chrome. The slide immediately below the active
 *              one also gets its player attached but held paused — see
 *              `prefetch` below. Other neighbours carry no video source.
 *  - `far`:    nothing but a sized box, so the compositor can skip it.
 */
export type SlideState = "active" | "near" | "far";

interface Props {
  post: ContentCardFieldsFragment;
  state: SlideState;
  /**
   * Warm this slide's stream even though it is not active yet.
   *
   * Set by the viewer for the next slide only, and only when the connection
   * can afford it. Attaching the player early is what removes the manifest
   * round trip and the first-fragment wait from a swipe: by the time the slide
   * becomes active it already has a few seconds buffered, so playback starts
   * on the next frame instead of after a spinner.
   *
   * Crucially this passes the SAME `attached` flag into useHlsVideo that the
   * active slide uses. The hook tears its player down when that flag goes
   * false, so flipping a prefetched slide to active must not change it —
   * otherwise becoming active would destroy the very buffer we just filled.
   */
  prefetch?: boolean;
  /**
   * Whether sound is off, owned by the viewer rather than read from the store
   * here.
   *
   * Sound is one decision for the whole viewer — unmute on any slide and every
   * slide is unmuted, which is what people expect from this kind of feed. It
   * also has to be known before a slide's first paint: mounting a <video>
   * muted and unmuting it in an effect leaves the unmute at the mercy of the
   * autoplay policy, and the slide you opened kept starting silent while the
   * ones you swiped to played with sound.
   */
  muted: boolean;
  /**
   * Set sound for the whole viewer to an explicit value.
   *
   * Explicit rather than a toggle on purpose. When the browser has force-muted
   * a slide the element and the intent disagree, and a blind flip moved them
   * further apart — the icon read "unmute", the tap unmuted the element, and
   * the viewer's intent flipped to muted at the same time.
   */
  onSetMuted: (next: boolean) => void;
  /** Rendered over the video on mobile, beside it on desktop. */
  overlay?: (sound: { muted: boolean; onToggleMuted: () => void }) => React.ReactNode;
  rail?: (sound: { muted: boolean; onToggleMuted: () => void }) => React.ReactNode;
  onRequestNext?: () => void;
}

export function ImmersiveSlide({
  post,
  state,
  prefetch = false,
  muted,
  onSetMuted,
  overlay,
  rail,
  onRequestNext,
}: Props) {
  const active = state === "active";
  const hlsUrl = hlsUrlOf(post);
  const poster = posterOf(post);

  // "Has a player" rather than "is playing". Stays true across the transition
  // from prefetched to active, which is what preserves the warmed buffer.
  const attached = Boolean(hlsUrl) && (active || (state === "near" && prefetch));

  // The element's real mute state, which can diverge from the viewer's
  // intention when the browser refuses an unmuted autoplay. Kept local so a
  // forced mute never rewrites what the user actually asked for.
  const [actualMuted, setActualMuted] = useState(muted);
  const [ended, setEnded] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [pageFocused, setPageFocused] = useState(() =>
    typeof document === "undefined" ||
    (document.visibilityState === "visible" && document.hasFocus()),
  );

  useEffect(() => {
    let windowFocused = document.hasFocus();
    const syncFocus = () => {
      setPageFocused(
        windowFocused && document.visibilityState === "visible",
      );
    };
    const handleBlur = () => {
      windowFocused = false;
      syncFocus();
    };
    const handleFocus = () => {
      windowFocused = true;
      syncFocus();
    };

    document.addEventListener("visibilitychange", syncFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    syncFocus();

    return () => {
      document.removeEventListener("visibilitychange", syncFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const onMutedChange = useCallback(
    (forced: boolean) => setActualMuted(forced),
    [],
  );

  const { videoRef, buffering, playing } = useHlsVideo(
    hlsUrl,
    attached,
    // A prefetched slide is attached but not active, so it lands here as
    // paused: the player loads the manifest and fills its buffer, and never
    // calls play(). Becoming active flips only this flag.
    ended || userPaused || !active || !pageFocused,
    onMutedChange,
  );

  const handleEnded = useCallback(() => setEnded(true), []);
  const { trackReplay } = useVideoAnalytics({
    videoRef,
    contentId: post.id,
    active,
    onEnded: handleEnded,
  });

  // ── Resume position, both directions ────────────────────────────────────
  // The shared map means the feed card this slide was opened from restores the
  // viewer's position when the viewer closes, and vice versa.
  const didSeekRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;

    // The baton from the tapped feed card, if this is the slide it opened.
    // One-shot: reading it clears it, so a later revisit uses the shared
    // resume map like any other slide.
    if (!didSeekRef.current) {
      // Only the resume position is claimed here. The sound decision is the
      // viewer's, taken before the first paint — see the `muted` prop.
      const handoff = takeImmersiveHandoff(post.id);

      if (handoff && handoff.time > 0) {
        const seek = () => {
          if (didSeekRef.current) return;
          try {
            video.currentTime = Math.min(
              handoff.time,
              video.duration || handoff.time,
            );
          } catch {
            // Native HLS rejects seeks before metadata; the listener retries.
          }
          didSeekRef.current = true;
        };
        // readyState >= 1 means metadata is in. Seeking before that is
        // rejected outright by native HLS on iOS.
        if (video.readyState >= 1) seek();
        else video.addEventListener("loadedmetadata", seek, { once: true });
      }
    }

    const save = () => saveFeedVideoTime(post.id, video);
    const restore = () => {
      if (didSeekRef.current) return;
      restoreFeedVideoTime(post.id, video);
    };
    video.addEventListener("timeupdate", save);
    video.addEventListener("pause", save);
    video.addEventListener("loadedmetadata", restore);
    video.addEventListener("canplay", restore);
    restore();

    return () => {
      save();
      video.removeEventListener("timeupdate", save);
      video.removeEventListener("pause", save);
      video.removeEventListener("loadedmetadata", restore);
      video.removeEventListener("canplay", restore);
    };
  }, [active, post.id, videoRef]);

  // Leaving the slide clears the transient playback flags so returning to it
  // autoplays rather than resuming a pause. Deferred so we don't setState
  // synchronously inside the effect body and cascade a second render.
  useEffect(() => {
    if (active) return;
    didSeekRef.current = false;
    const t = setTimeout(() => {
      setEnded(false);
      setUserPaused(false);
    }, 0);
    return () => clearTimeout(t);
  }, [active]);

  // ── Mute ────────────────────────────────────────────────────────────────
  //
  // Every attached element carries the viewer's intent, including a prefetched
  // one that is not playing yet. It used to be pinned muted while inactive, on
  // the theory that a silent neighbour is safer — but a paused element cannot
  // make a sound, so that bought nothing and broke the handover:
  //
  //   1. the prefetched element sat with muted = true
  //   2. the swipe made it active, and useHlsVideo's play effect runs BEFORE
  //      this one (the hook is called first, so its effects register first)
  //   3. that effect reads the element to decide what the caller wanted, saw
  //      muted = true, and played it muted without ever trying to unmute
  //   4. this effect then set muted = false on an element that was already
  //      playing, which browsers ignore or undo without fresh activation
  //
  // So every paginated slide came up silent no matter what the user had
  // chosen. Keeping intent on the element from the moment it mounts means the
  // play attempt starts from the right state instead of correcting afterwards.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = muted;
    video.defaultMuted = muted;
    setActualMuted(video.muted);

    if (active && !muted && !ended && !userPaused) {
      // An unmuted play can still be refused — on the tap-through path the
      // activation is sticky rather than fresh, and some browsers are stricter
      // about that. Falling back to muted playback keeps the video moving and
      // surfaces "Tap for sound", which the user can recover from in one tap.
      // Leaving it paused, which is what the bare catch used to do, they
      // cannot.
      video.play().catch((error: unknown) => {
        // Only a policy refusal justifies giving up the sound. A seek — the
        // resume handoff, or the user scrubbing — also rejects this promise,
        // and muting for that reason is what silenced the slide opened from
        // the feed.
        if (!isAutoplayRefusal(error)) {
          video.play().catch(() => {});
          return;
        }
        video.muted = true;
        setActualMuted(true);
        video.play().catch(() => {});
      });
    }
  }, [muted, active, ended, userPaused, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => setActualMuted(video.muted);
    sync();
    video.addEventListener("volumechange", sync);
    return () => video.removeEventListener("volumechange", sync);
  }, [videoRef]);

  // ── Recover sound on the first gesture ──────────────────────────────────
  // Opening this screen from a shared link has no user activation behind it,
  // and no browser will autoplay with sound in that state — that part is not
  // ours to override. What we can do is stop making the user hunt for the
  // speaker icon: while sound is wanted but the browser has forced a mute, the
  // next touch, click, key or scroll anywhere turns it on. One-shot, and it
  // unbinds the moment the mismatch resolves, so it never fights a user who
  // deliberately muted.
  useEffect(() => {
    if (!active) return;
    // Wanted on, actually off — i.e. the browser refused.
    if (muted || !actualMuted) return;
    const video = videoRef.current;
    if (!video) return;

    const recover = () => {
      video.muted = false;
      video.defaultMuted = false;
      setActualMuted(video.muted);
      video.play().catch(() => {});
    };

    const events = ["pointerdown", "touchstart", "keydown", "wheel"] as const;
    for (const type of events) {
      window.addEventListener(type, recover, { once: true, passive: true });
    }
    return () => {
      for (const type of events) {
        window.removeEventListener(type, recover);
      }
    };
  }, [active, muted, actualMuted, videoRef]);

  const toggleMuted = useCallback(() => {
    const video = videoRef.current;
    // Flip what the user can actually hear, which is the element's state and
    // what the icon is showing — not the stored intent, which may have been
    // overridden by a refused autoplay.
    const next = !(video?.muted ?? actualMuted);
    if (video) {
      video.muted = next;
      video.defaultMuted = next;
      // Unmuting needs this click's user activation to actually produce sound.
      if (!next) video.play().catch(() => {});
    }
    setActualMuted(next);
    // The viewer owns the decision, so every other slide follows. Sent as an
    // explicit value so the intent always ends up agreeing with the element.
    onSetMuted(next);
  }, [actualMuted, onSetMuted, videoRef]);

  const togglePlayback = useCallback(() => {
    if (ended) return;
    const video = videoRef.current;
    // Decide from the element's real state, not a blind toggle: when playback
    // never started (autoplay blocked, still buffering) a blind toggle would
    // need two taps to produce anything.
    const isPaused = video ? video.paused : userPaused;
    if (isPaused) {
      setUserPaused(false);
      video?.play().catch(() => {});
    } else {
      setUserPaused(true);
      video?.pause();
    }
  }, [ended, userPaused, videoRef]);

  const handleReplay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    clearFeedVideoTime(post.id);
    setEnded(false);
    video.currentTime = 0;
    video.play().catch(() => {});
    trackReplay();
  }, [post.id, trackReplay, videoRef]);

  // Nothing but a sized box until the slide is within reach of the viewport.
  if (state === "far") {
    return <div className="h-full w-full bg-black" aria-hidden />;
  }

  // The user asked for sound but this element is muted anyway — the browser
  // refused an unmuted autoplay. One tap with fresh user activation always
  // works, so say so rather than leaving them wondering.
  const soundBlocked = active && actualMuted && !muted;

  return (
    // The second column is tied to the rail actually existing, not to the
    // breakpoint. The rail is decided after hydration, so keying the grid off
    // `md:` alone would reserve 400px of empty space on the first desktop paint.
    <div
      className={`grid h-full w-full ${
        rail ? "grid-cols-1 md:grid-cols-[minmax(0,1fr)_var(--immersive-rail,400px)]" : "grid-cols-1"
      }`}
    >
      <div className="relative flex h-full min-h-0 w-full items-center justify-center bg-black">
        {poster && (
          // A plain img, not next/image: the viewer keeps many slides in the
          // list and next/image retains noticeably more per decoded bitmap.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            loading={active ? "eager" : "lazy"}
            decoding="async"
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
              active && playing && !buffering ? "opacity-0" : "opacity-100"
            }`}
          />
        )}

        {attached && (
          <video
            ref={videoRef}
            // Driven by the viewer's INTENT, not by `actualMuted`.
            //
            // React writes this during commit, which is before any effect
            // runs — including useHlsVideo's play attempt. That ordering is
            // the whole point: the element is already in the right state when
            // playback starts, so an unmuted slide genuinely starts unmuted
            // instead of starting muted and being corrected too late.
            //
            // Binding it to `actualMuted` instead would feed the browser's own
            // forced mute straight back into the element and latch it there.
            // The attribute must also be present from the first paint or iOS
            // can refuse autoplay outright.
            muted={muted}
            playsInline
            // Tells the native HLS path (iOS) to buffer rather than stop at
            // metadata, which is the whole point on a prefetched slide.
            preload="auto"
            className={`relative max-h-full max-w-full object-contain ${
              // Kept in the layout but invisible until the slide is active, so
              // the poster underneath still shows. `display:none` would be
              // wrong here — several browsers stop buffering a hidden element,
              // which would defeat the prefetch.
              active ? "" : "pointer-events-none opacity-0"
            }`}
          />
        )}

        {/* Tap target. Sits under the controls, above the media. */}
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={playing ? "Pause video" : "Play video"}
          className="absolute inset-0 z-10"
        >
          <span className="sr-only">
            {playing ? "Pause video" : "Play video"}
          </span>
        </button>

        {active && buffering && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <BufferSpinner />
          </div>
        )}

        {active && !buffering && !playing && !ended && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
              <Play className="ml-1 h-7 w-7" fill="currentColor" />
            </span>
          </div>
        )}

        {active && ended && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleReplay();
            }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
            aria-label="Replay video"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
              <RotateCcw className="h-7 w-7" />
            </span>
          </button>
        )}

        {soundBlocked && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleMuted();
            }}
            className="absolute left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm"
            style={{ top: "calc(var(--immersive-top, 16px) + 3.5rem)" }}
          >
            Tap for sound
          </button>
        )}

        {/* Mobile overlay sits over the video; on desktop the rail takes it.
            The scrim behind it is what lets the chrome be small: white text
            over an unknown video frame needs either heavy per-glyph shadows or
            a gradient behind it, and the gradient is the cheaper, cleaner of
            the two — shadows on every line made the block look muddy at these
            sizes. Sized to the text, not the frame, so the video is barely
            dimmed. */}
        {overlay && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 bg-linear-to-t from-black/85 via-black/45 to-transparent md:hidden"
            />
            <div className="pointer-events-none absolute inset-0 z-20 md:hidden">
              {overlay?.({ muted: actualMuted, onToggleMuted: toggleMuted })}
            </div>
          </>
        )}

        {/* Bottom inset comes from the viewer so the scrubber clears the
            iPhone home indicator instead of sitting under it. */}
        {active && hlsUrl && (
          <div className="absolute inset-x-4 bottom-[var(--immersive-bottom,1rem)] z-30 md:bottom-5">
            <VideoProgressBar videoRef={videoRef} active={active} showTime />
          </div>
        )}
      </div>

      {/* A normal themed panel, not part of the video. It hosts body text and
          the comment composer, so it uses the app's own surface and text
          tokens and follows the user's light/dark choice — only the video
          column is unconditionally black. */}
      {rail && (
        <aside className="hidden h-full min-h-0 overflow-hidden border-l border-default bg-background text-default md:block">
          {rail?.({ muted: actualMuted, onToggleMuted: toggleMuted })}
        </aside>
      )}

      {/* Screen-reader-only affordance mirroring the swipe gesture. */}
      {onRequestNext && (
        <button type="button" onClick={onRequestNext} className="sr-only">
          Next video
        </button>
      )}
    </div>
  );
}
