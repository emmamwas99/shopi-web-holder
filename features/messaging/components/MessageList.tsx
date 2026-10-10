"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Message } from "../types";
import { dayKey, dayLabel } from "../lib/dateHeaders";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  currentUserId?: string | null;
  typingUserId: string | null;
  otherParticipantId?: string | null;
  initialLoading: boolean;
  loadingOlder: boolean;
  hasMoreOlder: boolean;
  /** Incremented by the parent on send to force a scroll-to-bottom. */
  scrollToBottomSignal?: number;
  emptyState?: ReactNode;
  onLoadOlder: () => Promise<number>;
  onRetryMessage: (message: Message) => void;
  onDiscardMessage: (message: Message) => void;
  onDeleteMessage: (message: Message) => Promise<boolean>;
}

/** A day-separator chip (Today / Yesterday / date). */
function DaySeparator({ label }: { label: string }) {
  return (
    <div className="my-3 flex justify-center">
      <span
        className="rounded-full px-3 py-1 font-medium"
        style={{
          fontSize: "var(--text-xs)",
          backgroundColor: "rgb(var(--color-bg-elevated))",
          color: "rgb(var(--color-text-muted))",
          border: "1px solid rgb(var(--color-border))",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Scrollable message list with:
 *  - day separators + a floating date pill that tracks the top-most visible day
 *  - auto-scroll to bottom on new messages (only when already near the bottom)
 *  - infinite scroll: load older near the top, preserving scroll position
 */
export function MessageList({
  messages,
  currentUserId,
  typingUserId,
  otherParticipantId,
  initialLoading,
  loadingOlder,
  hasMoreOlder,
  scrollToBottomSignal,
  emptyState,
  onLoadOlder,
  onRetryMessage,
  onDiscardMessage,
  onDeleteMessage,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [floatingLabel, setFloatingLabel] = useState<string>("");
  const [showFloating, setShowFloating] = useState(false);

  // Track state needed to keep scroll stable when older messages are prepended.
  const prevScrollHeightRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const lastCountRef = useRef(0);

  // Build render items: interleave day separators between messages.
  const items = useMemo(() => {
    const out: Array<
      | { type: "sep"; key: string; label: string }
      | { type: "msg"; message: Message }
    > = [];
    let lastDay = "";
    for (const m of messages) {
      if (m.isDeleted) continue;
      const key = dayKey(m.createdAt);
      if (key !== lastDay) {
        out.push({
          type: "sep",
          key: `sep-${key}`,
          label: dayLabel(m.createdAt),
        });
        lastDay = key;
      }
      out.push({ type: "msg", message: m });
    }
    return out;
  }, [messages]);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  // Hard jump to the very bottom. Set scrollTop directly (more reliable than
  // scrollIntoView when sibling heights are still settling) and repeat across a
  // couple of frames so media/layout that grows after the first paint can't
  // leave us stranded above the latest message.
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    const jump = () => {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    };
    jump();
    requestAnimationFrame(jump);
    setTimeout(jump, 60);
  }, []);

  // Auto-scroll to bottom on new messages when already near the bottom (so we
  // don't yank the user up while they're reading history).
  useEffect(() => {
    const grew = messages.length > lastCountRef.current;
    const prependedOrSame = loadingOlderRef.current;
    lastCountRef.current = messages.length;
    if (initialLoading) return;
    if (prependedOrSame) return; // older load handles its own scroll restore
    if (grew && isNearBottom()) {
      scrollToBottom();
    }
  }, [messages.length, initialLoading, isNearBottom, scrollToBottom]);

  // Force a scroll to the bottom whenever the parent signals a send.
  useEffect(() => {
    if (!scrollToBottomSignal) return;
    scrollToBottom();
  }, [scrollToBottomSignal, scrollToBottom]);

  // The typing indicator renders below the last message, so when it pops in
  // while the user sits at the bottom it lands below the fold and shows only
  // half-clipped. Nudge the scroller to reveal it (same near-bottom rule as
  // the new-message auto-scroll, so it never yanks someone reading history).
  const typingVisible = Boolean(
    typingUserId && otherParticipantId === typingUserId,
  );
  useEffect(() => {
    if (typingVisible && isNearBottom()) scrollToBottom(true);
  }, [typingVisible, isNearBottom, scrollToBottom]);

  // Jump to bottom when a conversation first renders its messages.
  const didInitialScrollRef = useRef(false);
  useLayoutEffect(() => {
    if (initialLoading || messages.length === 0) {
      didInitialScrollRef.current = false;
      return;
    }
    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      scrollToBottom();
    }
  }, [initialLoading, messages.length, scrollToBottom]);

  // Preserve scroll position after older messages are prepended.
  useLayoutEffect(() => {
    if (!loadingOlderRef.current) return;
    const el = scrollRef.current;
    if (el) {
      const delta = el.scrollHeight - prevScrollHeightRef.current;
      if (delta > 0) el.scrollTop = el.scrollTop + delta;
    }
    loadingOlderRef.current = false;
  }, [messages]);

  const triggerLoadOlder = useCallback(async () => {
    const el = scrollRef.current;
    if (
      !el ||
      initialLoading ||
      loadingOlderRef.current ||
      loadingOlder ||
      !hasMoreOlder
    )
      return;
    loadingOlderRef.current = true;
    // Snapshot height so the layout effect can restore the exact scroll position
    // after the older page is prepended (the fixed-height media boxes keep this
    // delta accurate even before images finish loading).
    prevScrollHeightRef.current = el.scrollHeight;
    const added = await onLoadOlder();
    if (added === 0) loadingOlderRef.current = false;
  }, [hasMoreOlder, initialLoading, loadingOlder, onLoadOlder]);

  // IntersectionObserver on the top sentinel drives infinite scroll. A small
  // rootMargin prefetches the next page just before the user hits the top so it
  // feels seamless, without firing so early it loops.
  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = topSentinelRef.current;
    if (!root || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void triggerLoadOlder();
      },
      { root, rootMargin: "200px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [triggerLoadOlder]);

  // Update the floating date pill based on the top-most visible message.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowFloating(el.scrollTop > 24);
    const dayEls = el.querySelectorAll<HTMLElement>("[data-day-label]");
    const top = el.getBoundingClientRect().top;
    let current = "";
    for (const node of Array.from(dayEls)) {
      if (node.getBoundingClientRect().top - top <= 56) {
        current = node.dataset.dayLabel ?? "";
      } else break;
    }
    if (current) setFloatingLabel(current);
  }, []);

  if (initialLoading && messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-[rgb(var(--color-bg-subtle)/0.35)] px-4 py-4">
        <div className="flex h-[60vh] items-center justify-center">
          <InterlockingBalls size={40} className="opacity-60" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Floating date pill */}
      {showFloating && floatingLabel ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
          <span
            className="rounded-full px-3 py-1 font-medium shadow-sm"
            style={{
              fontSize: "var(--text-xs)",
              backgroundColor: "rgb(var(--color-bg-elevated))",
              color: "rgb(var(--color-text-muted))",
              border: "1px solid rgb(var(--color-border))",
            }}
          >
            {floatingLabel}
          </span>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overflow-x-hidden overscroll-contain bg-[rgb(var(--color-bg-subtle)/0.35)] px-4 py-4"
      >
        {/* Top sentinel + older-loading spinner */}
        <div ref={topSentinelRef} className="h-px" />
        {loadingOlder ? (
          <div className="flex justify-center py-2">
            <InterlockingBalls size={18} className="opacity-60" />
          </div>
        ) : null}

        {messages.length === 0 && emptyState ? (
          <div className="flex min-h-full items-center justify-center py-10">
            {emptyState}
          </div>
        ) : null}

        <div className="space-y-2">
          {items.map((item) =>
            item.type === "sep" ? (
              <div key={item.key} data-day-label={item.label}>
                <DaySeparator label={item.label} />
              </div>
            ) : (
              <MessageBubble
                key={item.message.id}
                message={item.message}
                mine={Boolean(
                  item.message.isMine ??
                  item.message.senderId === currentUserId,
                )}
                onRetry={onRetryMessage}
                onDiscard={onDiscardMessage}
                onDelete={onDeleteMessage}
              />
            ),
          )}

          {typingVisible ? (
            <div className="flex justify-start">
              <div
                className="rounded-2xl rounded-bl-md border px-3 py-2"
                style={{
                  borderColor: "rgb(var(--color-border))",
                  backgroundColor: "rgb(var(--color-bg-elevated))",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:240ms]" />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
