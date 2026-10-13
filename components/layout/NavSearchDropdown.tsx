"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { ArrowRight, ImageIcon, SearchX } from "lucide-react";
import { contentPath } from "@/lib/content-url";
import { SHIMMER_PORTRAIT } from "@/lib/shimmer";

const SEARCH_DEBOUNCE_MS = 280;
const RESULT_LIMIT = 6;

type NavSearchItem = {
  id: string;
  slug?: string | null;
  title?: string | null;
  price?: { amount: number; currency: string } | null;
  location?: {
    county?: string | null;
    subregion?: string | null;
    placeName?: string | null;
  } | null;
  media?: {
    mediaType: string;
    thumbnailUrl?: string | null;
    imageUrl?: string | null;
    url?: string | null;
    muxMeta?: { thumbnailUrl?: string | null; playbackId?: string | null } | null;
    r2Variants?: { url: string; variant: string }[] | null;
  }[];
};

type NavSearchData = { discoveryFeed: { items: NavSearchItem[] } };
type NavSearchVars = { query: string; limit: number };

const NAV_SEARCH_RESULTS: TypedDocumentNode<NavSearchData, NavSearchVars> = gql`
  query NavSearchResults($query: String!, $limit: Int) {
    discoveryFeed(query: $query, limit: $limit) {
      items {
        id
        slug
        title
        price {
          amount
          currency
        }
        location {
          county
          subregion
          placeName
        }
        media {
          mediaType
          thumbnailUrl
          imageUrl
          url
          muxMeta {
            thumbnailUrl
            playbackId
          }
          r2Variants {
            url
            variant
          }
        }
      }
    }
  }
`;

function formatPrice(amount: number, currency: string) {
  return `${currency} ${Math.round(amount).toLocaleString("en-KE")}`;
}

function locationLabel(loc: NavSearchItem["location"]): string | null {
  if (!loc) return null;
  const county = loc.county?.trim() || null;
  const area = loc.placeName?.trim() || loc.subregion?.trim() || null;
  const parts = [county, area].filter(
    (p, i, arr): p is string => Boolean(p) && arr.indexOf(p) === i,
  );
  return parts.length ? parts.join(", ") : null;
}

function getThumb(item: NavSearchItem): string | null {
  const first = item.media?.[0];
  const muxPlaybackId = first?.muxMeta?.playbackId;
  const muxDerivedThumb = muxPlaybackId
    ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=0&width=120&fit_mode=smartcrop`
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

function ResultRow({
  item,
  lang,
  onNavigate,
}: {
  item: NavSearchItem;
  lang: string;
  onNavigate: () => void;
}) {
  const thumb = getThumb(item);
  const hasPrice = !!item.price && item.price.amount > 0;
  const place = locationLabel(item.location);

  return (
    <Link
      href={contentPath(lang, item)}
      scroll={false}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface"
    >
      <div
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
        style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
      >
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
            placeholder="blur"
            blurDataURL={SHIMMER_PORTRAIT}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon size={16} strokeWidth={1.6} aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-default">
          {item.title || "Untitled listing"}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0 font-bold text-main">
            {hasPrice ? formatPrice(item.price!.amount, item.price!.currency) : "Ask"}
          </span>
          {place ? (
            <>
              <span className="shrink-0">•</span>
              <span className="truncate">{place}</span>
            </>
          ) : null}
        </p>
      </div>
    </Link>
  );
}

function ResultRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <div
        className="h-12 w-12 shrink-0 animate-pulse rounded-lg"
        style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div
          className="h-3.5 w-3/4 animate-pulse rounded-full"
          style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
        />
        <div
          className="h-3 w-1/2 animate-pulse rounded-full"
          style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
        />
      </div>
    </div>
  );
}

/**
 * Live search preview under the nav search box — shown on every route except
 * the discover pages themselves (which already filter their own grid inline
 * as you type). Lets a search from, say, /notifications jump straight to a
 * listing's PDP instead of forcing a detour through /explore first.
 */
export function NavSearchDropdown({
  lang,
  term,
  onNavigate,
}: {
  lang: string;
  term: string;
  onNavigate: () => void;
}) {
  const [debounced, setDebounced] = useState(term.trim());

  useEffect(() => {
    const handle = window.setTimeout(
      () => setDebounced(term.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(handle);
  }, [term]);

  const { data, loading } = useQuery(NAV_SEARCH_RESULTS, {
    variables: { query: debounced, limit: RESULT_LIMIT },
    skip: !debounced,
    fetchPolicy: "cache-and-network",
  });

  if (!term.trim()) return null;

  const items = data?.discoveryFeed?.items ?? [];
  // Only the first render for a fresh term has nothing cached — a later
  // background refetch (e.g. revisiting a term) shouldn't flash the skeleton
  // over results already on screen.
  const showSkeleton = loading && items.length === 0 && !data;

  return (
    <div
      role="listbox"
      aria-label="Search results"
      className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-default bg-app p-2 shadow-(--shadow-lg)"
    >
      {showSkeleton ? (
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <ResultRowSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <SearchX size={20} className="text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {`No results for "${debounced}".`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <ResultRow key={item.id} item={item} lang={lang} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      <Link
        href={`/${lang}/explore?q=${encodeURIComponent(term.trim())}`}
        onClick={onNavigate}
        className="mt-1 flex items-center justify-between rounded-xl border-t border-default px-2 pt-2.5 pb-1 text-sm font-semibold text-primary"
      >
        {`See all results for "${term.trim()}"`}
        <ArrowRight size={15} aria-hidden />
      </Link>
    </div>
  );
}
