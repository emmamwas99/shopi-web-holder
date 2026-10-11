"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's choice about analytics and advertising cookies.
 *
 * Google Tag Manager — and through it Google Analytics and the Meta Pixel —
 * loads only after "granted". Essential storage (sign-in, theme, scroll
 * position) is not covered by this choice; Vercel Analytics is cookieless.
 *
 * Stored in localStorage, so the choice is per browser and survives visits.
 */
export type CookieConsent = "granted" | "denied";

const STORAGE_KEY = "shopi-cookie-consent";
const CHANGE_EVENT = "shopi:cookie-consent";
const OPEN_EVENT = "shopi:cookie-settings";

function read(): CookieConsent | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(value: CookieConsent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage blocked: the choice holds for this page view only.
  }
  memory = value;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Re-opens the banner so a visitor can change their earlier choice. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenCookieSettings(callback: () => void) {
  window.addEventListener(OPEN_EVENT, callback);
  return () => window.removeEventListener(OPEN_EVENT, callback);
}

// Fallback for browsers that block localStorage, so a click still sticks
// until the next full load.
let memory: CookieConsent | null = null;

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * `undefined` on the server and during hydration (nothing is known yet),
 * `null` once mounted with no choice made, otherwise the choice.
 */
export function useCookieConsent(): CookieConsent | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => read() ?? memory,
    () => undefined,
  );
}
