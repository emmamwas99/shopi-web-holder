/**
 * Whether the browser's Back would stay inside the app.
 *
 * Back buttons go back (router.back()) whenever it would, so the screen behind
 * comes back exactly as it was left — RouteScrollRestoration restores its
 * scroll on a traversal — and only land on a fallback route when there is
 * nothing of ours behind them (a listing opened from WhatsApp or Google).
 *
 * `history.length` cannot answer this, and trusting it is what sent Back from
 * a listing to Home instead of the Categories tab it was opened from. Browsers
 * cap it (Chrome at 50): a long-lived phone tab reports the same length before
 * and after a navigation, so every in-app push looked like a direct arrival.
 * It also counts other sites' entries, which are not ours to go back to.
 *
 * Two sources instead:
 *
 *   - The Navigation API (Chromium, Safari 26.2+, Firefox 147+). Its entry
 *     list is the run of same-origin entries around the current one, so any
 *     entry before ours is one of our pages.
 *   - Elsewhere, a depth stamped into each history entry's state as it is
 *     created: 0 for the entry the visit arrived on, one more per push. It
 *     lives in history.state, so it survives reloads and traversals.
 */

const DEPTH_KEY = "__shopiDepth";

type NavigationLike = {
  canGoBack?: boolean;
  currentEntry?: { index?: number } | null;
  entries?: () => ReadonlyArray<{ url?: string | null }>;
};

function navigationApi(): NavigationLike | null {
  try {
    const navigation = (window as Window & { navigation?: NavigationLike })
      .navigation;
    return navigation?.currentEntry ? navigation : null;
  } catch {
    return null;
  }
}

function readDepth(state: unknown): number | null {
  if (!state || typeof state !== "object") return null;
  const value = (state as Record<string, unknown>)[DEPTH_KEY];
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

/** `state` with the depth added — a copy; the caller's object is not touched. */
function withDepth(state: unknown, value: number): unknown {
  if (state === null || state === undefined) return { [DEPTH_KEY]: value };
  if (typeof state !== "object" || Array.isArray(state)) return state;
  const proto = Object.getPrototypeOf(state);
  if (proto !== Object.prototype && proto !== null) return state;
  return { ...(state as Record<string, unknown>), [DEPTH_KEY]: value };
}

function isSameOriginReferrer(): boolean {
  try {
    return (
      document.referrer !== "" &&
      new URL(document.referrer).origin === window.location.origin
    );
  } catch {
    return false;
  }
}

/** The depth of the entry on screen; `null` when it is not known. */
let depth: number | null = null;
/** history.length when this document loaded — only for the last-resort guess. */
let arrivalLength = 0;
let installed = false;

/**
 * Start tracking. Runs once per document, as early as possible: the depth of
 * an entry is only known if it was stamped when it was created.
 */
export function installAppHistory(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  arrivalLength = window.history.length;

  // The Navigation API knows; nothing to track.
  if (navigationApi()) return;

  const { history } = window;
  // A reload, or Back into this document, finds its entry already stamped.
  // A full-page load from one of our own pages has one of ours behind it,
  // though how deep that was is unknown. Anything else is where the visit
  // started.
  depth =
    readDepth(history.state) ??
    (history.length > 1 && isSameOriginReferrer() ? 1 : 0);

  const nativePush = history.pushState;
  const nativeReplace = history.replaceState;
  history.pushState = function pushState(data, unused, url) {
    depth = (depth ?? 0) + 1;
    return nativePush.call(history, withDepth(data, depth), unused, url);
  };
  history.replaceState = function replaceState(data, unused, url) {
    const stamped = depth === null ? data : withDepth(data, depth);
    return nativeReplace.call(history, stamped, unused, url);
  };

  try {
    nativeReplace.call(history, withDepth(history.state, depth), "");
  } catch {
    // Unserialisable state: this entry just stays unstamped.
  }

  window.addEventListener("popstate", (event) => {
    depth = readDepth(event.state);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) depth = readDepth(history.state) ?? depth;
  });
}

/** Whether `history.back()` lands on one of our pages. */
export function canGoBackInApp(): boolean {
  if (typeof window === "undefined") return false;

  const navigation = navigationApi();
  if (navigation) {
    if (typeof navigation.canGoBack === "boolean") return navigation.canGoBack;
    return (navigation.currentEntry?.index ?? 0) > 0;
  }

  if (depth !== null) return depth > 0;

  // An entry from before tracking started (stamping failed): the best guess
  // is whether this document has added entries, or was opened from our site.
  return (
    window.history.length > arrivalLength ||
    (window.history.length > 1 && isSameOriginReferrer())
  );
}

/**
 * Where Back would land, when that is one of our pages and the browser can
 * say which (Navigation API only — `null` elsewhere, and when unknown).
 */
export function previousAppUrl(): URL | null {
  if (typeof window === "undefined") return null;
  const navigation = navigationApi();
  const index = navigation?.currentEntry?.index;
  if (!navigation?.entries || typeof index !== "number" || index < 1) {
    return null;
  }
  try {
    const url = navigation.entries()[index - 1]?.url;
    return url ? new URL(url) : null;
  } catch {
    return null;
  }
}

if (typeof window !== "undefined") installAppHistory();
