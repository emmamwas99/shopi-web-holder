"use client";

import { useSyncExternalStore } from "react";

export type ListingOrigin = "feed" | "explore" | "watch" | "notifications" | "profile" | "stores";

const STORAGE_KEY = "shopi-listing-origin";
const listeners = new Set<() => void>();
let currentOrigin: ListingOrigin = "feed";

export function isListingPath(pathname: string, lang: string) {
  return new RegExp(`^/${lang}/content/[^/]+/?$`).test(pathname);
}

export function originForPath(pathname: string, lang: string, feedTab: string | null): ListingOrigin | null {
  if (pathname === `/${lang}` || pathname.startsWith(`/${lang}/for-you`) || pathname.startsWith(`/${lang}/collections/`)) {
    return feedTab === "watch" ? "watch" : "feed";
  }
  if (pathname.startsWith(`/${lang}/explore`) || pathname.startsWith(`/${lang}/search`)) return "explore";
  if (pathname.startsWith(`/${lang}/notifications`)) return "notifications";
  if (pathname.startsWith(`/${lang}/profile`) || pathname.startsWith(`/${lang}/@`)) return "profile";
  if (pathname.startsWith(`/${lang}/stores`)) return "stores";
  return null;
}

function isOrigin(value: string | null): value is ListingOrigin {
  return value === "feed" || value === "explore" || value === "watch" || value === "notifications" || value === "profile" || value === "stores";
}

function publish(origin: ListingOrigin) {
  if (currentOrigin === origin) return;
  currentOrigin = origin;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function rememberListingOrigin(origin: ListingOrigin) {
  publish(origin);
  try { window.sessionStorage.setItem(STORAGE_KEY, origin); } catch {}
}

export function restoreListingOrigin() {
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (isOrigin(saved)) publish(saved);
  } catch {}
}

export function useListingOrigin(): ListingOrigin {
  return useSyncExternalStore(
    subscribe,
    () => currentOrigin,
    () => "feed",
  );
}
