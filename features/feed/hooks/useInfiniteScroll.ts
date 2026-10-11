"use client";

import { useCallback, useEffect, useRef, useState, type RefCallback } from "react";

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
  /** Scroll container to observe against; defaults to the browser viewport. */
  root?: Element | null;
  enabled?: boolean;
}

interface UseInfiniteScrollResult {
  sentinelRef: RefCallback<HTMLDivElement>;
}

/**
 * Generic hook that observes a sentinel element and calls onLoadMore when it
 * enters the viewport. Works with ANY cursor-based paginated list.
 *
 * Usage:
 *   const { sentinelRef } = useInfiniteScroll({ hasMore, loading, onLoadMore })
 *   // Then: <div ref={sentinelRef} />  somewhere at the bottom of your list
 */
export function useInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  rootMargin = "400px",
  root = null,
  enabled = true,
}: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const latest = useRef({ hasMore, loading, onLoadMore });
  const wasEnabled = useRef(enabled);

  useEffect(() => {
    latest.current = { hasMore, loading, onLoadMore };
  }, [hasMore, loading, onLoadMore]);

  const sentinelRef = useCallback<RefCallback<HTMLDivElement>>((node) => {
    setSentinelEl(node);
  }, []);

  useEffect(() => {
    const el = sentinelEl;
    const recheckOnEnable = enabled && !wasEnabled.current;
    wasEnabled.current = enabled;

    if (!el) return;
    if (!enabled) return;

    const maybeLoadMore = () => {
      if (document.body.classList.contains("comments-open")) return;
      const state = latest.current;
      if (state.hasMore && !state.loading) state.onLoadMore();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) maybeLoadMore();
      },
      { root, rootMargin },
    );

    observer.observe(el);

    let frame = 0;
    if (recheckOnEnable) {
      // When a feed returns from display:none, re-check once. The page-append
      // recheck lives in its own effect below.
      frame = requestAnimationFrame(() => {
        if (sentinelWithinMargin(el, rootMargin, root)) maybeLoadMore();
      });
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [enabled, root, rootMargin, sentinelEl]);

  // IntersectionObserver only fires on intersection CHANGES. If an appended
  // page is shorter than rootMargin (e.g. a grid of small tiles), the sentinel
  // never leaves the margin, no new event fires, and pagination silently
  // stalls with hasMore still true. So when a load finishes, re-check once:
  // still within the margin → request the next page. This chain-fills only
  // until the sentinel clears the margin, and hasMore/loading gate it.
  const wasLoading = useRef(loading);
  useEffect(() => {
    const justFinished = wasLoading.current && !loading;
    wasLoading.current = loading;
    if (!justFinished || !enabled || !sentinelEl) return;

    const frame = requestAnimationFrame(() => {
      const state = latest.current;
      if (document.body.classList.contains("comments-open")) return;
      if (!state.hasMore || state.loading) return;
      if (sentinelWithinMargin(sentinelEl, rootMargin, root)) state.onLoadMore();
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, enabled, root, rootMargin, sentinelEl]);

  return { sentinelRef };
}

function sentinelWithinMargin(
  el: HTMLElement,
  rootMargin: string,
  root: Element | null,
) {
  const rect = el.getBoundingClientRect();
  const margin = Number.parseFloat(rootMargin) || 0;
  const bounds = root?.getBoundingClientRect();
  const top = bounds?.top ?? 0;
  const bottom = bounds?.bottom ?? window.innerHeight;
  return rect.top <= bottom + margin && rect.bottom >= top - margin;
}
