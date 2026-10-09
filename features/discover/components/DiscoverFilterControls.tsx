"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DISTANCE_MAX_KM,
  DISTANCE_MIN_KM,
  useDiscoverFiltersStore,
  type DiscoverContentType,
} from "@/stores/discoverFilters";

/**
 * Filter controls shared by the mobile filter drawer and the desktop sidebar,
 * bound straight to the discover filters store so both surfaces always show
 * the same state.
 *
 * Anything that changes continuously — typing a price, dragging the distance
 * slider — edits a local draft and only commits to the store (which is what
 * the queries read) once the input has been still for a moment. Committing on
 * every keystroke or slider tick fired a feed query, a count query and three
 * facet queries per step.
 */

const COMMIT_DELAY_MS = 450;

export const CONTENT_TYPE_OPTIONS: Array<{ value: DiscoverContentType | null; label: string }> = [
  { value: null, label: "All" },
  { value: "IMAGE", label: "Photos" },
  { value: "VIDEO", label: "Videos" },
];

export const POSTED_WITHIN_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "Any time" },
  { value: 1, label: "Last 24 hours" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
];

export function postedWithinLabel(days: number | null): string {
  return POSTED_WITHIN_OPTIONS.find((option) => option.value === days)?.label ?? "Any time";
}

/**
 * A local copy of `value` that commits back after the user pauses. An outside
 * change (Clear, a shared link) replaces the draft — unless it is the value
 * this hook itself just committed.
 */
function useDebouncedDraft<T>(value: T, commit: (next: T) => void, delay = COMMIT_DELAY_MS) {
  const [draft, setDraft] = useState(value);
  const lastCommitted = useRef(value);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (Object.is(value, lastCommitted.current)) return;
    lastCommitted.current = value;
    setDraft(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const update = (next: T) => {
    setDraft(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      lastCommitted.current = next;
      commit(next);
    }, delay);
  };

  return [draft, update] as const;
}

export function PriceRangeFields({ compact = false }: { compact?: boolean }) {
  const minPrice = useDiscoverFiltersStore((s) => s.minPrice);
  const maxPrice = useDiscoverFiltersStore((s) => s.maxPrice);
  const setMinPrice = useDiscoverFiltersStore((s) => s.setMinPrice);
  const setMaxPrice = useDiscoverFiltersStore((s) => s.setMaxPrice);
  const [minDraft, updateMin] = useDebouncedDraft(minPrice, setMinPrice);
  const [maxDraft, updateMax] = useDebouncedDraft(maxPrice, setMaxPrice);

  const inputClass = compact
    ? "h-9 min-w-0 rounded-lg border border-border bg-transparent px-2 text-xs font-semibold outline-none focus:border-primary"
    : "h-11 w-full rounded-xl border border-border bg-elevated px-3 text-[15px] text-main outline-none placeholder:text-muted focus:border-primary";

  return (
    <div className={cn("grid grid-cols-2", compact ? "gap-2" : "gap-3")}>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="Min"
        value={minDraft}
        onChange={(event) => updateMin(event.target.value)}
        aria-label="Minimum price in KSh"
        className={inputClass}
      />
      <input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="Max"
        value={maxDraft}
        onChange={(event) => updateMax(event.target.value)}
        aria-label="Maximum price in KSh"
        className={inputClass}
      />
    </div>
  );
}

/** Photos / Videos as one segmented control. */
export function ContentTypeSegments({ compact = false }: { compact?: boolean }) {
  const selectedType = useDiscoverFiltersStore((s) => s.selectedType);
  const setSelectedType = useDiscoverFiltersStore((s) => s.setSelectedType);

  return (
    <div
      role="radiogroup"
      aria-label="Content type"
      className={cn("grid grid-cols-3 rounded-xl bg-surface p-1", compact ? "gap-0.5" : "gap-1")}
    >
      {CONTENT_TYPE_OPTIONS.map((option) => {
        const active = selectedType === option.value;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setSelectedType(option.value)}
            className={cn(
              "rounded-lg font-semibold transition-colors",
              compact ? "h-7 text-xs" : "h-9 text-sm",
              active ? "bg-elevated text-main shadow-sm" : "text-muted hover:text-main",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type LocateState = "idle" | "locating" | "denied" | "unavailable";

/**
 * The slider runs on a logarithmic scale: 1–10 km fills the left half of the
 * track and 10–100 km the right, so short distances — where the difference
 * between 3 and 5 km matters — get as much room under the thumb as long ones.
 * On a linear 1–100 track they would share its first tenth. The thumb moves
 * through SLIDER_STEPS fine positions (smooth, no snapping); the radius is the
 * position rounded to a whole km, so every km from 1 to 100 is reachable.
 */
const SLIDER_STEPS = 1000;
const RANGE_RATIO = Math.log(DISTANCE_MAX_KM / DISTANCE_MIN_KM);

function kmAt(position: number): number {
  const km = DISTANCE_MIN_KM * Math.exp((position / SLIDER_STEPS) * RANGE_RATIO);
  return Math.min(DISTANCE_MAX_KM, Math.max(DISTANCE_MIN_KM, Math.round(km)));
}

function positionOf(km: number): number {
  const clamped = Math.min(DISTANCE_MAX_KM, Math.max(DISTANCE_MIN_KM, km));
  return Math.round((Math.log(clamped / DISTANCE_MIN_KM) / RANGE_RATIO) * SLIDER_STEPS);
}

/**
 * "Near me" with a radius. The first tap asks the browser for the viewer's
 * position; after that the slider picks how far out to look. The position is
 * held in memory only — it never goes into the URL, so a shared link can't
 * reveal where someone was standing.
 */
export function DistanceFilter({ compact = false }: { compact?: boolean }) {
  const nearby = useDiscoverFiltersStore((s) => s.nearby);
  const radiusKm = useDiscoverFiltersStore((s) => s.radiusKm);
  const setNearby = useDiscoverFiltersStore((s) => s.setNearby);
  const setRadiusKm = useDiscoverFiltersStore((s) => s.setRadiusKm);
  const [locate, setLocate] = useState<LocateState>("idle");

  // The thumb's own position, kept locally so dragging is smooth; the store
  // (which the queries read) only gets the rounded km once the thumb rests.
  const [position, setPosition] = useState(() => positionOf(radiusKm));
  const committedKm = useRef(radiusKm);
  const commitTimer = useRef<number | null>(null);
  const draftKm = kmAt(position);

  // An outside change (Clear, the other surface) moves the thumb — but not our
  // own commit, which would snap it back to the rounded km mid-drag.
  useEffect(() => {
    if (radiusKm === committedKm.current) return;
    committedKm.current = radiusKm;
    setPosition(positionOf(radiusKm));
  }, [radiusKm]);

  useEffect(
    () => () => {
      if (commitTimer.current) window.clearTimeout(commitTimer.current);
    },
    [],
  );

  function moveTo(next: number) {
    const clamped = Math.min(SLIDER_STEPS, Math.max(0, next));
    setPosition(clamped);
    if (commitTimer.current) window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => {
      const km = kmAt(clamped);
      committedKm.current = km;
      setRadiusKm(km);
    }, COMMIT_DELAY_MS);
  }

  /** Arrow keys step one whole km (PageUp/PageDown ten), not one fine position. */
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
      PageUp: 10,
      PageDown: -10,
    };
    const delta = steps[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    moveTo(positionOf(draftKm + delta));
  }

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocate("unavailable");
      return;
    }
    setLocate("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocate("idle");
        setNearby({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => setLocate(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  const text = compact ? "text-xs" : "text-sm";

  if (!nearby) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={requestLocation}
          disabled={locate === "locating"}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border border-border font-semibold text-main transition-colors hover:bg-surface disabled:opacity-60",
            compact ? "h-9 text-xs" : "h-11 text-sm",
          )}
        >
          {locate === "locating" ? (
            <InterlockingBalls size={16} />
          ) : (
            <LocateFixed className="h-4 w-4" aria-hidden />
          )}
          {locate === "locating" ? "Finding you…" : "Use my location"}
        </button>
        {locate === "denied" ? (
          <p className={cn("text-muted", compact ? "text-[11px]" : "text-xs")}>
            Location access is off. Allow it in your browser settings to filter by distance.
          </p>
        ) : locate === "unavailable" ? (
          <p className={cn("text-muted", compact ? "text-[11px]" : "text-xs")}>
            Couldn’t find your location. Try again, or pick a region instead.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className={cn("font-semibold text-main", text)}>Within {draftKm} km of you</p>
        <button
          type="button"
          onClick={() => setNearby(null)}
          className={cn("shrink-0 font-semibold text-muted underline underline-offset-2", compact ? "text-[11px]" : "text-xs")}
        >
          Turn off
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={SLIDER_STEPS}
        step={1}
        value={position}
        onChange={(event) => moveTo(Number(event.target.value))}
        onKeyDown={onKeyDown}
        aria-label="Distance from you"
        aria-valuetext={`${draftKm} km`}
        className="w-full accent-primary"
      />
      {/* 10 km sits exactly mid-track on the log scale. */}
      <div className={cn("relative flex justify-between text-muted", compact ? "text-[10px]" : "text-[11px]")}>
        <span>{DISTANCE_MIN_KM} km</span>
        <span className="absolute left-1/2 -translate-x-1/2">10 km</span>
        <span>{DISTANCE_MAX_KM} km</span>
      </div>
    </div>
  );
}
