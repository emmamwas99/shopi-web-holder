import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { contentPath } from "@/lib/content-url";
import { shouldUnoptimize } from "@/lib/imageUtils";
import { VerifiedIdBadge } from "@/components/verification/VerifiedIdBadge";
import {
  listingCover,
  type SocialProofListing,
} from "@/features/social-proof/queries/socialProofSellers";

/**
 * A listing as a photo card: cover, asking price, title and place, the whole
 * card linking to the listing. Shared by the homepage featured sellers and
 * the blog's live listings so both show a listing the same way.
 */

export type ListingCardData = SocialProofListing;

/** "Kasarani, Nairobi" — the place and county, without repeating either. */
export function listingPlaceLabel(place?: string | null, county?: string | null) {
  return [place, county]
    .filter((part, i, parts) => part && parts.indexOf(part) === i)
    .join(", ");
}

export function listingPriceLabel(listing: ListingCardData, locale: string) {
  const price = listing.price;
  if (!price || price.amount <= 0) return null;
  return `${price.currency} ${price.amount.toLocaleString(locale)}`;
}

export function ListingPhotoCard({
  listing,
  lang,
  locale,
  sizes = "(max-width: 640px) 46vw, (max-width: 1280px) 30vw, 240px",
  showCta = false,
  verified,
}: {
  listing: ListingCardData;
  lang: string;
  locale: string;
  sizes?: string;
  /** Adds a "View listing" line under the details. */
  showCta?: boolean;
  /** The seller is a verified shop. Defaults to what the listing's own query says. */
  verified?: boolean | null;
}) {
  const showVerified = verified ?? listing.creator?.isVerified ?? false;
  const cover = listingCover(listing);
  const price = listingPriceLabel(listing, locale);
  const place = listingPlaceLabel(
    listing.location?.placeName,
    listing.location?.county,
  );

  return (
    // data-scroll-anchor: a return to this list lines back up with this card
    // (lib/scrollRestoration.ts).
    <Link
      href={contentPath(lang, listing)}
      data-scroll-anchor={listing.id}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-default bg-surface no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
    >
      <div className="relative aspect-square overflow-hidden bg-subtle">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title ?? ""}
            fill
            sizes={sizes}
            unoptimized={shouldUnoptimize(cover)}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <ImageIcon size={22} className="absolute inset-0 m-auto text-muted" aria-hidden />
        )}
        {price && (
          <span className="absolute bottom-2 left-2 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-black shadow-sm tabular-nums">
            {price}
          </span>
        )}
        {showVerified ? (
          <VerifiedIdBadge variant="overlay" className="pointer-events-none absolute right-2 top-2" />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-default">
          {listing.title}
        </p>
        {place && <p className="mt-auto truncate pt-1.5 text-xs text-muted">{place}</p>}
        {showCta && (
          <p className="pt-2 text-xs font-bold text-primary">View listing →</p>
        )}
      </div>
    </Link>
  );
}
