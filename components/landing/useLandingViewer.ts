"use client";

import { useSyncExternalStore } from "react";
import { useAuthStore } from "@/stores/auth";

export type LandingViewer = { firstName: string | null; avatar: string | null };

let cachedKey = "";
let cachedViewer: LandingViewer | null = null;

function readViewer(): LandingViewer | null {
  const { accessToken, user } = useAuthStore.getState();
  if (!accessToken) {
    cachedKey = "";
    cachedViewer = null;
    return null;
  }
  const firstName = user?.profile?.firstName?.trim() || null;
  const avatar = user?.profile?.avatar || null;
  // useSyncExternalStore needs the same object back while nothing changed.
  const key = `${firstName}|${avatar}`;
  if (key !== cachedKey || !cachedViewer) {
    cachedKey = key;
    cachedViewer = { firstName, avatar };
  }
  return cachedViewer;
}

/**
 * Who's looking at a marketing page: null when signed out, otherwise their
 * first name and photo for the "Continue as …" buttons.
 *
 * The homepage is one cached HTML for everyone, so the server always renders
 * the signed-out buttons; the signed-in ones take over right after hydration
 * (the server snapshot is null, so there is no hydration mismatch). Reads the
 * persisted auth store only — the homepage ships without Apollo.
 */
export function useLandingViewer(): LandingViewer | null {
  return useSyncExternalStore(useAuthStore.subscribe, readViewer, () => null);
}
