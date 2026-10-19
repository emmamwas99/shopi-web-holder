"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFeedPreferencesStore } from "@/stores/feedPreferences";

export type NearbyPermissionState =
  | "checking"
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

export interface NearbyCoords {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  label?: string | null;
}

type UseNearbyLocationOptions = {
  /**
   * The actual Nearby feed must be keyed by the device's current fix, not the
   * persisted seed from an earlier city. For You can still use the seed because
   * it only gives ranking a soft local hint and must not surprise users with a
   * location prompt.
   */
  requireLiveLocation?: boolean;
  useCachedLocation?: boolean;
};

/**
 * The persisted location is a render seed, not a source of truth. Anything
 * older than this triggers a silent GPS re-read so a user who travelled
 * (Nyahururu → Nanyuki) is not pinned to where they last opened the tab.
 */
const STALE_AFTER_MS = 10 * 60_000;
const DEFAULT_BROWSER_LOCATION_MAX_AGE_MS = 5 * 60_000;
const LIVE_BROWSER_LOCATION_MAX_AGE_MS = 10 * 60_000;
const DEFAULT_LOCATION_TIMEOUT_MS = 10_000;
const LIVE_LOCATION_TIMEOUT_MS = 3_000;

/**
 * Below this, a new fix is treated as GPS jitter and the previous coordinates
 * are kept. The feed query is keyed by lat/lng, so adopting every few-metre
 * drift would miss the Apollo cache and reset accumulated pagination pages.
 */
const SIGNIFICANT_MOVE_METERS = 500;

function metersBetween(a: NearbyCoords, b: NearbyCoords): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Owns the geolocation permission flow and the persisted "nearby" position,
 * shared by the mobile NearbyGrid and the DesktopNearbyColumn.
 */
export function useNearbyLocation({
  requireLiveLocation = false,
  useCachedLocation = true,
}: UseNearbyLocationOptions = {}) {
  const [permState, setPermState] = useState<NearbyPermissionState>("checking");
  const [location, setLocation] = useState<NearbyCoords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const cachedLocation = useFeedPreferencesStore((s) => s.nearbyLocation);
  const setCachedNearbyLocation = useFeedPreferencesStore(
    (s) => s.setNearbyLocation,
  );
  const clearCachedNearbyLocation = useFeedPreferencesStore(
    (s) => s.clearNearbyLocation,
  );

  // Start consistently on server and client; the effect below reads persisted
  // browser data after hydration without changing the initial HTML.
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const requestIdRef = useRef(0);

  // Read the stored position inside callbacks without making them depend on
  // (and re-run for) every coordinate change.
  const readCached = () => useFeedPreferencesStore.getState().nearbyLocation;

  const effectiveLocation: NearbyCoords | null =
    location ?? (useCachedLocation && prefsHydrated ? cachedLocation : null);

  // A cached position means we can render the feed immediately; a background
  // refresh must never drop the UI back to a spinner.
  const effectivePermState: NearbyPermissionState = effectiveLocation
    ? "granted"
    : permState;

  const clearPendingLocationRequest = useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  const requestLocation = useCallback(
    ({ silent = false }: { silent?: boolean } = {}) => {
      if (!navigator.geolocation) {
        setPermState("unavailable");
        return;
      }
      clearPendingLocationRequest();
      const requestId = requestIdRef.current;
      const isCurrentRequest = () => requestIdRef.current === requestId;

      if (!silent) {
        if (requireLiveLocation) setLocation(null);
        setPermState("requesting");
      }
      setGeoError(null);

      const handlePosition = (pos: GeolocationPosition) => {
        if (!isCurrentRequest()) return;

        const next: NearbyCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          label: "your current location",
        };
        const previous = readCached();
        const moved =
          !previous || metersBetween(previous, next) >= SIGNIFICANT_MOVE_METERS;

        if (moved) {
          setLocation(next);
          setCachedNearbyLocation(next);
        } else {
          // Same place: refresh the stored timestamp so we stop re-polling,
          // but keep the exact coordinates the feed query is already keyed by.
          setLocation(previous);
          setCachedNearbyLocation(previous);
        }
        setPermState("granted");
      };

      const failLocationRequest = (err: GeolocationPositionError) => {
        if (!isCurrentRequest()) return;

        const message =
          err.code === err.TIMEOUT
            ? "Location took too long. Tap Refresh and try again."
            : "Couldn't get your location. Check that location services are enabled for this browser.";
        setGeoError(message);
        if (requireLiveLocation) setLocation(null);
        setPermState("granted");
      };

      const handleError = (err: GeolocationPositionError) => {
        if (!isCurrentRequest()) return;

        if (err.code === err.PERMISSION_DENIED) {
          clearCachedNearbyLocation();
          setLocation(null);
          setPermState("denied");
          return;
        }

        failLocationRequest(err);
      };

      navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
        enableHighAccuracy: false,
        timeout: requireLiveLocation
          ? LIVE_LOCATION_TIMEOUT_MS
          : DEFAULT_LOCATION_TIMEOUT_MS,
        maximumAge: requireLiveLocation
          ? LIVE_BROWSER_LOCATION_MAX_AGE_MS
          : DEFAULT_BROWSER_LOCATION_MAX_AGE_MS,
      });
    },
    [
      clearCachedNearbyLocation,
      clearPendingLocationRequest,
      requireLiveLocation,
      setCachedNearbyLocation,
    ],
  );

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      clearPendingLocationRequest();
    };
  }, [clearPendingLocationRequest]);

  useEffect(() => {
    if (prefsHydrated) return;
    const persist = useFeedPreferencesStore.persist;
    if (!persist) {
      // Zustand omits its persist API during SSR or when browser storage is
      // unavailable. There is no saved location to wait for in that case.
      setPrefsHydrated(true);
      return;
    }
    if (persist.hasHydrated()) {
      setPrefsHydrated(true);
      return;
    }
    return persist.onFinishHydration(() => setPrefsHydrated(true));
  }, [prefsHydrated]);

  // Resolve the position on mount, and again whenever the stored one has gone
  // stale — including on tab re-focus, which is when a moved user comes back.
  useEffect(() => {
    if (!prefsHydrated) return;

    if (!navigator.geolocation) {
      queueMicrotask(() => setPermState("unavailable"));
      return;
    }

    const resolve = () => {
      const current = readCached();
      const needsFreshFix =
        requireLiveLocation ||
        !current ||
        Date.now() - current.updatedAt > STALE_AFTER_MS;
      if (!needsFreshFix) return;

      if (!navigator.permissions?.query) {
        // No Permissions API (older Safari): with nothing cached we must wait
        // for a tap unless this caller explicitly needs live Nearby results.
        if (current || requireLiveLocation) {
          requestLocation({ silent: Boolean(current && useCachedLocation) });
        } else {
          setPermState("idle");
        }
        return;
      }

      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "granted") {
            requestLocation({ silent: Boolean(current && useCachedLocation) });
          } else if (result.state === "denied") {
            clearCachedNearbyLocation();
            setPermState("denied");
          } else if (requireLiveLocation) {
            requestLocation();
          } else {
            setPermState(current && useCachedLocation ? "granted" : "idle");
          }
        })
        .catch(() => {
          if (requireLiveLocation) requestLocation();
          else setPermState(current && useCachedLocation ? "granted" : "idle");
        });
    };

    // A fresh stored position short-circuits this; `effectivePermState`
    // already reports "granted" whenever one exists, so no state change is
    // needed on that path.
    resolve();

    const onVisible = () => {
      if (document.visibilityState === "visible") resolve();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [
    clearCachedNearbyLocation,
    prefsHydrated,
    requestLocation,
    requireLiveLocation,
    useCachedLocation,
  ]);

  const refreshLocation = useCallback(
    () => requestLocation({ silent: true }),
    [requestLocation],
  );

  return {
    location: effectiveLocation,
    permState: effectivePermState,
    geoError,
    requestLocation,
    refreshLocation,
  };
}
