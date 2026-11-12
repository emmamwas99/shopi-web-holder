"use client";

import { useEffect, useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { Check, LocateFixed, LoaderCircle, MapPin, Search, X } from "lucide-react";
import {
  LocationResolveDocument,
  LocationWardSearchDocument,
} from "@/types/__generated__/graphql";
import type { NearbySearchPlace } from "@/stores/feedPreferences";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export function NearbyPlaceSheet({
  open,
  manual,
  label,
  onOpenChange,
  onUseCurrentLocation,
  onChoose,
}: {
  open: boolean;
  manual: boolean;
  label: string | null;
  onOpenChange: (open: boolean) => void;
  onUseCurrentLocation: () => void;
  onChoose: (place: NearbySearchPlace) => void;
}) {
  const client = useApolloClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [choosing, setChoosing] = useState<string | null>(null);
  const [chooseError, setChooseError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const searchingFor = query.trim();
  const results = useQuery(LocationWardSearchDocument, {
    variables: { input: debouncedQuery },
    skip: !open || debouncedQuery.length < 2,
    fetchPolicy: "network-only",
  });
  const predictions = debouncedQuery === searchingFor
    ? results.data?.wardSearch ?? []
    : [];
  const searching = searchingFor.length >= 2 &&
    (debouncedQuery !== searchingFor || results.loading);

  async function choose(placeId: string, name: string) {
    if (choosing) return;
    setChoosing(placeId);
    setChooseError(null);
    try {
      const { data } = await client.query({
        query: LocationResolveDocument,
        variables: { placeId },
        fetchPolicy: "network-only",
      });
      const coordinates = data?.resolveGooglePlace.location.coordinates;
      if (!coordinates) throw new Error("Missing place coordinates");
      onChoose({
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        label: name,
      });
      onOpenChange(false);
    } catch {
      setChooseError("Couldn’t find that place. Try a nearby town or area.");
    } finally {
      setChoosing(null);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto flex h-[75dvh] max-w-2xl flex-col border-border bg-elevated">
        <DrawerHeader className="flex shrink-0 items-center justify-between px-5 pb-2 text-left">
          <div>
            <DrawerTitle>Show listings near</DrawerTitle>
            <DrawerDescription className="sr-only">
              Choose your location or search for a town, estate, or area.
            </DrawerDescription>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-surface text-muted">
            <X size={18} aria-hidden />
          </button>
        </DrawerHeader>
        <div className="mx-5 mb-2 flex h-11 shrink-0 items-center gap-2 rounded-full bg-surface px-4">
          <Search size={17} className="shrink-0 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setChooseError(null);
            }}
            placeholder="Search a town, estate or area"
            aria-label="Search for a place"
            className="min-w-0 flex-1 bg-transparent text-base text-main outline-none placeholder:text-muted"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              onUseCurrentLocation();
              onOpenChange(false);
            }}
            className="flex min-h-16 w-full items-center gap-3 px-5 text-left active:bg-surface"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><LocateFixed size={19} aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-main">Use my current location</span>
              <span className="block truncate text-xs text-muted">{manual ? "Follow where you are" : label ? `Now: ${label}` : "Where you are now"}</span>
            </span>
            {!manual && <Check size={19} className="text-primary" aria-hidden />}
          </button>
          {manual && label && searchingFor.length < 2 && (
            <div className="flex min-h-14 items-center gap-3 px-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-main"><MapPin size={18} aria-hidden /></span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-main">{label}</span>
              <Check size={19} className="text-primary" aria-hidden />
            </div>
          )}
          {searchingFor.length < 2 ? (
            <p className="px-5 py-4 text-sm text-muted">Search for any town, estate or area to see what’s for sale there.</p>
          ) : searching ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted"><LoaderCircle size={17} className="animate-spin" aria-hidden />Searching places…</div>
          ) : results.error ? (
            <p className="px-5 py-5 text-sm text-muted">Places couldn’t load. Try again.</p>
          ) : predictions.length === 0 ? (
            <p className="px-5 py-5 text-sm text-muted">No places found for “{searchingFor}”.</p>
          ) : (
            predictions.map((prediction) => (
              <button
                key={prediction.placeId}
                type="button"
                disabled={choosing !== null}
                onClick={() => void choose(prediction.placeId, prediction.mainText ?? prediction.description)}
                className="flex min-h-14 w-full items-center gap-3 px-5 text-left active:bg-surface disabled:opacity-60"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-main"><MapPin size={18} aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-main">{prediction.mainText ?? prediction.description}</span>
                  {prediction.secondaryText && <span className="block truncate text-xs text-muted">{prediction.secondaryText}</span>}
                </span>
                {choosing === prediction.placeId && <LoaderCircle size={17} className="animate-spin text-primary" aria-hidden />}
              </button>
            ))
          )}
          {chooseError && <p role="alert" className="px-5 py-3 text-sm text-destructive">{chooseError}</p>}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
