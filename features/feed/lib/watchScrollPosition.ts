import {
  captureScrollPosition,
  restoreScrollPosition,
  type ScrollPosition,
} from "@/lib/scrollRestoration";

const MAX_AGE_MS = 15 * 60_000;

let pending: { position: ScrollPosition; at: number } | null = null;

/** Keep the Watch tab's anchored position while its video route is open. */
export function rememberWatchScrollPosition() {
  pending = { position: captureScrollPosition(), at: Date.now() };
}

export function hasPendingWatchScrollPosition() {
  if (!pending) return false;
  if (Date.now() - pending.at > MAX_AGE_MS) {
    pending = null;
    return false;
  }
  return true;
}

/** Restore once when Home becomes visible again, including after a remount. */
export function restoreWatchScrollPosition() {
  if (!hasPendingWatchScrollPosition()) return;
  const saved = pending;
  pending = null;
  if (!saved) return;
  restoreScrollPosition(saved.position);
}
