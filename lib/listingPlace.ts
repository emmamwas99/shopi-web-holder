/**
 * The place line on a listing — feed card, grid tile, listing page.
 *
 * The API's `displayAddress` is the seller's spot, then Google's address with
 * the plus code, postcode, county and country taken off: placeName "MON
 * Residence" with "JMJG+8J, Ngong, Kenya" reads "MON Residence, Ngong".
 * Showing the sub-county the pin fell in instead ("Kajiado North") made shops
 * look further from their buyers than they are.
 *
 * Data fetched without `displayAddress` (an older cache, a query that doesn't
 * ask for it) falls back to the place name, then the area.
 */

type ListingLocation = {
  displayAddress?: string | null;
  placeName?: string | null;
  subregion?: string | null;
  county?: string | null;
} | null;

/** "X3W4+H9G" is how Google names a spot with no address — never a place to show. */
const PLUS_CODE = /\b[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{0,3}\b/gi;

export function listingPlace(location?: ListingLocation): string | null {
  if (!location) return null;
  return (
    location.displayAddress?.trim() ||
    (location.placeName ?? "").replace(PLUS_CODE, " ").replace(/\s+/g, " ").trim() ||
    location.subregion?.trim() ||
    location.county?.trim() ||
    null
  );
}
