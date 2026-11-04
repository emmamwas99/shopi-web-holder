"use client";

import { ArrowUp, RefreshCw } from "lucide-react";

interface Props {
  active: boolean;
  hasNewListings: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function FeedRefreshControl({
  active,
  hasNewListings,
  isRefreshing,
  onRefresh,
}: Props) {
  if (!active) return null;

  return (
    <>
      <div className="flex min-h-11 items-center justify-between gap-3 px-3 sm:px-0">
        <span className="text-xs text-muted" role="status" aria-live="polite">
          {isRefreshing
            ? "Updating your feed…"
            : hasNewListings
              ? "New listings available"
              : "Picked for you"}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh your For You feed"
          className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          <RefreshCw
            size={14}
            className={
              isRefreshing
                ? "animate-spin motion-reduce:animate-none"
                : undefined
            }
            aria-hidden
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {hasNewListings && !isRefreshing ? (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--desktop-top-nav-height,68px)+0.75rem)] z-40 flex justify-center px-4">
          <button
            type="button"
            onClick={onRefresh}
            className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/15 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ArrowUp size={16} aria-hidden />
            New listings available
          </button>
        </div>
      ) : null}
    </>
  );
}
