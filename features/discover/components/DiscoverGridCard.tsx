"use client";

import { memo, useCallback, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, ImageIcon, Images, MapPin, Play } from "lucide-react";
import { SHIMMER_PORTRAIT } from "@/lib/shimmer";
import { contentPath } from "@/lib/content-url";
import { profileHref } from "@/lib/profile-url";
import { cn } from "@/lib/utils";
import { VerifiedIdBadge } from "@/components/verification/VerifiedIdBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/features/feed/hooks/useAuthGuard";
import { useSaveToggle } from "@/features/feed/hooks/useSaveToggle";
import {
  HoverVideoPreview,
  useHoverPreview,
} from "@/features/video/components/HoverVideoPreview";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";

/**
 * The post tile. One component for phone and desktop — only the column count
 * changes, never the anatomy.
 *
 * Top to bottom it answers a buyer's questions in the order they ask them:
 *
 *   1. WHAT — the photo, edge to edge, no card border or panel. Chrome around
 *      forty small tiles reads as a spreadsheet, not a feed. Over it: Save,
 *      Negotiable, and what tapping opens (a video's length, a photo count).
 *   2. HOW MUCH — the price, first and boldest, on a line of its own. Prices
 *      line up across a row and compare at a glance however long the titles
 *      under them run.
 *   3. WHICH ONE — the title, in the seller's own casing at reading weight. It
 *      used to be bold uppercase, which made every title shout and left the
 *      price nothing to stand out against.
 *   4. WHERE — county, then area, behind a pin.
 *   5. WHO — the seller, small and last. As a row above the photo at title
 *      size it made the grid read as a list of people rather than of things.
 *      It is still one tap to the shop.
 *
 * Cover ratio is a uniform 3:4 at every width, so rows align and infinite
 * scroll never reflows under the thumb.
 */

/**
 * The columns and gaps every grid of these tiles uses — /explore, /search, the
 * Saved tab, a seller's profile and Ask Shopi.
 *
 * It lives with the tile because those five surfaces are supposed to read as
 * one system, and the string was previously pasted into each of them with a
 * comment in each asking the next person to keep them in sync by hand.
 *
 * Gaps widen with the viewport rather than staying at a phone's 12/20: on a
 * desktop grid five columns at a tight gap read as a contact sheet. 24 across
 * and 40 down at xl is the reference spacing.
 */
export const DISCOVER_GRID =
  "grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 xl:grid-cols-4 xl:gap-x-6 xl:gap-y-10 min-[90rem]:grid-cols-5";

/** "KES 12,500" — grouped thousands, no decimals. */
function formatPrice(amount: number, currency: string) {
  return `${currency} ${Math.round(amount).toLocaleString("en-KE")}`;
}

/** Seconds → "0:42" / "12:05". */
function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * "Nyandarua, Mairo-Inya" — county first, then the more specific area. County
 * leads because it is the unit a buyer recognises and filters on; the area
 * after it answers "where exactly". De-duped, so a listing whose area equals
 * its county reads "Nairobi", never "Nairobi, Nairobi".
 */
function locationLabel(loc: {
  placeName?: string | null;
  subregion?: string | null;
  county?: string | null;
}): string | null {
  const county = loc.county?.trim() || null;
  const area = loc.placeName?.trim() || loc.subregion?.trim() || null;
  const parts = [county, area].filter(
    (p, i, arr): p is string => Boolean(p) && arr.indexOf(p) === i,
  );
  return parts.length ? parts.join(", ") : null;
}

function sellerName(
  creator: NonNullable<ContentCardFieldsFragment["creator"]>,
) {
  const first = creator.profile?.firstName?.trim();
  const last = creator.profile?.lastName?.trim();
  const full = [first, last].filter(Boolean).join(" ");
  return creator.username?.trim() || full || "Seller";
}

function getThumb(post: ContentCardFieldsFragment): string | null {
  const first = post.media?.[0];
  const muxPlaybackId = first?.muxMeta?.playbackId;
  const muxDerivedThumb = muxPlaybackId
    ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=0&width=540&fit_mode=smartcrop`
    : null;

  return (
    first?.muxMeta?.thumbnailUrl ??
    first?.thumbnailUrl ??
    first?.r2Variants?.find((v) => v.variant === "medium")?.url ??
    first?.r2Variants?.[0]?.url ??
    first?.url ??
    first?.imageUrl ??
    muxDerivedThumb ??
    null
  );
}

/** The blue tick the feed card and profiles use, sized for a 12px line. */
function DiscoverGridCardImpl({
  post,
  lang,
  priority,
  showSave = true,
  showSeller = true,
}: {
  post: ContentCardFieldsFragment;
  lang: string;
  priority: boolean;
  /**
   * Whether to draw the save button.
   *
   * The Saved tab turns it off: every tile there is saved already, so a save
   * control says nothing about the state it is in and only adds a target to
   * mis-tap.
   */
  showSave?: boolean;
  /**
   * Whether to draw the seller line.
   *
   * A profile grid turns it off — every tile there belongs to the same seller,
   * so repeating them down the page is noise. It also self-disables when the
   * query behind the tile did not select `creator`, so a narrower query
   * degrades to a tile without it rather than to an empty line.
   */
  showSeller?: boolean;
}) {
  // Some legacy listings point at media that 404s. Without this the tile shows
  // the browser's broken-image chrome plus raw alt text — a dead tile in the
  // middle of a discovery grid.
  const [imageFailed, setImageFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const thumb = getThumb(post);
  const isVideo = post.type === "VIDEO";
  const playbackId =
    post.media?.find((m) => m.muxMeta?.playbackId)?.muxMeta?.playbackId ?? null;
  const { previewing, bind } = useHoverPreview(isVideo && !!playbackId);
  const { requireAuth } = useAuthGuard(lang);
  const { saved, toggle } = useSaveToggle({
    contentId: post.id,
    initialSaved: post.isSavedByMe ?? false,
    initialCount: post.stats?.saves ?? 0,
  });

  const hasPrice = !!post.price && post.price.amount > 0;
  const priceText = hasPrice
    ? formatPrice(post.price.amount, post.price.currency)
    : "Price on request";
  const negotiable = hasPrice && Boolean(post.price?.negotiable);
  const place = post.location ? locationLabel(post.location) : null;
  const creator = post.creator;
  const seller = showSeller && creator ? sellerName(creator) : null;

  const durationSeconds =
    post.media?.find((m) => m.muxMeta?.duration)?.muxMeta?.duration ??
    post.tiktokEmbed?.duration ??
    null;
  const photoCount =
    post.media?.filter((m) => m.mediaType === "IMAGE").length ?? 0;

  // Screen readers get the whole decision in one label — the visual hierarchy
  // doesn't survive being read tile by tile.
  const ariaLabel = [
    post.title,
    priceText,
    negotiable ? "negotiable" : null,
    place,
    post.creator?.isVerified ? "Verified ID" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const onSaveTap = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      // The cover is a Link; saving must not navigate.
      e.preventDefault();
      e.stopPropagation();
      if (!requireAuth({ contentId: post.id, action: "save" })) return;
      void toggle();
    },
    [post.id, requireAuth, toggle],
  );

  return (
    // Two links rather than one around everything: the seller line goes to
    // the shop and the rest to the post, and an <a> inside an <a> is invalid
    // and un-clickable.
    // data-scroll-anchor: what a return to this grid lines back up with.
    <div data-scroll-anchor={post.id} className="flex min-w-0 flex-col">
      <Link
        href={contentPath(lang, post)}
        scroll={false}
        className="group/post block outline-none"
        aria-label={ariaLabel}
        {...bind}
      >
        {/* ---- What ------------------------------------------------------ */}
        <div
          className="group/cover relative aspect-3/4 w-full overflow-hidden rounded-xl transition-transform duration-200 active:scale-[0.98] group-focus-visible/post:ring-2 group-focus-visible/post:ring-primary group-focus-visible/post:ring-offset-2"
          style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
        >
          {thumb && !imageFailed ? (
            <Image
              src={
                post.media.filter((m) => m.mediaType === "IMAGE")[0]
                  ?.r2Variants?.[0]?.url ??
                thumb ??
                "/images/placeholder.png"
              }
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover/cover:scale-[1.04]"
              // Matches DISCOVER_GRID's columns: 2 → 3 at md → 4 at xl → 5.
              sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, (max-width: 1439px) 25vw, 20vw"
              priority={priority}
              loading={priority ? "eager" : "lazy"}
              placeholder="blur"
              blurDataURL={SHIMMER_PORTRAIT}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ color: "rgb(var(--color-text-placeholder))" }}
            >
              <ImageIcon size={22} strokeWidth={1.6} aria-hidden />
            </div>
          )}

          {/* Hover preview sits over the thumbnail, which stays mounted behind
              it so there's no flash while the stream spins up. Desktop only. */}
          {previewing && playbackId && (
            <HoverVideoPreview playbackId={playbackId} />
          )}

          {showSave && (
            <button
              type="button"
              onClick={onSaveTap}
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : `Save ${post.title}`}
              className={cn(
                "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90",
                saved ? "bg-white text-primary" : "bg-black/40 text-white",
              )}
            >
              <Bookmark
                size={15}
                strokeWidth={2.2}
                fill={saved ? "currentColor" : "none"}
                aria-hidden
              />
            </button>
          )}

          {/* A quiet chip in the empty corner rather than words beside the
              price, where a 2-up phone grid has no room for them. */}
          {negotiable ? (
            <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold leading-none text-white backdrop-blur-md">
              Negotiable
            </span>
          ) : null}

          {/* Every listing from a verified shop carries Verified ID in the
              bottom-right corner of its media. */}
          {post.creator?.isVerified ? (
            <VerifiedIdBadge variant="overlay" className="pointer-events-none absolute bottom-2 right-2" />
          ) : null}

          {/* What kind of media this is, because it changes what tapping the
              tile opens. */}
          {isVideo || photoCount > 1 ? (
            <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold leading-none text-white tabular-nums">
              {isVideo ? (
                <>
                  <Play
                    size={10}
                    fill="currentColor"
                    strokeWidth={0}
                    aria-hidden
                  />
                  {durationSeconds ? formatDuration(durationSeconds) : "Video"}
                </>
              ) : (
                <>
                  <Images size={11} strokeWidth={2.2} aria-hidden />
                  {photoCount}
                </>
              )}
            </span>
          ) : null}
        </div>

        {/* ---- How much, which one, where ---------------------------------- */}
        <div className="pt-2">
          <p
            className={cn(
              "truncate leading-5 tabular-nums md:leading-6",
              hasPrice
                ? "text-[15px] font-bold tracking-[-0.01em] text-main md:text-base"
                : "text-[13px] font-medium text-muted md:text-[14px]",
            )}
          >
            {priceText}
          </p>

          {post.title ? (
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-[18px] text-main md:text-[14px] md:leading-5 md:group-hover/post:underline">
              {post.title}
            </p>
          ) : null}

          {place ? (
            <p className="mt-1 flex min-w-0 items-center gap-1 text-[12px] leading-4 text-muted">
              <MapPin size={12} strokeWidth={2} className="shrink-0" aria-hidden />
              <span className="truncate">{place}</span>
            </p>
          ) : null}
        </div>
      </Link>

      {/* ---- Who ----------------------------------------------------------- */}
      {seller && creator ? (
        <Link
          href={profileHref(lang, creator)}
          scroll={false}
          className="mt-1 flex min-w-0 max-w-full items-center gap-1.5 self-start py-1 outline-none hover:underline focus-visible:underline"
        >
          {creator.profile?.avatar && !avatarFailed ? (
            <Image
              src={creator.profile.avatar}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 rounded-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-subtle text-[9px] font-semibold uppercase leading-none text-muted"
              aria-hidden
            >
              {seller.charAt(0)}
            </span>
          )}
          <span className="truncate text-[12px] leading-4 text-muted">
            <span className="sr-only">Sold by </span>
            {seller}
          </span>
        </Link>
      ) : null}
    </div>
  );
}

// The Discover grid re-renders on every pagination/filter state change; memo
// keeps already-rendered tiles from re-rendering when pages append (Apollo
// cache items are referentially stable).
export const DiscoverGridCard = memo(DiscoverGridCardImpl);

/**
 * Loading stand-in with the tile's exact anatomy — 3:4 cover, price, two-line
 * title, place, seller — so nothing shifts when real tiles land.
 */
export function DiscoverGridCardSkeleton({
  showSeller = true,
  className,
}: {
  showSeller?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)} aria-hidden>
      <Skeleton className="aspect-3/4 w-full rounded-xl" />
      <div className="pt-2">
        <div className="flex h-5 items-center md:h-6">
          <Skeleton className="h-3.5 w-20 md:h-4" />
        </div>
        <Skeleton className="mt-1.5 h-3 w-11/12" />
        <Skeleton className="mt-1.5 h-3 w-2/3" />
        <Skeleton className="mt-2.5 h-2.5 w-1/2" />
      </div>
      {showSeller ? (
        <div className="mt-1 flex items-center gap-1.5 py-1">
          <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Tiles shown per breakpoint: always `rows` complete rows of DISCOVER_GRID's
 * column count (2 → 3 → 4 → 5), so a loading grid never ends in a ragged row.
 */
function fullRowsClass(index: number, rows: number) {
  if (index >= rows * 4) return "hidden min-[90rem]:flex";
  if (index >= rows * 3) return "hidden xl:flex";
  if (index >= rows * 2) return "hidden md:flex";
  return undefined;
}

/** A whole DISCOVER_GRID of skeleton tiles that fills its rows at every width. */
export function DiscoverGridSkeleton({
  rows = 4,
  count = rows * 5,
  showSeller = true,
  className,
}: {
  rows?: number;
  count?: number;
  showSeller?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(DISCOVER_GRID, className)} role="status" aria-label="Loading listings">
      {Array.from({ length: count }).map((_, index) => (
        <DiscoverGridCardSkeleton
          key={index}
          showSeller={showSeller}
          className={fullRowsClass(index, rows)}
        />
      ))}
    </div>
  );
}
