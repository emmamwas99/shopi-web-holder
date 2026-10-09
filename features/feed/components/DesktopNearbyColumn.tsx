"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

/**
 * DesktopNearbyColumn — desktop version of the Nearby tab. Mirrors the
 * geolocation / permission flow of the mobile NearbyGrid, but renders
 * desktop-styled cards and states (no full-screen fixed overlays).
 */

import { PostCard } from "./PostCard";
import { PostCardSkeleton } from "./FeedSkeleton";
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

const RADIUS_OPTIONS = [1, 2, 3, 5, 10, 25, 50, 100, 200] as const;

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-default bg-elevated px-6 py-20 text-center">
      {children}
    </div>
  );
}

function DesktopPostCard({
  post,
  lang,
  priority,
}: {
  post: Parameters<typeof PostCard>[0]["post"];
  lang: string;
  priority?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-default bg-elevated shadow-sm">
      <PostCard post={post} lang={lang} priority={priority} />
    </div>
  );
}

export function DesktopNearbyColumn({
  lang,
  active = true,
}: {
  lang: string;
  active?: boolean;
}) {
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
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: loadMore,
  });

  const pinIcon = (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgb(var(--brand-primary))"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );

  if (effectivePermState === "checking") {
    return (
      <Panel>
        <InterlockingBalls size={32} />
        <p className="app-subcopy">Checking location…</p>
      </Panel>
    );
  }

  if (effectivePermState === "idle") {
    return (
      <Panel>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {pinIcon}
        </div>
        <div>
          <h3 className="mb-1 text-lg font-bold text-default">
            Discover sellers near you
          </h3>
          <p className="app-subcopy mx-auto max-w-sm">
            See listings from sellers in your area. We only use your location to
            find nearby content.
          </p>
        </div>
        <button
          onClick={() => requestLocation()}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
          style={{ backgroundColor: "rgb(var(--brand-primary))" }}
        >
          Enable location
        </button>
      </Panel>
    );
  }

  if (effectivePermState === "requesting") {
    return (
      <Panel>
        <InterlockingBalls size={32} />
        <p className="app-subcopy">Finding your location…</p>
      </Panel>
    );
  }

  if (effectivePermState === "denied") {
    return (
      <Panel>
        <div className="text-4xl">🚫</div>
        <h3 className="text-lg font-bold text-default">
          Location access denied
        </h3>
        <p className="app-subcopy mx-auto max-w-sm">
          To see nearby listings, enable location access in your browser settings
          and reload.
        </p>
      </Panel>
    );
  }

  if (effectivePermState === "unavailable") {
    return (
      <Panel>
        <div className="text-4xl">📍</div>
        <p className="app-subcopy">
          Location is not supported on this device.
        </p>
      </Panel>
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-3xl border border-default bg-elevated"
          >
            <PostCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (geoError && !effectiveLocation) {
    return (
      <Panel>
        <div className="text-4xl">⚠️</div>
        <p className="app-subcopy">{geoError}</p>
        <button
          onClick={() => requestLocation()}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "rgb(var(--brand-primary))" }}
        >
          Try again
        </button>
      </Panel>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <Panel>
        <div className="text-4xl">🏪</div>
        <h3 className="text-lg font-bold text-default">
          No listings nearby yet
        </h3>
        <p className="app-subcopy mx-auto max-w-sm">
          No sellers found within <strong>{nearbyRadiusKm} km</strong> of your
          current location yet. Try expanding the radius.
        </p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {effectiveLocation && (
        <div className="flex items-center gap-2 rounded-2xl border border-default bg-elevated px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(var(--brand-primary))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span className="truncate text-sm text-muted-foreground">
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
              className="h-9 w-auto shrink-0 gap-1 rounded-full border-default bg-surface px-3 py-0 text-sm font-medium text-default"
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
            className="text-sm font-medium text-primary"
            style={{ color: "rgb(var(--brand-primary))" }}
          >
            Refresh
          </button>
        </div>
      )}

      {items.map((post, i) => (
        <DesktopPostCard key={post.id} post={post} lang={lang} priority={i === 0} />
      ))}

      <div ref={sentinelRef} className="h-1" />

      {loadingMore && (
        <div className="overflow-hidden rounded-3xl border border-default bg-elevated">
          <PostCardSkeleton />
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">
          All nearby listings shown ✓
        </p>
      )}
    </div>
  );
}
