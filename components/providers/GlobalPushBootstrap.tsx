"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth";
import { detachBrowserPush } from "@/features/messaging/lib/browserPush";

type PushStatusResponse = {
  data?: {
    myWebPushStatus?: {
      isAvailable?: boolean;
      isEnabled?: boolean;
      isOptedOut?: boolean;
      publicKey?: string | null;
    };
  };
  errors?: Array<{ message?: string }>;
};

type PushStatusRecord = NonNullable<PushStatusResponse["data"]>["myWebPushStatus"];

type SaveSubscriptionResponse = {
  data?: {
    saveWebPushSubscription?: {
      isEnabled?: boolean;
    };
  };
  errors?: Array<{ message?: string }>;
};

function browserSupportsPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function base64ToUint8Array(value: string): Uint8Array {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const decoded = atob(padded);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

function uint8ToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function subscriptionMatchesKey(
  subscription: PushSubscription,
  serverKey: string,
): boolean {
  const appKey = subscription.options?.applicationServerKey;
  if (!appKey) return false;
  return uint8ToBase64Url(appKey) === serverKey.replace(/=+$/, "");
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/shopi-push-sw.js", {
    updateViaCache: "none",
  });
}

async function fetchPushStatus(
  accessToken: string,
): Promise<PushStatusRecord | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: `
        query MyWebPushStatusBootstrap {
          myWebPushStatus {
            isAvailable
            isEnabled
            isOptedOut
            publicKey
          }
        }
      `,
    }),
  });

  const payload = (await res.json()) as PushStatusResponse;
  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || "Could not load push status");
  }
  return payload.data?.myWebPushStatus ?? null;
}

async function saveSubscription(
  accessToken: string,
  lang: string,
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) {
    throw new Error("Could not read push subscription keys");
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: `
        mutation SaveWebPushSubscriptionBootstrap($input: SaveWebPushSubscriptionInput!) {
          saveWebPushSubscription(input: $input) {
            isEnabled
          }
        }
      `,
      variables: {
        input: {
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          locale: lang,
          userAgent: navigator.userAgent,
          // A refresh, not the user turning push on: the server will not let
          // it override an opt-out.
          background: true,
        },
      },
    }),
  });

  const payload = (await res.json()) as SaveSubscriptionResponse;
  if (payload.errors?.length) {
    throw new Error(
      payload.errors[0]?.message || "Could not save push subscription",
    );
  }
}

export function GlobalPushBootstrap({ lang }: { lang: string }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hadSessionRef = useRef(Boolean(accessToken));

  // However the session ends — signing out, an expired or revoked session, a
  // suspension — this browser must stop receiving the account's notifications.
  useEffect(() => {
    if (accessToken) {
      hadSessionRef.current = true;
      return;
    }
    if (!hadSessionRef.current) return;
    hadSessionRef.current = false;
    void detachBrowserPush();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !browserSupportsPush()) return;
    if (Notification.permission !== "granted") return;

    let cancelled = false;

    const sync = async () => {
      const status = await fetchPushStatus(accessToken);
      if (cancelled || !status?.isAvailable || !status.publicKey) return;
      // This runs on every page load and every access-token refresh. Without
      // this check it re-subscribed the browser each time, turning push back
      // on within minutes of the user switching it off.
      if (status.isOptedOut) return;

      const registration = await getRegistration();
      let subscription = await registration.pushManager.getSubscription();

      if (subscription && !subscriptionMatchesKey(subscription, status.publicKey)) {
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(
            status.publicKey,
          ) as unknown as BufferSource,
        });
      }

      if (cancelled) return;
      await saveSubscription(accessToken, lang, subscription);
    };

    void sync().catch((error) => {
      console.warn("[push] background bootstrap sync failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, lang]);

  return null;
}
