"use client";

import { useState } from "react";
import { LocateFixed, MapPin, Store } from "lucide-react";
import { useFeedPreferencesStore } from "@/stores/feedPreferences";
import { useNearbyLocation } from "../hooks/useNearbyLocation";
import { useNearbyFeed } from "../hooks/useFeed";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { PostCard } from "./PostCard";
import { FeedCardsSkeleton, FeedPaginationSkeleton } from "./FeedSkeleton";
import { NearbyPlaceSheet } from "./NearbyPlaceSheet";

const RADII = [5, 10, 20, 50, 100, 200] as const;

export function NearbyFeedTab({ lang, active = true }: { lang: string; active?: boolean }) {
  const [placeSheetOpen, setPlaceSheetOpen] = useState(false);
  const manualPlace = useFeedPreferencesStore((state) => state.homeNearbyPlace);
  const setManualPlace = useFeedPreferencesStore((state) => state.setHomeNearbyPlace);
  const radiusKm = useFeedPreferencesStore((state) => state.homeNearbyRadiusKm);
  const setRadiusKm = useFeedPreferencesStore((state) => state.setHomeNearbyRadiusKm);
  const { location, permState, geoError, requestLocation } = useNearbyLocation({
    requireLiveLocation: active && !manualPlace,
    useCachedLocation: false,
  });
  const point = manualPlace ?? location;
  const label = manualPlace?.label ?? location?.label ?? null;
  const feed = useNearbyFeed(point, radiusKm);
  const { sentinelRef } = useInfiniteScroll({
    enabled: active && Boolean(point),
    hasMore: feed.hasMore,
    loading: feed.loading || feed.loadingMore,
    onLoadMore: feed.loadMore,
  });

  const changeRadius = (next: number) => {
    setRadiusKm(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const placeSheet = (
    <NearbyPlaceSheet
      open={placeSheetOpen}
      manual={Boolean(manualPlace)}
      label={label}
      onOpenChange={setPlaceSheetOpen}
      onUseCurrentLocation={() => {
        if (manualPlace) setManualPlace(null);
        else requestLocation();
        window.scrollTo({ top: 0, behavior: "instant" });
      }}
      onChoose={(place) => {
        setManualPlace(place);
        window.scrollTo({ top: 0, behavior: "instant" });
      }}
    />
  );

  if (!point) {
    const loadingLocation = permState === "checking" || permState === "requesting";
    return (
      <>
        <div className="flex min-h-[65svh] flex-col items-center justify-center px-6 text-center">
          <span className="mb-4 grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <MapPin size={25} aria-hidden />
          </span>
          <h2 className="text-base font-bold text-main">
            {loadingLocation ? "Finding your location…" :
              permState === "denied" ? "Location is off for Shopi" :
              geoError || permState === "unavailable" ? "Couldn’t find your location" :
              "Discover sellers near you"}
          </h2>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
            {loadingLocation ? "Looking for listings around you." :
              permState === "denied" ? "Allow location in your browser settings, or pick a place instead." :
              geoError ?? "See listings from sellers around you. Shopi only uses your location to find nearby posts."}
          </p>
          {!loadingLocation && (
            <div className="mt-6 flex flex-col items-center gap-2">
              {permState !== "denied" && permState !== "unavailable" && (
                <button type="button" onClick={() => requestLocation()} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
                  {geoError ? "Try again" : "Enable location"}
                </button>
              )}
              <button type="button" onClick={() => setPlaceSheetOpen(true)} className="min-h-11 px-4 text-sm font-semibold text-primary">
                Pick a place instead
              </button>
            </div>
          )}
        </div>
        {placeSheet}
      </>
    );
  }

  const wider = RADII.find((option) => option > radiusKm);

  return (
    <div className="min-h-svh pb-6">
      <section className="mb-2 border-b border-border/60 bg-elevated py-3">
        <div className="flex items-center gap-2 px-4">
          <MapPin size={17} className="shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-sm text-muted">
            Within {radiusKm} km of <strong className="font-semibold text-main">{label ?? "you"}</strong>
          </p>
          <button type="button" onClick={() => setPlaceSheetOpen(true)} className="flex min-h-9 shrink-0 items-center gap-1 text-sm font-semibold text-primary">
            <LocateFixed size={16} aria-hidden /> Change
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="Distance">
          {RADII.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={radiusKm === option}
              onClick={() => changeRadius(option)}
              className={`min-h-9 min-w-15 shrink-0 rounded-full px-3.5 text-sm font-medium ${radiusKm === option ? "bg-primary text-white" : "bg-surface text-main"}`}
            >
              {option} km
            </button>
          ))}
        </div>
      </section>
      {feed.loading && feed.items.length === 0 ? (
        <FeedCardsSkeleton />
      ) : feed.error && feed.items.length === 0 ? (
        <div className="flex min-h-[50svh] flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-muted">Nearby listings couldn’t load.</p>
          <button type="button" onClick={() => void feed.refetch().catch(() => {})} className="mt-3 min-h-11 px-4 text-sm font-semibold text-primary">Try again</button>
        </div>
      ) : feed.items.length === 0 ? (
        <div className="flex min-h-[50svh] flex-col items-center justify-center px-6 text-center">
          <Store size={30} className="mb-3 text-primary" aria-hidden />
          <h2 className="text-base font-bold text-main">Nothing within {radiusKm} km yet</h2>
          <p className="mt-2 max-w-xs text-sm text-muted">No listings near {label ?? "you"} yet. Try a wider distance or change location.</p>
          {wider && <button type="button" onClick={() => changeRadius(wider)} className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white">Show within {wider} km</button>}
          <button type="button" onClick={() => setPlaceSheetOpen(true)} className="mt-2 min-h-11 px-4 text-sm font-semibold text-primary">Change location</button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {feed.items.map((post, index) => <PostCard key={post.id} post={post} lang={lang} priority={index === 0} />)}
          </div>
          <div ref={sentinelRef} className="h-1" />
          {feed.loadingMore && <FeedPaginationSkeleton />}
          {!feed.hasMore && <p className="py-6 text-center text-xs text-muted">That’s everything nearby</p>}
        </>
      )}
      {placeSheet}
    </div>
  );
}
