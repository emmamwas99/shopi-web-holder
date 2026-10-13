/**
 * Detach this browser from push notifications. Best-effort by design: there
 * may be no service worker or no subscription at all, and none of that may
 * hold up the caller — sign-out above all.
 *
 * Dropping the local subscription is enough to stop delivery on its own: the
 * push service then answers 404/410 and the API deactivates its row on the
 * next send. `removeOnServer` clears that row straight away as well, for
 * callers that still hold a valid session.
 */
export async function detachBrowserPush(
  removeOnServer?: (endpoint: string) => Promise<unknown>,
): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;

    if (removeOnServer) {
      await removeOnServer(subscription.endpoint).catch(() => {});
    }
    await subscription.unsubscribe().catch(() => {});
  } catch {
    // No service worker or no push support: nothing is subscribed here.
  }
}
