"use client";

import { useCallback, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { LogoutDocument } from "@/types/__generated__/graphql";
import { signOutAndLeave, useAuthStore } from "@/stores/auth";
import { REMOVE_WEB_PUSH_SUBSCRIPTION } from "@/features/messaging/graphql/operations";
import { detachBrowserPush } from "@/features/messaging/lib/browserPush";
import { disableGoogleAutoSelect } from "../lib/googleIdentity";

/** How long sign-out waits on push cleanup before going ahead regardless. */
const PUSH_DETACH_TIMEOUT_MS = 3000;

/** Revokes the refresh token, clears local auth state and returns to the feed. */
export function useLogout(lang: string) {
  // Primitive selector — stable reference, no object allocation
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [logoutMutation] = useMutation(LogoutDocument, {
    errorPolicy: "all",
  });
  const [removePushSubscription] = useMutation(REMOVE_WEB_PUSH_SUBSCRIPTION, {
    errorPolicy: "all",
  });
  // Stays true from the tap until the new page replaces this one, so the
  // button keeps saying "Logging out…" through the page load too.
  const [leaving, setLeaving] = useState(false);

  const logout = useCallback(async () => {
    setLeaving(true);
    try {
      // Detach this browser from the account's push first, while the session
      // is still valid — on a shared computer the next person would otherwise
      // keep seeing this account's message previews.
      await Promise.race([
        detachBrowserPush((endpoint) =>
          removePushSubscription({ variables: { endpoint } }),
        ),
        new Promise((resolve) => setTimeout(resolve, PUSH_DETACH_TIMEOUT_MS)),
      ]);
      if (refreshToken) {
        await logoutMutation({ variables: { refreshToken } });
      }
    } catch {
      // Offline or the API is down: this device signs out all the same.
    }
    // Signing out on purpose: Google's auto sign-in must not undo it the next
    // time the login screen opens.
    disableGoogleAutoSelect();
    signOutAndLeave(`/${lang}/for-you`);
  }, [refreshToken, logoutMutation, removePushSubscription, lang]);

  return { logout, loading: leaving };
}
