/** How long Post may run before the seller is told to check and tap again. */
const PUBLISH_TIMEOUT_MS = 45_000;

export const PUBLISH_TIMEOUT_MESSAGE =
  "Posting is taking longer than usual. Check your connection and tap Post again. You won't get a duplicate post.";

export const PUBLISH_UNCONFIRMED_MESSAGE =
  "We couldn't confirm your post. Tap Post again. You won't get a duplicate post.";

/**
 * Apollo context for the publish mutation that gives up after a while instead
 * of spinning forever on a dead connection. Safe because publishing is
 * idempotent on the API: tapping Post again returns the post the draft already
 * became, so a request that timed out here but landed there can't double-post.
 */
export function publishTimeout(ms = PUBLISH_TIMEOUT_MS) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  return {
    context: { fetchOptions: { signal: controller.signal } },
    done: () => clearTimeout(timer),
    timedOut: () => timedOut,
  };
}
