"use client";

import { Fragment, useState } from "react";
import { PostCard } from "./PostCard";
import {
  FeaturedSellerCard,
  useFeaturedSellers,
} from "./FeaturedSellerCard";
import { FEED_PAGE_SIZE } from "../constants";
import { useForYouFeed } from "../hooks/useFeed";
import {
  FeedCardsSkeleton,
  FeedPaginationSkeleton,
} from "./FeedSkeleton";
import { LocationPermissionBanner } from "./LocationPermissionBanner";
import { StoriesBar } from "@/features/stories/components/StoriesBar";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { memo, Suspense } from "react";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";

interface Props {
  lang: string;
  active?: boolean;
  /**
   * The first page, fetched on the server. See the Suspense boundary below for
   * why this exists — without it the feed's HTML is a skeleton in production.
   */
  initialItems?: ContentCardFieldsFragment[];
}

/** The card list itself — the only part that differs between the server
 *  snapshot and the live, paginating feed. */
/**
 * Where the seller slots land, counted in posts.
 *
 * The first comes at the end of page one — early enough that a scroller meets a
 * shop in their first session, late enough that it never interrupts the opening
 * screen. After that they space out to every two pages, so the feed stays
 * mostly listings.
 *
 * Slots therefore fall after post 12, 36, 60, …
 */
const SELLER_SLOT_FIRST_AFTER = FEED_PAGE_SIZE;
const SELLER_SLOT_EVERY = FEED_PAGE_SIZE * 2;

function FeedCards({
  items,
  lang,
}: {
  items: ContentCardFieldsFragment[];
  lang: string;
}) {
  const sellers = useFeaturedSellers();

  // A seller card may never be inserted into content that is already on
  // screen.
  //
  // The sellers query resolves a beat after the first cards paint. Filling
  // every eligible slot the moment it landed spliced a card into the middle of
  // a list the user was already scrolling, pushing everything below it down —
  // the largest layout shift in the feed, and the one that reads as the page
  // jumping under your thumb.
  //
  // Both values are captured once, at mount, so they cannot move mid-scroll.
  // If the sellers were already cached when the list first rendered, every
  // slot is safe: the cards were there from the first frame. Otherwise only
  // slots past the initially rendered items are filled, and those appear as
  // new pages append — content the user has not reached yet.
  const [sellersReadyAtMount] = useState(() => sellers.length > 0);
  const [initialCount] = useState(items.length);

  return (
    <div className="flex flex-col gap-2">
      {items.map((post, i) => {
        // Slot goes AFTER the nth post, and only once there is a seller to put
        // in it — never an empty gap or a placeholder.
        const posted = i + 1;
        const isSlot =
          posted >= SELLER_SLOT_FIRST_AFTER &&
          (posted - SELLER_SLOT_FIRST_AFTER) % SELLER_SLOT_EVERY === 0;
        const slot = isSlot
          ? (posted - SELLER_SLOT_FIRST_AFTER) / SELLER_SLOT_EVERY
          : -1;
        // Cycle, so a long scroll keeps offering sellers instead of running dry
        // after the last ranked one.
        const seller =
          slot >= 0 &&
          sellers.length > 0 &&
          (sellersReadyAtMount || i >= initialCount)
            ? sellers[slot % sellers.length]
            : null;

        return (
          <Fragment key={post.id}>
            <PostCard post={post} lang={lang} priority={i === 0} />
            {seller && <FeaturedSellerCard seller={seller} lang={lang} />}
          </Fragment>
        );
      })}
    </div>
  );
}

/**
 * The live feed. Reads through `useForYouFeed`, which uses `useSuspenseQuery`
 * and therefore suspends until the query resolves.
 */
function LiveFeedCards({ lang, active }: { lang: string; active: boolean }) {
  const { items, loadingMore, hasMore, loadMore, loading } = useForYouFeed(active);

  const { sentinelRef } = useInfiniteScroll({
    enabled: active,
    hasMore,
    loading,
    onLoadMore: loadMore,
  });

  if (!loading && items.length === 0) {
    return (
      <div className="flex min-h-[93svh] fixed top-0 left-0 right-0 bottom-0  flex-col items-center justify-center py-24 px-6 text-center">
        <div className="text-5xl mb-4">🛍️</div>
        <h3 className="font-bold text-default text-base mb-2">
          Your feed is empty
        </h3>
        <p className="app-subcopy">
          Follow sellers or explore categories to see content here.
        </p>
      </div>
    );
  }

  return (
    <>
      <FeedCards items={items} lang={lang} />

      {/* ── Infinite scroll sentinel ─────────────────────────────────── */}
      <div ref={sentinelRef} className="h-1" />

      {/* The loader's space is reserved rather than inserted.
          Mounting it only while a page was in flight changed the document
          height by ~72px each time, and near the bottom of the feed a
          shrinking document makes the browser clamp scrollTop — which reads
          as the page jumping under your thumb, especially when scrolling up
          and down repeatedly across the pagination trigger. */}
      <div
        className="flex items-center justify-center"
        style={{ minHeight: hasMore ? "72px" : undefined }}
        aria-hidden={!loadingMore}
      >
        {loadingMore && <FeedPaginationSkeleton />}
      </div>

      {!hasMore && items.length > 0 && (
        <p className="text-center text-muted-foreground text-xs py-6">
          You&apos;re all caught up ✓
        </p>
      )}
    </>
  );
}

function FeedGrid({ lang, active = true, initialItems }: Props) {
  return (
    <div className="pb-safe-area-inset-bottom pb-6 min-h-svh">
      {/* ── Stories tray ──────────────────────────────────────────────── */}
      {/* Deliberately OUTSIDE the boundary below: it reads with useQuery (not
          useSuspenseQuery), so it never suspends, and it always renders at one
          height — skeleton, "Your story" alone, or a full tray. Keeping it here
          means the swap from server snapshot to live feed cannot move anything
          above the cards, which is what would have shown up as layout shift. */}
      <StoriesBar lang={lang} />

      {/* ── Location permission nudge ────────────────────────────────── */}
      <LocationPermissionBanner />

      {/* ── Post cards ───────────────────────────────────────────────────
          `useForYouFeed` suspends. Without a boundary here, the *route's*
          boundary was the nearest one, and on the server it could only be
          completed if the feed query resolved during the render. Against the
          production API (~2.4s for one page) it never did, so React abandoned
          the whole boundary and shipped a skeleton, leaving the client to fetch
          and render every card — and leaving the LCP image out of the HTML
          entirely, where no preload or fetchpriority hint could reach it. That
          abort is React error #419.

          Giving the suspending part its own boundary whose fallback is the
          server-fetched first page means the server always has something real
          to render: the cards, and with them the LCP <img>, land in the initial
          HTML. The live feed then takes over on the client with the same items
          (same query, same cache), so the swap is invisible. */}
      <Suspense
        fallback={
          initialItems && initialItems.length > 0 ? (
            <FeedCards items={initialItems} lang={lang} />
          ) : (
            <FeedCardsSkeleton />
          )
        }
      >
        <LiveFeedCards lang={lang} active={active} />
      </Suspense>
    </div>
  );
}
export default memo(FeedGrid);
