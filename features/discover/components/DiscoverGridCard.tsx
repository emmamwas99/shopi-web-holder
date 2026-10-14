"use client";

import { memo, useCallback, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, ImageIcon, Images, Play } from "lucide-react";
import { SHIMMER_PORTRAIT } from "@/lib/shimmer";
import { contentPath } from "@/lib/content-url";
import { profileHref } from "@/lib/profile-url";
import { idInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";
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
 * Three bands, in the order a buyer actually uses them:
 *
 *   1. WHO — avatar and seller, above the photo. On a marketplace the seller is
 *      half the decision, and putting them above the photo rather than on it
 *      means the photo is never covered and the row is its own tap target to
 *      the profile.
 *   2. WHAT — the photo, edge to edge, no card border or panel. Chrome around
 *      forty small tiles reads as a spreadsheet, not a feed. The only things
 *      over it are Save and, for video, a duration chip.
 *   3. THE DECISION — price first, so prices align down the column and compare
 *      at a glance; then the title; then where it is.
 *
 * Location moved off the photo and into that third band. As a glass pill it was
 * competing with the product for the same pixels, and it is not a reason to tap
 * so much as something you check once you are interested.
 *
 * The "Popular"/"New" chip is gone. It was the one piece of pure decoration
 * here: derived from save counts and age rather than from anything the seller
 * did, floating over the product, and on a full grid it turned into wallpaper.
 *
 * Cover ratio is a uniform 3:4 at every width, so rows align and infinite
 * scroll never reflows under the thumb. It used to widen to 4:5 at md+, which
 * meant the same tile had two different shapes depending on the viewport.
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

/** "KSh 12,500" — grouped thousands, no decimals. */
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
   * Whether to draw the seller row.
   *
   * A profile grid turns it off — every tile there belongs to the same seller,
   * so repeating them down the page is noise. It also self-disables when the
   * query behind the tile did not select `creator`, so a narrower query
   * degrades to the old layout rather than to an empty row.
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
    : "Ask price";
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
  const ariaLabel = [post.title, priceText, place].filter(Boolean).join(", ");

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
    // Not one big Link: the seller row links to the profile and the rest links
    // to the post, and an <a> inside an <a> is invalid and un-clickable.
    // data-scroll-anchor: what a return to this grid lines back up with.
    <div data-scroll-anchor={post.id} className="group/tile flex flex-col">
      {/* ---- 1. Who --------------------------------------------------- */}
      {seller && creator ? (
        <Link
          href={profileHref(lang, creator)}
          scroll={false}
          className="mb-2.5 flex min-w-0 items-center gap-2 outline-none"
        >
          {creator.profile?.avatar && !avatarFailed ? (
            <Image
              src={creator.profile.avatar}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 shrink-0 rounded-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-main text-[9px] font-black text-elevated"
              aria-hidden
            >
              {idInitials(creator.id)}
            </span>
          )}
          <span className="truncate text-[13px] font-semibold leading-[18.5px] text-main group-hover/tile:underline">
            {seller}
          </span>
        </Link>
      ) : null}

      <Link
        href={contentPath(lang, post)}
        scroll={false}
        className="block outline-none"
        aria-label={ariaLabel}
        {...bind}
      >
        {/* ---- 2. What ------------------------------------------------ */}
        <div
          className="group/cover relative aspect-3/4 w-full overflow-hidden rounded-xl transition-transform duration-200 group-focus-visible/tile:ring-2 group-focus-visible/tile:ring-primary active:scale-[0.98]"
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
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
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
                "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full  transition active:scale-90",
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

          {/* Was inline text next to the price ("KES 14,500,000 Negotiable"),
              which had nowhere to go on a 2-up mobile grid and ran into the
              next tile. A small badge in the empty top-left corner instead —
              same quiet black/40 chip as Save and the photo/video count, not
              a shouty colored "Negotiable!" tag. */}
          {post.price?.negotiable && hasPrice ? (
            <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold leading-none text-white ">
              Negotiable
            </span>
          ) : null}

          {/* What kind of media this is — the one thing still over the photo,
              because it changes what tapping it does. */}
          {isVideo || photoCount > 1 ? (
            <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold leading-none text-white  tabular-nums">
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

        {/* ---- 3. The decision ---------------------------------------- */}
        <div className="pt-3">
          {post.title && (
            // Smaller on mobile: at 15px/leading-5 this ran two bold uppercase
            // lines that dwarfed the price/location beneath it — heavy for a
            // 2-up grid, where 96% of traffic actually sees this tile.
            <p className="line-clamp-2 text-[13px] font-black uppercase leading-4 tracking-normal text-main md:text-[15px] md:leading-5">
              {post.title}
            </p>
          )}

          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] font-medium leading-[18.5px] text-muted">
            <span className="shrink-0 font-bold text-main">
              {hasPrice ? priceText : "Ask"}
            </span>
            {place ? (
              <>
                <span className="shrink-0 text-muted">•</span>
                <span className="truncate">{place}</span>
              </>
            ) : null}
          </p>
        </div>
      </Link>
    </div>
  );
}

// The Discover grid re-renders on every pagination/filter state change; memo
// keeps already-rendered tiles from re-rendering when pages append (Apollo
// cache items are referentially stable).
export const DiscoverGridCard = memo(DiscoverGridCardImpl);

/**
 * Loading stand-in with the tile's exact anatomy — seller row, 3:4 cover,
 * two-line title, price • place — so nothing shifts when real tiles land.
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
      {showSeller ? (
        <div className="mb-2.5 flex items-center gap-2">
          <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      ) : null}
      <Skeleton className="aspect-3/4 w-full rounded-xl" />
      <div className="pt-3">
        <Skeleton className="h-3.5 w-11/12 md:h-4" />
        <Skeleton className="mt-1.5 h-3.5 w-2/3 md:h-4" />
        <div className="mt-2 flex items-center gap-1.5">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
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
