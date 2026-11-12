"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useNearbyLocation } from "../hooks/useNearbyLocation";
import { useFeedPreferencesStore } from "@/stores/feedPreferences";

/** Re-prompt after this long even if previously dismissed — a "not now" from
 *  months ago shouldn't permanently opt someone out of better personalization. */
const RE_PROMPT_AFTER_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Inline banner on the For You feed nudging the seller to grant location
 * access, so `forYouFeed` can rank by where they actually are (see
 * useForYouFeed) instead of falling back to their saved profile address.
 * Only ever shown when permission hasn't been asked yet — never nags someone
 * who already granted or explicitly denied it.
 */
export function LocationPermissionBanner() {
  const { permState, requestLocation } = useNearbyLocation();
  const dismissedAt = useFeedPreferencesStore((s) => s.locationBannerDismissedAt);
  const dismissLocationBanner = useFeedPreferencesStore(
    (s) => s.dismissLocationBanner,
  );
  const [justRequested, setJustRequested] = useState(false);

  const recentlyDismissed =
    dismissedAt != null && Date.now() - dismissedAt < RE_PROMPT_AFTER_MS;

  if (permState !== "idle" || recentlyDismissed || justRequested) return null;

  return (
    <div className="mx-3 my-2 flex items-center gap-3 rounded-2xl border border-border bg-elevated px-4 py-3 shadow-sm sm:mx-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <svg
          width="18"
          height="18"
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
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-default">
          See what’s actually near you
        </p>
        <p className="app-microcopy">
          Enable location for a feed tailored to where you are right now.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          setJustRequested(true);
          requestLocation();
        }}
        className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform active:scale-95"
      >
        Enable
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismissLocationBanner}
        className="shrink-0 text-muted-foreground"
      >
        <X size={16} />
      </button>
    </div>
  );
}
