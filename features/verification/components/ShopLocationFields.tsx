"use client";

import { useId, useState } from "react";
import { MapPin, Navigation, X } from "lucide-react";
import { LocationPickerDrawer } from "@/features/create/components/LocationPickerDrawer";
import type { DraftLocation } from "@/stores/create";
import type { ShopVerificationLocation, ShopVerificationLocationInput } from "../api";

const AREA_MAX = 160;
const ADDRESS_MAX = 200;

/** "X3W4+H9G" is how Google names a spot with no address — never an area name. */
const PLUS_CODE = /\b[0-9A-Z]{2,}\+[0-9A-Z]+\b/i;

export function hasPin(location: ShopVerificationLocation | null | undefined): boolean {
  return typeof location?.latitude === "number" && typeof location?.longitude === "number";
}

function hasArea(location: ShopVerificationLocation | null | undefined): boolean {
  return Boolean(location && (location.placeName?.trim() || location.subregion || location.county));
}

/** An area, plus a map pin or the building and street — the same rule the API applies. */
export function isLocationComplete(location: ShopVerificationLocation | null, addressLine: string): boolean {
  return hasArea(location) && (hasPin(location) || addressLine.trim().length > 0);
}

export function toLocationInput(
  location: ShopVerificationLocation | null,
  addressLine: string,
): ShopVerificationLocationInput {
  return {
    county: location?.county ?? null,
    subregion: location?.subregion ?? null,
    placeName: location?.placeName?.trim() || null,
    formattedAddress: location?.formattedAddress ?? null,
    placeId: location?.placeId ?? null,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    addressLine: addressLine.trim() || null,
  };
}

/**
 * Place labels joined once each. Pickers hand back "Nairobi, Kenya" as a
 * sub-county and "Ngong Rd, Nairobi, Kenya" as an address, so every label is
 * split on commas, and the country and any plus-code dropped.
 */
function joinPlaces(labels: Array<string | null | undefined>): string {
  const seen = new Set<string>();
  return labels
    .flatMap((label) => (label ?? "").split(","))
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.toLowerCase();
      if (!part || key === "kenya" || PLUS_CODE.test(part) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

/**
 * "Ngong, Kajiado": the seller's own area name and the county. The sub-county
 * the pin resolved to only stands in when there's no area name — a seller who
 * wrote "Ngong" doesn't want "Kajiado North" shown beside it.
 */
export function locationLabel(location?: ShopVerificationLocation | null): string {
  if (!location) return "";
  return joinPlaces([location.placeName?.trim() || location.subregion, location.county]);
}

/**
 * Fill the editable area name from the place's own labels, so the field opens
 * with what the map or the listing said and the seller only retypes it if
 * their customers know the area by another name.
 */
export function withAreaName(location: ShopVerificationLocation | null): ShopVerificationLocation | null {
  if (!location || location.placeName?.trim()) return location;
  const placeName = location.subregion || location.county || null;
  return placeName ? { ...location, placeName } : location;
}

function fromPicker(picked: DraftLocation): ShopVerificationLocation {
  const name = picked.placeName?.trim();
  return {
    placeName: (name && !PLUS_CODE.test(name) ? name : picked.subregion || picked.county) || null,
    formattedAddress: picked.formattedAddress || null,
    placeId: picked.placeId || null,
    latitude: picked.latitude ?? null,
    longitude: picked.longitude ?? null,
    county: picked.county ?? null,
    subregion: picked.subregion ?? null,
  };
}

function fromMap(location: ShopVerificationLocation | null): boolean {
  return Boolean(location && (hasPin(location) || location.placeId || location.formattedAddress));
}

/** What the map itself says, kept apart from the area name the seller can retype. */
function mapSummary(location: ShopVerificationLocation): string {
  return joinPlaces([location.formattedAddress, location.subregion, location.county]);
}

export type ShopLocationValue = { location: ShopVerificationLocation | null; addressLine: string };

/**
 * The shop's location, three ways in: pick it on the map, rename the area the
 * way customers know it ("Ngong Road", not the "Kajiado North" the map filled
 * in), and the building or landmark that gets a buyer to the door. When the
 * map is wrong the pin can go, and a typed area plus street is enough.
 *
 * `onChange` says how the value changed, so a caller that autosaves can save a
 * map pick at once and wait for the seller to stop typing.
 */
export function ShopLocationFields({
  value,
  onChange,
  sourceNote,
}: {
  value: ShopLocationValue;
  onChange: (next: ShopLocationValue, how: "pick" | "type") => void;
  /** Where a pre-filled location came from, e.g. "from your latest listing". */
  sourceNote?: string | null;
}) {
  const { location, addressLine } = value;
  const [pickerOpen, setPickerOpen] = useState(false);
  const areaId = useId();
  const addressId = useId();
  const mapped = fromMap(location);
  const pinned = hasPin(location);

  function removeMapLocation() {
    const placeName = location?.placeName?.trim();
    onChange({ location: placeName ? { placeName } : null, addressLine }, "pick");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        {mapped && location ? (
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-subtle text-main">
              <MapPin size={18} strokeWidth={1.9} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted">On the map</p>
              <p className="truncate text-[14px] font-semibold text-main">{mapSummary(location) || locationLabel(location)}</p>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold text-main transition-colors hover:bg-subtle"
            >
              Change
            </button>
            <button
              type="button"
              onClick={removeMapLocation}
              className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-main"
              aria-label="Remove map location"
            >
              <X size={17} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[rgb(var(--color-border-strong))] px-4 py-4 text-left transition-colors hover:bg-subtle active:bg-subtle"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-subtle text-main">
              <MapPin size={19} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-main">Find your shop on the map</span>
              <span className="block text-[12px] text-muted">Use your current location or search</span>
            </span>
          </button>
        )}

        <p className="mt-2 flex items-center gap-1.5 text-[12px] leading-4 text-muted">
          {pinned ? (
            <>
              <Navigation size={12} strokeWidth={2.2} className="shrink-0 text-[#1D9BF0]" aria-hidden />
              Map pin added{sourceNote ? ` · ${sourceNote}` : ""}
            </>
          ) : sourceNote ? (
            `${sourceNote.charAt(0).toUpperCase()}${sourceNote.slice(1)} — change it if your shop is elsewhere`
          ) : mapped ? (
            "No map pin — add the building and street below"
          ) : (
            "Map wrong, or your place isn’t on it? Type your area and street below."
          )}
        </p>
      </div>

      <div>
        <label htmlFor={areaId} className="text-[13px] font-semibold text-main">
          Area name
        </label>
        <input
          id={areaId}
          value={location?.placeName ?? ""}
          maxLength={AREA_MAX}
          autoComplete="address-level2"
          onChange={(event) =>
            onChange({ location: { ...(location ?? {}), placeName: event.target.value }, addressLine }, "type")
          }
          placeholder="e.g. Ngong Road"
          className="mt-1.5 h-11 w-full rounded-lg border border-border bg-app px-3 text-[14px] text-main outline-none transition-colors placeholder:text-[14px] focus:border-[#1D9BF0]"
        />
        <p className="mt-1.5 text-[12px] leading-4 text-muted">
          The name buyers see. Write it the way your customers know your area.
        </p>
      </div>

      <div>
        <label htmlFor={addressId} className="text-[13px] font-semibold text-main">
          Building, street or landmark
          {pinned ? <span className="font-normal text-muted"> · optional</span> : null}
        </label>
        <input
          id={addressId}
          value={addressLine}
          maxLength={ADDRESS_MAX}
          autoComplete="street-address"
          onChange={(event) => onChange({ location, addressLine: event.target.value }, "type")}
          placeholder="e.g. Prestige Plaza, 2nd floor"
          className="mt-1.5 h-11 w-full rounded-lg border border-border bg-app px-3 text-[14px] text-main outline-none transition-colors placeholder:text-[14px] focus:border-[#1D9BF0]"
        />
      </div>

      <LocationPickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(picked) => onChange({ location: fromPicker(picked), addressLine }, "pick")}
      />
    </div>
  );
}
