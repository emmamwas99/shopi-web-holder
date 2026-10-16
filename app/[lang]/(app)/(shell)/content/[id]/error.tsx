"use client";

import { useEffect } from "react";

/**
 * Shown when a listing could not be loaded — the API was down, slow or
 * rate-limited — as opposed to a listing that no longer exists, which
 * not-found.tsx handles with a 404.
 *
 * The page throws in that case rather than rendering an empty, noindexed
 * shell, so the response is a 500: engines treat that as temporary and keep
 * the indexed listing, where a noindexed 200 told them to drop it. This
 * boundary is the human half of that trade — a retry instead of Next's
 * generic error screen.
 *
 * The failure happened on the server, so retrying has to re-request the
 * server render: `unstable_retry` refreshes the route, then resets the
 * boundary. Plain `reset()` would only re-render the same error.
 */
export default function ListingError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    console.error("[listing] failed to load", error);
  }, [error]);

  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4 text-5xl">🛍️</div>
      <h1 className="mb-2 text-base font-bold text-default">
        We couldn&apos;t load this listing
      </h1>
      <p className="mb-6 max-w-xs text-sm leading-relaxed text-muted-foreground">
        This is usually a connection hiccup. Try again in a moment.
      </p>
      <button
        onClick={unstable_retry ?? reset}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
