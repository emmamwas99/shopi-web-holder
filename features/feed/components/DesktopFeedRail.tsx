"use client";

/**
 * DesktopFeedRail — the desktop feed's right rail: sellers to follow, then
 * what's trending. Stories live at the top of the feed column (StoriesBar);
 * this column is for discovery.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Flame } from "lucide-react";
import { useFollow } from "../hooks/useFollow";
import { useTrending } from "../hooks/useFeed";
import { priceLabel } from "./PriceTag";
import { idInitials } from "@/lib/avatar";
import { fmtCompact } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { profileHref } from "@/lib/profile-url";
import { contentPath } from "@/lib/content-url";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";

type SellerToFollow = {
  id: string;
  username?: string | null;
  isFollowedByMe?: boolean | null;
  followerCount?: number | null;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  } | null;
  location?: {
    county?: string | null;
    subregion?: string | null;
    placeName?: string | null;
  } | null;
};

type SellersToFollowData = {
  sellersToFollow: SellerToFollow[];
};

type SellersToFollowVars = {
  limit: number;
};

const SELLERS_TO_FOLLOW: TypedDocumentNode<
  SellersToFollowData,
  SellersToFollowVars
> = gql`
  query SellersToFollow($limit: Int!) {
    sellersToFollow(limit: $limit) {
      id
      username
      isFollowedByMe
      followerCount
      profile {
        firstName
        lastName
        avatar
      }
      location {
        county
        subregion
        placeName
      }
    }
  }
`;

/** How many sellers the desktop rail suggests. The API allows up to 20. */
export const SELLERS_TO_FOLLOW_COUNT = 6;
/** How many trending listings follow them. */
export const TRENDING_COUNT = 6;

const placeholder = "rounded-full bg-black/10 dark:bg-white/10";

function RailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-default bg-elevated px-3 pb-3 pt-4">
      <h2 className="mb-2 flex items-center gap-1.5 px-2 text-base font-black text-default">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Sellers to follow ─────────────────────────────────────────────────────────

function SellerToFollowRow({
  seller,
  lang,
}: {
  seller: SellerToFollow;
  lang: string;
}) {
  const { following, toggle, loading } = useFollow({
    userId: seller.id,
    initialFollowing: seller.isFollowedByMe ?? false,
    initialFollowerCount: seller.followerCount ?? 0,
    lang,
  });

  const name = seller.profile?.firstName
    ? `${seller.profile.firstName}${seller.profile.lastName ? " " + seller.profile.lastName : ""}`
    : (seller.username ?? `Seller ${seller.id.slice(-4)}`);
  const location =
    seller.location?.county ?? seller.location?.placeName ?? "Nearby";

  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface">
      <Link
        href={profileHref(lang, seller)}
        scroll={false}
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-xs font-black text-default"
      >
        {seller.profile?.avatar ? (
          <Image
            src={seller.profile.avatar}
            alt={name}
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        ) : (
          idInitials(seller.id)
        )}
      </Link>
      <Link
        href={profileHref(lang, seller)}
        scroll={false}
        className="min-w-0 flex-1"
      >
        <p className="truncate text-sm font-bold leading-tight text-default">
          {name}
        </p>
        <p className="mt-1 truncate text-xs leading-tight text-muted">{location}</p>
      </Link>
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={[
          // Fixed width, so Follow and Following line up down the list.
          "w-22 shrink-0 rounded-full py-1.5 text-center text-xs font-black transition-colors disabled:opacity-70",
          following
            ? "bg-surface text-muted"
            : "bg-primary text-white hover:bg-primary/90",
        ].join(" ")}
      >
        {following ? "Following" : "Follow"}
      </button>
    </li>
  );
}

function SellerRowPlaceholder() {
  return (
    <li className="flex animate-pulse items-center gap-3 px-2 py-2.5" aria-hidden>
      <div className={`h-10 w-10 shrink-0 ${placeholder}`} />
      <div className="flex-1 space-y-2">
        <div className={`h-3 w-2/3 ${placeholder}`} />
        <div className={`h-2.5 w-1/2 ${placeholder}`} />
      </div>
      <div className={`h-7 w-22 shrink-0 ${placeholder}`} />
    </li>
  );
}

// ── Trending now ──────────────────────────────────────────────────────────────

function trendingThumb(post: ContentCardFieldsFragment): string | null {
  const media = post.media?.[0];
  const playbackId = media?.muxMeta?.playbackId ?? null;
  return (
    media?.thumbnailUrl ??
    (playbackId
      ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0&width=200&fit_mode=smartcrop`
      : (media?.r2Variants?.find((v) => v.variant === "thumb")?.url ??
        media?.r2Variants?.[0]?.url ??
        media?.imageUrl ??
        null))
  );
}

function TrendingRow({
  post,
  lang,
  rank,
}: {
  post: ContentCardFieldsFragment;
  lang: string;
  rank: number;
}) {
  const thumb = trendingThumb(post);
  const views = post.stats?.views ?? 0;
  const detail = [
    post.price ? priceLabel(post.price.amount, post.price.currency) : null,
    views > 0 ? `${fmtCompact(views)} views` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <button
        type="button"
        onClick={() => window.location.assign(contentPath(lang, post))}
        className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface"
      >
        <span className="w-4 shrink-0 text-center text-sm font-black text-muted">
          {rank}
        </span>
        {/* Squared-off tile, not a circle: listings shouldn't read as people. */}
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-surface">
          {thumb && (
            <Image
              src={thumb}
              alt=""
              fill
              sizes="44px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized={thumb.endsWith(".gif")}
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight text-default">
            {post.title}
          </span>
          <span className="mt-1 block truncate text-xs leading-tight text-muted">
            {detail || "Trending now"}
          </span>
        </span>
      </button>
    </li>
  );
}

function TrendingRowPlaceholder() {
  return (
    <li className="flex animate-pulse items-center gap-3 px-2 py-2" aria-hidden>
      <div className={`h-3.5 w-4 shrink-0 ${placeholder}`} />
      <div className="h-11 w-11 shrink-0 rounded-[10px] bg-black/10 dark:bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className={`h-3 w-3/4 ${placeholder}`} />
        <div className={`h-2.5 w-1/2 ${placeholder}`} />
      </div>
    </li>
  );
}

function TrendingSection({ lang }: { lang: string }) {
  const { items, loading } = useTrending();
  const trending = items.slice(0, TRENDING_COUNT);

  // Nothing trending yet → no empty card taking up the rail.
  if (!loading && trending.length === 0) return null;

  return (
    <RailSection
      title="Trending now"
      icon={<Flame className="h-4 w-4 text-primary" fill="currentColor" />}
    >
      <ul className="m-0 flex list-none flex-col p-0">
        {trending.length === 0
          ? Array.from({ length: TRENDING_COUNT }, (_, i) => <TrendingRowPlaceholder key={i} />)
          : trending.map((post, i) => (
              <TrendingRow key={post.id} post={post} lang={lang} rank={i + 1} />
            ))}
      </ul>
    </RailSection>
  );
}

// ── Rail ──────────────────────────────────────────────────────────────────────

export function DesktopFeedRail({ lang }: { lang: string }) {
  const [authHydrated, setAuthHydrated] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { data: sellersData, loading: sellersLoading } = useQuery(
    SELLERS_TO_FOLLOW,
    {
      variables: { limit: SELLERS_TO_FOLLOW_COUNT },
      skip: !authHydrated || !isAuthenticated,
      fetchPolicy: "cache-and-network",
    },
  );

  useEffect(() => {
    if (authHydrated) return;
    if (!useAuthStore.persist) return;
    if (useAuthStore.persist.hasHydrated()) {
      queueMicrotask(() => setAuthHydrated(true));
      return;
    }
    const unsubscribe = useAuthStore.persist.onFinishHydration(() =>
      setAuthHydrated(true),
    );
    return unsubscribe;
  }, [authHydrated]);

  const sellers =
    sellersData?.sellersToFollow.filter(
      (seller): seller is SellerToFollow => typeof seller.id === "string",
    ) ?? [];

  return (
    <div className="flex min-h-full flex-col gap-4">
      <RailSection title="Sellers to follow">
        {/* Placeholder only until there's something to show: cache-and-network
            keeps `loading` true while it revalidates cached sellers. */}
        {!authHydrated || (sellersLoading && sellers.length === 0) ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {Array.from({ length: SELLERS_TO_FOLLOW_COUNT }, (_, i) => (
              <SellerRowPlaceholder key={i} />
            ))}
          </ul>
        ) : !isAuthenticated ? (
          <p className="px-2 py-3 text-sm text-muted">
            Sign in to discover sellers.
          </p>
        ) : sellers.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted">
            You follow every suggested seller.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {sellers.map((seller) => (
              <SellerToFollowRow key={seller.id} seller={seller} lang={lang} />
            ))}
          </ul>
        )}
      </RailSection>

      <TrendingSection lang={lang} />
    </div>
  );
}
