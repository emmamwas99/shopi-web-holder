"use client";

import { VerifiedTick } from "@/components/verification/VerifiedTick";
import Image from "next/image";
import Link from "next/link";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { MapPin, Store } from "lucide-react";
import { avatarGradient, idInitials } from "@/lib/avatar";
import { SHIMMER_PORTRAIT } from "@/lib/shimmer";
import { profileHref } from "@/lib/profile-url";

/**
 * A shop woven into the feed — the "suggested page" slot, for sellers.
 *
 * The feed is a river of individual listings, which is good for finding one
 * thing and useless for finding someone worth coming back to. This breaks the
 * river with a whole seller: who they are, how deep their catalogue is, where
 * they sell from, and three of their actual products. It is a destination, not
 * another item, so the entire card is one link into the shop.
 *
 * Ranking is the server's job (`featuredSellers`), scored on views, likes,
 * comments, saves and started conversations, weighted upward in that order.
 */

export type FeaturedSeller = {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatar?: string | null;
  isVerified: boolean;
  followerCount: number;
  listingCount: number;
  location?: string | null;
  previewImages: string[];
};

type FeaturedSellersData = { featuredSellers: FeaturedSeller[] };

const FEATURED_SELLERS: TypedDocumentNode<
  FeaturedSellersData,
  { limit?: number }
> = gql`
  query FeaturedSellers($limit: Int) {
    featuredSellers(limit: $limit) {
      id
      username
      displayName
      avatar
      isVerified
      followerCount
      listingCount
      location
      previewImages
    }
  }
`;

/**
 * The server ranks and caches this for everyone, so it is fetched once per
 * session and read from cache for every slot the feed renders.
 */
export function useFeaturedSellers(limit = 6) {
  const { data } = useQuery(FEATURED_SELLERS, {
    variables: { limit },
    fetchPolicy: "cache-first",
    nextFetchPolicy: "cache-first",
  });
  return data?.featuredSellers ?? [];
}

/**
 * Initials for the avatar fallback, from the seller's name — "Jet Motors" → JM.
 * The shared `idInitials` helper takes the last two characters of the id, which
 * on a card that always knows the name renders meaningless pairs like "25".
 * Falls back to the id only when there is genuinely no name.
 */
function sellerInitials(name: string, id: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return idInitials(id);
  const letters = (words[0][0] + (words[1]?.[0] ?? "")).replace(
    /[^\p{L}\p{N}]/gu,
    "",
  );
  return letters ? letters.toUpperCase() : idInitials(id);
}

/** "8 listings · Nairobi" — only the parts we actually know. */
function metaLine(seller: FeaturedSeller): string {
  const parts = [
    `${seller.listingCount} listing${seller.listingCount === 1 ? "" : "s"}`,
  ];
  // Followers are near-zero across most of the catalogue today; showing "0
  // followers" on a shop card argues against opening it.
  if (seller.followerCount > 0) {
    parts.push(
      `${seller.followerCount} follower${seller.followerCount === 1 ? "" : "s"}`,
    );
  }
  return parts.join(" · ");
}

export function FeaturedSellerCard({
  seller,
  lang,
}: {
  seller: FeaturedSeller;
  lang: string;
}) {
  const name = seller.displayName || seller.username || "Shop";
  const previews = seller.previewImages.slice(0, 3);

  return (
    <Link
      href={profileHref(lang, seller)}
      className="block bg-elevated px-4 py-4 outline-none"
      aria-label={`${name}, ${metaLine(seller)}. Visit listings`}
    >
      {/* Slot label — says why this is here, so it never reads as a listing
          the feed got wrong. */}
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Store size={13} strokeWidth={2.2} aria-hidden />
        Seller to discover
      </p>

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <span className="relative block h-12 w-12 shrink-0">
          {seller.avatar ? (
            <Image
              src={seller.avatar}
              alt=""
              fill
              sizes="48px"
              className="rounded-full object-cover ring-1 ring-[rgb(var(--color-border))]"
            />
          ) : (
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br text-sm font-bold text-white ${avatarGradient(
                seller.id,
              )}`}
            >
              {sellerInitials(name, seller.id)}
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[15px] font-semibold text-default">
            <span className="truncate">{name}</span>
            {seller.isVerified && <VerifiedTick size={15} label="Verified shop" />}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {metaLine(seller)}
          </p>
          {seller.location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin size={11} strokeWidth={2.2} className="shrink-0" aria-hidden />
              <span className="truncate">{seller.location}</span>
            </p>
          )}
        </div>

        {/* Reads as the action even though the whole card is the link. */}
        <span className="shrink-0 rounded-full border border-default px-4 py-2 text-xs font-semibold text-default">
          Visit listings
        </span>
      </div>

      {/* Proof: three real products beat any amount of copy about the shop. */}
      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {previews.map((url, i) => (
            <span
              key={url + i}
              className="relative block aspect-square overflow-hidden rounded-lg ring-1 ring-inset ring-[rgb(var(--color-border))]"
              style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="(max-width: 640px) 30vw, 160px"
                className="object-cover"
                loading="lazy"
                placeholder="blur"
                blurDataURL={SHIMMER_PORTRAIT}
              />
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
