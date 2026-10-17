"use client";

import { useSyncExternalStore } from "react";

/** A Home click can arrive before its feed mounts or becomes visible. */
export const HOME_FEED_REFRESH_EVENT = "shopi:refresh-home-feed";
let pending = false;
let activeRequests = 0;
const listeners = new Set<() => void>();
const notifyLoading = () => listeners.forEach((listener) => listener());
const getLoading = () => pending || activeRequests > 0;
const getServerLoading = () => false;

function subscribeLoading(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useHomeFeedLoading(): boolean {
  return useSyncExternalStore(subscribeLoading, getLoading, getServerLoading);
}

/** Returns an idempotent completion callback, including for failed requests. */
export function beginHomeFeedLoading(): () => void {
  activeRequests += 1;
  notifyLoading();
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    activeRequests -= 1;
    notifyLoading();
  };
}

export function requestHomeFeedRefresh(): void {
  pending = true;
  notifyLoading();
  window.dispatchEvent(new Event(HOME_FEED_REFRESH_EVENT));
}

export function consumeHomeFeedRefresh(): boolean {
  const requested = pending;
  pending = false;
  notifyLoading();
  return requested;
}

export function hasPendingHomeFeedRefresh(): boolean {
  return pending;
}
