"use client";

import { useSyncExternalStore } from "react";

/**
 * The last URL visited on each nav tab's own screen, so tapping the tab returns
 * to that screen as it was left — the sub-tab, the search, the filters — the
 * way a native tab bar keeps each tab's state.
 *
 * Scroll restoration alone could not do this. A tab link pointed at the bare
 * route (`/en/explore`), while the screen being returned to was
 * `/en/explore?q=iphone` or the feed's Watch sub-tab: the page rebuilt
 * itself from the bare URL, showed different content, and the saved position
 * no longer matched anything on it.
 *
 * Only a tab's root screen is remembered, never a detail opened from it (a
 * chat, a listing), and only for tabs whose screen is fully described by its
 * URL. Profile is left out on purpose: its sections are pushed screens with
 * their own back button, which a tab tap must not land inside.
 */
export type RememberedNavTab = "feed" | "explore" | "notifications" | "stores";

const STORAGE_KEY = "shopi-nav-tab-urls";

type Remembered = Partial<Record<RememberedNavTab, string>>;

const TAB_ROOT = /^\/([^/?#]+)\/([^/?#]+)\/?$/;

function tabOf(pathname: string): RememberedNavTab | null {
  const segment = TAB_ROOT.exec(pathname)?.[2];
  switch (segment) {
    case "for-you":
      return "feed";
    case "explore":
    case "search":
      return "explore";
    case "notifications":
      return "notifications";
    case "stores":
      return "stores";
    default:
      return null;
  }
}

/**
 * Explore returns with its search, sort and price, but not its category:
 * category (and the subcategory and spec filters that belong to it) is chosen
 * inside the filters, so a remembered one comes back invisible — the tab would
 * reopen quietly scoped to, say, Electronics. It always opens on all
 * categories.
 */
const EXPLORE_FORGETS = ["category", "subcategory", "spec"];

function tabSearch(tab: RememberedNavTab, search: string): string {
  if (tab !== "explore" || !search) return search;
  const params = new URLSearchParams(search);
  for (const key of EXPLORE_FORGETS) params.delete(key);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

let remembered: Remembered | null = null;
const listeners = new Set<() => void>();

function load(): Remembered {
  if (remembered) return remembered;
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as unknown;
    remembered =
      parsed && typeof parsed === "object" ? (parsed as Remembered) : {};
  } catch {
    remembered = {};
  }
  return remembered;
}

/**
 * Record the current URL for its tab, if it is a tab's root screen. Called on
 * every committed navigation, and by screens that swap their sub-tab with a
 * bare `history.replaceState` (the feed), which Next does not see.
 */
export function rememberNavTabUrl(): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  const tab = tabOf(pathname);
  if (!tab) return;

  const href = `${pathname}${tabSearch(tab, search)}`;
  const current = load();
  if (current[tab] === href) return;

  remembered = { ...current, [tab]: href };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(remembered));
  } catch {
    // Remembered for this document only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The href for a nav tab: where that tab was last left, or `fallback` (its bare
 * route) when there is nothing to return to. The server render and hydration
 * always use `fallback`, so the markup matches; the remembered URL takes over
 * right after.
 */
export function useNavTabHref(
  tab: RememberedNavTab | null,
  fallback: string,
): string {
  const href = useSyncExternalStore(
    subscribe,
    () => (tab ? (load()[tab] ?? null) : null),
    () => null,
  );
  if (!tab || !href) return fallback;

  // Same locale and still that tab's screen — switching language must not
  // send the Swahili nav to an English URL.
  const path = href.split(/[?#]/)[0];
  const fallbackLocale = fallback.split("/")[1];
  if (TAB_ROOT.exec(path)?.[1] !== fallbackLocale || tabOf(path) !== tab) {
    return fallback;
  }
  return href;
}
