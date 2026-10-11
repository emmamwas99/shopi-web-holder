/**
 * Mobile-first initial window. Six cards fill several phone viewports while
 * keeping the first streamed response and hydration work bounded.
 *
 * This is the size of the FIRST page only — the one that is server-rendered
 * into the document and hydrated before the feed is interactive. It is the
 * single biggest lever on the feed's cold-start cost, because every card is a
 * PostCard: ~100 DOM nodes, an IntersectionObserver, a ResizeObserver and a
 * `<video>` element each. At 16 the first document carried ~1,700 elements and
 * ~940 KB of HTML, which delayed LCP-image discovery by seconds. Six keeps the
 * first paint small; `FEED_LOAD_MORE_SIZE` refills ahead of the scroll so the
 * feed still feels endless.
 *
 * NOTE: the server preload in app/[lang]/(app)/(shell)/for-you/page.tsx must request this
 * exact same limit, or the client's query misses the SSR cache and refetches
 * page 1 on hydration.
 */
export const FEED_PAGE_SIZE = 12;

/**
 * Subsequent pages fetched by the infinite-scroll sentinel. Larger than the
 * first page because by then nothing is blocking: the cards mount off-screen,
 * outside the LCP window, so a bigger page just means fewer round trips.
 */
export const FEED_LOAD_MORE_SIZE = 12;

/**
 * Immersive video viewer pages. Smaller than the feed's because every slide is
 * a full viewport: only the active slide and its immediate neighbours keep a
 * `<video>` alive, so a larger page buys no extra readiness and just costs
 * payload on a surface that is usually opened on mobile data.
 *
 * The viewer prefetches when fewer than VIDEO_FEED_PREFETCH_AHEAD slides remain
 * ahead of the active one, so pages land well before the user reaches the end.
 */
export const VIDEO_FEED_PAGE_SIZE = 8;
export const VIDEO_FEED_LOAD_MORE_SIZE = 8;
export const VIDEO_FEED_PREFETCH_AHEAD = 4;

/**
 * Watch tab grid pages. Unlike the viewer, many posters show at once, so a page
 * should add whole rows: 10 fills the phone grid's 2 columns, 18 the desktop
 * grid's 6 (and three full rows of 5 plus change at lg).
 */
export const WATCH_GRID_PAGE_SIZE = 10;
export const WATCH_GRID_DESKTOP_PAGE_SIZE = 18;
