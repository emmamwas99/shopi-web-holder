"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { PostCard } from "./PostCard";
import { FeedPaginationSkeleton, FeedSkeleton } from "./FeedSkeleton";
import { useNearbyFeed } from "../hooks/useFeed";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { useNearbyLocation } from "../hooks/useNearbyLocation";
import { useFeedPreferencesStore } from "@/stores/feedPreferences";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  lang: string;
  active?: boolean;
}

const RADIUS_OPTIONS = [1, 2, 3, 5, 10, 25, 50, 100, 200] as const;

export function NearbyGrid({ lang, active = true }: Props) {
  const {
    location: effectiveLocation,
    permState: effectivePermState,
    geoError,
    requestLocation,
  } = useNearbyLocation({
    requireLiveLocation: active,
    useCachedLocation: false,
  });
  const nearbyRadiusKm = useFeedPreferencesStore((s) => s.nearbyRadiusKm);
  const setNearbyRadiusKm = useFeedPreferencesStore(
    (s) => s.setNearbyRadiusKm,
  );

  const { items, loading, loadingMore, hasMore, loadMore } = useNearbyFeed(
    effectiveLocation,
    nearbyRadiusKm,
  );

  const { sentinelRef } = useInfiniteScroll({
    enabled: active,
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: loadMore,
  });

  if (effectivePermState === "checking") {
    return (
      <div className="flex min-h-[93svh] fixed top-0 left-0 w-full right-0 bottom-0 flex-col items-center justify-center px-6 text-center gap-4">
        <InterlockingBalls size={32} />
        <p className="app-subcopy">Checking location…</p>
      </div>
    );
  }

  // ── Permission not yet requested ──────────────────────────────────────────
  if (effectivePermState === "idle") {
    return (
      <div className="flex min-h-[93svh] fixed top-0 left-0 w-full right-0 bottom-0 flex-col items-center justify-center px-6 text-center gap-5">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-default text-base mb-1">
            Discover sellers near you
          </h3>
          <p className="app-subcopy max-w-xs">
            See listings from sellers in your area. We only use your location to
            find nearby content.
          </p>
        </div>
        <button
          onClick={() => requestLocation()}
          className="px-6 py-3 bg-primary text-white rounded-full text-sm font-semibold active:scale-95 transition-transform shadow-sm"
        >
          Enable location
        </button>
      </div>
    );
  }

  // ── Requesting ────────────────────────────────────────────────────────────
  if (effectivePermState === "requesting") {
    return (
      <div className="flex min-h-[93svh] fixed top-0 left-0 w-full right-0 bottom-0 flex-col items-center justify-center px-6 text-center gap-4">
        <InterlockingBalls size={32} />
        <p className="app-subcopy">Finding your location…</p>
      </div>
    );
  }

  // ── Denied ────────────────────────────────────────────────────────────────
  if (effectivePermState === "denied") {
    return (
      <div className="flex min-h-[93svh] fixed top-0 left-0 w-full right-0 bottom-0 flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-4xl">🚫</div>
        <h3 className="font-bold text-default text-base">
          Location access denied
        </h3>
        <p className="app-subcopy max-w-xs">
          To see nearby listings, enable location access in your browser
          settings and reload.
        </p>
      </div>
    );
  }

  // ── Unavailable ───────────────────────────────────────────────────────────
  if (effectivePermState === "unavailable") {
    return (
      <div className="flex min-h-[93svh] fixed top-0 left-0 w-full right-0 bottom-0 flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-4xl">📍</div>
        <p className="app-subcopy">
          Location is not supported on this device.
        </p>
      </div>
    );
  }

  // ── Granted — loading feed ────────────────────────────────────────────────
  if (loading && items.length === 0) return <FeedSkeleton />;

  // ── Geo error ─────────────────────────────────────────────────────────────
  if (geoError && !effectiveLocation) {
    return (
      <div className="flex min-h-[93svh] fixed top-0 left-0 w-full right-0 bottom-0 flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-4xl">⚠️</div>
        <p className="app-subcopy">{geoError}</p>
        <button
          onClick={() => requestLocation()}
          className="px-5 py-2.5 bg-primary text-white rounded-full text-sm font-semibold"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── No results ────────────────────────────────────────────────────────────
  if (!loading && items.length === 0) {
    return (
      <div className="flex min-h-[93svh] fixed top-0 left-0 w-full right-0 bottom-0 flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-4xl">🏪</div>
        <h3 className="font-bold text-default text-base">
          No listings nearby yet
        </h3>
        <p className="app-subcopy max-w-xs">
          No sellers found within <strong>{nearbyRadiusKm} km</strong> of your
          current location yet. Try expanding the radius.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-safe-area-inset-bottom pb-6">
      {/* Location banner */}
      {effectiveLocation && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span className="truncate text-xs text-muted-foreground">
              Within{" "}
              <span className="font-semibold text-default">
                {nearbyRadiusKm} km
              </span>{" "}
              of {effectiveLocation.label ?? "your location"}
            </span>
          </div>

          <Select
            value={String(nearbyRadiusKm)}
            onValueChange={(value) => setNearbyRadiusKm(Number(value))}
          >
            <SelectTrigger
              className="h-8 w-auto shrink-0 gap-1 rounded-full border-border bg-surface px-3 py-0 text-xs font-medium text-default"
              aria-label="Nearby distance"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((km) => (
                <SelectItem key={km} value={String(km)}>
                  {km} km
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={() => requestLocation()}
            className="text-xs text-primary font-medium"
          >
            Refresh
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        {items.map((post, i) => (
          <PostCard key={post.id} post={post} lang={lang} priority={i === 0} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {loadingMore && <FeedPaginationSkeleton />}

      {!hasMore && items.length > 0 && (
        <p className="text-center text-muted-foreground text-xs py-6">
          All nearby listings shown ✓
        </p>
      )}
    </div>
  );
}
