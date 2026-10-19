"use client";

import { VerifiedTick } from "@/components/verification/VerifiedTick";
import { memo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Clock3,
  Eye,
  Link2,
  MapPin,
  MoreHorizontal,
  Package2,
  Share2,
  Store as StoreIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFollow } from "@/features/feed/hooks/useFollow";
import { useAuthStore } from "@/stores/auth";
import { SHIMMER, SHIMMER_AVATAR } from "@/lib/shimmer";
import { profileHref } from "@/lib/profile-url";
import { avatarGradient, idInitials } from "@/lib/avatar";
import { fmtCompact } from "@/lib/format";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { StoreCard } from "@/features/stores/queries/stores";

/**
 * One storefront in the directory.
 *
 * Read top to bottom the way someone picks a shop to walk into:
 *
 *   1. WHAT THEY SELL — a collage of their newest covers. A shop is judged on
 *      its stock long before its name, so the photos lead and get the most
 *      pixels. Four tiles: enough to read a category at a glance, few enough
 *      that the row of cards still scans.
 *   2. WHO THEY ARE — avatar, name, verified badge, the line that says what
 *      they deal in, and where they trade. Below the collage rather than over
 *      it, so nothing covers the goods.
 *   3. WHY THEY'RE WORTH A TAP — the footer strip: stock, reach, freshness.
 *      Every number there is derived from live public listings rather than
 *      typed by the seller, which is the whole reason it can be trusted.
 *
 * The whole tile is one link to the storefront. A card with two tap targets
 * (collage → listing, name → profile) reads as a feed post, and this is a
 * directory entry: there is exactly one thing to do with it.
 *
 * Phones get their own compact card (MobileStoreCard) instead: who they are
 * first, then a strip of thumbnails, so a full-width 3:2 collage doesn't turn
 * every shop into a screen and a half of scrolling.
 */

/** Grid the directory lays these out on. Lives with the tile so the two agree. */
export const STORE_GRID_CLASS =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5";

/** A shop that listed within this window is worth marking as currently trading. */
const ACTIVE_WINDOW_DAYS = 7;

function isRecentlyActive(value: string): boolean {
  const listed = new Date(value).getTime();
  if (Number.isNaN(listed)) return false;
  return Date.now() - listed < ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Row count for the sidebar column, written out in full so Tailwind's scanner
 * sees each class literally.
 */
const SIDEBAR_ROWS: Record<number, string> = {
  1: "grid-rows-1",
  2: "grid-rows-2",
  3: "grid-rows-3",
};

function StoreCollage({ images, name }: { images: string[]; name: string }) {
  // An empty directory card would be a dead tile, and the API already drops
  // sellers with no public stock — so this only fires when every cover failed
  // to resolve, and a plain panel beats four broken image frames.
  if (images.length === 0) {
    return (
      <div className="flex aspect-3/2 w-full items-center justify-center bg-surface">
        <StoreIcon className="h-7 w-7 text-muted" aria-hidden />
      </div>
    );
  }

  const [hero, ...rest] = images;
  const sidebar = rest.slice(0, 3);
  const heroImage = (
    <Image
      src={hero}
      alt={`Latest from ${name}`}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 25vw"
      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      placeholder="blur"
      blurDataURL={SHIMMER}
    />
  );

  // A shop with one resolvable cover — a new seller, or one whose other covers
  // failed — gets the full frame. A hero pinned to two thirds beside an empty
  // third reads as a broken image rather than a composition.
  if (sidebar.length === 0) {
    return (
      <div className="relative aspect-3/2 w-full overflow-hidden bg-surface">
        {heroImage}
      </div>
    );
  }

  return (
    <div className="grid aspect-3/2 w-full grid-cols-3 gap-0.5 overflow-hidden bg-surface">
      {/* The newest listing gets two thirds of the width — a shop's most recent
          stock is the one most worth showing, and a flat 2x2 of equal tiles
          reads as a mood board rather than a storefront. */}
      <div className="relative col-span-2 h-full overflow-hidden">{heroImage}</div>

      {/* Rows follow the covers that actually resolved, so the column is always
          filled edge to edge however many there are. */}
      <div className={cn("grid h-full gap-0.5", SIDEBAR_ROWS[sidebar.length])}>
        {sidebar.map((image, index) => (
          <div key={`${image}-${index}`} className="relative h-full overflow-hidden">
            <Image
              src={image}
              alt=""
              fill
              sizes="10vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              placeholder="blur"
              blurDataURL={SHIMMER}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * One number in the footer strip. The icon carries the meaning visually and
 * the label carries it for screen readers, so a bare "1.2K" is never ambiguous
 * to either.
 */
function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Eye;
  value: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1" title={`${value} ${label}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Slots in the phone card's thumbnail strip. */
const THUMB_SLOTS = 4;

/**
 * The phone's stand-in for the collage: four equal squares in a row. Slots
 * with no cover stay as quiet placeholders so every card keeps the same
 * height and the list scans in an even rhythm.
 */
function StoreThumbStrip({ images, name }: { images: string[]; name: string }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: THUMB_SLOTS }).map((_, index) => {
        const image = images[index];
        return (
          <div
            key={index}
            className="relative aspect-square overflow-hidden rounded-lg bg-surface"
          >
            {image ? (
              <Image
                src={image}
                alt={index === 0 ? `Latest from ${name}` : ""}
                fill
                sizes="(max-width: 640px) 24vw, 12vw"
                className="object-cover"
                placeholder="blur"
                blurDataURL={SHIMMER}
              />
            ) : index === 0 ? (
              <div className="flex h-full w-full items-center justify-center">
                <StoreIcon className="h-5 w-5 text-muted" aria-hidden />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StoreAvatar({ store, size }: { store: StoreCard; size: number }) {
  const box = size === 44 ? "h-11 w-11" : "h-10 w-10";
  return store.avatar ? (
    <Image
      src={store.avatar}
      alt=""
      width={size}
      height={size}
      className={cn(box, "shrink-0 rounded-full object-cover")}
      placeholder="blur"
      blurDataURL={SHIMMER_AVATAR}
    />
  ) : (
    <span
      className={cn(
        box,
        "flex shrink-0 items-center justify-center rounded-full bg-linear-to-br text-[12px] font-bold text-white",
        avatarGradient(store.id),
      )}
      aria-hidden
    >
      {idInitials(store.id)}
    </span>
  );
}

/**
 * The phone card. Same single stretched link as the desktop tile, with Follow
 * beside the name (a phone card is wide enough for both) and Share in place
 * of the ⋯ menu, since the native share sheet is what a phone reaches for.
 */
function MobileStoreCard({
  store,
  href,
  place,
  listedAgo,
  active,
  isOwnStore,
  following,
  followLoading,
  onToggleFollow,
  onShare,
}: {
  store: StoreCard;
  href: string;
  place: string;
  listedAgo: string | null | undefined;
  active: boolean;
  isOwnStore: boolean;
  following: boolean;
  followLoading: boolean;
  onToggleFollow: () => void;
  onShare: () => void;
}) {
  return (
    <div
      data-scroll-anchor={store.id}
      className="relative rounded-2xl border border-border bg-elevated p-3 transition-colors active:bg-surface md:hidden"
    >
      <Link
        href={href}
        scroll={false}
        aria-label={`${store.displayName}, @${store.username} — ${store.listingCount} ${
          store.listingCount === 1 ? "listing" : "listings"
        }`}
        className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />

      <div className="flex items-center gap-3">
        <StoreAvatar store={store} size={44} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-[15px] font-bold text-main">
              {store.displayName}
            </span>
            {store.isVerified ? <VerifiedTick size={16} label="Verified shop" /> : null}
          </div>
          {/* The handle is who they are, the place only where: when the line
              runs short, the place gives way first. */}
          <p className="flex min-w-0 items-center gap-1 text-[12px] text-muted">
            <span className="max-w-[60%] shrink-0 truncate">@{store.username}</span>
            {place ? (
              <>
                <span aria-hidden>·</span>
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{place}</span>
              </>
            ) : null}
          </p>
        </div>

        {/* Your own storefront gets no Follow button — the API rejects
            following yourself, so offering it would only ever error. */}
        {isOwnStore ? null : (
          <button
            type="button"
            onClick={onToggleFollow}
            disabled={followLoading}
            aria-pressed={following}
            className={cn(
              "relative z-10 inline-flex h-8 shrink-0 items-center justify-center rounded-full px-4 text-[13px] font-bold transition-opacity active:opacity-70 disabled:opacity-60",
              following
                ? "border border-border bg-app text-main"
                : "bg-primary text-white",
            )}
          >
            {following ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {store.headline ? (
        <p className="mt-2 truncate text-[13px] text-main">{store.headline}</p>
      ) : null}

      <div className="mt-3">
        <StoreThumbStrip images={store.previewImages} name={store.displayName} />
      </div>

      <div className="mt-2.5 flex items-center gap-3 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1 font-semibold text-main">
          <Package2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {store.listingCount.toLocaleString("en-KE")}{" "}
          {store.listingCount === 1 ? "listing" : "listings"}
        </span>

        {store.totalViews > 0 ? (
          <Metric icon={Eye} value={fmtCompact(store.totalViews)} label="views" />
        ) : null}

        {listedAgo ? (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              active && "font-semibold text-success",
            )}
          >
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{listedAgo}</span>
            <span className="sr-only">since the last listing</span>
          </span>
        ) : null}

        <button
          type="button"
          onClick={onShare}
          aria-label={`Share ${store.displayName}`}
          className="relative z-10 -my-1.5 -mr-1.5 ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface"
        >
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function StoreTileComponent({
  lang,
  store,
  isFollowed = false,
}: {
  lang: string;
  store: StoreCard;
  /** Whether the viewer already follows this seller (see StoresPage). */
  isFollowed?: boolean;
}) {
  const href = profileHref(lang, { username: store.username, id: store.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const viewerId = useAuthStore((s) => s.user?.id);

  const { following, toggle, loading } = useFollow({
    userId: store.id,
    initialFollowing: isFollowed,
    lang,
  });

  // Neighbourhood first, county second: "The Bazaar, Nairobi County" is how
  // someone here would actually say where a shop is.
  const place = [store.placeName, store.county].filter(Boolean).join(", ");
  const listedAgo = timeAgo(store.lastListedAt);
  const active = isRecentlyActive(store.lastListedAt);
  const joinedYear = new Date(store.memberSince).getFullYear();
  const isOwnStore = viewerId === store.id;

  async function handleCopyLink() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${href}`;
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      // Safari denies the clipboard API outside a trusted gesture chain and
      // every browser denies it over plain http — same fallback PostCard uses.
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setMenuOpen(false);
    toast.success("Link copied");
  }

  async function handleShare() {
    const url = `${window.location.origin}${href}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: store.displayName, url });
        return;
      } catch (error) {
        // Dismissing the share sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await handleCopyLink();
  }

  return (
    <>
      <MobileStoreCard
        store={store}
        href={href}
        place={place}
        listedAgo={listedAgo}
        active={active}
        isOwnStore={isOwnStore}
        following={following}
        followLoading={loading}
        onToggleFollow={() => void toggle()}
        onShare={() => void handleShare()}
      />
      {/**
       * The card is a div with a stretched link over it rather than one big
       * <a>: Follow and the ⋯ menu are real buttons, and a button inside an
       * anchor is invalid HTML that navigates on click. The overlay keeps the
       * whole card a single tap target; the controls sit above it on z-10.
       */}
      <div
        data-scroll-anchor={store.id}
        className="group relative hidden flex-col overflow-hidden rounded-2xl border border-border bg-elevated transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary md:flex"
      >
        <Link
          href={href}
          scroll={false}
          aria-label={`${store.displayName}, @${store.username} — ${store.listingCount} ${
            store.listingCount === 1 ? "listing" : "listings"
          }`}
          className="absolute inset-0 z-0 focus:outline-none"
        />

        <StoreCollage images={store.previewImages} name={store.displayName} />

        <div className="flex flex-1 flex-col gap-2 p-3.5">
          <div className="flex items-start gap-2.5">
            {store.avatar ? (
              <Image
                src={store.avatar}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
                placeholder="blur"
                blurDataURL={SHIMMER_AVATAR}
              />
            ) : (
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-[12px] font-bold text-white",
                  avatarGradient(store.id),
                )}
                aria-hidden
              >
                {idInitials(store.id)}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-bold text-main group-hover:underline">
                  {store.displayName}
                </span>
                {store.isVerified ? <VerifiedTick size={16} label="Verified shop" /> : null}
              </div>
              {/* How long they've been trading belongs next to who they are, not
                  in the metric strip — and keeping it out of there is what lets
                  that strip stay one line on every card in the row. */}
              <p className="truncate text-[12px] text-muted">
                @{store.username}
                {Number.isFinite(joinedYear) ? ` · Joined ${joinedYear}` : ""}
              </p>
            </div>
          </div>

          {/* The admin-written headline says what the shop actually sells, which
              a name rarely does ("Grace Wanjiru" vs "Phone accessories"). */}
          {store.headline ? (
            <p className="truncate text-[13px] font-medium text-main">
              {store.headline}
            </p>
          ) : null}

          {place ? (
            <p className="flex min-w-0 items-center gap-1 text-[12px] text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{place}</span>
            </p>
          ) : null}

          {/* Both actions sit together on their own row rather than up beside the
              name: a control in the identity block steals the width the shop's
              name and handle need, and those were truncating because of it. */}
          <div className="mt-1 flex items-center justify-end gap-2">
            {/* Your own storefront gets no Follow button — the API rejects
                following yourself, so offering it would only ever error. */}
            {isOwnStore ? null : (
              <button
                type="button"
                onClick={() => void toggle()}
                disabled={loading}
                aria-pressed={following}
                className={cn(
                  "relative z-10 inline-flex h-8 flex-1 items-center justify-center rounded-full text-[13px] font-bold transition-colors disabled:opacity-60 lg:cursor-pointer",
                  following
                    ? "border border-border bg-surface text-main hover:bg-subtle"
                    : "bg-primary text-white hover:opacity-90",
                )}
              >
                {following ? "Following" : "Follow"}
              </button>
            )}

            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`More options for ${store.displayName}`}
                  className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:bg-surface hover:text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:cursor-pointer"
                >
                  <MoreHorizontal className="h-4 w-4" strokeWidth={2.4} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={6}
                className="z-30 w-48 rounded-2xl border border-border bg-elevated p-1.5 shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => void handleCopyLink()}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-main transition-colors hover:bg-surface lg:cursor-pointer"
                >
                  <Link2
                    className="h-4 w-4 shrink-0 text-muted"
                    strokeWidth={2.2}
                    aria-hidden
                  />
                  Copy link
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3.5 py-2.5 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1 font-semibold text-main">
            <Package2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {store.listingCount.toLocaleString("en-KE")}{" "}
            {store.listingCount === 1 ? "listing" : "listings"}
          </span>

          {store.totalViews > 0 ? (
            <Metric icon={Eye} value={fmtCompact(store.totalViews)} label="views" />
          ) : null}

          {/* "Is this shop still trading?" is the first doubt a directory has to
              answer. A separate "Active" badge would say the same thing this
              number already says, so the number itself carries the signal:
              green when the shop has listed inside the active window. */}
          {listedAgo ? (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                active && "font-semibold text-success",
              )}
              title={
                active
                  ? `Actively trading — last listed ${listedAgo} ago`
                  : `Last listed ${listedAgo} ago`
              }
            >
              <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{listedAgo}</span>
              <span className="sr-only">since the last listing</span>
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}

export const StoreTile = memo(StoreTileComponent);
