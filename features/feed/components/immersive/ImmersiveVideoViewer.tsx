"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  MessageCircle,
} from "lucide-react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { DISCOVERY_CATEGORIES } from "@/features/discover/categories";
import { resumeVideoElection, suspendVideoElection } from "@/lib/activeVideo";
import { pruneVideoFeedCache } from "@/lib/apollo/feedCache";
import { contentSlugSegment } from "@/lib/content-url";
import {
  clearViewerSlide,
  rememberViewerSlide,
  viewerSlideFor,
} from "../../lib/viewerPosition";
import { useAppBack } from "@/lib/useAppBack";
import { VIDEO_FEED_PREFETCH_AHEAD } from "@/features/feed/constants";
import { useVideoFeed } from "../../hooks/useVideoFeed";
import { useSnapPager } from "../../hooks/useSnapPager";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useInteractions } from "../../hooks/useInteractions";
import { useAuthGuard } from "../../hooks/useAuthGuard";
import { useFollow } from "../../hooks/useFollow";
import { ImmersiveSlide, type SlideState } from "./ImmersiveSlide";
import { ImmersiveActions } from "./ImmersiveActions";
import { ImmersiveMeta } from "./ImmersiveMeta";
import { BufferSpinner } from "../BufferSpinner";
import { posterOf } from "../../lib/videoSource";
import { useFeedPreferencesStore } from "@/stores/feedPreferences";
import {
  onVideoPrefetchChange,
  videoPrefetchAllowed,
} from "../../lib/videoPrefetch";

const CommentsDrawer = dynamic(() =>
  import("../CommentsDrawer").then((mod) => mod.CommentsDrawer),
);

/** Slides within this distance of the active one keep a poster and chrome. */
const NEAR_WINDOW = 1;
/** How long after the index settles before the URL is rewritten. */
const URL_DEBOUNCE_MS = 150;

function safeContentSlugSegment(
  content: { id?: string; slug?: string | null; title?: string | null } | null | undefined,
) {
  if (!content?.id) return null;
  return contentSlugSegment({
    id: content.id,
    slug: content.slug,
    title: content.title,
  });
}

interface Props {
  /**
   * The tapped video's URL segment — a slug, though the API resolves an id or
   * a `title-id` form just as well. Initial value only, see the URL note below.
   */
  seed: string;
  lang: string;
}

export function ImmersiveVideoViewer({ seed: seedProp, lang }: Props) {
  const client = useApolloClient();
  const pathname = usePathname();
  const router = useRouter();

  // Frozen on purpose. Swiping rewrites the address bar with replaceState,
  // which Next never sees, so the route segment keeps rendering the original
  // slug. Treating the prop as live would re-key the query on every swipe.
  //
  // The address bar wins over the route param when the two disagree. Swiping
  // rewrites the URL with replaceState, and Next deliberately keeps its own
  // route tree pointing at the slug the route was opened with — it restores
  // that tree on back whatever the address bar says, and passing `null` as the
  // history state does not change that. So returning from a conversation handed
  // the viewer the slug it was FIRST opened with while the URL showed the one
  // the user had swiped to: the address bar said one video and the screen
  // played another.
  //
  // Read once, in the initialiser, rather than tracked: the swipe effect below
  // rewrites the URL constantly, and following it live would re-key the query
  // on every slide. On the server there is no address bar, and the first paint
  // is the same loading panel either way, so there is nothing to mismatch.
  // Kept as the route's own slug, NOT the slide the user was last on.
  //
  // Re-seeding on the remembered slide looked right and was wrong: `videoFeed`
  // is cached per seed, so a different seed is a cache miss, and the viewer
  // renders a full-screen black panel while it refetches. The list for this
  // seed is already in cache, so keeping it means the slides paint instantly —
  // and the position is restored by jumping to the right index within that
  // list instead. See the restore effect below.
  const [seed] = useState(seedProp);
  // The origin tab travels on the video URL so chat can push another route and
  // the browser still knows where Back should return after the chat is closed.
  const [returnToWatch] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("tab") === "watch",
  );
  const [returnToWatchCategoryId] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") === "watch" ? params.get("categoryId") : null;
  });
  const returnToWatchQuery = returnToWatch
    ? `?tab=watch${returnToWatchCategoryId ? `&categoryId=${encodeURIComponent(returnToWatchCategoryId)}` : ""}`
    : "";
  const { data: watchCategoriesData } = useQuery(DISCOVERY_CATEGORIES, {
    variables: { type: "VIDEO" },
    skip: !returnToWatchCategoryId,
    fetchPolicy: "cache-first",
  });
  const selectedWatchCategoryName = returnToWatchCategoryId
    ? watchCategoriesData?.discoveryFacets?.categories?.find(
        (category) => category.id === returnToWatchCategoryId,
      )?.name ?? "this category"
    : null;

  const { items, loading, loadingMore, hasMore, loadMore } = useVideoFeed(
    seed,
    returnToWatchCategoryId,
  );
  const [commentsOpen, setCommentsOpen] = useState(false);
  // ssrDefault:false keeps the first paint mobile-first, matching how the
  // feed page decides its own layout.
  const desktop = useIsDesktop({ ssrDefault: false }) === true;

  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  // Mirrored into a ref so the settle callback can stay referentially stable —
  // it is handed to useSnapPager, and a new identity per page would re-run the
  // pager's effects mid-scroll.
  const paginationRef = useRef({ hasMore, loadingMore, count: items.length });
  useEffect(() => {
    paginationRef.current = { hasMore, loadingMore, count: items.length };
  }, [hasMore, loadingMore, items.length]);

  // Pagination is index arithmetic, not a sentinel. With one slide per
  // viewport a "within 400px" sentinel only fires once the user is already on
  // the last slide, which is a wall rather than a prefetch.
  const handleSettle = useCallback((index: number) => {
    const { hasMore: more, loadingMore: busy, count } = paginationRef.current;
    if (more && !busy && count - index <= VIDEO_FEED_PREFETCH_AHEAD) {
      loadMoreRef.current();
    }
  }, []);

  const { scrollerRef, scrollerEl, index, goTo, handleScroll } = useSnapPager({
    count: items.length,
    onSettle: handleSettle,
  });

  const activePost = items[index];

  // ── Resume the slide the user left from ──────────────────────────────────
  // Next restores its router tree, so a remount always hands us the slug the
  // route was OPENED with — not the one the user had swiped to. The address
  // bar knows, but reading it here is a race: on a back navigation the mount
  // can happen before the browser commits the restored URL. So the slide is
  // recorded when the user taps away (see openContact) and looked up here.
  //
  // A jump within the already-cached list, not a re-seed: re-seeding would be
  // a cache miss and a black loading panel, which is the other half of this
  // bug report.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || items.length === 0) return;
    restoredRef.current = true;

    const wanted = viewerSlideFor(seedProp);
    const target = wanted
      ? items.findIndex((item) => safeContentSlugSegment(item) === wanted)
      : -1;

    // Always set the landing position, even when it is slide 0. Browsers
    // restore the scrollTop of a scrollable element on a back navigation, but
    // `index` starts at 0 — so leaving it alone puts the user on a slide the
    // pager thinks is far away, which renders as an empty black box. This is
    // the single owner of where the viewer lands, so the two can never
    // disagree.
    //
    // Instant: a restore should be in place before the first frame, not
    // animated in front of the user.
    goTo(target > 0 ? target : 0, "instant");
  }, [items, seedProp, goTo]);

  // ── Sound, for the whole viewer ──────────────────────────────────────────
  // One decision shared by every slide, so unmuting anywhere unmutes
  // everywhere, and set here in the initialiser so it is already correct on the
  // first paint rather than arriving a tick later in an effect.
  //
  // This screen is a request to watch something, however it was reached, so it
  // starts with sound on in every case — a tap from the feed, a shared link, a
  // refresh. That is what people expect from a full-screen video feed, and it
  // is why this does NOT read the stored mute preference: that preference
  // exists for the browse feed, where silent autoplay is the right default,
  // and inheriting it here is what kept making this screen silent.
  //
  // A cold load has no user activation, so the browser may refuse the unmuted
  // start. The slide handles that: it falls back to muted playback, shows
  // "Tap for sound", and turns sound on at the first gesture.
  const setVideoMuted = useFeedPreferencesStore((s) => s.setVideoMuted);
  const [muted, setMuted] = useState(false);

  // Mirror it into the shared preference so the feed behind and the next
  // session agree with what the viewer is doing — the same thing the mute
  // button already did before sound moved up here.
  useEffect(() => {
    setVideoMuted(muted);
  }, [muted, setVideoMuted]);

  const setMutedIntent = useCallback((next: boolean) => setMuted(next), []);

  // ── Take over playback from the feed still mounted behind us ─────────────
  // The card's click handler already suspended once, synchronously, so the
  // outgoing element was paused before the route changed. This second claim
  // covers the cold-load path (a shared link) and is released on unmount.
  useEffect(() => {
    suspendVideoElection();
    return () => resumeVideoElection();
  }, []);

  // Per-seed cache entries would otherwise pile up, one list per tap, for the
  // life of the session. Pruned on OPEN, keeping this viewer's own list: doing
  // it on close meant coming back — from a conversation, most obviously — always
  // found an empty cache and sat on a black loading panel while it refetched.
  useEffect(() => {
    pruneVideoFeedCache(client.cache, seed);
  }, [client, seed]);

  // ── URL follows the swipe, without a navigation ──────────────────────────
  // Writes the canonical slug path, the same one the feed card pushes and the
  // route treats as canonical, so copying the address bar mid-swipe yields a
  // shareable, indexable link rather than an id that would only redirect.
  const activePostSlug = safeContentSlugSegment(activePost);
  const nextPath = activePostSlug
    ? `/${lang}/video/${activePostSlug}${returnToWatchQuery}`
    : null;
  const lastWrittenPath = useRef<string | null>(null);
  useEffect(() => {
    if (!nextPath || nextPath === lastWrittenPath.current) return;

    const timer = setTimeout(() => {
      lastWrittenPath.current = nextPath;
      try {
        // history.state carries Next's route tree. Replacing it with null
        // breaks back, forward and the interception, so pass it through.
        // Debounced because Safari throttles replaceState and throws past it.
        window.history.replaceState(window.history.state, "", nextPath);
      } catch {
        // Throttled by the browser — the address bar lags, nothing else breaks.
      }
    }, URL_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [nextPath]);

  // A shared video link is the common way into this screen, and that arrival
  // has no app history behind it — a plain back() would do nothing at all and
  // trap the viewer open. Fall through to the feed instead.
  const closeViewer = useAppBack(
    `/${lang}/for-you${returnToWatchQuery}`,
  );
  // Closing is a deliberate exit, so the remembered slide goes with it —
  // reopening this video later should start at the top, not mid-list.
  const close = useCallback(() => {
    clearViewerSlide();
    closeViewer();
  }, [closeViewer]);

  // ── Keyboard (desktop) ───────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // The rail holds a comment composer; never steal its keys.
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowDown":
        case "PageDown":
          event.preventDefault();
          goTo(index + 1);
          break;
        case "ArrowUp":
        case "PageUp":
          event.preventDefault();
          goTo(index - 1);
          break;
        case "Escape":
          close();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, index, close]);

  // ── Mouse wheel (desktop only) ───────────────────────────────────────────
  // Desktop video paging is intentionally button/key driven. Wheel gestures
  // vary wildly across mice and trackpads, so swallowing them over the video
  // keeps the viewer from skipping or flickering. The comments rail is allowed
  // to keep its own normal wheel scrolling.
  useEffect(() => {
    // Keyed on the element, not [], because the scroller does not exist on the
    // first commit — the viewer renders a loading tree until the feed lands.
    if (!scrollerEl) return;
    // Touch devices already get correct native snap; never intercept there.
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onWheel = (event: WheelEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-immersive-rail]")
      ) {
        return;
      }
      if (Math.abs(event.deltaY) < 4) return;
      event.preventDefault();
    };

    scrollerEl.addEventListener("wheel", onWheel, { passive: false });
    return () => scrollerEl.removeEventListener("wheel", onWheel);
  }, [scrollerEl]);

  // Warm only the next poster. Anything more and the decoded-bitmap cost grows
  // without making the next slide meaningfully faster.
  useEffect(() => {
    const next = items[index + 1];
    if (!next) return;
    const src = posterOf(next as ContentCardFieldsFragment);
    if (!src) return;
    const img = new window.Image();
    img.src = src;
  }, [items, index]);

  // ── Warm the next stream ─────────────────────────────────────────────────
  // Resolved after mount, and re-resolved when the connection changes, so a
  // viewer left open while the user loses signal stops prefetching. Starts
  // false because the check reads navigator, which does not exist on the
  // server.
  const [prefetchAllowed, setPrefetchAllowed] = useState(false);
  useEffect(() => {
    const sync = () => setPrefetchAllowed(videoPrefetchAllowed());
    sync();
    return onVideoPrefetchChange(sync);
  }, []);

  const slideStates = useMemo(
    () =>
      items.map((_, i): SlideState => {
        if (i === index) return "active";
        return Math.abs(i - index) <= NEAR_WINDOW ? "near" : "far";
      }),
    [items, index],
  );

  // Exactly one slide ahead. Two would double the idle bandwidth for a slide
  // the user is unlikely to reach before it needs rebuffering anyway, and the
  // slide behind is already warm from having been played.
  const prefetchIndex = prefetchAllowed ? index + 1 : -1;

  // Parallel routes keep an unmatched slot's last content mounted across a
  // soft navigation. Without this the viewer stayed on screen — fixed and
  // full-bleed at z-100 — covering whatever we pushed to, which is why
  // "Contact seller" looked like it did nothing at all: the chat had opened
  // underneath it. usePathname is deliberate: swipes rewrite the URL with
  // replaceState, which Next never sees, so this only changes on a real
  // navigation away.
  if (!pathname.includes("/video/")) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
        <button
          type="button"
          onClick={close}
          aria-label="Back"
          className="absolute left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white  active:scale-95"
          style={{
            top: "var(--immersive-top, max(env(safe-area-inset-top, 0px), 16px))",
          }}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <BufferSpinner />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black"
      // Publish the back button's vertical position here so it clears the
      // safe area on the same line across loading and playback states.
      style={
        {
          "--immersive-top": "max(env(safe-area-inset-top, 0px), 16px)",
          // Bottom counterpart, published for the same reason: the progress
          // bar lives in the slide and the overlay's padding is set here, and
          // both have to clear the iPhone home indicator by the same amount or
          // the scrubber ends up under it.
          "--immersive-bottom": "max(env(safe-area-inset-bottom, 0px), 16px)",
          // Rail width, shared with the slide's grid so the paging chevrons
          // land over the video column instead of on top of the rail.
          "--immersive-rail": "400px",
        } as CSSProperties
      }
    >
      <button
        type="button"
        onClick={close}
        aria-label="Back"
        className="absolute left-4 top-[var(--immersive-top)] z-40 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white  active:scale-95"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="no-scroll-indicator h-full w-full overflow-y-auto overscroll-y-contain"
        style={{
          // `contain`, not `none`: the rubber-band is what makes it feel
          // native, but chaining into the feed mounted behind would destroy
          // the scroll position we restore on close.
          scrollSnapType: commentsOpen ? "none" : "y mandatory",
          overflowY: commentsOpen ? "hidden" : "auto",
        }}
      >
        {items.map((post, i) => (
          <section
            key={post.id}
            data-index={i}
            // h-full, not 100svh: inside a fixed inset-0 parent both resize
            // together when the iOS toolbar collapses, so a slide is always
            // exactly one container height and never leaves the next one
            // peeking.
            className="relative h-full w-full"
            style={{
              scrollSnapAlign: "start",
              // Without `always`, a hard fling skips several videos.
              scrollSnapStop: "always",
            }}
          >
            <SlideContainer
              post={post}
              state={slideStates[i]}
              prefetch={i === prefetchIndex}
              routeSlug={seedProp}
              muted={muted}
              onSetMuted={setMutedIntent}
              lang={lang}
              desktop={desktop}
              onOpenComments={() => setCommentsOpen(true)}
              onRequestNext={() => goTo(i + 1)}
            />
          </section>
        ))}

        {/* Every child of a mandatory snap container must be a full-height
            snap target. The pagination spinner used to live here as a 96px
            box with no snap-align, appearing mid-fling exactly when a page
            was requested — it inserted an unsnappable gap and let a hard
            flick sail past several videos. It is an overlay now, outside the
            scroller entirely. */}
        {!hasMore && items.length > 0 && (
          <section
            className="flex h-full w-full items-center justify-center bg-black"
            style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
          >
            <p className="text-sm text-white/60">
              {selectedWatchCategoryName
                ? `No more videos for ${selectedWatchCategoryName}`
                : "No more videos"}
            </p>
          </section>
        )}
      </div>

      {loadingMore && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex justify-center">
          <BufferSpinner />
        </div>
      )}

      {/* Desktop paging chevrons */}
      {/* Paging chevrons, inset past the rail so they stay over the video —
          they are light-on-dark and would vanish against the themed panel.
          Rendered on the same `desktop` flag as the rail so the two can never
          disagree about whether that column exists. */}
      {desktop && (
        <div
          className="absolute top-1/2 z-40 flex -translate-y-1/2 flex-col gap-4"
          style={{ right: "calc(var(--immersive-rail) + 2rem)" }}
        >
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Previous video"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/18 text-white shadow-[0_12px_32px_rgba(0,0,0,0.35)]  transition-[background-color,transform,opacity] hover:scale-105 hover:bg-white/28 active:scale-95 disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronUp className="h-7 w-7" strokeWidth={2.6} />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index >= items.length - 1}
            aria-label="Next video"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/18 text-white shadow-[0_12px_32px_rgba(0,0,0,0.35)]  transition-[background-color,transform,opacity] hover:scale-105 hover:bg-white/28 active:scale-95 disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronDown className="h-7 w-7" strokeWidth={2.6} />
          </button>
        </div>
      )}

      {/* Mobile comments, portalled above the viewer so the video stays visible
          and playing behind it — the arrangement people expect from TikTok. */}
      {commentsOpen &&
        activePost &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[110] md:hidden">
            <CommentsDrawer
              contentId={activePost.id}
              contentCreatorId={activePost.creatorId}
              lang={lang}
              open
              // The viewer owns the viewport already; locking the body would
              // only reflow the large feed still mounted behind it.
              lockBody={false}
              onClose={() => setCommentsOpen(false)}
              onOpenChange={setCommentsOpen}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * One slide's interactive state.
 *
 * Split out so each post owns its own like/save/follow hooks. Hoisting them
 * into the viewer would mean one set of hooks reused across every slide, and
 * the counts would lag a swipe behind.
 */
function SlideContainer({
  post,
  state,
  prefetch,
  routeSlug,
  muted,
  onSetMuted,
  lang,
  desktop,
  onOpenComments,
  onRequestNext,
}: {
  post: ContentCardFieldsFragment;
  state: SlideState;
  prefetch: boolean;
  /** The route's slug, used to key this slide's remembered position. */
  routeSlug: string;
  muted: boolean;
  onSetMuted: (next: boolean) => void;
  lang: string;
  desktop: boolean;
  onOpenComments: () => void;
  onRequestNext: () => void;
}) {
  const router = useRouter();
  const { requireAuth } = useAuthGuard(lang);
  const contactHref = `/${lang}/notifications/${post.id}?source=content`;
  const {
    liked,
    likeCount,
    handleLike,
    saved,
    handleSave,
    handleShare,
    fireView,
  } = useInteractions(post, { requireAuth });

  // Straight to the conversation for this listing. `source=content` tells the
  // messaging screen to create-or-reuse the thread in place, so it never
  // flashes the inbox list — the same contract the feed card and the product
  // page both use.
  const openContact = useCallback(() => {
    if (!post.id || !requireAuth({ contentId: post.id })) return;
    // Recorded here, from the slide that is actually sending the user away,
    // rather than from the viewer's active index. The index is derived from
    // scroll, and the scroller resets as the viewer tears down — that reset
    // fired one last index change and overwrote the position with a
    // neighbouring slide, which is why coming back landed near the right video
    // instead of on it.
    const postSlug = safeContentSlugSegment(post);
    if (!postSlug) return;
    rememberViewerSlide(routeSlug, postSlug);
    router.push(contactHref);
  }, [requireAuth, router, contactHref, post, routeSlug]);

  // This is a button-driven navigation rather than a Link, so Next cannot
  // prefetch the chat route from its viewport. Warm it while the video is
  // active so the click can enter the conversation without waiting for its
  // route bundle and server payload first.
  useEffect(() => {
    if (state !== "active" || post.isMyContent) return;
    void router.prefetch(contactHref);
  }, [contactHref, post.isMyContent, router, state]);

  const { following, toggle: handleFollow } = useFollow({
    userId: post.creator?.id ?? post.creatorId,
    initialFollowing: post.creator?.isFollowedByMe ?? false,
    initialFollowerCount: post.creator?.followerCount ?? 0,
    lang,
  });

  // Becoming active is a view. This feeds the seen-decay term in the server's
  // ranking, so swiping past a video de-prioritises it next session.
  const fireViewRef = useRef(fireView);
  useEffect(() => {
    fireViewRef.current = fireView;
  }, [fireView]);
  useEffect(() => {
    if (state !== "active") return;
    fireViewRef.current();
  }, [state, post.id]);

  if (state === "far") {
    return <div className="h-full w-full bg-black" aria-hidden />;
  }

  return (
    <ImmersiveSlide
      post={post}
      state={state}
      prefetch={prefetch}
      muted={muted}
      onSetMuted={onSetMuted}
      onRequestNext={onRequestNext}
      // Mobile only — ImmersiveSlide renders this subtree under `md:hidden`.
      // The rail takes over on desktop, where the comments panel already
      // carries the composer and a full-width button would be wrong.
      overlay={(sound) => (
        <div className="flex h-full w-full flex-col justify-end gap-3 p-4 pb-[calc(var(--immersive-bottom)+2.25rem)]">
          {/* Action rail sits above the text block rather than beside it, so
              the meta below can use the full width for the price and the
              action button. No pointer-events-auto on the wrappers:
              ImmersiveMeta and ImmersiveActions opt their own interactive
              children in, leaving the rest of the frame tappable for
              play/pause. */}
          <div className="flex justify-end">
            <ImmersiveActions
              liked={liked}
              likeCount={likeCount}
              onLike={handleLike}
              saved={saved}
              onSave={handleSave}
              commentCount={post.stats?.comments ?? 0}
              onComment={onOpenComments}
              onShare={handleShare}
              muted={sound.muted}
              onToggleMuted={sound.onToggleMuted}
              orientation="column"
              tone="overlay"
            />
          </div>

          <ImmersiveMeta
            post={post}
            lang={lang}
            variant="overlay"
            following={following}
            onFollow={handleFollow}
            cta={
              // Hidden on your own listing — there is nobody to contact.
              post.isMyContent ? null : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openContact();
                  }}
                  className="pointer-events-auto relative z-30 mt-0.5 mb-3 flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[0.8rem] font-bold text-white transition-transform active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
                  {/* Deliberately not "Chat to Buy". Half this marketplace is
                      not a purchase in that sense — a shamba, a plot, a rental,
                      a service, a quote — and a buy-now label misreads all of
                      them. "Contact seller" is the one phrase that fits every
                      listing type, and it matches the feed card's button. */}
                  Contact seller
                </button>
              )
            }
          />
        </div>
      )}
      // Gated on a real media query, not `hidden md:block`. CSS still mounts
      // the subtree and runs its comment query; on a phone that is a wasted
      // round trip per slide for a panel nobody can see.
      rail={desktop ? (sound) => (
          <div
            data-immersive-rail
            className="flex h-full min-h-0 flex-col overflow-hidden"
          >
            <div className="shrink-0 border-b border-default p-4">
              <ImmersiveMeta
                post={post}
                lang={lang}
                variant="rail"
                following={following}
                onFollow={handleFollow}
              />
              <div className="mt-4">
                <ImmersiveActions
                  liked={liked}
                  likeCount={likeCount}
                  onLike={handleLike}
                  saved={saved}
                  onSave={handleSave}
                  commentCount={post.stats?.comments ?? 0}
                  onComment={onOpenComments}
                  onShare={handleShare}
                  muted={sound.muted}
                  onToggleMuted={sound.onToggleMuted}
                  orientation="row"
                  tone="surface"
                />
              </div>
              {/* The rail had no primary action at all, so on desktop there
                  was no way to reach the seller from a video. */}
              {!post.isMyContent && (
                <button
                  type="button"
                  onClick={openContact}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
                  Contact seller
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {state === "active" && (
                <CommentsDrawer
                  contentId={post.id}
                  contentCreatorId={post.creatorId}
                  lang={lang}
                  open
                  desktopInline
                  onClose={() => {}}
                />
              )}
            </div>
          </div>
        ) : undefined}
    />
  );
}
