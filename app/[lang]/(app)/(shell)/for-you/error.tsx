"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary for the feed.
 *
 * The feed's first page is read with `useSuspenseQuery`, which rethrows a
 * failed query instead of returning an `error` field. With no boundary between
 * that hook and the root, a single failed feed request — a dropped connection,
 * a 5xx, a blocked request — unmounted the entire route and left the user on
 * Next's generic "This page couldn't load" screen, losing the nav and every
 * other tab with it.
 *
 * This is also the client-side half of React error #419 ("the server could not
 * finish this Suspense boundary"). When the server cannot complete the feed's
 * Suspense boundary it aborts it and asks the client to re-render that subtree;
 * if the client render then throws too, this boundary is what catches it, so
 * the failure degrades to a retry affordance on an otherwise intact page.
 *
 * `reset()` re-renders the segment, which re-runs the query — the natural
 * retry, and enough to recover from a transient failure without a full reload.
 */
export default function FeedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the detail in the console rather than on screen: feed errors are
    // usually network-shaped and the message is not useful to a shopper.
    console.error("[feed] failed to render", error);
  }, [error]);

  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4 text-5xl">🛍️</div>
      <h2 className="mb-2 text-base font-bold text-default">
        We couldn&apos;t load your feed
      </h2>
      <p className="mb-6 max-w-xs text-sm leading-relaxed text-muted-foreground">
        This is usually a connection hiccup. Try again in a moment.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
