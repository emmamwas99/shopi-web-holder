/**
 * Opening a listing from the homepage's search suggestions goes through
 * Browse: the homepage sends the reader to /explore?q=…, and Browse opens the
 * listing on arrival (features/discover/components/SearchHandoff.tsx).
 *
 * That leaves history as Home → Browse → listing, so Back from the listing —
 * the in-app button and the phone's own back gesture alike — lands on the
 * results for that search, not on the homepage. Pushing the listing directly
 * and faking a different Back target can't do that: the phone's gesture only
 * ever goes to the entry that is really there.
 *
 * A module variable rather than a store or sessionStorage: it only has to
 * survive one client-side navigation, and a reload in between should drop it.
 */
let pendingListing: string | null = null;

export function openListingAfterBrowse(href: string): void {
  pendingListing = href;
}

/** Whether a listing is waiting to open — read during render, consumes nothing. */
export function hasPendingListing(): boolean {
  return pendingListing !== null;
}

/** The waiting listing, once. */
export function takePendingListing(): string | null {
  const href = pendingListing;
  pendingListing = null;
  return href;
}

/**
 * /explore with a search, encoded the way DiscoverPage writes its own URL
 * (spaces as "+"). If the two differed, DiscoverPage would replace the URL on
 * arrival, and a later navigation cancels a pending one — the listing push.
 */
export function browseSearchHref(lang: string, term: string): string {
  const query = new URLSearchParams(term ? { q: term } : {}).toString();
  return `/${lang}/explore${query ? `?${query}` : ""}`;
}
