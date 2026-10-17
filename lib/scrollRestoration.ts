/**
 * Window scroll restoration that behaves like a native social app.
 *
 *   - Back / forward lands exactly where that screen was left.
 *   - Switching tabs from the nav returns to where that tab was left.
 *   - Re-tapping the tab you are already on scrolls it back to the top.
 *   - Anything else — opening a listing, a profile, a search — starts at the
 *     top.
 *
 * Every page here scrolls the window (there is no inner scroll container), so
 * the window position is the one piece of UI state that does not survive a
 * route change on its own. Next's App Router only resets it; restoring it is
 * this module's job, driven by RouteScrollRestoration.
 *
 * ## Positions are anchored to content, not just pixels
 *
 * A saved position is the pixel offset plus an anchor: the list item that was
 * on screen (`data-scroll-anchor`) and how far it sat from the top of the
 * viewport. Restoring puts that item back at the same offset.
 *
 * Pixel offsets alone drift. The feed does not lay out identically twice:
 * seller cards fill slots on a revisit that were empty on the first visit, the
 * location banner and trending strip resolve at different times, and a
 * background refresh can put new items above. Each of those moved a restored
 * feed by a card or more. The anchor is immune to all of it, and when the
 * anchored item is no longer in the list at all, the content has changed and
 * the old offset would be meaningless — the page stays at the top instead.
 *
 * ## Positions belong to history entries
 *
 * Positions are stored per history entry (Navigation API `currentEntry.key`)
 * and, separately, per URL. Back/forward uses the entry, so the same profile
 * visited twice in one stack keeps two positions, exactly as the browser does
 * for a static site. The URL copy is what a nav tab returns to, and the
 * fallback for browsers without the Navigation API.
 */

export type ScrollAnchor = {
  /** The `data-scroll-anchor` value of the item that was on screen. */
  k: string;
  /** Its distance from the top of the viewport, in px (negative when above). */
  o: number;
};

export type ScrollPosition = {
  y: number;
  a?: ScrollAnchor;
  /** When it was taken — used to prune old entries. */
  t: number;
};

/** Marks a list item that a scroll position can be anchored to. */
export const SCROLL_ANCHOR_ATTR = "data-scroll-anchor";

/**
 * Marks an intercepted route's overlay (post sheet, video viewer). Those
 * render OVER the page that opened them, so the page must not move.
 */
export const ROUTE_OVERLAY_ATTR = "data-route-overlay";

/**
 * On a nav link: this is a tab. Arriving through it returns to where the tab
 * was left, and tapping it while already there scrolls to the top.
 */
export const NAV_TAB_ATTR = "data-nav-tab";

/**
 * On any other link: arriving through it returns to where that exact URL was
 * left (e.g. the desktop Messages / Notifications / Saved shortcuts).
 */
export const RESTORE_LINK_ATTR = "data-scroll-restore";

const KEY_PREFIX = "shopi-scroll:";
const ENTRY_PREFIX = `${KEY_PREFIX}e:`;
const URL_PREFIX = `${KEY_PREFIX}u:`;
/** Oldest positions beyond this are dropped when a document loads. */
const MAX_STORED_POSITIONS = 150;

/** How often a scroll in progress takes a (DOM-reading) sample. */
const SAMPLE_INTERVAL_MS = 120;
/** Scroll idle time after which the resting position is persisted. */
const IDLE_PERSIST_MS = 350;
/** How long a restore waits for its content to render before giving up. */
// Feed/profile/discovery results can take longer than a skeleton transition to
// arrive, especially on a cold mobile session. Keep retrying for the full
// route load window; any deliberate user input cancels restoration immediately.
const RESTORE_TIMEOUT_MS = 10_000;
/**
 * How long a reached position is held against late layout shifts. Chrome's
 * scroll anchoring already does this; Safari (the iPhone) has none, so an
 * image or banner resolving above the restored item would otherwise push it
 * down after the fact.
 */
const RESTORE_HOLD_MS = 600;
/** A traversal or tab return must land within this long to count. */
const PENDING_TTL_MS = 15_000;

/** Any of these means the user has taken the scroll over; stop restoring. */
const INTENT_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/**
 * Home swaps its For You / Watch sub-tabs in place and keeps a
 * position per sub-tab itself, so `tab` is not part of its identity here.
 * Every other page's `?tab=` (inbox, profile) is a different list and stays in
 * the key.
 */
const FEED_PATH = /^\/[^/]+\/(?:for-you|feed)\/?$/;

/**
 * The video viewer and the seller dashboard. From inside the app they are
 * intercepted into the @modal slot and drawn over the page that opened them.
 *
 * Listings (/content/) are not: they are ordinary pages that scroll the window
 * and are restored like any other. Leaving them in here after their
 * interception was removed meant a listing's position was never recorded and
 * every return to one — Back from the seller, a related listing, the chat —
 * opened it at the top.
 */
const OVERLAY_PATH = /^\/[^/]+\/(?:video\/[^/]+|dashboard\/?$)/;

type Sample = { entry: string | null; url: string; position: ScrollPosition };

type Pending = { url: string; entry: string | null; at: number };

const isBrowser = () => typeof window !== "undefined";

// ── Keys ─────────────────────────────────────────────────────────────────────

export function scrollUrlKey(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  if (FEED_PATH.test(pathname)) params.delete("tab");
  // Param order is not identity: ?a=1&b=2 and ?b=2&a=1 are the same page.
  params.sort();
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

function locationUrlKey(): string {
  return scrollUrlKey(window.location.pathname, window.location.search);
}

export function isOverlayPath(pathname: string): boolean {
  return OVERLAY_PATH.test(pathname);
}

type NavigationLike = { currentEntry?: { key?: string } | null };

/**
 * The current history entry's key — stable across replaceState (a page
 * rewriting its own URL) and back/forward, new for every push. `null` where the
 * Navigation API is missing (Safari before 26.2), which falls back to URLs.
 */
function currentEntryKey(): string | null {
  try {
    const navigation = (window as Window & { navigation?: NavigationLike })
      .navigation;
    const key = navigation?.currentEntry?.key;
    return typeof key === "string" && key.length > 0 ? key : null;
  } catch {
    return null;
  }
}

function documentNavigationType(): string | undefined {
  try {
    const [entry] = performance.getEntriesByType("navigation") as
      | PerformanceNavigationTiming[]
      | [];
    return entry?.type;
  } catch {
    return undefined;
  }
}

// ── Storage ──────────────────────────────────────────────────────────────────

const memory = new Map<string, ScrollPosition>();

function parsePosition(raw: string | null): ScrollPosition | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ScrollPosition> | null;
    if (!value || typeof value.y !== "number" || !Number.isFinite(value.y)) {
      return null;
    }
    const anchor =
      value.a &&
      typeof value.a.k === "string" &&
      typeof value.a.o === "number" &&
      Number.isFinite(value.a.o)
        ? { k: value.a.k, o: value.a.o }
        : undefined;
    return {
      y: Math.max(0, value.y),
      a: anchor,
      t: typeof value.t === "number" ? value.t : 0,
    };
  } catch {
    return null;
  }
}

function readPosition(storageKey: string): ScrollPosition | null {
  const cached = memory.get(storageKey);
  if (cached) return cached;
  try {
    const position = parsePosition(window.sessionStorage.getItem(storageKey));
    if (position) memory.set(storageKey, position);
    return position;
  } catch {
    return null;
  }
}

function writePosition(storageKey: string, position: ScrollPosition) {
  memory.set(storageKey, position);
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(position));
  } catch {
    // Storage full or blocked (private mode): positions still work in memory
    // for this document, they just will not survive a reload.
  }
}

/**
 * Drop the previous format (a bare number keyed by URL) and trim to the most
 * recent positions. Once per document; sessionStorage lives as long as the tab.
 */
function pruneStoredPositions() {
  try {
    const storage = window.sessionStorage;
    const current: { key: string; t: number }[] = [];
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (!key?.startsWith(KEY_PREFIX)) continue;
      if (!key.startsWith(ENTRY_PREFIX) && !key.startsWith(URL_PREFIX)) {
        storage.removeItem(key);
        continue;
      }
      current.push({ key, t: parsePosition(storage.getItem(key))?.t ?? 0 });
    }
    if (current.length <= MAX_STORED_POSITIONS) return;
    current
      .sort((a, b) => a.t - b.t)
      .slice(0, current.length - MAX_STORED_POSITIONS)
      .forEach(({ key }) => storage.removeItem(key));
  } catch {
    // Nothing to prune without storage.
  }
}

// ── Reading the page ─────────────────────────────────────────────────────────

/**
 * The page's logical scroll offset. While a sheet locks the page with
 * `body { position: fixed; top: -Ypx }` (CommentsDrawer, vaul) the window
 * reports 0; the real offset is the body's negative top.
 */
function readScrollY(): number {
  const { body } = document;
  if (body?.style.position === "fixed") {
    const top = Number.parseFloat(body.style.top);
    if (Number.isFinite(top) && top <= 0) return -top;
  }
  return window.scrollY;
}

/**
 * A vaul drawer is on screen. On iOS vaul scrolls the window to the top while
 * one is open, holds it there, and scrolls back when it closes — so what the
 * window reports meanwhile is not where the page is. The page cannot scroll
 * under a drawer anyway, so the position taken before it opened (the tap that
 * opened it samples one) stays the true one. Sampling the forced 0 overwrote
 * it: Back to Categories from a subcategory chosen in its drawer opened at
 * the top on iPhones.
 */
function isDrawerOpen(): boolean {
  return document.querySelector("[data-vaul-drawer]") !== null;
}

function maxScrollY(): number {
  const root = document.scrollingElement ?? document.documentElement;
  return Math.max(0, root.scrollHeight - window.innerHeight);
}

function scrollToY(y: number) {
  window.scrollTo({
    top: Math.max(0, Math.round(y)),
    left: 0,
    behavior: "instant" as ScrollBehavior,
  });
}

/**
 * Whether `el` moves with the window: not inside a dialog, a fixed layer or an
 * inner scroller (the desktop trending rail, an open sheet). Anchoring the
 * window to one of those would restore to nonsense.
 */
function movesWithWindow(el: Element): boolean {
  for (
    let node = el.parentElement;
    node && node !== document.body && node !== document.documentElement;
    node = node.parentElement
  ) {
    if (
      node.hasAttribute(ROUTE_OVERLAY_ATTR) ||
      node.getAttribute("role") === "dialog" ||
      node.getAttribute("aria-modal") === "true"
    ) {
      return false;
    }
    const style = window.getComputedStyle(node);
    if (style.position === "fixed") return false;
    if (
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Where to look for the item on screen, as fractions of the viewport. The
 * middle band first: the top holds sticky headers and the bottom the tab bar,
 * and several columns because a grid's centre line can fall in a gutter.
 */
const ANCHOR_PROBES: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.4],
  [0.3, 0.4],
  [0.7, 0.4],
  [0.5, 0.6],
  [0.3, 0.6],
  [0.7, 0.6],
  [0.5, 0.25],
  [0.5, 0.8],
];

function captureAnchor(): ScrollAnchor | undefined {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width <= 0 || height <= 0) return undefined;

  for (const [fx, fy] of ANCHOR_PROBES) {
    const x = width * fx;
    const y = height * fy;
    const hit = document.elementFromPoint(x, y);
    const hitAnchor = hit?.closest<HTMLElement>(`[${SCROLL_ANCHOR_ATTR}]`);
    if (hitAnchor && movesWithWindow(hitAnchor)) {
      const key = hitAnchor.getAttribute(SCROLL_ANCHOR_ATTR);
      if (key) {
        return { k: key, o: Math.round(hitAnchor.getBoundingClientRect().top) };
      }
    }

    // A drawer or fixed sheet can cover every probe even though the page
    // underneath is the thing whose position must survive the navigation.
    // elementFromPoint only returns the top layer, so find the window-scrolling
    // anchor whose box occupies this point, ignoring fixed/dialog descendants.
    let underlying: HTMLElement | undefined;
    for (const el of document.querySelectorAll<HTMLElement>(
      `[${SCROLL_ANCHOR_ATTR}]`,
    )) {
      if (el.getClientRects().length === 0 || !movesWithWindow(el)) continue;
      const rect = el.getBoundingClientRect();
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        continue;
      }
      underlying = el;
      break;
    }
    const key = underlying?.getAttribute(SCROLL_ANCHOR_ATTR);
    if (key && underlying) {
      return { k: key, o: Math.round(underlying.getBoundingClientRect().top) };
    }
  }
  return undefined;
}

function escapeAttributeValue(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}

/**
 * The rendered element for an anchor. The same video can appear more than once
 * (Home and Watch can both surface it, one of them hidden), so hidden copies
 * are skipped and, among visible ones, the one nearest where it used to be
 * wins.
 */
function findAnchorElement(
  anchor: ScrollAnchor,
  expectedTop: number,
): HTMLElement | null {
  const selector = `[${SCROLL_ANCHOR_ATTR}="${escapeAttributeValue(anchor.k)}"]`;
  let best: HTMLElement | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (el.getClientRects().length === 0) return; // display:none
    if (!movesWithWindow(el)) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const distance = Math.abs(top - expectedTop);
    if (distance < bestDistance) {
      best = el;
      bestDistance = distance;
    }
  });

  return best;
}

/** Where the page is right now, anchored to the item on screen. */
export function captureScrollPosition(): ScrollPosition {
  return {
    // iOS rubber-banding past the top reports a negative offset.
    y: Math.max(0, Math.round(readScrollY())),
    a: captureAnchor(),
    t: Date.now(),
  };
}

// ── Restoring ────────────────────────────────────────────────────────────────

let activeRestore: { cancel: () => void } | null = null;

export function cancelScrollRestore() {
  activeRestore?.cancel();
}

type Attempt = "done" | "partial" | "missing";

function applyPosition(target: ScrollPosition, expectedTop: number): Attempt {
  const maxY = maxScrollY();

  if (target.a) {
    const el = findAnchorElement(target.a, expectedTop);
    if (!el) return "missing";
    const desired = Math.max(
      0,
      window.scrollY + el.getBoundingClientRect().top - target.a.o,
    );
    if (desired <= maxY + 1) {
      if (Math.abs(window.scrollY - desired) >= 1) scrollToY(desired);
      return "done";
    }
    // The item is there but what follows it has not rendered yet: get as
    // close as the page allows and keep going as it grows.
    if (Math.abs(window.scrollY - maxY) >= 1) scrollToY(maxY);
    return "partial";
  }

  if (target.y <= maxY + 1) {
    if (Math.abs(window.scrollY - target.y) >= 1) scrollToY(target.y);
    return "done";
  }
  return "partial";
}

/**
 * Put the page back at `target`, waiting for its content if it has not
 * rendered yet. `null` (nothing saved) means the top.
 *
 * The first attempt runs synchronously, so a page that renders from cache is
 * restored before it is ever painted at the wrong offset. After that it
 * retries each frame until the anchored item can be placed, then holds it
 * briefly against late layout shifts. Any wheel, touch, click or key stops it
 * at once — a restore must never fight a user who has started scrolling.
 */
export function restoreScrollPosition(
  target: ScrollPosition | null | undefined,
) {
  if (!isBrowser()) return;
  cancelScrollRestore();

  if (!target || (target.y <= 0 && !target.a)) {
    scrollToY(0);
    return;
  }

  const expectedTop = target.a ? target.y + target.a.o : target.y;
  const startedAt = performance.now();
  let reachedAt = 0;
  let frame = 0;
  let finished = false;

  const finish = (settled: boolean) => {
    if (finished) return;
    finished = true;
    if (frame) cancelAnimationFrame(frame);
    for (const type of INTENT_EVENTS) {
      window.removeEventListener(type, onIntent, true);
    }
    if (activeRestore === handle) activeRestore = null;
    // Record where the page actually ended up, so leaving it right away saves
    // that rather than whatever the previous page last sampled.
    if (settled) sampleNow();
  };
  const onIntent = () => finish(true);
  const handle = { cancel: () => finish(false) };

  const tick = () => {
    frame = 0;
    if (finished) return;
    const now = performance.now();
    const result = applyPosition(target, expectedTop);

    if (result === "done") {
      if (!reachedAt) reachedAt = now;
      if (now - reachedAt >= RESTORE_HOLD_MS) {
        finish(true);
        return;
      }
    } else {
      // Keep the old pixel position visible while an async list is rendering.
      // The anchor will refine it as soon as the original item appears; leaving
      // the user at the top during that wait looks like restoration failed.
      if (result === "missing" && target.a) {
        scrollToY(Math.min(target.y, maxScrollY()));
      }
      reachedAt = 0;
      if (now - startedAt >= RESTORE_TIMEOUT_MS) {
        // If an anchor never appears, leave the best pixel-based position
        // rather than discarding the saved position and jumping to the top.
        if (
          (result === "missing" && target.a) ||
          (result === "partial" && !target.a)
        ) {
          scrollToY(Math.min(target.y, maxScrollY()));
        }
        finish(true);
        return;
      }
    }
    frame = requestAnimationFrame(tick);
  };

  activeRestore = handle;
  for (const type of INTENT_EVENTS) {
    window.addEventListener(type, onIntent, { capture: true, passive: true });
  }

  // Until it can be restored, this page's position is the one being restored.
  latest = { entry: currentEntryKey(), url: locationUrlKey(), position: target };

  const first = applyPosition(target, expectedTop);
  if (first === "done") {
    reachedAt = startedAt;
  } else if (first === "missing" || !target.a) {
    // Start at the saved pixel position while the anchored content hydrates.
    // applyPosition will snap to the exact item once that item is rendered.
    scrollToY(Math.min(target.y, maxScrollY()));
  }
  frame = requestAnimationFrame(tick);
}

/** A tab re-tap: back to the top, animated unless the user prefers otherwise. */
export function scrollToTopLikeNative() {
  if (!isBrowser()) return;
  cancelScrollRestore();
  const y = window.scrollY;
  if (y <= 1) return;

  const reduceMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduceMotion) {
    scrollToY(0);
    return;
  }
  // Animating through a hundred cards would take seconds and wake every
  // video on the way; cover most of the distance at once, then glide.
  const glideFrom = window.innerHeight * 2;
  if (y > glideFrom) scrollToY(glideFrom);
  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
}

// ── Tracking ─────────────────────────────────────────────────────────────────

/** The most recent position of the page on screen, not yet necessarily persisted. */
let latest: Sample | null = null;
/** The URL React last committed. Samples are only taken while it is on screen. */
let committedUrl: string | null = null;
let committedEntry: string | null = null;
let committedPathname = "";
let initialized = false;
let pendingTraversal: Pending | null = null;
let pendingReturn: Pending | null = null;
const knownEntries = new Set<string>();

function sampleNow() {
  if (!isBrowser() || activeRestore || isDrawerOpen()) return;
  const { pathname } = window.location;
  // An overlay route is drawn over another page: the window belongs to that
  // page, not to the overlay's URL.
  if (isOverlayPath(pathname)) return;
  const url = locationUrlKey();
  // Between a back/forward press and Next committing it, the address bar
  // already shows the destination while the old page is still on screen.
  // Scrolling in that gap must not be filed under the destination.
  if (committedUrl !== null && url !== committedUrl) return;
  latest = { entry: currentEntryKey(), url, position: captureScrollPosition() };
}

function persistLatest() {
  const sample = latest;
  if (!sample) return;
  if (sample.entry) writePosition(ENTRY_PREFIX + sample.entry, sample.position);
  writePosition(URL_PREFIX + sample.url, sample.position);
}

/** Save where the page is now; for code that navigates programmatically. */
export function rememberScrollBeforeNavigation() {
  if (!isBrowser()) return;
  sampleNow();
  persistLatest();
}

/**
 * Mark the next arrival at `href` as a return rather than a fresh visit, so it
 * resumes where that page was last left. Signing in uses this: the guard
 * pushed the user off the feed mid-scroll, and the way back is a replace, not
 * a back().
 */
export function markScrollRestore(href: string) {
  if (!isBrowser()) return;
  try {
    const url = new URL(href, window.location.origin);
    pendingReturn = {
      url: scrollUrlKey(url.pathname, url.search),
      entry: null,
      at: performance.now(),
    };
  } catch {
    pendingReturn = null;
  }
}

function isFresh(pending: Pending | null): pending is Pending {
  return !!pending && performance.now() - pending.at < PENDING_TTL_MS;
}

function hasOverlayMarker(): boolean {
  return document.querySelector(`[${ROUTE_OVERLAY_ATTR}]`) !== null;
}

/**
 * For You is ranked afresh for every page load (useForYouFeed), so a position
 * saved before the load points into a list that is no longer there. It opens
 * at the top, like a native feed after a refresh. Watch is not re-ranked.
 */
function isReRankedOnLoad(): boolean {
  return (
    FEED_PATH.test(window.location.pathname) &&
    new URLSearchParams(window.location.search).get("tab") !== "watch"
  );
}

function restoreOnDocumentLoad(entry: string | null, url: string) {
  if (isOverlayPath(window.location.pathname)) return;
  // Only a reload or a back/forward into this document resumes. Opening a
  // link or typing the URL is a fresh visit, even if this tab has been here
  // before — which is what the browser does on a static site too.
  const type = documentNavigationType();
  if (type !== "reload" && type !== "back_forward") return;
  if (isReRankedOnLoad()) return;
  const saved = entry
    ? readPosition(ENTRY_PREFIX + entry)
    : readPosition(URL_PREFIX + url);
  if (saved) restoreScrollPosition(saved);
}

/**
 * Called by RouteScrollRestoration in a layout effect whenever the committed
 * URL changes (and once on load). History has already been updated by then —
 * Next pushes in an insertion effect — and the new page's DOM is in place, so
 * a page rendered from cache is restored before its first paint.
 */
export function handleRouteCommit() {
  if (!isBrowser()) return;

  const entry = currentEntryKey();
  const url = locationUrlKey();
  const { pathname } = window.location;

  if (!initialized) {
    initialized = true;
    committedUrl = url;
    committedEntry = entry;
    committedPathname = pathname;
    if (entry) knownEntries.add(entry);
    restoreOnDocumentLoad(entry, url);
    return;
  }

  // The page we were on is gone; keep where it was left.
  persistLatest();

  const previousEntry = committedEntry;
  const previousPathname = committedPathname;
  committedUrl = url;
  committedEntry = entry;
  committedPathname = pathname;

  const traversal =
    isFresh(pendingTraversal) &&
    (entry !== null
      ? pendingTraversal.entry === entry
      : pendingTraversal.url === url);
  const isReturn = isFresh(pendingReturn) && pendingReturn.url === url;

  // Same history entry and same page: the page rewrote its own URL (filters, a
  // sub-tab, a search term). That is not a navigation — leave the page where it
  // is, and let any restore already running finish. Without the Navigation API
  // the best available proxy is "same pathname and not back/forward".
  const sameEntry =
    entry !== null
      ? entry === previousEntry
      : !traversal && pathname === previousPathname;
  if (sameEntry && pathname === previousPathname && !isReturn) return;

  pendingTraversal = null;
  pendingReturn = null;
  cancelScrollRestore();

  // An entry seen before can only be reached by back/forward, even when the
  // popstate that led here was missed. A replace that swapped in a different
  // page (a back button's no-history fallback) keeps the entry but is a new
  // page, so it starts at the top like a push.
  const revisit = !sameEntry && entry !== null && knownEntries.has(entry);
  if (entry) knownEntries.add(entry);

  if (isOverlayPath(pathname)) {
    // Intercepted: the overlay covers the page that opened it, which must stay
    // exactly where it was. A direct visit renders the full page instead
    // (no overlay marker) and starts at the top like any other.
    if (!hasOverlayMarker()) scrollToY(0);
    return;
  }

  if (isReturn) {
    restoreScrollPosition(readPosition(URL_PREFIX + url));
    return;
  }

  if ((traversal && !sameEntry) || revisit) {
    restoreScrollPosition(
      (entry ? readPosition(ENTRY_PREFIX + entry) : null) ??
        readPosition(URL_PREFIX + url),
    );
    return;
  }

  scrollToY(0);
  latest = { entry, url, position: { y: 0, t: Date.now() } };
}

function linkFromEvent(event: MouseEvent): HTMLAnchorElement | null {
  const target = event.target as Element | null;
  const link = target?.closest?.("a[href]");
  return link instanceof HTMLAnchorElement ? link : null;
}

/**
 * Wire up the listeners. Returns the cleanup. Installed once, by
 * RouteScrollRestoration, for the life of the document.
 */
export function installScrollTracking(): () => void {
  if (!isBrowser()) return () => {};

  let lastSampleAt = 0;
  let throttleTimer: ReturnType<typeof setTimeout> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const onScroll = () => {
    if (activeRestore) return;

    const now = performance.now();
    if (now - lastSampleAt >= SAMPLE_INTERVAL_MS) {
      lastSampleAt = now;
      sampleNow();
    } else if (!throttleTimer) {
      throttleTimer = setTimeout(
        () => {
          throttleTimer = undefined;
          lastSampleAt = performance.now();
          sampleNow();
        },
        SAMPLE_INTERVAL_MS - (now - lastSampleAt),
      );
    }

    // The storage write waits for the scroll to come to rest — nothing reads
    // storage until the page is left, and leaving always persists first.
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      idleTimer = undefined;
      sampleNow();
      persistLatest();
    }, IDLE_PERSIST_MS);
  };

  // A press can be the start of a navigation (a card's onClick calling
  // router.push), so the position is fresh before any handler runs.
  const onPointerDown = () => {
    sampleNow();
  };

  const onClick = (event: MouseEvent) => {
    sampleNow();
    persistLatest();

    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = linkFromEvent(event);
    if (!link) return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    let url: URL;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return;
    }
    if (url.origin !== window.location.origin) return;

    const isTab = link.hasAttribute(NAV_TAB_ATTR);
    if (
      isTab &&
      url.pathname === window.location.pathname &&
      url.search === window.location.search
    ) {
      // Re-tapping the tab you are on: straight back to the top, like every
      // native tab bar. Cancelling the click stops next/link from running a
      // navigation to the page already on screen. A tab link always points at
      // the screen that tab last showed (navTabMemory), so this is exact-URL:
      // tapping Profile from inside one of its pushed sections still pops
      // back to the profile, as a tab bar does from deeper in its stack.
      event.preventDefault();
      scrollToTopLikeNative();
      return;
    }

    pendingReturn =
      isTab || link.hasAttribute(RESTORE_LINK_ATTR)
        ? {
            url: scrollUrlKey(url.pathname, url.search),
            entry: null,
            at: performance.now(),
          }
        : null;
  };

  const onHide = () => {
    if (document.visibilityState === "visible") return;
    sampleNow();
    persistLatest();
  };
  const onPageHide = () => {
    sampleNow();
    persistLatest();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pagehide", onPageHide);
  document.addEventListener("pointerdown", onPointerDown, {
    capture: true,
    passive: true,
  });
  document.addEventListener("click", onClick, true);
  document.addEventListener("visibilitychange", onHide);

  return () => {
    if (throttleTimer) clearTimeout(throttleTimer);
    if (idleTimer) clearTimeout(idleTimer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pagehide", onPageHide);
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("visibilitychange", onHide);
    persistLatest();
  };
}

/**
 * Marks the commit a back/forward press is about to cause as a traversal.
 *
 * Registered as this module loads, ahead of Next's own popstate listener (an
 * effect in its router), and that order matters: React renders a popstate
 * update synchronously, so Next's listener commits the destination — and
 * handleRouteCommit runs — before any listener registered after it. Installed
 * with the other listeners (an effect, inside a Suspense boundary that
 * hydrates after the router), this ran too late, every Back looked like a
 * fresh visit, and only the Navigation API's entry keys still recognised it —
 * so on browsers without them (Safari before 26.2) Back always opened the
 * previous screen at the top.
 */
function onPopState() {
  // Location and the current entry already point at the destination.
  pendingTraversal = {
    url: locationUrlKey(),
    entry: currentEntryKey(),
    at: performance.now(),
  };
}

if (isBrowser()) {
  window.addEventListener("popstate", onPopState);
  // The browser's own restoration runs before any client-rendered content
  // exists and then fights this module; it must be off before the first
  // popstate or reload.
  try {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  } catch {
    // Some embedded browsers expose it read-only.
  }
  pruneStoredPositions();
}
