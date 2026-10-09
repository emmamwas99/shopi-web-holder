"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { motion, type PanInfo } from "framer-motion";
import { isOverlayPath } from "@/lib/scrollRestoration";
import { CommentThread } from "./CommentThread";

interface Props {
  contentId: string;
  /** The userId of the content's creator — used to label their comments "Creator". */
  contentCreatorId?: string;
  onClose: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCommentAdded?: () => void;
  desktopInline?: boolean;
  /**
   * Whether opening the sheet should pin `document.body`. Default true.
   * Set false when the caller already covers the viewport with its own
   * scroller, where the lock buys nothing and costs a reflow of whatever is
   * still mounted behind.
   */
  lockBody?: boolean;
  /** Locale, forwarded to the thread so guests can be routed to auth. */
  lang: string;
}

/**
 * The comments surface — a mobile bottom sheet, a desktop centred dialog, or an
 * inline panel (`desktopInline`). It's purely the shell/animation; the comment
 * list, replies, and composer all live in the shared {@link CommentThread}.
 */
export function CommentsDrawer({
  contentId,
  contentCreatorId,
  onClose,
  open = true,
  onOpenChange,
  onCommentAdded,
  desktopInline = false,
  lockBody = true,
  lang,
}: Props) {
  // Keep the comment thread mounted after the first open. Reopening the drawer
  // then preserves Apollo's observer/cache state instead of recreating the
  // query and accidentally nudging the surrounding feed watchers.
  const hasOpenedRef = useRef(open || desktopInline);
  const [hasOpened, setHasOpened] = useState(open || desktopInline);
  const onCloseRef = useRef(onClose);
  const onOpenChangeRef = useRef(onOpenChange);
  const closeRef = useRef<() => void>(() => {
    onOpenChangeRef.current?.(false);
    onCloseRef.current();
  });

  useEffect(() => {
    onCloseRef.current = onClose;
    onOpenChangeRef.current = onOpenChange;
  }, [onClose, onOpenChange]);

  // The native/browser Back action should dismiss the sheet before navigating
  // away from the feed. Defer the history entry so Strict Mode's development
  // effect replay cannot immediately pop the drawer closed.
  useEffect(() => {
    if (desktopInline || !open) return;

    let pushed = false;
    let closedByPop = false;
    const onPop = () => {
      closedByPop = true;
      onOpenChangeRef.current?.(false);
      onCloseRef.current();
    };

    const timer = window.setTimeout(() => {
      window.history.pushState(
        { ...window.history.state, commentsDrawer: true },
        "",
      );
      pushed = true;
      window.addEventListener("popstate", onPop);
    }, 0);

    closeRef.current = () => {
      if (pushed && !closedByPop) {
        closedByPop = true;
        window.history.back();
      } else {
        onOpenChangeRef.current?.(false);
        onCloseRef.current();
      }
    };

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      if (pushed && !closedByPop) window.history.back();
    };
  }, [desktopInline, open]);

  const requestClose = useCallback(() => closeRef.current(), []);

  useEffect(() => {
    if (open && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      setHasOpened(true);
    }
  }, [open]);

  // Swipe-to-dismiss handled by framer-motion `drag="y"`. Past ~120px pull or a
  // fast downward flick → dismiss.
  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 600) requestClose();
  }

  // Lock the page behind the sheet so it can't scroll while open. Restores the
  // exact scroll position on close (position:fixed would otherwise jump to top).
  //
  // The class is applied either way — it only hides the bottom nav and gates
  // the feed's infinite-scroll sentinel, which is wanted regardless. The
  // position:fixed lock is what `lockBody` opts out of: a caller that already
  // covers the viewport (the immersive viewer) gains nothing from it and would
  // pay a full reflow of the still-mounted feed on every open and close.
  useEffect(() => {
    if (desktopInline || !open) return;
    const { body } = document;
    body.classList.add("comments-open");

    if (!lockBody) {
      return () => body.classList.remove("comments-open");
    }

    const scrollY = window.scrollY;
    const lockedPath = `${window.location.pathname}${window.location.search}`;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.classList.remove("comments-open");
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      // Only put the page back if it is still the page on screen. When the
      // sheet closes because the user tapped through to somewhere else (a
      // commenter's profile), this cleanup runs after the new route has
      // mounted — scrolling here would open that page at the feed's offset.
      // An overlay route (a listing opened from a comment) is drawn over the
      // same page, so that one is still restored.
      const { pathname, search } = window.location;
      if (`${pathname}${search}` === lockedPath || isOverlayPath(pathname)) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [desktopInline, open, lockBody]);

  if (desktopInline) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <CommentThread
          contentId={contentId}
          contentCreatorId={contentCreatorId}
          onCommentAdded={onCommentAdded}
          lang={lang}
        />
      </div>
    );
  }

  if (!hasOpened) return null;

  // ── Mobile: keyboard-avoiding bottom sheet (TikTok-style) ──
  // The overlay is full-screen `position: fixed` so it never affects page layout
  // and the drawer body stays put. When the keyboard opens we DON'T move the
  // sheet — only the input bar lifts to sit above the keyboard (CommentThread's
  // `keyboardAvoiding`), exactly like TikTok.
  return (
    <div
      className={[
        "fixed inset-0 z-80",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      {/* Scrim */}
      <motion.button
        type="button"
        aria-label="Close comments"
        onClick={requestClose}
        className="absolute inset-0 bg-black/60"
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
      />

      {/* Mobile sheet — TikTok-style bottom drawer. */}
      <motion.div
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-107.5 flex-col overflow-hidden rounded-t-3xl bg-app shadow-2xl md:hidden"
        style={{ height: "75dvh" }}
        initial={false}
        animate={{ y: open ? 0 : "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        drag={open ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={handleDragEnd}
      >
        {/* Grabber + header — drag handle for swipe-to-close */}
        <div className="shrink-0 border-b border-default cursor-grab active:cursor-grabbing">
          <div className="flex justify-center pt-3 pb-1.5">
            <div className="h-1.5 w-11 rounded-full bg-muted-foreground/35" />
          </div>
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <h2 className="text-sm font-bold text-default">Comments</h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <CommentThread
          contentId={contentId}
          contentCreatorId={contentCreatorId}
          onCommentAdded={onCommentAdded}
          lang={lang}
          keyboardAvoiding
        />
      </motion.div>

      {/* Desktop / tablet dialog — centered, wider, and not draggable. */}
      <motion.div
        className="absolute left-1/2 top-1/2 hidden w-[min(760px,calc(100vw-3rem))] max-w-[760px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-default bg-app shadow-2xl md:flex lg:w-[min(860px,calc(100vw-5rem))] lg:max-w-[860px]"
        style={{ height: "min(82dvh, 860px)" }}
        initial={false}
        animate={{
          opacity: open ? 1 : 0,
          scale: open ? 1 : 0.96,
          y: open ? 0 : 18,
        }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="shrink-0 border-b border-default bg-[rgb(var(--color-bg)/0.96)] backdrop-blur-md">
          <div className="flex items-center justify-between px-5 py-4 lg:px-6">
            <div>
              <h2 className="text-base font-bold text-default">Comments</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Join the conversation
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-default"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <CommentThread
          contentId={contentId}
          contentCreatorId={contentCreatorId}
          onCommentAdded={onCommentAdded}
          lang={lang}
        />
      </motion.div>
    </div>
  );
}
