"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { avatarGradient, idInitials } from "@/lib/avatar";
import { profileHref } from "@/lib/profile-url";
import { PriceTag, priceLabel } from "../PriceTag";
import { cn } from "@/lib/utils";
import { listingPlace } from "@/lib/listingPlace";

/**
 * Who posted it and what it is — the text half of the viewer's chrome.
 *
 * Shared by the mobile overlay (over the video, light-on-dark) and the desktop
 * rail (beside it, on its own themed surface), so a seller's name, price and
 * caption read the same in both.
 *
 * The two variants are not the same layout at different sizes. The overlay is
 * a full-width stack ending in a primary action, because on a phone this block
 * is the whole product page: seller, price, where it is, what it is, and one
 * way to reach the seller. The rail has the comments panel below it and does
 * not carry the action, so it stays a compact column.
 */
export function ImmersiveMeta({
  post,
  lang,
  onFollow,
  following,
  variant,
  cta,
}: {
  post: ContentCardFieldsFragment;
  lang: string;
  onFollow?: () => void;
  following?: boolean;
  variant: "overlay" | "rail";
  /** Primary action, rendered full-width at the end of the overlay variant. */
  cta?: React.ReactNode;
}) {
  const creator = post.creator;
  const displayName =
    [creator?.profile?.firstName, creator?.profile?.lastName]
      .filter(Boolean)
      .join(" ") ||
    creator?.username ||
    "Seller";
  const avatar = creator?.profile?.avatar;
  const overlay = variant === "overlay";
  // A zero amount means the seller never entered a price, so there is nothing
  // to show. It does NOT mean free — PriceTag's "Free" label is for surfaces
  // that want it; here a blank space is the honest answer.
  const hasPrice = (post.price?.amount ?? 0) > 0;
  const place = listingPlace(post.location) ?? "";

  if (overlay) {
    return (
      // The block must not swallow taps — pause is the whole-frame gesture, and
      // a caption column eating the bottom third of the video would feel
      // broken. Only the genuinely interactive children opt back in.
      <div className="pointer-events-none flex flex-col gap-2.5 text-white">
        {/* Seller, with Follow pushed to the far edge */}
        <div className="flex items-center gap-2.5">
          <Link
            href={profileHref(lang, creator)}
            className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2"
          >
            {avatar ? (
              <Image
                src={avatar}
                alt={displayName}
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-[0.65rem] font-bold text-white",
                  avatarGradient(creator?.id ?? post.creatorId),
                )}
              >
                {idInitials(creator?.id ?? post.creatorId)}
              </span>
            )}
            <span className="truncate text-[0.8rem] font-semibold">
              {displayName}
            </span>
          </Link>

          {onFollow && !post.isMyContent && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onFollow();
              }}
              className={cn(
                "pointer-events-auto shrink-0 rounded-full px-3.5 py-1.5 text-[0.72rem] font-bold transition-transform active:scale-95",
                following
                  ? "border border-white/45 text-white"
                  : "bg-white text-black",
              )}
            >
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Price, with the place as a pill beside it. The price is the most
            scanned thing on a marketplace video so it stays the largest type
            here, but only when there is one: amount 0 means the seller left it
            blank, not that the item is free, and labelling a plot of land
            "Free" is worse than showing nothing. */}
        {(hasPrice || place) && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {hasPrice && (
              <span className="font-display text-[1.25rem] font-bold leading-none tracking-[-0.01em]">
                {priceLabel(post.price!.amount, post.price!.currency)}
                {post.price!.negotiable && (
                  <span className="ml-1 align-middle text-[0.7rem] font-semibold opacity-75">
                    · neg
                  </span>
                )}
              </span>
            )}
            {place && (
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[0.7rem] font-semibold ">
                <MapPin className="h-3 w-3 shrink-0" />
                {place}
              </span>
            )}
          </div>
        )}

        {/* Title and caption read as one sentence, the title carrying the
            weight — two separately styled blocks wasted vertical space the
            video needs. */}
        {(post.title || post.caption) && (
          <ExpandableCaption
            title={post.title}
            caption={post.caption ?? ""}
            overlay
          />
        )}

        {cta}
      </div>
    );
  }

  // ── Desktop rail ────────────────────────────────────────────────────────
  // A normal themed panel with the comments list under it, so it stays a
  // compact column and carries no primary action of its own.
  return (
    <div className="flex flex-col gap-2 text-default">
      <div className="flex items-center gap-2">
        <Link
          href={profileHref(lang, creator)}
          className="pointer-events-auto flex items-center gap-2"
        >
          {avatar ? (
            <Image
              src={avatar}
              alt={displayName}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold text-white",
                avatarGradient(creator?.id ?? post.creatorId),
              )}
            >
              {idInitials(creator?.id ?? post.creatorId)}
            </span>
          )}
          <span className="text-sm font-semibold">{displayName}</span>
        </Link>

        {onFollow && !post.isMyContent && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFollow();
            }}
            className={cn(
              "pointer-events-auto rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              following
                ? "border border-default text-muted"
                : "bg-primary text-white",
            )}
          >
            {following ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {post.title && (
        <p className="text-sm font-semibold leading-snug">{post.title}</p>
      )}

      {hasPrice && (
        <div>
          <PriceTag
            amount={post.price!.amount}
            currency={post.price!.currency}
            negotiable={post.price!.negotiable}
          />
        </div>
      )}

      {post.caption && <ExpandableCaption caption={post.caption} />}

      {place && (
        <p className="flex items-center gap-1 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5" />
          {place}
        </p>
      )}
    </div>
  );
}

/**
 * Caption clamped to two lines, with a toggle only when there is more to see.
 *
 * Overflow is measured rather than guessed from length: the same string wraps
 * to a different number of lines depending on width, so a character count
 * would show "more" on captions that already fit and hide it on ones that
 * don't. A ResizeObserver keeps that honest as the viewport changes, which is
 * the pattern the feed card already uses.
 */
function ExpandableCaption({
  title,
  caption,
  overlay = false,
}: {
  /** Rendered bold at the head of the same paragraph, when there is one. */
  title?: string | null;
  caption: string;
  overlay?: boolean;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measured from inside the observer rather than synchronously here, so the
    // read stays off the layout-flush path.
    const observer = new ResizeObserver(() => {
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [title, caption, expanded]);

  return (
    <div>
      <p
        ref={ref}
        role={overlay && expanded ? "button" : undefined}
        tabIndex={overlay && expanded ? 0 : undefined}
        aria-label={overlay && expanded ? "Collapse description" : undefined}
        onClick={(event) => {
          if (!overlay || !expanded) return;
          event.stopPropagation();
          setExpanded(false);
        }}
        onKeyDown={(event) => {
          if (
            !overlay ||
            !expanded ||
            (event.key !== "Enter" && event.key !== " ")
          ) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          setExpanded(false);
        }}
        className={cn(
          "leading-snug whitespace-pre-line",
          overlay ? "text-[0.8rem]" : "text-sm",
          !expanded && "line-clamp-2",
          // Expanded captions can be long, so cap the height and let them
          // scroll instead of pushing the action row off a phone screen.
          expanded &&
            "pointer-events-auto max-h-32 overflow-y-auto no-scroll-indicator",
          overlay && expanded && "cursor-pointer",
          overlay ? "text-white/90" : "text-default",
        )}
      >
        {title && <span className="font-bold">{title}</span>}
        {title && caption ? " " : null}
        {caption}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          className={cn(
            "pointer-events-auto mt-0.5 font-bold underline transition-opacity active:opacity-60",
            overlay ? "text-[0.75rem] text-white/90" : "text-sm text-muted",
          )}
        >
          {expanded ? "less" : "more"}
        </button>
      )}
    </div>
  );
}
