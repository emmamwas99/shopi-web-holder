export const FOR_YOU_REFRESH_EVENT = "shopi:refresh-for-you";
// Deduplicate bursts of focus, visibility and reconnect events; this schedules no requests.
export const FEED_RESUME_CHECK_MS = 15_000;

type Listing = { id: string; createdAt: unknown };

function createdAt(listing: Listing): number {
  const value = listing.createdAt;
  const time =
    value instanceof Date
      ? value.getTime()
      : typeof value === "string" || typeof value === "number"
        ? new Date(value).getTime()
        : 0;
  return Number.isFinite(time) ? time : 0;
}

/** Ignore reranking and edits: only unseen listings at least as new as the head qualify. */
export function hasNewListings(
  current: readonly Listing[],
  incoming: readonly Listing[],
): boolean {
  const known = new Set(current.map(({ id }) => id));
  const newest = current.reduce(
    (time, listing) => Math.max(time, createdAt(listing)),
    0,
  );
  return incoming.some(
    (listing) =>
      !known.has(listing.id) &&
      createdAt(listing) > 0 &&
      createdAt(listing) >= newest,
  );
}
