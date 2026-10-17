/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { gql, NetworkStatus, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DrawerLoadingIndicator } from "@/components/ui/drawer-loading-indicator";
import { FeedLoader } from "@/components/ui/feed-loader";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import {
  useDiscoverFiltersStore,
  type DiscoverContentType,
} from "@/stores/discoverFilters";
import { useSearchStore } from "@/stores/search";
import type {
  ContentCardFieldsFragment,
  ContentType,
} from "@/types/__generated__/graphql";
import {
  DISCOVER_GRID,
  DiscoverGridCard,
  DiscoverGridSkeleton,
} from "./DiscoverGridCard";
import { ExploreCategoryGrid } from "./ExploreCategoryGrid";
import {
  ContentTypeSegments,
  DistanceFilter,
  POSTED_WITHIN_OPTIONS,
  PriceRangeFields,
  postedWithinLabel,
} from "./DiscoverFilterControls";
import { useInfiniteScroll } from "@/features/feed/hooks/useInfiniteScroll";
import { usePaginationGuard } from "@/features/feed/hooks/useFeed";
import {
  DISCOVERY_CATEGORIES,
  type CategoryFacet,
  type DiscoveryCategoryFacetsVars,
} from "../categories";
import { slugifyContentTitle } from "@/lib/content-url";
import { rememberScrollBeforeNavigation } from "@/lib/scrollRestoration";

type DiscoverySort =
  | "RELEVANCE"
  | "NEWEST"
  | "PRICE_LOW_TO_HIGH"
  | "PRICE_HIGH_TO_LOW";

type LocationSheetStep = "county" | "subcounty" | "ward";

/** A spec filter, e.g. { key: "make", value: "Toyota" }. Keys are canonical. */
type SpecFilter = { key: string; value: string };

type SpecFacet = {
  key: string;
  label: string;
  values: Array<{ value: string; count: number }>;
};

/** An option list opened from a field in the mobile filter drawer. */
type FilterPicker =
  | { kind: "category" }
  | { kind: "subcategory" }
  | { kind: "sort" }
  | { kind: "posted" }
  | { kind: "price" }
  | { kind: "spec"; key: string };

type LocationFacet = {
  id: string;
  name: string;
  slug: string;
  count: number;
  countyId?: string | null;
  subCountyId?: string | null;
};

type DiscoveryFeedData = {
  discoveryFeed: {
    items: ContentCardFieldsFragment[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

type DiscoveryFeedVars = {
  query?: string;
  categoryId?: string;
  type?: ContentType;
  countyId?: string;
  subCountyId?: string;
  wardId?: string;
  minPrice?: number;
  maxPrice?: number;
  negotiableOnly?: boolean;
  specs?: SpecFilter[];
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  postedWithinDays?: number;
  subcategory?: string;
  sort?: DiscoverySort;
  limit?: number;
  after?: string;
};

type DiscoveryFacetsVars = {
  query?: string;
  categoryId?: string;
  type?: ContentType;
  subcategory?: string;
  countyId?: string;
  subCountyId?: string;
  wardId?: string;
  minPrice?: number;
  maxPrice?: number;
  negotiableOnly?: boolean;
  specs?: SpecFilter[];
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  postedWithinDays?: number;
};

type DiscoveryResultCountData = {
  discoveryResultCount: number;
};

// The grid tops out at 5 columns (min-[90rem] in DISCOVER_GRID), so pages are
// a multiple of 5 — a page always fills whole rows instead of leaving a
// ragged last row while the next page loads.
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 280;
const SEARCH_ANALYTICS_DEBOUNCE_MS = 500;

const RECORD_SEARCH_TERM = gql`
  mutation RecordSearchTerm($input: RecordSearchTermInput!) {
    recordSearchTerm(input: $input)
  }
`;

const DISCOVERY_FEED: TypedDocumentNode<DiscoveryFeedData, DiscoveryFeedVars> =
  gql`
    query DiscoveryFeed(
      $query: String
      $categoryId: String
      $type: ContentType
      $subcategory: String
      $countyId: String
      $subCountyId: String
      $wardId: String
      $minPrice: Float
      $maxPrice: Float
      $negotiableOnly: Boolean
      $specs: [DiscoverySpecFilterInput!]
      $latitude: Float
      $longitude: Float
      $radiusKm: Float
      $postedWithinDays: Int
      $sort: DiscoverySort
      $limit: Int
      $after: String
    ) {
      discoveryFeed(
        query: $query
        categoryId: $categoryId
        type: $type
        subcategory: $subcategory
        countyId: $countyId
        subCountyId: $subCountyId
        wardId: $wardId
        minPrice: $minPrice
        maxPrice: $maxPrice
        negotiableOnly: $negotiableOnly
        specs: $specs
        latitude: $latitude
        longitude: $longitude
        radiusKm: $radiusKm
        postedWithinDays: $postedWithinDays
        sort: $sort
        limit: $limit
        after: $after
      ) {
        items {
          id
          slug
          type
          title
          caption
          hashtags
          creatorId
          allowDownload
          hdEnabled
          createdAt
          creator {
            id
            username
            isVerified
            isFollowedByMe
            followerCount
            profile {
              firstName
              lastName
              avatar
            }
          }
          media {
            mediaType
            url
            imageUrl
            thumbnailUrl
            sortOrder
            displayWidth
            displayHeight
            muxMeta {
              playbackId
              duration
              aspectRatio
              thumbnailUrl
              animatedThumbnailUrl
            }
            r2Variants {
              url
              variant
              width
              height
            }
          }
          price {
            amount
            currency
            negotiable
          }
          stats {
            views
            likes
            shares
            saves
          }
          location {
            county
            subregion
            placeName
          }
          ranking {
            rankScore
            trendingScore
          }
          isLikedByMe
          isSavedByMe
          isMyContent
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

// Location facets — these DO depend on the active filters because the post
// counts shown in the location drawer reflect the current query/category.
type DiscoveryLocationFacetsData = {
  discoveryFacets: {
    counties: LocationFacet[];
    subCounties: LocationFacet[];
    wards: LocationFacet[];
  };
};

const DISCOVERY_LOCATION_FACETS: TypedDocumentNode<
  DiscoveryLocationFacetsData,
  DiscoveryFacetsVars
> = gql`
  query DiscoveryLocationFacets(
    $query: String
    $categoryId: String
    $type: ContentType
    $subcategory: String
    $countyId: String
    $subCountyId: String
    $wardId: String
    $minPrice: Float
    $maxPrice: Float
    $negotiableOnly: Boolean
    $specs: [DiscoverySpecFilterInput!]
    $latitude: Float
    $longitude: Float
    $radiusKm: Float
    $postedWithinDays: Int
  ) {
    discoveryFacets(
      query: $query
      categoryId: $categoryId
      type: $type
      subcategory: $subcategory
      countyId: $countyId
      subCountyId: $subCountyId
      wardId: $wardId
      minPrice: $minPrice
      maxPrice: $maxPrice
      negotiableOnly: $negotiableOnly
      specs: $specs
      latitude: $latitude
      longitude: $longitude
      radiusKm: $radiusKm
      postedWithinDays: $postedWithinDays
    ) {
      counties {
        id
        name
        slug
        count
      }
      subCounties {
        id
        name
        slug
        count
        countyId
      }
      wards {
        id
        name
        slug
        count
        countyId
        subCountyId
      }
    }
  }
`;

/**
 * Level-2 subcategories inside the active category, with a cover image each.
 *
 * Deliberately does NOT take `$subcategory`: the row must not rearrange itself
 * when you pick a tile from it, and leaving the variable out keeps one cache
 * entry per category instead of one per tile.
 */
type SubcategoryFacet = {
  name: string;
  count: number;
  imageUrl?: string | null;
};

type DiscoverySubcategoryFacetsData = {
  discoveryFacets: { subcategories: SubcategoryFacet[] };
};

const DISCOVERY_SUBCATEGORY_FACETS: TypedDocumentNode<
  DiscoverySubcategoryFacetsData,
  Omit<DiscoveryFacetsVars, "subcategory">
> = gql`
  query DiscoverySubcategoryFacets(
    $query: String
    $categoryId: String
    $type: ContentType
    $countyId: String
    $subCountyId: String
    $wardId: String
    $minPrice: Float
    $maxPrice: Float
    $negotiableOnly: Boolean
    $specs: [DiscoverySpecFilterInput!]
    $latitude: Float
    $longitude: Float
    $radiusKm: Float
    $postedWithinDays: Int
  ) {
    discoveryFacets(
      query: $query
      categoryId: $categoryId
      type: $type
      countyId: $countyId
      subCountyId: $subCountyId
      wardId: $wardId
      minPrice: $minPrice
      maxPrice: $maxPrice
      negotiableOnly: $negotiableOnly
      specs: $specs
      latitude: $latitude
      longitude: $longitude
      radiusKm: $radiusKm
      postedWithinDays: $postedWithinDays
    ) {
      subcategories {
        name
        count
        imageUrl
      }
    }
  }
`;

const DISCOVERY_RESULT_COUNT: TypedDocumentNode<
  DiscoveryResultCountData,
  DiscoveryFacetsVars
> = gql`
  query DiscoveryResultCount(
    $query: String
    $categoryId: String
    $type: ContentType
    $subcategory: String
    $countyId: String
    $subCountyId: String
    $wardId: String
    $minPrice: Float
    $maxPrice: Float
    $negotiableOnly: Boolean
    $specs: [DiscoverySpecFilterInput!]
    $latitude: Float
    $longitude: Float
    $radiusKm: Float
    $postedWithinDays: Int
  ) {
    discoveryResultCount(
      query: $query
      categoryId: $categoryId
      type: $type
      subcategory: $subcategory
      countyId: $countyId
      subCountyId: $subCountyId
      wardId: $wardId
      minPrice: $minPrice
      maxPrice: $maxPrice
      negotiableOnly: $negotiableOnly
      specs: $specs
      latitude: $latitude
      longitude: $longitude
      radiusKm: $radiusKm
      postedWithinDays: $postedWithinDays
    )
  }
`;

/**
 * Spec fields for the active category — Make, Model, Year… — with how many
 * listings carry each value. Empty without a category: specs only mean
 * something inside one.
 */
const DISCOVERY_SPEC_FACETS: TypedDocumentNode<
  { discoverySpecFacets: SpecFacet[] },
  DiscoveryFacetsVars
> = gql`
  query DiscoverySpecFacets(
    $query: String
    $categoryId: String
    $type: ContentType
    $subcategory: String
    $countyId: String
    $subCountyId: String
    $wardId: String
    $minPrice: Float
    $maxPrice: Float
    $negotiableOnly: Boolean
    $specs: [DiscoverySpecFilterInput!]
    $latitude: Float
    $longitude: Float
    $radiusKm: Float
    $postedWithinDays: Int
  ) {
    discoverySpecFacets(
      query: $query
      categoryId: $categoryId
      type: $type
      subcategory: $subcategory
      countyId: $countyId
      subCountyId: $subCountyId
      wardId: $wardId
      minPrice: $minPrice
      maxPrice: $maxPrice
      negotiableOnly: $negotiableOnly
      specs: $specs
      latitude: $latitude
      longitude: $longitude
      radiusKm: $radiusKm
      postedWithinDays: $postedWithinDays
    ) {
      key
      label
      values {
        value
        count
      }
    }
  }
`;

/** `?spec=make:Toyota&spec=model:Prado` ⇄ spec filters. */
function parseSpecParams(values: string[]): SpecFilter[] {
  const byKey = new Map<string, string>();
  for (const raw of values) {
    const separator = raw.indexOf(":");
    if (separator <= 0) continue;
    const key = raw.slice(0, separator).trim().toLowerCase();
    const value = raw.slice(separator + 1).trim();
    if (key && value) byKey.set(key, value);
  }
  return [...byKey].map(([key, value]) => ({ key, value }));
}

function parsePriceFilter(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function formatResultCount(count: number): string {
  return new Intl.NumberFormat("en-KE", {
    notation: count >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(count);
}

const SORT_OPTIONS: Array<{
  value: DiscoverySort;
  label: string;
}> = [
  { value: "RELEVANCE", label: "Best match" },
  { value: "NEWEST", label: "Newest first" },
  { value: "PRICE_LOW_TO_HIGH", label: "Lowest price" },
  { value: "PRICE_HIGH_TO_LOW", label: "Highest price" },
];

function isDiscoverySort(value: string | null): value is DiscoverySort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/**
 * The default order is "Best match" only when there is a search to match;
 * without one it is our pick, and calling it a match reads as a bug.
 */
function sortLabel(sort: DiscoverySort, hasQuery: boolean): string {
  if (sort === "RELEVANCE") return hasQuery ? "Best match" : "Recommended";
  return (
    SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Recommended"
  );
}

/** The price chip says what it is set to: "KSh 5K–20K", "KSh 5K+", "Under KSh 20K". */
function priceChipLabel(minPrice: string, maxPrice: string): string {
  const format = (value: number) =>
    new Intl.NumberFormat("en-KE", {
      notation: value >= 10_000 ? "compact" : "standard",
      maximumFractionDigits: 1,
    }).format(value);
  const min = minPrice.trim() ? Number(minPrice) : NaN;
  const max = maxPrice.trim() ? Number(maxPrice) : NaN;
  const hasMin = Number.isFinite(min);
  const hasMax = Number.isFinite(max);
  if (hasMin && hasMax) return `KSh ${format(min)}–${format(max)}`;
  if (hasMin) return `KSh ${format(min)}+`;
  if (hasMax) return `Under KSh ${format(max)}`;
  return "Price";
}

function isDiscoverContentType(
  value: string | null,
): value is DiscoverContentType {
  return value === "IMAGE" || value === "VIDEO";
}

function DiscoverFeedSkeleton() {
  return (
    <div className="px-4 pb-8 lg:px-0">
      <DiscoverGridSkeleton />
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="px-8 pb-16 pt-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-subtle text-muted">
        <Search size={22} aria-hidden />
      </div>
      <h2 className="mt-4 text-[16px] font-semibold leading-6 text-main">
        {title}
      </h2>
      <p className="mx-auto mt-1 max-w-xs text-[13px] leading-5 text-muted">
        {body}
      </p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex h-10 items-center rounded-full border border-default px-5 text-[14px] font-semibold text-main transition-colors active:bg-subtle"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

/**
 * The line between the controls and the grid: what is being shown, how many
 * there are once something narrows it, and how they are ordered.
 *
 * A category page never said which category it was — the search box above it
 * reads the same everywhere — so this is also the page's title.
 */
function ResultsHeader({
  title,
  subtitle,
  subtitleLoading,
  sortControl,
}: {
  title: string;
  subtitle: string | null;
  /** Hold the subtitle's line while the count loads, so the grid doesn't jump. */
  subtitleLoading: boolean;
  sortControl: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 lg:px-0 lg:pt-2">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold leading-5 text-main md:text-[17px] md:leading-6">
          {title}
        </h1>
        {subtitle ? (
          <p className="truncate text-[12px] leading-4 text-muted tabular-nums md:text-[13px] md:leading-5">
            {subtitle}
          </p>
        ) : subtitleLoading ? (
          <div className="flex h-4 items-center md:h-5" aria-hidden>
            <span className="h-2.5 w-16 animate-pulse rounded-full bg-subtle" />
          </div>
        ) : null}
      </div>
      {sortControl}
    </div>
  );
}

const SORT_TRIGGER_CLASS =
  "-mr-2 flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium transition-colors active:bg-subtle hover:bg-subtle";

/** The quick filters under the search bar on a category page. */
const FILTER_CHIP_CLASS =
  "flex h-8 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors";
const FILTER_CHIP_OFF = "border-default bg-app text-main active:bg-subtle";
const FILTER_CHIP_ON = "border-primary bg-primary/5 text-primary";

/** Sort on desktop: a menu under the button rather than a sheet from below. */
function SortMenu({
  sort,
  hasQuery,
  onSelect,
}: {
  sort: DiscoverySort;
  hasQuery: boolean;
  onSelect: (sort: DiscoverySort) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            SORT_TRIGGER_CLASS,
            sort !== "RELEVANCE" ? "text-primary" : "text-main",
          )}
        >
          <ArrowUpDown size={14} aria-hidden />
          {sortLabel(sort, hasQuery)}
          <ChevronDown size={14} className="text-muted" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 rounded-xl border-default bg-elevated p-1.5 text-main shadow-lg"
      >
        <div role="radiogroup" aria-label="Sort by">
          {SORT_OPTIONS.map((option) => {
            const active = sort === option.value;
            return (
              <PopoverClose asChild key={option.value}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSelect(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[14px] transition-colors hover:bg-subtle",
                    active ? "font-semibold text-primary" : "text-main",
                  )}
                >
                  {option.value === "RELEVANCE"
                    ? sortLabel("RELEVANCE", hasQuery)
                    : option.label}
                  {active ? <Check size={16} aria-hidden /> : null}
                </button>
              </PopoverClose>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LocationOption({
  item,
  active,
  onSelect,
  onDrillIn,
  indicator = "check",
  listStyle = false,
}: {
  item: LocationFacet;
  active: boolean;
  /** Tapping the row's name/body — marks this item the active choice for the
   * current step. It doesn't navigate or close; the step's sticky footer picks
   * up whatever is active and is the one control that applies + closes. */
  onSelect: () => void;
  /**
   * The chevron control — marks the item active *and* advances into its
   * children. Only meaningful on a chevron row; omit it for a leaf level
   * (wards) that has nothing left to drill into.
   */
  onDrillIn?: () => void;
  indicator?: "check" | "chevron";
  listStyle?: boolean;
}) {
  const disabled = item.count === 0;
  const countLabel = `${item.count} ${item.count === 1 ? "item" : "items"}`;

  if (listStyle && onDrillIn) {
    return (
      <button
        type="button"
        onClick={onDrillIn}
        disabled={disabled}
        aria-label={`View places inside ${item.name}`}
        className={cn(
          "flex min-h-16 w-full items-center justify-between border-b border-default px-4 text-left disabled:cursor-not-allowed",
          disabled && "opacity-50",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "truncate text-[14px] font-medium",
              active ? "text-primary" : "text-default",
            )}
          >
            {item.name}
          </span>
          <span className="shrink-0 text-[12px] text-muted-foreground">
            · {item.count.toLocaleString()} {item.count === 1 ? "ad" : "ads"}
          </span>
        </span>
        <ChevronRight size={19} className="ml-3 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  if (listStyle) {
    return (
      <div
        className={cn(
          "flex min-h-16 items-center border-b border-default",
          disabled && "opacity-50",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          className="flex min-h-16 min-w-0 flex-1 items-center gap-1.5 px-4 text-left disabled:cursor-not-allowed"
        >
          <span
            className={cn(
              "truncate text-[14px] font-medium",
              active ? "text-primary" : "text-default",
            )}
          >
            {item.name}
          </span>
          <span className="shrink-0 text-[12px] text-muted-foreground">
            · {item.count.toLocaleString()} {item.count === 1 ? "ad" : "ads"}
          </span>
        </button>
        {onDrillIn ? (
          <button
            type="button"
            onClick={onDrillIn}
            disabled={disabled}
            aria-label={`View places inside ${item.name}`}
            className="grid h-12 w-11 shrink-0 place-items-center text-muted-foreground disabled:cursor-not-allowed"
          >
            <ChevronRight size={19} />
          </button>
        ) : active ? (
          <Check size={17} className="mr-4 shrink-0 text-primary" />
        ) : null}
      </div>
    );
  }

  if (indicator === "chevron" && onDrillIn) {
    return (
      <div
        className={cn(
          "flex w-full items-stretch overflow-hidden rounded-2xl border transition-colors",
          active ? "border-primary bg-primary/5" : "border-default bg-app",
          disabled && "opacity-50",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          className="min-w-0 flex-1 px-4 py-3 text-left disabled:cursor-not-allowed"
        >
          <p className="truncate text-sm font-medium text-default">
            {item.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{countLabel}</p>
        </button>
        <button
          type="button"
          onClick={onDrillIn}
          disabled={disabled}
          aria-label={`View places inside ${item.name}`}
          className={cn(
            "relative flex shrink-0 items-center border-l px-3 transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:hover:bg-transparent",
            active
              ? "border-primary/20 bg-primary/10"
              : "border-default text-muted-foreground",
          )}
        >
          {/* Once a row is the active choice, drilling further in is the one
              obvious next move — a ping ring behind the chevron reads as
              "tap me", not just as a static "this has children" affordance.
              (animate-pulse on the icon itself was too subtle to notice.) */}
          {active ? (
            <span
              className="absolute inset-1.5 animate-ping rounded-full bg-primary/40"
              aria-hidden
            />
          ) : null}
          <ChevronRight
            size={18}
            className={cn("relative", active && "text-primary")}
          />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active ? "border-primary bg-primary/5" : "border-default bg-app",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-default">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{countLabel}</p>
      </div>
      {active ? <Check size={18} className="text-primary" /> : null}
    </button>
  );
}

function MobileLocationSearchHeader({
  title,
  value,
  onChange,
  placeholder,
  onBack,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onBack: () => void;
}) {
  return (
    <div className="shrink-0 bg-app px-3 py-2.5">
      <DrawerTitle className="sr-only">{title}</DrawerTitle>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-default bg-surface px-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-primary active:bg-primary/10"
        >
          <ChevronLeft size={21} strokeWidth={2.2} />
        </button>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-default outline-none placeholder:text-muted-foreground"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="grid h-8 w-8 shrink-0 place-items-center text-muted-foreground"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Client-side filter box shared by all three location steps — the facet
 * lists are already fully loaded, so this never hits the network. */
function LocationSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-full border border-default bg-surface px-3.5 py-2">
      <Search
        size={15}
        className="shrink-0 text-muted-foreground"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-5 min-w-0 flex-1 bg-transparent text-sm text-default outline-none placeholder:text-muted-foreground"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 text-muted-foreground"
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Sticky action at the bottom of every location step. It always reflects
 * whatever is currently the active choice for that step (nationwide, or a
 * facet) — tapping a row above updates it live, and this is the one control
 * that actually applies the selection and closes the picker.
 */
function LocationStepFooter({
  count,
  label,
  onConfirm,
}: {
  count: number;
  label: string;
  onConfirm: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-default px-4 py-3">
      <button
        type="button"
        onClick={onConfirm}
        disabled={count === 0}
        className="flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        Show {count} {count === 1 ? "item" : "items"} {label}
      </button>
    </div>
  );
}

/** A row in the category sheet: the name, how many listings, a chevron. */
function CategoryDrawerRow({
  label,
  count,
  onClick,
  emphasis = false,
}: {
  label: string;
  count: number;
  onClick: () => void;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors active:bg-subtle"
    >
      <span
        className={cn(
          "min-w-0 truncate text-[14px] leading-5 text-main",
          emphasis && "font-semibold",
        )}
      >
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[12px] text-muted tabular-nums">
        {count.toLocaleString()}
        <ChevronRight size={16} strokeWidth={2} aria-hidden />
      </span>
    </button>
  );
}

function LocationSheetHeader({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="border-b border-default px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-default bg-app text-default transition-colors hover:bg-surface"
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <SheetTitle className="truncate text-base">{title}</SheetTitle>
            {subtitle ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {action ?? <div className="h-9 w-9 shrink-0" aria-hidden />}
      </div>
    </div>
  );
}

/**
 * Header for a view inside the mobile filter drawer: back (or close) on the
 * left, the title, and an optional action on the right.
 */
function FilterDrawerHeader({
  title,
  subtitle,
  onBack,
  onClose,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 pb-3 pt-1">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-main active:bg-surface"
        >
          <ChevronLeft size={22} />
        </button>
      ) : (
        <span className="w-1 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <DrawerTitle className="truncate text-base font-semibold text-main">{title}</DrawerTitle>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p> : null}
      </div>
      {action ??
        (onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-main active:bg-surface"
          >
            <X size={20} />
          </button>
        ) : (
          <span className="w-10 shrink-0" aria-hidden />
        ))}
    </div>
  );
}

/**
 * The top bar of a sheet opened from the page: close on the left, then the
 * title. Filters and Sort share it, so the two sheets read as one family.
 */
function SheetTitleBar({
  title,
  closeLabel,
  onClose,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-app px-4 py-2 text-default">
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-default active:bg-surface"
      >
        <X size={21} />
      </button>
      <DrawerTitle className="text-[16px] font-semibold text-default">
        {title}
      </DrawerTitle>
    </div>
  );
}

/** One field in the filter list: its name, and what it is set to. */
function FilterFieldRow({
  label,
  value,
  active,
  onClick,
  onClear,
}: {
  label: string;
  value: string;
  active?: boolean;
  onClick: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="flex min-h-[62px] items-center border-b border-border px-4">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2.5 text-left active:opacity-60"
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-default">{label}</span>
          {value ? (
            <span
              className={cn(
                "mt-0.5 block truncate text-[13px] text-primary",
                active && "font-medium",
              )}
            >
              {value}
            </span>
          ) : null}
        </span>
      </button>
      {active && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear ${label} filter`}
          className="ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary active:bg-primary/15"
        >
          <X size={19} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onClick}
          aria-label={`Open ${label} filter`}
          className="-mr-2 ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted active:bg-surface"
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

/**
 * The drawer's main view: every filter as one list of fields, the way people
 * already know it from classifieds apps. A field opens its options in place;
 * price is typed straight in. Spec fields (Make, Model, Year…) come from what
 * the category's listings actually carry, so there is never a field with
 * nothing behind it.
 */
function FilterFieldList({
  categoryLabel,
  subcategoryLabel,
  regionLabel,
  sortLabel,
  sortActive,
  minPrice,
  maxPrice,
  postedLabel,
  specFacets,
  specFacetsLoading,
  specs,
  negotiableOnly,
  onNegotiableOnly,
  onOpenPicker,
  onOpenRegion,
  onOpenSort,
  onClearLocation,
  onClearSort,
  onClearPrice,
  onClearPosted,
  onClearSpec,
  onClose,
  onClear,
  canClear,
  resultLabel,
}: {
  categoryLabel: string | null;
  /** Null hides the row (no category, or a category without subcategories). */
  subcategoryLabel: string | null;
  regionLabel: string;
  sortLabel: string;
  sortActive: boolean;
  minPrice: string;
  maxPrice: string;
  postedLabel: string;
  specFacets: SpecFacet[];
  specFacetsLoading: boolean;
  specs: SpecFilter[];
  negotiableOnly: boolean;
  onNegotiableOnly: (value: boolean) => void;
  onOpenPicker: (picker: FilterPicker) => void;
  onOpenRegion: () => void;
  onOpenSort: () => void;
  onClearLocation: () => void;
  onClearSort: () => void;
  onClearPrice: () => void;
  onClearPosted: () => void;
  onClearSpec: (key: string) => void;
  onClose: () => void;
  onClear: () => void;
  canClear: boolean;
  resultLabel: string;
}) {
  const specValue = (key: string) => specs.find((spec) => spec.key === key)?.value;

  return (
    <>
      <SheetTitleBar
        title="Filter results"
        closeLabel="Close filters"
        onClose={onClose}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {categoryLabel ? (
          <FilterFieldRow
            label="Category"
            value={categoryLabel}
            active={categoryLabel !== "All categories"}
            onClick={() => onOpenPicker({ kind: "category" })}
          />
        ) : null}
        {subcategoryLabel ? (
          <FilterFieldRow
            label="Subcategory"
            value={subcategoryLabel}
            active={!subcategoryLabel.startsWith("All ")}
            onClick={() => onOpenPicker({ kind: "subcategory" })}
          />
        ) : null}
        <FilterFieldRow
          label="Region"
          value={regionLabel}
          active={regionLabel !== "All Kenya"}
          onClick={onOpenRegion}
          onClear={onClearLocation}
        />

        <FilterFieldRow
          label="Sort by"
          value={sortLabel}
          active={sortActive}
          onClick={onOpenSort}
          onClear={sortActive ? onClearSort : undefined}
        />

        <FilterFieldRow
          label="Period"
          value={postedLabel}
          active={postedLabel !== "Any time"}
          onClick={() => onOpenPicker({ kind: "posted" })}
          onClear={onClearPosted}
        />

        <div className="border-b border-border px-4 py-3">
          <span className="mb-1.5 block text-[13px] font-medium text-default">
            Distance
          </span>
          <DistanceFilter compact />
        </div>

        <div className="h-2 bg-elevated" aria-hidden />

        <FilterFieldRow
          label="Price, KSh"
          value={
            minPrice.trim() || maxPrice.trim()
              ? `${minPrice.trim() || "Any"} – ${maxPrice.trim() || "Any"}`
              : "Any price"
          }
          active={Boolean(minPrice.trim() || maxPrice.trim())}
          onClick={() => onOpenPicker({ kind: "price" })}
          onClear={onClearPrice}
        />

        {specFacets.length > 0 || specFacetsLoading ? (
          <>
            <div className="h-2 bg-elevated" aria-hidden />
            <div className="px-4 pb-1 pt-3 text-[12px] font-semibold text-muted">
              Popular filters
            </div>
          </>
        ) : null}

        {specFacetsLoading
          ? <DrawerLoadingIndicator className="min-h-32 border-b border-border" />
          : specFacets.map((facet) => {
              const value = specValue(facet.key);
              return (
                <FilterFieldRow
                  key={facet.key}
                  label={facet.label}
                  value={value ?? ""}
                  active={Boolean(value)}
                  onClick={() => onOpenPicker({ kind: "spec", key: facet.key })}
                  onClear={() => onClearSpec(facet.key)}
                />
              );
            })}

        <div className="border-b border-border px-4 py-3.5">
          <span className="mb-2 block text-[13px] font-medium text-default">
            Content type
          </span>
          <ContentTypeSegments />
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3.5">
          <div className="min-w-0">
            <span className="block text-[13px] text-main">Negotiable only</span>
            <span className="mt-0.5 block text-[11px] text-muted">
              Sellers open to discussing the price
            </span>
          </div>
          <Switch
            checked={negotiableOnly}
            onCheckedChange={onNegotiableOnly}
            aria-label="Negotiable only"
          />
        </div>

        {categoryLabel === "All categories" ? (
          <p className="px-4 py-4 text-xs leading-relaxed text-muted">
            Pick a category to filter by make, model, size and more.
          </p>
        ) : null}
      </div>

      {/* Thumb-sized: these two close the sheet, so they get the 44px a
          primary action needs rather than the 36px they had. */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2">
        <button
          type="button"
          onClick={onClear}
          disabled={!canClear}
          className="h-11 shrink-0 rounded-full px-4 text-[14px] font-semibold text-main transition-opacity active:opacity-70 disabled:opacity-40"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-11 flex-1 rounded-full bg-primary text-[14px] font-semibold text-white transition-opacity active:opacity-80"
        >
          {resultLabel}
        </button>
      </div>
    </>
  );
}

/**
 * The options for one field, opened from the field list. Picking one applies
 * it and goes straight back to the list — one tap, no confirm step.
 */
function FilterPickerView({
  picker,
  categories,
  selectedCategory,
  subcategories,
  selectedSubcategory,
  specFacets,
  specs,
  sort,
  relevanceLabel,
  postedWithinDays,
  onBack,
  onPickCategory,
  onPickSubcategory,
  onPickPosted,
  onPickSpec,
  onPickSort,
}: {
  picker: FilterPicker;
  categories: CategoryFacet[];
  selectedCategory: CategoryFacet | null;
  subcategories: SubcategoryFacet[];
  selectedSubcategory: string | null;
  specFacets: SpecFacet[];
  specs: SpecFilter[];
  sort: DiscoverySort;
  /** What the default order is called here — see sortLabel. */
  relevanceLabel: string;
  postedWithinDays: number | null;
  onBack: () => void;
  onPickPosted: (days: number | null) => void;
  onPickCategory: (category: CategoryFacet | null) => void;
  onPickSubcategory: (name: string | null) => void;
  onPickSpec: (key: string, value: string | null) => void;
  onPickSort: (sort: DiscoverySort) => void;
}) {
  const [search, setSearch] = useState("");

  if (picker.kind === "price") {
    return (
      <>
        <FilterDrawerHeader title="Price, KSh" onBack={onBack} />
        <div className="px-4 py-5">
          <PriceRangeFields />
        </div>
      </>
    );
  }

  let title: string;
  let anyLabel: string;
  let options: Array<{ id: string; label: string; count?: number; active: boolean; pick: () => void }>;
  let anyActive: boolean;
  let pickAny: () => void;
  let anyCount: number | undefined;

  if (picker.kind === "category") {
    title = "Category";
    anyLabel = "All categories";
    anyActive = !selectedCategory;
    pickAny = () => onPickCategory(null);
    options = categories.map((category) => ({
      id: category.id,
      label: category.name,
      count: category.count,
      active: selectedCategory?.id === category.id,
      pick: () => onPickCategory(category),
    }));
  } else if (picker.kind === "subcategory") {
    title = selectedCategory?.name ?? "Subcategory";
    anyLabel = selectedCategory ? `All ${selectedCategory.name}` : "All";
    anyCount = selectedCategory
      ? categories.find((category) => category.id === selectedCategory.id)?.count ??
        selectedCategory.count
      : undefined;
    anyActive = !selectedSubcategory;
    pickAny = () => onPickSubcategory(null);
    options = subcategories.map((item) => ({
      id: item.name,
      label: item.name,
      count: item.count,
      active: selectedSubcategory === item.name,
      pick: () => onPickSubcategory(item.name),
    }));
  } else if (picker.kind === "posted") {
    title = "Posted";
    anyLabel = "Any time";
    anyActive = postedWithinDays == null;
    pickAny = () => onPickPosted(null);
    options = POSTED_WITHIN_OPTIONS.filter((option) => option.value != null).map((option) => ({
      id: String(option.value),
      label: option.label,
      active: postedWithinDays === option.value,
      pick: () => onPickPosted(option.value),
    }));
  } else if (picker.kind === "sort") {
    title = "Sort by";
    anyLabel = relevanceLabel;
    anyActive = sort === "RELEVANCE";
    pickAny = () => onPickSort("RELEVANCE");
    options = SORT_OPTIONS.filter((option) => option.value !== "RELEVANCE").map(
      (option) => ({
        id: option.value,
        label: option.label,
        active: sort === option.value,
        pick: () => onPickSort(option.value),
      }),
    );
  } else {
    const facet = specFacets.find((item) => item.key === picker.key);
    const current = specs.find((spec) => spec.key === picker.key)?.value;
    title = facet?.label ?? picker.key;
    anyLabel = "Any";
    anyActive = !current;
    pickAny = () => onPickSpec(picker.key, null);
    options = (facet?.values ?? []).map((item) => ({
      id: item.value,
      label: item.value,
      count: item.count,
      active: current?.toLowerCase() === item.value.toLowerCase(),
      pick: () => onPickSpec(picker.key, item.value),
    }));
  }

  // Long lists (Model, Category) get a filter box; short ones don't need it.
  const searchable = options.length > 8;
  const term = search.trim().toLowerCase();
  const visible = term
    ? options.filter((option) => option.label.toLowerCase().includes(term))
    : options;

  return (
    <>
      <FilterDrawerHeader title={title} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        {searchable ? (
          <div className="pt-3">
            <LocationSearchInput
              value={search}
              onChange={setSearch}
              placeholder={`Search ${title.toLowerCase()}`}
            />
          </div>
        ) : null}
        {!term ? (
          <PickerOptionRow
            label={anyLabel}
            count={anyCount}
            active={anyActive}
            onClick={pickAny}
          />
        ) : null}
        {visible.map((option) => (
          <PickerOptionRow
            key={option.id}
            label={option.label}
            count={option.count}
            active={option.active}
            onClick={option.pick}
          />
        ))}
        {term && visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No matches for “{search.trim()}”.</p>
        ) : null}
      </div>
    </>
  );
}

function PickerOptionRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex w-full items-center gap-3 border-b border-border py-3 text-left active:opacity-60"
    >
      <span className={cn("min-w-0 flex-1 truncate text-[14px] text-main", active && "font-semibold")}>
        {label}
      </span>
      {count != null ? <span className="shrink-0 text-xs tabular-nums text-muted">{count}</span> : null}
      <Check
        size={18}
        className={cn("shrink-0 text-primary", active ? "opacity-100" : "opacity-0")}
        aria-hidden
      />
    </button>
  );
}

function locationSheetDepth(step: LocationSheetStep | null) {
  switch (step) {
    case "county":
      return 1;
    case "subcounty":
      return 2;
    case "ward":
      return 3;
    default:
      return 0;
  }
}

export function DiscoverPage({
  lang,
  initialCategorySlug,
  initialSubcategorySlug,
  initialPosts,
  initialTitle,
}: {
  lang: string;
  initialCategorySlug?: string;
  initialSubcategorySlug?: string;
  /**
   * The route's first page of cards, fetched on the server. Shown in place of
   * the skeleton until the first client load settles, so the server HTML —
   * all a non-JS crawler sees — has real listings and links in it.
   */
  initialPosts?: ContentCardFieldsFragment[];
  /** The results heading before the client resolves the subcategory name. */
  initialTitle?: string;
}) {
  const isSubcategoryRoute = Boolean(
    initialCategorySlug && initialSubcategorySlug,
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Seed the search box from a ?q= deep link (e.g. /search?q=iphone, and the
  // /explore?q= URL advertised in our WebSite SearchAction structured data).
  // useState reads its argument only on the first render, so this is a plain
  // initial value — no effect, no cascading render — after which the input owns
  // the term and the mirror effect keeps the URL in sync.
  // The draft lives in a store rather than here because the desktop nav's
  // search box writes to it too — see stores/search.ts. `query` stays local:
  // it is the debounced value this page actually searches on, and nothing
  // outside needs it.
  const searchDraft = useSearchStore((s) => s.draft);
  const setSearchDraft = useSearchStore((s) => s.setDraft);
  const [query, setQuery] = useState(() => searchParams.get("q")?.trim() ?? "");
  const [recordSearchTerm] = useMutation(RECORD_SEARCH_TERM);

  // Seed the shared draft from a ?q= deep link on mount. The store outlives
  // this page (it is a module singleton), so without this a term typed on
  // /explore would still be sitting in the nav box on the next visit, and a
  // ?q= link would open with the box showing the previous search.
  useEffect(() => {
    setSearchDraft(searchParams.get("q")?.trim() ?? "");
    // Mount only: after this the input owns the term. Re-running on
    // searchParams would fight the debounce, because the mirror effect below
    // writes ?q= back from `query` on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const selectedCategory = useDiscoverFiltersStore(
    (s) => s.selectedCategory as CategoryFacet | null,
  );
  const setSelectedCategory = useDiscoverFiltersStore(
    (s) => s.setSelectedCategory,
  );
  const selectedSubcategory = useDiscoverFiltersStore(
    (s) => s.selectedSubcategory,
  );
  const setSelectedSubcategory = useDiscoverFiltersStore(
    (s) => s.setSelectedSubcategory,
  );
  const selectedCounty = useDiscoverFiltersStore(
    (s) => s.selectedCounty as LocationFacet | null,
  );
  const setSelectedCounty = useDiscoverFiltersStore((s) => s.setSelectedCounty);
  const selectedSubCounty = useDiscoverFiltersStore(
    (s) => s.selectedSubCounty as LocationFacet | null,
  );
  const setSelectedSubCounty = useDiscoverFiltersStore(
    (s) => s.setSelectedSubCounty,
  );
  const selectedWard = useDiscoverFiltersStore(
    (s) => s.selectedWard as LocationFacet | null,
  );
  const setSelectedWard = useDiscoverFiltersStore((s) => s.setSelectedWard);
  const selectedType = useDiscoverFiltersStore(
    (s) => s.selectedType as ContentType | null,
  );
  const setSelectedType = useDiscoverFiltersStore((s) => s.setSelectedType);
  const sort = useDiscoverFiltersStore((s) => s.sort as DiscoverySort);
  const setSort = useDiscoverFiltersStore((s) => s.setSort);
  const minPrice = useDiscoverFiltersStore((s) => s.minPrice);
  const setMinPrice = useDiscoverFiltersStore((s) => s.setMinPrice);
  const maxPrice = useDiscoverFiltersStore((s) => s.maxPrice);
  const setMaxPrice = useDiscoverFiltersStore((s) => s.setMaxPrice);
  const negotiableOnly = useDiscoverFiltersStore((s) => s.negotiableOnly);
  const setNegotiableOnly = useDiscoverFiltersStore((s) => s.setNegotiableOnly);
  const requestLocationPicker = useDiscoverFiltersStore(
    (s) => s.requestLocationPicker,
  );
  const setStoreSubcategories = useDiscoverFiltersStore(
    (s) => s.setSubcategories,
  );
  const [locationStep, setLocationStep] = useState<LocationSheetStep | null>(
    null,
  );
  // The location picker is a right-side sheet on mobile (matches Filters/Sort)
  // but a centered dialog on desktop, where a slide-in panel reads as a leftover
  // mobile pattern rather than a deliberate desktop control.
  const isDesktop = useIsDesktop({ ssrDefault: false });
  // One search box shared by all three location steps — only one step is ever
  // visible at a time, so a single term is enough. It's client-side (the
  // facet lists are already fully loaded); every step transition below clears
  // it so leftover text from "county" doesn't linger into "ward".
  const [locationSearch, setLocationSearch] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [subcategoryHeaderMode, setSubcategoryHeaderMode] = useState<
    "expanded" | "chips" | "search"
  >("expanded");
  const subcategoryChipsRef = useRef<HTMLDivElement>(null);
  const [subcategoryDrawerOpen, setSubcategoryDrawerOpen] = useState(false);
  const [drawerCategory, setDrawerCategory] = useState<CategoryFacet | null>(null);
  // An option list open inside the mobile filter drawer (Category, Make…).
  const [picker, setPicker] = useState<FilterPicker | null>(null);
  // Spec filters (Make: Toyota…), distance and recency live in the shared
  // store so the desktop sidebar edits the same state as the mobile drawer.
  const specs = useDiscoverFiltersStore((s) => s.specs);
  const setSpec = useDiscoverFiltersStore((s) => s.setSpec);
  const setSpecs = useDiscoverFiltersStore((s) => s.setSpecs);
  const clearNarrowingFilters = useDiscoverFiltersStore((s) => s.clearFilters);
  const setStoreSpecFacets = useDiscoverFiltersStore((s) => s.setSpecFacets);
  const nearby = useDiscoverFiltersStore((s) => s.nearby);
  const radiusKm = useDiscoverFiltersStore((s) => s.radiusKm);
  const postedWithinDays = useDiscoverFiltersStore((s) => s.postedWithinDays);
  const setPostedWithinDays = useDiscoverFiltersStore(
    (s) => s.setPostedWithinDays,
  );
  const [locationParamsApplied, setLocationParamsApplied] = useState(() => {
    return !(
      searchParams.get("countyId") ||
      searchParams.get("subCountyId") ||
      searchParams.get("wardId")
    );
  });
  const initialLocationParams = useRef({
    countyId: searchParams.get("countyId"),
    subCountyId: searchParams.get("subCountyId"),
    wardId: searchParams.get("wardId"),
  });

  const parsedMinPrice = parsePriceFilter(minPrice);
  const parsedMaxPrice = parsePriceFilter(maxPrice);

  useEffect(() => {
    const initialSort = searchParams.get("sort");
    setSort(isDiscoverySort(initialSort) ? initialSort : "RELEVANCE");
    const initialType = searchParams.get("type");
    setSelectedType(isDiscoverContentType(initialType) ? initialType : null);
    setSelectedSubcategory(searchParams.get("subcategory")?.trim() || null);
    setMinPrice(searchParams.get("minPrice") ?? "");
    setMaxPrice(searchParams.get("maxPrice") ?? "");
    setNegotiableOnly(searchParams.get("negotiable") === "1");
    // The URL decides what Explore opens on. The filters store outlives the
    // page, so a category or region picked on an earlier visit would otherwise
    // still be applied — invisibly, now that category lives in the filters.
    // (A ?category= deep link is applied below once categories have loaded.)
    // Category first: setting it clears the spec filters, which come next.
    if (!searchParams.get("category") && !initialCategorySlug) {
      setSelectedCategory(null);
    }
    if (
      !searchParams.get("countyId") &&
      !searchParams.get("subCountyId") &&
      !searchParams.get("wardId")
    ) {
      setSelectedCounty(null);
    }
    setSpecs(parseSpecParams(searchParams.getAll("spec")));
    const posted = Number(searchParams.get("posted"));
    setPostedWithinDays(Number.isInteger(posted) && posted > 0 ? posted : null);
    // Mount only: query params seed the shared desktop sidebar filters once.
    // After that, the shared filter store owns changes and the URL mirror below
    // persists them without fighting user input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchDraft.trim();
      setQuery(next);
      // Search spans every category, so drop any category constraint when one
      // starts — otherwise results would be silently scoped to a category whose
      // bar is now hidden.
      if (next && !isSubcategoryRoute) {
        setSelectedCategory(null);
        setSelectedSubcategory(null);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [isSubcategoryRoute, searchDraft]);

  // `query` is already debounced for feed requests. Wait briefly again so a
  // quick edit does not create a second analytics event, then send it
  // asynchronously; analytics must never delay the Explore results.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;

    const handle = window.setTimeout(() => {
      void recordSearchTerm({ variables: { input: { term } } }).catch(() => {
        // Search analytics is best-effort and must not affect browsing.
      });
    }, SEARCH_ANALYTICS_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query, recordSearchTerm]);

  const hasCategoryResults = Boolean(selectedCategory) || isSubcategoryRoute;

  useEffect(() => {
    if (!hasCategoryResults) {
      setSubcategoryHeaderMode("expanded");
      return;
    }

    let previousY = window.scrollY;
    let mode: "expanded" | "chips" | "search" = "expanded";
    let direction = 0;
    let directionTravel = 0;
    const topThreshold = 72;
    const scrollDistanceToSearch = 36;
    const scrollDistanceToChips = 20;

    const handleScroll = () => {
      if (window.innerWidth >= 1024) return;
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - previousY;

      if (currentY <= topThreshold) {
        mode = "expanded";
        direction = 0;
        directionTravel = 0;
      } else if (Math.abs(delta) > 0.5) {
        const nextDirection = delta > 0 ? 1 : -1;
        if (nextDirection !== direction) {
          direction = nextDirection;
          directionTravel = 0;
        }
        directionTravel += Math.abs(delta);

        if (direction > 0 && mode === "expanded") {
          mode = "chips";
          directionTravel = 0;
        } else if (
          direction > 0 &&
          mode === "chips" &&
          directionTravel >= scrollDistanceToSearch
        ) {
          mode = "search";
          directionTravel = 0;
        } else if (
          direction < 0 &&
          mode === "search" &&
          directionTravel >= scrollDistanceToChips
        ) {
          mode = "chips";
          directionTravel = 0;
        }
      }

      setSubcategoryHeaderMode((current) => (current === mode ? current : mode));
      previousY = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasCategoryResults]);

  useEffect(() => {
    if (hasCategoryResults && subcategoryChipsRef.current) {
      subcategoryChipsRef.current.scrollLeft = 0;
    }
  }, [hasCategoryResults]);

  // Subcategory tiles follow every filter EXCEPT the subcategory itself, so
  // picking a tile narrows the grid below without the row reshuffling under the
  // thumb that just tapped it. Built before the feed variables because the feed
  // depends on which tiles actually exist — see `subcategory` below.
  const subcategoryFacetVariables = useMemo(
    () => ({
      query: query || undefined,
      categoryId: (subcategoryDrawerOpen ? drawerCategory : selectedCategory)?.id,
      type: selectedType ?? undefined,
      countyId: selectedCounty?.id,
      subCountyId: selectedSubCounty?.id,
      wardId: selectedWard?.id,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
      negotiableOnly: negotiableOnly || undefined,
      specs: specs.length > 0 ? specs : undefined,
      latitude: nearby?.latitude,
      longitude: nearby?.longitude,
      radiusKm: nearby ? radiusKm : undefined,
      postedWithinDays: postedWithinDays ?? undefined,
    }),
    [
      query,
      drawerCategory?.id,
      subcategoryDrawerOpen,
      selectedCategory?.id,
      selectedType,
      selectedCounty?.id,
      selectedSubCounty?.id,
      selectedWard?.id,
      parsedMinPrice,
      parsedMaxPrice,
      negotiableOnly,
      specs,
      nearby,
      radiusKm,
      postedWithinDays,
    ],
  );

  const {
    data: subcategoryFacetsData,
    loading: subcategoriesLoading,
  } = useQuery(
    DISCOVERY_SUBCATEGORY_FACETS,
    {
      variables: subcategoryFacetVariables,
      skip: !selectedCategory && !(subcategoryDrawerOpen && drawerCategory),
      fetchPolicy: "network-only",
      nextFetchPolicy: "cache-first",
    },
  );

  const subcategories = useMemo(
    () =>
      (subcategoryFacetsData?.discoveryFacets?.subcategories ?? []).filter(
        (subcategory) => subcategory.count > 0,
      ),
    [subcategoryFacetsData?.discoveryFacets?.subcategories],
  );

  useEffect(() => {
    setStoreSubcategories(subcategories);
  }, [setStoreSubcategories, subcategories]);

  /**
   * The subcategory actually applied to the queries.
   *
   * Narrowing the location (or the search) can empty out the chosen
   * subcategory. Left alone that reads as a broken page: an empty grid with no
   * visibly selected tile to un-tap. Deriving it rather than clearing the state
   * in an effect means the stale name simply stops counting for as long as it
   * has no listings, and starts counting again if widening the filters brings
   * it back — no cascading render either way.
   */
  const subcategory =
    selectedSubcategory &&
    (isSubcategoryRoute ||
      !subcategoryFacetsData ||
      subcategories.some((item) => item.name === selectedSubcategory))
      ? selectedSubcategory
      : null;

  // A deep-linked subcategory needs its category and canonical subcategory
  // name resolved before the feed/spec queries run. Otherwise the page first
  // requests category-wide data, then requests the actual subcategory data;
  // that produces a second feed load and briefly shows irrelevant spec chips.
  const subcategoryRouteReady =
    !isSubcategoryRoute ||
    Boolean(
      initialCategorySlug &&
        initialSubcategorySlug &&
        selectedCategory?.slug === initialCategorySlug &&
        subcategory &&
        slugifyContentTitle(subcategory) === initialSubcategorySlug,
    );

  const feedVariables = useMemo<DiscoveryFeedVars>(
    () => ({
      query: query || undefined,
      categoryId: selectedCategory?.id,
      type: selectedType ?? undefined,
      subcategory: subcategory || undefined,
      countyId: selectedCounty?.id,
      subCountyId: selectedSubCounty?.id,
      wardId: selectedWard?.id,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
      negotiableOnly: negotiableOnly || undefined,
      specs: specs.length > 0 ? specs : undefined,
      latitude: nearby?.latitude,
      longitude: nearby?.longitude,
      radiusKm: nearby ? radiusKm : undefined,
      postedWithinDays: postedWithinDays ?? undefined,
      sort,
      limit: PAGE_SIZE,
    }),
    [
      query,
      selectedCategory?.id,
      selectedType,
      subcategory,
      selectedCounty?.id,
      selectedSubCounty?.id,
      selectedWard?.id,
      parsedMinPrice,
      parsedMaxPrice,
      negotiableOnly,
      specs,
      nearby,
      radiusKm,
      postedWithinDays,
      sort,
    ],
  );

  const facetVariables = useMemo<DiscoveryFacetsVars>(
    () => ({
      query: query || undefined,
      categoryId: selectedCategory?.id,
      type: selectedType ?? undefined,
      subcategory: subcategory || undefined,
      countyId: selectedCounty?.id,
      subCountyId: selectedSubCounty?.id,
      wardId: selectedWard?.id,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
      negotiableOnly: negotiableOnly || undefined,
      specs: specs.length > 0 ? specs : undefined,
      latitude: nearby?.latitude,
      longitude: nearby?.longitude,
      radiusKm: nearby ? radiusKm : undefined,
      postedWithinDays: postedWithinDays ?? undefined,
    }),
    [
      query,
      selectedCategory?.id,
      selectedType,
      subcategory,
      selectedCounty?.id,
      selectedSubCounty?.id,
      selectedWard?.id,
      parsedMinPrice,
      parsedMaxPrice,
      negotiableOnly,
      specs,
      nearby,
      radiusKm,
      postedWithinDays,
    ],
  );

  const { data, loading, error, fetchMore, refetch, networkStatus } = useQuery(
    DISCOVERY_FEED,
    {
      skip: !subcategoryRouteReady,
      variables: feedVariables,
      fetchPolicy: "network-only",
      nextFetchPolicy: "cache-first",
      // The discoveryFeed field policy needs `existing` during refetches so a
      // background page-1 refresh splices over the head of the accumulated
      // window instead of replacing it (Apollo's default is "overwrite").
      refetchWritePolicy: "merge",
      notifyOnNetworkStatusChange: true,
    },
  );

  // Category counts follow active narrowing filters so categories with no
  // matching listings aren't offered in the mobile category grid.
  const categoryFacetVariables = useMemo<DiscoveryCategoryFacetsVars>(
    () => ({
      type: selectedType ?? undefined,
      countyId: selectedCounty?.id,
      subCountyId: selectedSubCounty?.id,
      wardId: selectedWard?.id,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
      negotiableOnly: negotiableOnly || undefined,
      specs: specs.length > 0 ? specs : undefined,
      latitude: nearby?.latitude,
      longitude: nearby?.longitude,
      radiusKm: nearby ? radiusKm : undefined,
      postedWithinDays: postedWithinDays ?? undefined,
    }),
    [
      selectedType,
      selectedCounty?.id,
      selectedSubCounty?.id,
      selectedWard?.id,
      parsedMinPrice,
      parsedMaxPrice,
      negotiableOnly,
      specs,
      nearby,
      radiusKm,
      postedWithinDays,
    ],
  );
  const { data: categoriesData, loading: categoriesLoading } = useQuery(
    DISCOVERY_CATEGORIES,
    {
      variables: categoryFacetVariables,
      fetchPolicy: "network-only",
      nextFetchPolicy: "cache-first",
    },
  );

  // Location facets follow the active filters (their post counts depend on the
  // current query/category). Kept separate so they don't disturb categories.
  const { data: locationFacetsData, loading: locationFacetsLoading } = useQuery(
    DISCOVERY_LOCATION_FACETS,
    {
      variables: facetVariables,
      skip: !subcategoryRouteReady,
      fetchPolicy: "network-only",
      nextFetchPolicy: "cache-first",
    },
  );

  /** Picking a category drops the subcategory — it only means something inside its parent. */
  const selectCategory = useCallback((next: CategoryFacet | null) => {
    // The store also clears the spec filters: a new category has its own.
    setSelectedCategory(next);
    setSelectedSubcategory(null);
  }, []);

  const openCategorySubcategories = useCallback(
    (category: CategoryFacet) => {
      setDrawerCategory(category);
      setSubcategoryDrawerOpen(true);
    },
    [],
  );

  const selectAllCategoryAndNavigate = useCallback(() => {
    if (!drawerCategory) return;
    rememberScrollBeforeNavigation();
    setSelectedCategory(drawerCategory);
    setSelectedSubcategory(null);
    setSubcategoryDrawerOpen(false);
    router.replace(
      `/${lang}/explore?category=${encodeURIComponent(drawerCategory.slug)}`,
      { scroll: false },
    );
  }, [drawerCategory, lang, router, setSelectedCategory, setSelectedSubcategory]);

  const selectSubcategoryAndNavigate = useCallback(
    (name: string) => {
      if (!drawerCategory) return;
      // Save the page behind the drawer before its exit animation begins.
      // RouteScrollRestoration uses this anchored snapshot when Back returns.
      rememberScrollBeforeNavigation();
      setSubcategoryDrawerOpen(false);
      // Replace, not push: the open drawer holds its own history entry (see
      // overlayDepth), and it is the one on top. Pushing past it left that
      // entry behind, so Back from the subcategory showed Categories and the
      // next Back stayed on it — popping a drawer that was no longer open.
      router.replace(
        `/${lang}/explore/${drawerCategory.slug}/${slugifyContentTitle(name)}`,
        { scroll: false },
      );
    },
    [drawerCategory, lang, router],
  );

  // Anything set in the facet variables narrows the results — a search, a
  // category, a filter. They are all left undefined when nothing does.
  const isNarrowed = Object.values(facetVariables).some(
    (value) => value !== undefined,
  );
  // The filter sheet's button and, once something narrows the results, the
  // results header both say how many posts match.
  const { data: resultCountData, loading: resultCountLoading } = useQuery(
    DISCOVERY_RESULT_COUNT,
    {
      variables: facetVariables,
      // A deep-linked subcategory resolves first, or the header would flash
      // the whole category's count before settling on the subcategory's.
      skip: !subcategoryRouteReady || (!filterOpen && !isNarrowed),
      fetchPolicy: "network-only",
      nextFetchPolicy: "cache-first",
    },
  );

  // Spec fields (Brand, Model, Year…) only exist inside a category, and load
  // as soon as one is chosen: they are the quick-filter chips under the search
  // bar. Phones used to wait for the filter sheet to open, so a category page
  // showed no chips until someone had already gone looking for them.
  const { data: specFacetsData, loading: specFacetsLoading } = useQuery(
    DISCOVERY_SPEC_FACETS,
    {
      variables: facetVariables,
      skip: !subcategoryRouteReady || (!selectedCategory && !subcategory),
      fetchPolicy: "network-only",
      nextFetchPolicy: "cache-first",
    },
  );
  const specFacetScope = `${selectedCategory?.id ?? "all"}:${
    subcategory ?? ""
  }`;
  const [resolvedSpecFacetScope, setResolvedSpecFacetScope] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (
      !subcategoryRouteReady ||
      specFacetsLoading ||
      (!selectedCategory && !subcategory) ||
      resolvedSpecFacetScope === specFacetScope
    ) {
      return;
    }
    setResolvedSpecFacetScope(specFacetScope);
  }, [
    selectedCategory,
    resolvedSpecFacetScope,
    specFacetScope,
    specFacetsLoading,
    subcategory,
    subcategoryRouteReady,
  ]);

  const specFacets = useMemo(
    () =>
      subcategoryRouteReady &&
      (selectedCategory || subcategory) &&
      (!specFacetsLoading || resolvedSpecFacetScope === specFacetScope)
        ? (specFacetsData?.discoverySpecFacets ?? [])
        : [],
    [
      selectedCategory,
      subcategory,
      specFacetsLoading,
      subcategoryRouteReady,
      specFacetsData?.discoverySpecFacets,
      resolvedSpecFacetScope,
      specFacetScope,
    ],
  );

  useEffect(() => {
    setStoreSpecFacets(specFacets);
  }, [setStoreSpecFacets, specFacets]);

  const items = data?.discoveryFeed?.items ?? [];
  const pageInfo = data?.discoveryFeed?.pageInfo;
  const locationFacets = locationFacetsData?.discoveryFacets;
  const isFetchingMore = networkStatus === NetworkStatus.fetchMore;
  // A full reload with nothing to show yet: the very first load, or a
  // filter/search/sort change whose combination has never been cached. A
  // revisit (or a previously used filter combo) has cached items, renders them
  // instantly, and refreshes silently in the background — no skeleton flash,
  // no scroll loss.
  const isReloading =
    (isSubcategoryRoute && !subcategoryRouteReady) ||
    (loading && !isFetchingMore && items.length === 0);
  // The server's cards stand in for the skeleton during the first load only.
  // Once anything has settled, a later reload (a filter or sort change) is
  // showing a different result set, so it gets the skeleton as before.
  const [firstLoadSettled, setFirstLoadSettled] = useState(false);
  useEffect(() => {
    if (!isReloading) setFirstLoadSettled(true);
  }, [isReloading]);
  const showInitialPosts =
    !firstLoadSettled && Boolean(initialPosts?.length);

  const itemCount = items.length;
  const guard = usePaginationGuard(itemCount);
  const loadMore = useCallback(() => {
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;
    const cursor = pageInfo.endCursor;
    // The discoveryFeed cache field policy appends + dedupes the page; the
    // guard stops a duplicate-only page from re-requesting the same cursor
    // forever.
    guard(cursor, itemCount, () =>
      fetchMore({
        variables: {
          ...feedVariables,
          after: cursor,
        },
      }),
    );
  }, [fetchMore, feedVariables, pageInfo, guard, itemCount]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore: pageInfo?.hasNextPage ?? false,
    loading: isFetchingMore,
    onLoadMore: loadMore,
    rootMargin: "1200px",
  });

  const locationLabel =
    selectedWard?.name ??
    selectedSubCounty?.name ??
    selectedCounty?.name ??
    "All Kenya";
  const locationDepth = locationSheetDepth(locationStep);
  const overlayDepth =
    (subcategoryDrawerOpen ? 1 : 0) +
    (sortOpen ? 1 : 0) +
    (filterOpen ? 1 : 0) +
    (picker ? 1 : 0) +
    locationDepth;
  // Count only what lives inside the filter sheet (location + price + negotiable);
  // category and sort have their own controls outside the sheet.
  const hasLocation = Boolean(
    selectedCounty || selectedSubCounty || selectedWard,
  );
  // Everything that narrows the results counts — category too, now that it
  // is chosen in the filters rather than shown as a tab.
  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    (subcategory ? 1 : 0) +
    (selectedType ? 1 : 0) +
    (hasLocation ? 1 : 0) +
    (minPrice.trim() || maxPrice.trim() ? 1 : 0) +
    (negotiableOnly ? 1 : 0) +
    (nearby ? 1 : 0) +
    (postedWithinDays ? 1 : 0) +
    specs.length;
  const subcategoryNarrowingFilterCount = Math.max(
    0,
    activeFilterCount - Number(Boolean(selectedCategory)) - Number(Boolean(subcategory)),
  );
  const matchingResultCount = resultCountData?.discoveryResultCount;
  const activeSortLabel = sortLabel(sort, Boolean(query));
  const resultButtonLabel =
    resultCountLoading && matchingResultCount == null
      ? "Show … results"
      : `Show ${formatResultCount(matchingResultCount ?? 0)} ${
          matchingResultCount === 1 ? "result" : "results"
        }`;

  // Bumped after every history step taken to close a drawer layer. Each layer
  // holds its own history entry, so filters changed inside the drawer were
  // written to that entry's URL — and stepping back to close it restored the
  // older URL without them. Re-running the URL mirror once the step has landed
  // writes them back onto the entry the page is left on.
  const [urlSyncTick, setUrlSyncTick] = useState(0);
  const overlayDepthRef = useRef(overlayDepth);
  const lastPushedOverlayDepthRef = useRef(overlayDepth);
  const ignoredPopStateCountRef = useRef(0);

  useEffect(() => {
    overlayDepthRef.current = overlayDepth;
  }, [overlayDepth]);

  const clearLocation = useCallback(() => {
    setSelectedCounty(null);
    setSelectedSubCounty(null);
    setSelectedWard(null);
  }, []);

  // Clear resets narrowing filters while preserving a scoped category or
  // subcategory. On unscoped Explore it also clears the category selection.
  const clearAllFilters = useDiscoverFiltersStore((s) => s.clearAll);
  const clearFilters = useCallback(() => {
    if (hasCategoryResults) {
      clearNarrowingFilters();
      setSort("RELEVANCE");
      return;
    }
    clearAllFilters();
  }, [clearAllFilters, clearNarrowingFilters, hasCategoryResults, setSort]);

  const clearSearch = useCallback(() => {
    setSearchDraft("");
    setQuery("");
  }, [setSearchDraft]);

  const closeTopOverlayState = useCallback(() => {
    if (subcategoryDrawerOpen) {
      setSubcategoryDrawerOpen(false);
      return;
    }
    if (locationStep === "ward") {
      setLocationStep("subcounty");
      return;
    }
    if (locationStep === "subcounty") {
      setLocationStep("county");
      return;
    }
    if (locationStep === "county") {
      setLocationStep(null);
      return;
    }
    if (picker) {
      setPicker(null);
      return;
    }
    if (filterOpen) {
      setFilterOpen(false);
      return;
    }
    if (sortOpen) setSortOpen(false);
  }, [filterOpen, locationStep, picker, sortOpen, subcategoryDrawerOpen]);

  const closeTopOverlayStateRef = useRef(closeTopOverlayState);

  useEffect(() => {
    closeTopOverlayStateRef.current = closeTopOverlayState;
  }, [closeTopOverlayState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPopState = () => {
      if (ignoredPopStateCountRef.current > 0) {
        ignoredPopStateCountRef.current -= 1;
        setUrlSyncTick((tick) => tick + 1);
        return;
      }

      if (overlayDepthRef.current > 0) {
        closeTopOverlayStateRef.current();
        setUrlSyncTick((tick) => tick + 1);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const previousDepth = lastPushedOverlayDepthRef.current;
    if (overlayDepth > previousDepth) {
      for (let i = 0; i < overlayDepth - previousDepth; i += 1) {
        window.history.pushState({ discoverMobileSheet: true }, "");
      }
    }

    lastPushedOverlayDepthRef.current = overlayDepth;
  }, [overlayDepth]);

  const requestHistoryClose = useCallback((delta = 1) => {
    if (typeof window === "undefined") return;
    ignoredPopStateCountRef.current += 1;
    if (delta > 1) {
      window.history.go(-delta);
      return;
    }
    window.history.back();
  }, []);

  const closeCategoryDrawer = useCallback(() => {
    if (!subcategoryDrawerOpen) return;
    setSubcategoryDrawerOpen(false);
    requestHistoryClose();
  }, [requestHistoryClose, subcategoryDrawerOpen]);

  /**
   * Close the whole filter drawer, whatever view it is on — the drawer, an
   * option list and up to three location steps each hold a history entry, and
   * all of them go at once.
   */
  const closeFilterSheet = useCallback(() => {
    const depth =
      (filterOpen ? 1 : 0) + (picker ? 1 : 0) + locationSheetDepth(locationStep);
    if (depth === 0) return;
    setFilterOpen(false);
    setPicker(null);
    setLocationStep(null);
    setLocationSearch("");
    requestHistoryClose(depth);
  }, [filterOpen, locationStep, picker, requestHistoryClose]);

  const openFilterSheet = useCallback(() => {
    setSortOpen(false);
    setFilterOpen(true);
  }, []);

  const openPicker = useCallback((next: FilterPicker) => {
    setPicker(next);
  }, []);

  const openQuickFilterPicker = useCallback((next: FilterPicker) => {
    setSortOpen(false);
    setFilterOpen(false);
    setPicker(next);
  }, []);

  /** Back from an option list to the field list. */
  const closePicker = useCallback(() => {
    if (!picker) return;
    setPicker(null);
    requestHistoryClose();
  }, [picker, requestHistoryClose]);

  const openSortSheet = useCallback(() => {
    setFilterOpen(false);
    setLocationStep(null);
    setSortOpen(true);
  }, []);

  const closeSortSheet = useCallback(() => {
    if (!sortOpen) return;
    setSortOpen(false);
    requestHistoryClose();
  }, [requestHistoryClose, sortOpen]);

  const openCountySheet = useCallback(() => {
    setSortOpen(false);
    setLocationStep("county");
    setLocationSearch("");
  }, []);

  const handledLocationRequestRef = useRef(requestLocationPicker);
  useEffect(() => {
    if (requestLocationPicker === handledLocationRequestRef.current) return;
    handledLocationRequestRef.current = requestLocationPicker;
    openCountySheet();
  }, [openCountySheet, requestLocationPicker]);

  const collapseLocationSheets = useCallback(() => {
    const depth = locationSheetDepth(locationStep);
    if (depth === 0) return;
    setLocationStep(null);
    requestHistoryClose(depth);
  }, [locationStep, requestHistoryClose]);

  // Tapping a row's name/body only marks it the active choice for the step
  // it's on — it doesn't navigate or close. The sticky footer at the bottom of
  // each step reads whichever selection is currently active and is the one
  // thing that actually applies it and closes the picker. The chevron on a
  // county/subcounty row is the only thing that drills in one level.
  const selectNationwide = useCallback(() => {
    clearLocation();
  }, [clearLocation]);

  const handleCountySelection = useCallback((item: LocationFacet) => {
    setSelectedCounty(item);
    setSelectedSubCounty(null);
    setSelectedWard(null);
  }, []);

  const drillIntoSubcounties = useCallback((item: LocationFacet) => {
    setSelectedCounty(item);
    setSelectedSubCounty(null);
    setSelectedWard(null);
    setLocationStep("subcounty");
    setLocationSearch("");
  }, []);

  const handleSubCountySelection = useCallback((item: LocationFacet) => {
    setSelectedSubCounty(item);
    setSelectedWard(null);
  }, []);

  const drillIntoWards = useCallback((item: LocationFacet) => {
    setSelectedSubCounty(item);
    setSelectedWard(null);
    setLocationStep("ward");
    setLocationSearch("");
  }, []);

  const handleWardSelection = useCallback((item: LocationFacet) => {
    setSelectedWard(item);
  }, []);

  const stepBackLocationSheet = useCallback(() => {
    setLocationSearch("");
    if (locationStep === "ward") {
      setLocationStep("subcounty");
      requestHistoryClose();
      return;
    }
    if (locationStep === "subcounty") {
      setLocationStep("county");
      requestHistoryClose();
      return;
    }
    if (locationStep === "county") {
      setLocationStep(null);
      requestHistoryClose();
    }
  }, [locationStep, requestHistoryClose]);

  const subCountySheetTitle = selectedCounty?.name ?? "Subcounties";
  const wardSheetTitle = selectedSubCounty?.name ?? "Wards";
  const wardSheetSubtitle = selectedSubCounty
    ? `Choose a ward inside ${selectedSubCounty.name}.`
    : "Choose the most precise place for these results.";

  const categories = useMemo(
    () => categoriesData?.discoveryFacets?.categories ?? [],
    [categoriesData?.discoveryFacets?.categories],
  );

  // Deep-link support: /explore?category=<slug> (e.g. from the SideNav Browse
  // list) preselects that category. Applied once per param value — the ref
  // stops it re-asserting after the user clears or switches categories in-page.
  const categoryParam = searchParams.get("category") ?? initialCategorySlug ?? null;
  const appliedCategoryParam = useRef<string | null>(null);
  useEffect(() => {
    if (!categoryParam) {
      appliedCategoryParam.current = null;
      return;
    }
    if (appliedCategoryParam.current === categoryParam) return;
    const match = categories.find(
      (c) => c.slug === categoryParam || c.id === categoryParam,
    );
    // Categories may still be loading — leave the param pending until they
    // arrive; an unknown slug simply never matches and is ignored.
    if (!match) return;
    appliedCategoryParam.current = categoryParam;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCategory(match);
    if (isSubcategoryRoute) {
      // Category changes clear specs in the shared store; restore URL filters
      // when opening a shareable subcategory results route.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpecs(parseSpecParams(searchParams.getAll("spec")));
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSubcategory(searchParams.get("subcategory")?.trim() || null);
    // A deep link means "show me this category" — a leftover search query
    // would hide the category bar and scope results, so clear it.
    setSearchDraft("");
    setQuery("");
  }, [
    categoryParam,
    categories,
    searchParams,
    isSubcategoryRoute,
    setSearchDraft,
    setSelectedCategory,
    setSelectedSubcategory,
    setSpecs,
  ]);

  const appliedSubcategoryRoute = useRef<string | null>(null);
  useEffect(() => {
    if (!initialSubcategorySlug || !selectedCategory || subcategoriesLoading) return;
    if (appliedSubcategoryRoute.current === initialSubcategorySlug) return;
    const match = subcategories.find(
      (item) => slugifyContentTitle(item.name) === initialSubcategorySlug,
    );
    if (!match) return;
    appliedSubcategoryRoute.current = initialSubcategorySlug;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSubcategory(match.name);
  }, [
    initialSubcategorySlug,
    selectedCategory,
    setSelectedSubcategory,
    subcategories,
    subcategoriesLoading,
  ]);

  const counties = useMemo(
    () => locationFacets?.counties ?? [],
    [locationFacets?.counties],
  );
  const subCounties = useMemo(
    () => locationFacets?.subCounties ?? [],
    [locationFacets?.subCounties],
  );
  const wards = useMemo(
    () => locationFacets?.wards ?? [],
    [locationFacets?.wards],
  );
  const nationwideCount = useMemo(
    () => counties.reduce((sum, item) => sum + item.count, 0),
    [counties],
  );

  // Client-side filter for whichever list the location picker is currently
  // showing — the facets are already fully loaded, so there's no round trip.
  const locationSearchTerm = locationSearch.trim().toLowerCase();
  const filteredCounties = useMemo(
    () =>
      locationSearchTerm
        ? counties.filter((item) =>
            item.name.toLowerCase().includes(locationSearchTerm),
          )
        : counties,
    [counties, locationSearchTerm],
  );
  const filteredSubCounties = useMemo(
    () =>
      locationSearchTerm
        ? subCounties.filter((item) =>
            item.name.toLowerCase().includes(locationSearchTerm),
          )
        : subCounties,
    [subCounties, locationSearchTerm],
  );
  const filteredWards = useMemo(
    () =>
      locationSearchTerm
        ? wards.filter((item) =>
            item.name.toLowerCase().includes(locationSearchTerm),
          )
        : wards,
    [wards, locationSearchTerm],
  );

  useEffect(() => {
    if (locationParamsApplied) return;

    const { countyId, subCountyId, wardId } = initialLocationParams.current;
    const county = countyId
      ? counties.find((item) => item.id === countyId || item.slug === countyId)
      : null;
    const subCounty = subCountyId
      ? subCounties.find(
          (item) => item.id === subCountyId || item.slug === subCountyId,
        )
      : null;
    const ward = wardId
      ? wards.find((item) => item.id === wardId || item.slug === wardId)
      : null;

    if (countyId && !county) return;
    if (subCountyId && !subCounty) return;
    if (wardId && !ward) return;

    if (county) setSelectedCounty(county);
    if (subCounty) setSelectedSubCounty(subCounty);
    if (ward) setSelectedWard(ward);
    setLocationParamsApplied(true);
  }, [counties, locationParamsApplied, subCounties, wards]);

  // Keep share/reload-worthy filters in the URL and use Next navigation so
  // other client components (notably the desktop sidebar) see changes.
  useEffect(() => {
    if (categoryParam && appliedCategoryParam.current !== categoryParam) return;
    if (!locationParamsApplied) return;

    // Read the filters from the store as they are NOW, not from this render.
    // On arrival the reset above clears a stale category in the same commit
    // this effect runs in; the render's values still held it, and writing them
    // back into the URL was then picked up as a ?category= deep link and
    // re-selected the old category.
    const live = useDiscoverFiltersStore.getState();
    const params = new URLSearchParams(window.location.search);
    const setOrDelete = (key: string, value: string | null) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };

    setOrDelete("q", query || null);
    setOrDelete(
      "category",
      isSubcategoryRoute ? null : live.selectedCategory?.slug ?? null,
    );
    setOrDelete("type", live.selectedType ?? null);
    setOrDelete(
      "subcategory",
      isSubcategoryRoute ? null : live.selectedSubcategory || null,
    );
    setOrDelete("sort", live.sort === "RELEVANCE" ? null : live.sort);
    setOrDelete("countyId", live.selectedCounty?.id ?? null);
    setOrDelete("subCountyId", live.selectedSubCounty?.id ?? null);
    setOrDelete("wardId", live.selectedWard?.id ?? null);
    setOrDelete("minPrice", live.minPrice.trim() || null);
    setOrDelete("maxPrice", live.maxPrice.trim() || null);
    setOrDelete("negotiable", live.negotiableOnly ? "1" : null);
    params.delete("spec");
    for (const spec of live.specs) params.append("spec", `${spec.key}:${spec.value}`);
    setOrDelete(
      "posted",
      live.postedWithinDays ? String(live.postedWithinDays) : null,
    );

    appliedCategoryParam.current = live.selectedCategory?.slug ?? null;

    const qs = params.toString();
    const next = `${pathname}${qs ? `?${qs}` : ""}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [
    categoryParam,
    isSubcategoryRoute,
    locationParamsApplied,
    maxPrice,
    minPrice,
    negotiableOnly,
    pathname,
    query,
    router,
    selectedCategory,
    selectedCounty,
    selectedSubcategory,
    selectedSubCounty,
    selectedType,
    selectedWard,
    sort,
    specs,
    postedWithinDays,
    urlSyncTick,
  ]);

  // Whether Clear has anything to clear: on a category page the category
  // itself stays, so only what narrows it further counts.
  const canClearFilters =
    (hasCategoryResults
      ? activeFilterCount >
        Number(Boolean(selectedCategory)) + Number(Boolean(subcategory))
      : activeFilterCount > 0) || sort !== "RELEVANCE";

  // The results header: what this page is, and — once anything narrows it —
  // how many posts match and, where the title doesn't say it, where from.
  const resultsTitle = query
    ? `Results for “${query}”`
    : (subcategory ?? selectedCategory?.name ?? initialTitle ?? "All listings");
  const resultsCountText =
    matchingResultCount == null
      ? null
      : `${formatResultCount(matchingResultCount)} ${
          query
            ? matchingResultCount === 1
              ? "result"
              : "results"
            : matchingResultCount === 1
              ? "listing"
              : "listings"
        }`;
  const resultsScope = query
    ? isSubcategoryRoute && subcategory
      ? `in ${subcategory}`
      : null
    : subcategory && selectedCategory
      ? `in ${selectedCategory.name}`
      : null;
  const resultsSubtitle =
    isNarrowed && resultsCountText
      ? [resultsCountText, resultsScope].filter(Boolean).join(" ")
      : null;

  // Not while a deep-linked subcategory is still resolving: its feed query
  // waits for that, so it is neither loading nor holding anything yet.
  const showEmptyState =
    !isReloading && !loading && items.length === 0 && !error;

  const showSubcategorySearch =
    !hasCategoryResults || subcategoryHeaderMode !== "chips";
  const showSubcategoryChips =
    !hasCategoryResults || subcategoryHeaderMode !== "search";
  const showCategoryFilterChips = hasCategoryResults;
  const backToCategories = useCallback(() => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    router.replace(`/${lang}/explore`, { scroll: false });
  }, [lang, router, setSelectedCategory, setSelectedSubcategory]);

  return (
    <div
      className={`min-h-svh bg-app ${isSubcategoryRoute ? "pb-0 md:pb-8" : "pb-24 md:pb-8"}`}
    >
      <div className="mx-auto w-full lg:max-w-390 lg:px-8 lg:pt-4">
        <main className="min-w-0">
          <div
            className="sticky top-0 z-30 grid border-b border-default bg-app [overflow-anchor:none] lg:hidden"
            style={{
              gridTemplateRows:
                showCategoryFilterChips &&
                subcategoryHeaderMode === "expanded"
                  ? "56px auto"
                  : "56px",
            }}
          >
            <motion.div
              initial={false}
              animate={showSubcategorySearch ? "visible" : "hidden"}
              variants={{
                visible: { opacity: 1, y: 0 },
                hidden: { opacity: 0, y: -8 },
              }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              aria-hidden={!showSubcategorySearch}
              style={{ gridArea: "1 / 1" }}
              className={cn(
                "flex items-center overflow-hidden",
                !showSubcategorySearch && "pointer-events-none",
              )}
            >
              <div className="flex w-full min-w-0 items-center gap-2 px-4 lg:px-0">
                {showCategoryFilterChips && subcategoryHeaderMode !== "chips" ? (
                  <button
                    type="button"
                    // Opened straight from a link (Google, WhatsApp) there is
                    // no Categories screen behind it to go back to.
                    onClick={backToCategories}
                    className="-ml-2 -mr-1 grid h-10 w-9 shrink-0 place-items-center rounded-full text-main active:bg-subtle"
                    aria-label="Back to categories"
                  >
                    <ChevronLeft size={22} strokeWidth={2.25} />
                  </button>
                ) : null}
                {/* A filled field, no outline, like the platform's own search
                    bars. 16px text is not a style choice: iOS zooms the page
                    into any focused field set smaller (see globals.css). */}
                <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-transparent bg-subtle pl-3.5 pr-2 transition-colors focus-within:border-primary focus-within:bg-app">
                  <Search size={16} className="shrink-0 text-muted" aria-hidden />
                  <input
                    type="search"
                    enterKeyHint="search"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    // Results already follow the typing; the keyboard's Search
                    // key just puts the keyboard away so they can be seen.
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    // Only a subcategory page searches within itself — anywhere
                    // else a search spans every category (see the debounce).
                    placeholder={
                      isSubcategoryRoute && subcategory
                        ? `Search ${subcategory}`
                        : "Search anything on Shopi"
                    }
                    aria-label="Search listings"
                    className="h-full min-w-0 flex-1 appearance-none bg-transparent text-[16px] leading-5 text-main outline-none text-ellipsis placeholder:!text-[15px] placeholder:text-[rgb(var(--color-text-placeholder))] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                  />
                  {searchDraft ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="grid h-7 w-7 shrink-0 place-items-center"
                      aria-label="Clear search"
                    >
                      <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-muted/50 text-white dark:text-black">
                        <X size={12} strokeWidth={3} aria-hidden />
                      </span>
                    </button>
                  ) : null}
                </div>

                {/* Category pages carry their filters as chips just below;
                    everywhere else this is the way in to them (sort included). */}
                {!showCategoryFilterChips ? (
                  <button
                    type="button"
                    onClick={openFilterSheet}
                    className={cn(
                      "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors active:opacity-70",
                      activeFilterCount > 0
                        ? "bg-primary/10 text-primary"
                        : "bg-subtle text-main",
                    )}
                    aria-label={
                      activeFilterCount > 0
                        ? `Filters, ${activeFilterCount} on`
                        : "Filters"
                    }
                  >
                    <SlidersHorizontal size={18} strokeWidth={2} aria-hidden />
                    {activeFilterCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[rgb(var(--color-bg))] tabular-nums">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </button>
                ) : null}
              </div>
            </motion.div>

            {showCategoryFilterChips ? (
              <div
                aria-hidden={!showSubcategoryChips}
                style={{
                  gridArea:
                    subcategoryHeaderMode === "expanded"
                      ? "2 / 1"
                      : "1 / 1",
                }}
                className={cn(
                  "flex min-w-0 overflow-hidden",
                  subcategoryHeaderMode === "expanded"
                    ? "items-start pb-2.5"
                    : "h-full items-center",
                  !showSubcategoryChips && "pointer-events-none",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center">
                  {subcategoryHeaderMode === "chips" ? (
                    <button
                      type="button"
                      onClick={backToCategories}
                      className="ml-2 grid h-10 w-9 shrink-0 place-items-center rounded-full text-main active:bg-subtle"
                      aria-label="Back to categories"
                    >
                      <ChevronLeft size={22} strokeWidth={2.25} />
                    </button>
                  ) : null}
                  {/* Full-bleed: the chips scroll out to the screen edge
                      instead of being clipped 12px short of it. */}
                  <div
                    ref={subcategoryChipsRef}
                    className={cn(
                      "no-scroll-indicator min-w-0 flex-1 overflow-x-auto pr-4",
                      subcategoryHeaderMode === "chips" ? "pl-1" : "pl-4",
                    )}
                  >
                    <motion.div
                      initial={false}
                      animate={showSubcategoryChips ? "visible" : "hidden"}
                      variants={{
                        visible: { opacity: 1, y: 0 },
                        hidden: { opacity: 0, y: -8 },
                      }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="flex w-max gap-2"
                    >
                    <button
                      type="button"
                      onClick={openFilterSheet}
                      className={cn(
                        FILTER_CHIP_CLASS,
                        subcategoryNarrowingFilterCount > 0
                          ? FILTER_CHIP_ON
                          : FILTER_CHIP_OFF,
                      )}
                    >
                      <SlidersHorizontal size={14} strokeWidth={2.25} aria-hidden />
                      Filters
                      {subcategoryNarrowingFilterCount > 0 ? (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white tabular-nums">
                          {subcategoryNarrowingFilterCount}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={openCountySheet}
                      className={cn(
                        FILTER_CHIP_CLASS,
                        hasLocation ? FILTER_CHIP_ON : FILTER_CHIP_OFF,
                      )}
                    >
                      {hasLocation ? locationLabel : "Region"}
                      <ChevronDown size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => openQuickFilterPicker({ kind: "price" })}
                      className={cn(
                        FILTER_CHIP_CLASS,
                        minPrice.trim() || maxPrice.trim()
                          ? FILTER_CHIP_ON
                          : FILTER_CHIP_OFF,
                      )}
                    >
                      {priceChipLabel(minPrice, maxPrice)}
                      <ChevronDown size={14} aria-hidden />
                    </button>
                    {specFacets.map((facet) => {
                      const selectedValue = specs.find(
                        (spec) => spec.key === facet.key,
                      )?.value;
                      return (
                        <button
                          key={facet.key}
                          type="button"
                          onClick={() =>
                            openQuickFilterPicker({ kind: "spec", key: facet.key })
                          }
                          className={cn(
                            FILTER_CHIP_CLASS,
                            selectedValue ? FILTER_CHIP_ON : FILTER_CHIP_OFF,
                          )}
                        >
                          {selectedValue
                            ? `${facet.label}: ${selectedValue}`
                            : facet.label}
                          <ChevronDown size={14} aria-hidden />
                        </button>
                      );
                    })}
                    </motion.div>
                  </div>
                </div>
              </div>
            ) : null}

          </div>

          <div className="min-w-0">
            {!selectedCategory && !categoryParam && !query ? (
              <ExploreCategoryGrid
                categories={categories}
                loading={categoriesLoading}
                onSelect={openCategorySubcategories}
              />
            ) : null}

            {error && items.length === 0 ? (
              <div className="px-8 pb-16 pt-12 text-center">
                <p className="text-[16px] font-semibold leading-6 text-main">
                  Couldn&apos;t load listings
                </p>
                <p className="mx-auto mt-1 max-w-xs text-[13px] leading-5 text-muted">
                  Check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-5 inline-flex h-10 items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-white active:opacity-80"
                >
                  Try again
                </button>
              </div>
            ) : showEmptyState && query ? null : (
              // Empty, the header keeps only the page's name: "0 listings" and
              // a sort for nothing would repeat what the empty state says.
              <ResultsHeader
                title={resultsTitle}
                subtitle={showEmptyState ? null : resultsSubtitle}
                subtitleLoading={
                  !showEmptyState &&
                  isNarrowed &&
                  resultsSubtitle === null &&
                  resultCountLoading
                }
                sortControl={
                  showEmptyState ? null : isDesktop ? (
                    // On a category page the desktop sidebar has its own sort.
                    hasCategoryResults ? null : (
                      <SortMenu
                        sort={sort}
                        hasQuery={Boolean(query)}
                        onSelect={setSort}
                      />
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={openSortSheet}
                      aria-haspopup="dialog"
                      className={cn(
                        SORT_TRIGGER_CLASS,
                        sort !== "RELEVANCE" ? "text-primary" : "text-main",
                      )}
                    >
                      <ArrowUpDown size={14} aria-hidden />
                      {activeSortLabel}
                    </button>
                  )
                }
              />
            )}

            {/* A full reload (filter/search/sort change) — NOT pagination — is in
              flight. Show only the skeleton; the stale results grid below is
              hidden so we never stack old items under a loader. */}
            {isReloading &&
              (showInitialPosts ? (
                <div className="px-4 pb-6 lg:px-0">
                  <div className={DISCOVER_GRID}>
                    {initialPosts!.map((post, index) => (
                      <DiscoverGridCard
                        key={post.id}
                        post={post}
                        lang={lang}
                        priority={index < 4}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <DiscoverFeedSkeleton />
              ))}

            {showEmptyState ? (
              query ? (
                <EmptyState
                  title={`No results for “${query}”`}
                  body="Check the spelling, or try a shorter or more general word."
                  action={{ label: "Clear search", onClick: clearSearch }}
                />
              ) : canClearFilters ? (
                <EmptyState
                  title="Nothing matches these filters"
                  body="Try removing a filter or widening the area."
                  action={{ label: "Clear filters", onClick: clearFilters }}
                />
              ) : (
                <EmptyState
                  title="No listings here yet"
                  body="New listings are posted every day. Check back soon."
                />
              )
            ) : null}

            {!isReloading && items.length > 0 ? (
              <div className="px-4 pb-6 lg:px-0">
                <div className={DISCOVER_GRID}>
                  {items.map((post, index) => (
                    <DiscoverGridCard
                      key={post.id}
                      post={post}
                      lang={lang}
                      priority={index < 4}
                    />
                  ))}
                </div>

                <div ref={sentinelRef} className="h-2" />

                {isFetchingMore ? (
                  <>
                    <div className="pb-6 pt-3 md:hidden">
                      <DiscoverGridSkeleton rows={1} />
                    </div>
                    <div className="hidden md:block">
                      <FeedLoader />
                    </div>
                  </>
                ) : null}

                {!pageInfo?.hasNextPage ? (
                  <p className="py-8 text-center text-[12px] text-muted">
                    You&apos;ve reached the end
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {(() => {
        // The footer always mirrors the deepest currently-active choice for
        // this step, whether that came from tapping a row on this screen or
        // from the parent step that got you here.
        const countyFooterFacet = selectedCounty;
        const subcountyFooterFacet = selectedSubCounty ?? selectedCounty;
        const wardFooterFacet = selectedWard ?? selectedSubCounty;

        const countySearchEmpty =
          locationSearchTerm.length > 0 && filteredCounties.length === 0;
        const popularCounties = filteredCounties
          .filter((item) => item.count > 0)
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        const otherCounties = filteredCounties
          .filter((item) => item.count === 0)
          .sort((a, b) => a.name.localeCompare(b.name));
        const countiesLoading = counties.length === 0 && locationFacetsLoading;
        const countyBody = (
          <>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto",
                isDesktop ? "px-4 py-4" : "py-0",
              )}
            >
              {isDesktop ? (
                <LocationSearchInput
                  value={locationSearch}
                  onChange={setLocationSearch}
                  placeholder="Search counties"
                />
              ) : null}

              {!locationSearchTerm && isDesktop ? (
                <button
                  type="button"
                  onClick={selectNationwide}
                  disabled={nationwideCount === 0}
                  className={cn(
                    "mb-2 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    !hasLocation
                      ? "border-primary bg-primary/5"
                      : "border-default bg-app",
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-default">
                      All Kenya
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {nationwideCount}{" "}
                      {nationwideCount === 1 ? "item" : "items"} available
                      nationwide
                    </p>
                  </div>
                  {!hasLocation ? (
                    <Check size={18} className="text-primary" />
                  ) : null}
                </button>
              ) : null}

              {!locationSearchTerm && !isDesktop ? (
                <button
                  type="button"
                  onClick={selectNationwide}
                  disabled={nationwideCount === 0}
                  className={cn(
                    "flex min-h-16 w-full items-center justify-between border-b border-default px-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    !hasLocation ? "bg-primary/5" : "bg-app",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="text-[14px] font-medium text-default">
                      All Kenya
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      · {nationwideCount.toLocaleString()} {nationwideCount === 1 ? "ad" : "ads"}
                    </span>
                  </div>
                  {!hasLocation ? (
                    <Check size={17} className="shrink-0 text-primary" />
                  ) : null}
                </button>
              ) : null}

              {countiesLoading ? (
                <DrawerLoadingIndicator className="min-h-[40vh]" />
              ) : isDesktop ? (
                <div className="space-y-2">
                  {countySearchEmpty ? (
                    <p className="rounded-2xl border border-dashed border-default px-4 py-3 text-sm leading-6 text-muted-foreground">
                      {`No counties match "${locationSearch.trim()}".`}
                    </p>
                  ) : (
                    filteredCounties.map((item) => (
                      <LocationOption
                        key={item.id}
                        item={item}
                        active={selectedCounty?.id === item.id}
                        indicator="chevron"
                        onSelect={() => handleCountySelection(item)}
                        onDrillIn={() => drillIntoSubcounties(item)}
                      />
                    ))
                  )}
                </div>
              ) : countySearchEmpty ? (
                <p className="px-4 py-5 text-[13px] text-muted-foreground">
                  {`No counties match "${locationSearch.trim()}".`}
                </p>
              ) : (
                <>
                  {popularCounties.length > 0 ? (
                    <>
                      <div className="bg-elevated px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Popular
                      </div>
                      {popularCounties.map((item) => (
                        <LocationOption
                          key={item.id}
                          item={item}
                          active={selectedCounty?.id === item.id}
                          indicator="chevron"
                          listStyle={!isDesktop}
                          onSelect={() => handleCountySelection(item)}
                          onDrillIn={() => drillIntoSubcounties(item)}
                        />
                      ))}
                    </>
                  ) : null}
                  {otherCounties.length > 0 ? (
                    <>
                      <div className="bg-elevated px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Other
                      </div>
                      {otherCounties.map((item) => (
                        <LocationOption
                          key={item.id}
                          item={item}
                          active={selectedCounty?.id === item.id}
                          indicator="chevron"
                          listStyle={!isDesktop}
                          onSelect={() => handleCountySelection(item)}
                          onDrillIn={() => drillIntoSubcounties(item)}
                        />
                      ))}
                    </>
                  ) : null}
                </>
              )}
            </div>
            <LocationStepFooter
              count={
                countyFooterFacet ? countyFooterFacet.count : nationwideCount
              }
              label={
                countyFooterFacet
                  ? `in ${countyFooterFacet.name}`
                  : "nationwide"
              }
              onConfirm={collapseLocationSheets}
            />
          </>
        );

        // Loading is only trusted as "still fetching" when there's nothing to
        // show yet — a background refetch of an already-populated list (e.g.
        // switching sort) shouldn't flash a skeleton over rows already on screen.
        const subCountiesLoading =
          subCounties.length === 0 && locationFacetsLoading;
        const subcountySearchEmpty =
          !subCountiesLoading &&
          subCounties.length > 0 &&
          locationSearchTerm.length > 0 &&
          filteredSubCounties.length === 0;
        const popularSubCounties = filteredSubCounties
          .filter((item) => item.count > 0)
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        const otherSubCounties = filteredSubCounties
          .filter((item) => item.count === 0)
          .sort((a, b) => a.name.localeCompare(b.name));
        const subcountyBody = (
          <>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto",
                isDesktop ? "px-4 py-4" : "py-0",
              )}
            >
              {isDesktop && (subCounties.length > 0 || subCountiesLoading) ? (
                <LocationSearchInput
                  value={locationSearch}
                  onChange={setLocationSearch}
                  placeholder="Search subcounties"
                />
              ) : null}

              {!locationSearchTerm && !isDesktop && selectedCounty ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubCounty(null);
                    setSelectedWard(null);
                  }}
                  className={cn(
                    "flex min-h-16 w-full items-center justify-between border-b border-default px-4 text-left",
                    !selectedSubCounty ? "bg-primary/5" : "bg-app",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[14px] font-medium text-default">
                      Whole {selectedCounty.name}
                    </span>
                    <span className="shrink-0 text-[12px] text-muted-foreground">
                      · {selectedCounty.count.toLocaleString()} {selectedCounty.count === 1 ? "ad" : "ads"}
                    </span>
                  </span>
                  {!selectedSubCounty ? (
                    <Check size={17} className="shrink-0 text-primary" />
                  ) : null}
                </button>
              ) : null}

              {isDesktop ? (
                <div className="space-y-2">
                  {subCountiesLoading ? (
                    <DrawerLoadingIndicator className="min-h-full" />
                  ) : subCounties.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-default px-4 py-3 text-sm leading-6 text-muted-foreground">
                      No subcounty clusters yet for this county. You can keep
                      the county selection and continue browsing.
                    </p>
                  ) : subcountySearchEmpty ? (
                    <p className="rounded-2xl border border-dashed border-default px-4 py-3 text-sm leading-6 text-muted-foreground">
                      {`No subcounties match "${locationSearch.trim()}".`}
                    </p>
                  ) : (
                    filteredSubCounties.map((item) => (
                      <LocationOption
                        key={item.id}
                        item={item}
                        active={selectedSubCounty?.id === item.id}
                        indicator="chevron"
                        onSelect={() => handleSubCountySelection(item)}
                        onDrillIn={() => drillIntoWards(item)}
                      />
                    ))
                  )}
                </div>
              ) : subCountiesLoading ? (
                <DrawerLoadingIndicator className="min-h-full" />
              ) : subCounties.length === 0 ? (
                <p className="px-4 py-5 text-[13px] text-muted-foreground">
                  No subcounty clusters yet for this county. You can keep the
                  county selection and continue browsing.
                </p>
              ) : subcountySearchEmpty ? (
                <p className="px-4 py-5 text-[13px] text-muted-foreground">
                  {`No subcounties match "${locationSearch.trim()}".`}
                </p>
              ) : (
                <>
                  {popularSubCounties.length > 0 ? (
                    <>
                      <div className="bg-elevated px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Popular
                      </div>
                      {popularSubCounties.map((item) => (
                        <LocationOption
                          key={item.id}
                          item={item}
                          active={selectedSubCounty?.id === item.id}
                          indicator="chevron"
                          listStyle
                          onSelect={() => handleSubCountySelection(item)}
                          onDrillIn={() => drillIntoWards(item)}
                        />
                      ))}
                    </>
                  ) : null}
                  {otherSubCounties.length > 0 ? (
                    <>
                      <div className="bg-elevated px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Other
                      </div>
                      {otherSubCounties.map((item) => (
                        <LocationOption
                          key={item.id}
                          item={item}
                          active={selectedSubCounty?.id === item.id}
                          indicator="chevron"
                          listStyle
                          onSelect={() => handleSubCountySelection(item)}
                          onDrillIn={() => drillIntoWards(item)}
                        />
                      ))}
                    </>
                  ) : null}
                </>
              )}
            </div>
            {subcountyFooterFacet ? (
              <LocationStepFooter
                count={subcountyFooterFacet.count}
                label={`in ${subcountyFooterFacet.name}`}
                onConfirm={collapseLocationSheets}
              />
            ) : null}
          </>
        );

        const wardsLoading = wards.length === 0 && locationFacetsLoading;
        const wardSearchEmpty =
          !wardsLoading &&
          wards.length > 0 &&
          locationSearchTerm.length > 0 &&
          filteredWards.length === 0;
        const wardBody = (
          <>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto",
                isDesktop ? "px-4 py-4" : "py-0",
              )}
            >
              {isDesktop && (wards.length > 0 || wardsLoading) ? (
                <LocationSearchInput
                  value={locationSearch}
                  onChange={setLocationSearch}
                  placeholder="Search wards"
                />
              ) : null}

              <div className="space-y-2">
                {wardsLoading ? (
                  <DrawerLoadingIndicator className="min-h-full" />
                ) : wards.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-default px-4 py-3 text-sm leading-6 text-muted-foreground">
                    Ward-level options will show up here whenever listings are
                    tagged that precisely.
                  </p>
                ) : wardSearchEmpty ? (
                  <p className="rounded-2xl border border-dashed border-default px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {`No wards match "${locationSearch.trim()}".`}
                  </p>
                ) : (
                  filteredWards.map((item) => (
                    <LocationOption
                      key={item.id}
                      item={item}
                      active={selectedWard?.id === item.id}
                      listStyle={!isDesktop}
                      onSelect={() => handleWardSelection(item)}
                    />
                  ))
                )}
              </div>
            </div>
            {wardFooterFacet ? (
              <LocationStepFooter
                count={wardFooterFacet.count}
                label={`in ${wardFooterFacet.name}`}
                onConfirm={collapseLocationSheets}
              />
            ) : null}
          </>
        );

        const countyClearAction = hasLocation ? (
          <button
            type="button"
            onClick={clearLocation}
            className="h-9 shrink-0 rounded-full px-3 text-xs font-semibold text-primary"
          >
            Clear
          </button>
        ) : undefined;

        const locationViews: Record<
          LocationSheetStep,
          { title: string; subtitle: string; action?: ReactNode; body: ReactNode }
        > = {
          county: {
            title: "Choose county",
            subtitle: "Start broad, then drill into the exact place.",
            action: countyClearAction,
            body: countyBody,
          },
          subcounty: {
            title: subCountySheetTitle,
            subtitle: "Pick a subcounty, or keep the whole county selected.",
            body: subcountyBody,
          },
          ward: {
            title: wardSheetTitle,
            subtitle: wardSheetSubtitle,
            body: wardBody,
          },
        };
        const locationView = locationStep ? locationViews[locationStep] : null;

        // Desktop, opened from the sidebar: one centered dialog whose content
        // swaps per step. Escape/backdrop click closes the whole picker; the
        // header's back chevron steps back one level at a time. Opened from
        // the filter drawer (tablet widths), it lives inside the drawer instead.
        const locationDialog = isDesktop ? (
          <Dialog
            open={locationDepth >= 1 && !filterOpen}
            onOpenChange={(open) => {
              if (!open) collapseLocationSheets();
            }}
          >
            <DialogContent className="flex h-[min(80svh,640px)] w-[min(92vw,480px)] max-w-none flex-col gap-0 overflow-hidden rounded-3xl bg-app p-0 [&>button:last-of-type]:hidden">
              {locationView ? (
                <>
                  <LocationSheetHeader
                    title={locationView.title}
                    subtitle={locationView.subtitle}
                    onBack={stepBackLocationSheet}
                    action={locationView.action}
                  />
                  {locationView.body}
                </>
              ) : null}
            </DialogContent>
          </Dialog>
        ) : null;

        // Mobile: ONE bottom drawer. The field list, each field's option list
        // and the county → subcounty → ward steps are views inside it, so
        // nothing stacks on top of anything — back steps between views, and
        // swiping down closes the lot.
        const drawerOpen =
          filterOpen ||
          picker != null ||
          (!isDesktop && locationDepth >= 1);
        let drawerView: ReactNode;
        if (locationView) {
          drawerView = (
            <>
              {isDesktop ? (
                <LocationSheetHeader
                  title={locationView.title}
                  subtitle={locationView.subtitle}
                  onBack={stepBackLocationSheet}
                  action={locationView.action}
                />
              ) : (
                <MobileLocationSearchHeader
                  title={locationView.title}
                  value={locationSearch}
                  onChange={setLocationSearch}
                  placeholder={
                    locationStep === "county"
                      ? "Find a county..."
                      : locationStep === "subcounty"
                        ? "Find a subcounty..."
                        : "Find a ward..."
                  }
                  onBack={stepBackLocationSheet}
                />
              )}
              {locationView.body}
            </>
          );
        } else if (picker) {
          drawerView = (
            <FilterPickerView
              picker={picker}
              categories={categories}
              selectedCategory={selectedCategory}
              subcategories={subcategories}
              selectedSubcategory={subcategory}
              specFacets={specFacets}
              specs={specs}
              sort={sort}
              relevanceLabel={sortLabel("RELEVANCE", Boolean(query))}
              postedWithinDays={postedWithinDays}
              onBack={closePicker}
              onPickPosted={(days) => {
                setPostedWithinDays(days);
                closePicker();
              }}
              onPickCategory={(next) => {
                selectCategory(next);
                closePicker();
              }}
              onPickSubcategory={(next) => {
                setSelectedSubcategory(next);
                closePicker();
              }}
              onPickSpec={(key, value) => {
                setSpec(key, value);
                closePicker();
              }}
              onPickSort={(next) => {
                setSort(next);
                closePicker();
              }}
            />
          );
        } else {
          drawerView = (
            <FilterFieldList
              // On Explore the round category shortcuts above the listings
              // are where a category is picked, so the sheet doesn't repeat
              // them. Search results hide those shortcuts; there the field is
              // the only way to narrow a search to one category.
              categoryLabel={
                isSubcategoryRoute || selectedCategory || !query
                  ? null
                  : "All categories"
              }
              subcategoryLabel={null}
              regionLabel={locationLabel}
              sortLabel={activeSortLabel}
              sortActive={sort !== "RELEVANCE"}
              minPrice={minPrice}
              maxPrice={maxPrice}
              postedLabel={postedWithinLabel(postedWithinDays)}
              specFacets={specFacets}
              specFacetsLoading={
                specFacetsLoading && specFacets.length === 0 && Boolean(selectedCategory || subcategory)
              }
              specs={specs}
              negotiableOnly={negotiableOnly}
              onNegotiableOnly={setNegotiableOnly}
              onOpenPicker={openPicker}
              onOpenRegion={openCountySheet}
              onOpenSort={() => openPicker({ kind: "sort" })}
              onClearLocation={clearLocation}
              onClearSort={() => setSort("RELEVANCE")}
              onClearPrice={() => {
                setMinPrice("");
                setMaxPrice("");
              }}
              onClearPosted={() => setPostedWithinDays(null)}
              onClearSpec={(key) => setSpec(key, null)}
              onClose={closeFilterSheet}
              onClear={clearFilters}
              canClear={canClearFilters}
              resultLabel={resultButtonLabel}
            />
          );
        }

        return (
          <>
            {locationDialog}
            <Drawer
              open={drawerOpen}
              onOpenChange={(open) => {
                if (!open) closeFilterSheet();
              }}
            >
              <DrawerContent className="mx-auto h-[88svh] w-full max-w-107.5 bg-app">
                <div className="flex min-h-0 flex-1 flex-col">{drawerView}</div>
              </DrawerContent>
            </Drawer>
          </>
        );
      })()}

      <Drawer
        open={subcategoryDrawerOpen}
        onOpenChange={(open) => {
          if (open) setSubcategoryDrawerOpen(true);
          else closeCategoryDrawer();
        }}
      >
        {/* Sized to its rows: three subcategories used to sit at the top of
            a sheet fixed at 85% of the screen, the rest of it blank. */}
        <DrawerContent className="mx-auto flex max-h-[85svh] w-full max-w-107.5 flex-col bg-app">
          <DrawerHeader className="shrink-0 px-5 pb-2 pt-3 text-left sm:text-left">
            <DrawerTitle className="truncate text-[16px] font-semibold leading-6 text-main">
              {drawerCategory?.name ?? "Categories"}
            </DrawerTitle>
            <DrawerDescription className="text-[12px] leading-4 text-muted">
              Pick a subcategory, or see everything
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            {subcategoriesLoading ? (
              <DrawerLoadingIndicator className="min-h-48" />
            ) : drawerCategory ? (
              <div className="flex flex-col">
                <CategoryDrawerRow
                  label={`All ${drawerCategory.name}`}
                  count={drawerCategory.count}
                  onClick={selectAllCategoryAndNavigate}
                  emphasis
                />
                {subcategories.length > 0 ? (
                  <div className="mx-3 my-1 border-t border-border" aria-hidden />
                ) : null}
                {subcategories.map((subcategory) => (
                  <CategoryDrawerRow
                    key={subcategory.name}
                    label={subcategory.name}
                    count={subcategory.count}
                    onClick={() => selectSubcategoryAndNavigate(subcategory.name)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={sortOpen}
        onOpenChange={(open) => {
          if (open) {
            openSortSheet();
            return;
          }
          if (sortOpen) closeSortSheet();
        }}
      >
        {/* The same bar and rows as Sort by inside Filters, so sorting looks
            the same whichever way it was opened. */}
        <DrawerContent className="mx-auto max-w-107.5 bg-app">
          <SheetTitleBar
            title="Sort by"
            closeLabel="Close sort"
            onClose={closeSortSheet}
          />
          <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            {SORT_OPTIONS.map((option) => (
              <PickerOptionRow
                key={option.value}
                label={
                  option.value === "RELEVANCE"
                    ? sortLabel("RELEVANCE", Boolean(query))
                    : option.label
                }
                active={sort === option.value}
                onClick={() => {
                  setSort(option.value);
                  closeSortSheet();
                }}
              />
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
