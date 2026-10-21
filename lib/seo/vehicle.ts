import { CAR_SUBCATEGORY } from "./search-intent-pages";

/**
 * Car listings: what the seller's specs say about the vehicle, and a title
 * built from them.
 *
 * Car buyers in Kenya search by year, make and model ("toyota prado 2018 for
 * sale in kenya"), but sellers often title the listing "Vehicle", "Cars" or
 * "Car for sale" and put the make and model only in the specs. The specs come
 * from the composer's car fields, so their keys are stable enough to read:
 * Make, Model, Year (or Year of Manufacture), Mileage, Condition,
 * Transmission, Fuel Type, Body Type, Engine Size, Drive, Exterior Colour.
 */

type Spec = { key?: string | null; value?: string | null };

export type VehicleSpecs = {
  year?: string;
  make?: string;
  model?: string;
  mileageKm?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  engineSize?: string;
  drive?: string;
  colour?: string;
  steering?: string;
};

/** Whether the classifier filed the listing under passenger cars. */
export function isCarListing(
  classification?: { level2?: string | null } | null,
): boolean {
  return (
    classification?.level2?.trim().toLowerCase() ===
    CAR_SUBCATEGORY.toLowerCase()
  );
}

const YEAR = /^(19[5-9]\d|20\d\d)$/;

export function vehicleSpecs(specs: Spec[] | null | undefined): VehicleSpecs {
  const byKey = new Map(
    (specs ?? [])
      .filter((spec) => spec.key?.trim() && spec.value?.trim())
      .map((spec) => [spec.key!.trim().toLowerCase(), spec.value!.trim()]),
  );
  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = byKey.get(key);
      if (value) return value;
    }
    return undefined;
  };

  const year = read("year", "year of manufacture", "manufacture year");
  const make = read("make", "brand", "make and model");
  let model = read("model");
  // Sellers put the year in the model field ("Model: 2009"), or repeat the
  // make there ("Make: Vauxhall Insignia", "Model: Insignia").
  if (
    model &&
    (YEAR.test(model) || make?.toLowerCase().includes(model.toLowerCase()))
  ) {
    model = undefined;
  }
  const mileage = Number(read("mileage", "odometer")?.replace(/[^\d.]/g, ""));

  return {
    year: year && YEAR.test(year) ? year : undefined,
    make,
    model,
    mileageKm: Number.isFinite(mileage) && mileage > 0 ? mileage : undefined,
    fuelType: read("fuel type", "fuel"),
    transmission: read("transmission", "gearbox"),
    bodyType: read("body type", "type", "body"),
    engineSize: read("engine size", "engine capacity", "engine"),
    drive: read("drive", "drivetrain", "drive type"),
    colour: read("exterior colour", "exterior color", "colour", "color"),
    steering: read("drive side", "steering"),
  };
}

// Words that say "this is a vehicle" and nothing else. A title made only of
// these ("Car for sale", "Old used cars", "Vehicle s") carries no make, model
// or year, so the specs replace it rather than being appended to it.
const GENERIC = new Set([
  "a",
  "an",
  "and",
  "available",
  "buy",
  "car",
  "cars",
  "clean",
  "for",
  "hand",
  "my",
  "new",
  "old",
  "on",
  "s",
  "h",
  "sale",
  "second",
  "selling",
  "the",
  "used",
  "vehicle",
  "vehicles",
]);

const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/**
 * The listing's title as a car buyer would search for it: year, make and
 * model, taken from the specs where the seller's title leaves them out.
 *
 * - "Toyota Land Cruiser ZX V8 bronze SUV" (2018) → "2018 Toyota Land Cruiser ZX V8 bronze SUV"
 * - "Cars" (Toyota, Prado, 2018) → "2018 Toyota Prado"
 * - "Clean and well kept" (Mazda, CX-5, 2018) → "2018 Mazda CX-5 – Clean and well kept"
 *
 * Without a make or model in the specs the seller's title is kept as it is.
 */
export function carListingTitle(title: string, vehicle: VehicleSpecs): string {
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  if (!name) return title;

  const titleWords = new Set(words(title));
  // Compacted as well, so "Mazda CX-5" matches a title saying "mazda cx5".
  const compact = (text: string) => words(text).join("");
  const mentionsVehicle =
    words(name).every((word) => titleWords.has(word)) ||
    compact(title).includes(compact(name));
  const withYear = (text: string) =>
    vehicle.year && !titleWords.has(vehicle.year)
      ? `${vehicle.year} ${text}`
      : text;

  if (mentionsVehicle) return withYear(title);
  // "BMW 3 Series" with model "320i" → "2009 BMW 3 Series (320i)".
  if (
    vehicle.make &&
    vehicle.model &&
    compact(title).includes(compact(vehicle.make))
  ) {
    return `${withYear(title)} (${vehicle.model})`;
  }
  const fullName = vehicle.year ? `${vehicle.year} ${name}` : name;
  const generic = [...titleWords].every((word) => GENERIC.has(word));
  return generic ? fullName : `${fullName} – ${title}`;
}
