"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  MapPin,
  Search,
  Store as StoreIcon,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import {
  FOLLOWED_STORE_IDS_QUERY,
  STORES_QUERY,
  type StoreCard,
  type StoreDirectoryPage,
  type StoreSort,
} from "@/features/stores/queries/stores";
import {
  StoreTile,
  STORE_GRID_CLASS,
} from "@/features/stores/components/StoreTile";
import { useInfiniteScroll } from "@/features/feed/hooks/useInfiniteScroll";
import { usePaginationGuard } from "@/features/feed/hooks/useFeed";

/**
 * The Stores directory.
 *
 * Every seller already has a storefront at /{lang}/@{username}; this page is
 * the index of them, ranked by the stock actually behind each one. It exists
 * because browsing by shop is a different intent from browsing by product — you
 * come here to find someone to buy from repeatedly, not to find one item.
 *
 * The title block scrolls away but the filter bar sticks, because the directory
 * runs to many screens and a filter you have to scroll back up to reach is a
 * filter people stop using.
 *
 * The first page is rendered on the server (see the route), so the grid is
 * painted and crawlable before hydration; everything after that is client-side.
 */

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

const SORTS: Array<{ value: StoreSort; label: string }> = [
  { value: "LISTINGS", label: "Most stock" },
  { value: "RECENT", label: "Recently active" },
  { value: "POPULAR", label: "Most viewed" },
];

const ALL_COUNTIES = "__all__";

export type StoresPageProps = {
  lang: string;
  counties: string[];
  initialPage: StoreDirectoryPage;
  initialFilters: {
    search?: string;
    county?: string;
    sort: StoreSort;
    verifiedOnly?: boolean;
  };
};

/** A filter that is currently narrowing the grid, with the way to undo it. */
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1.5 text-[12px] font-semibold text-primary-strong dark:text-primary">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter: ${label}`}
        className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-primary/20"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/**
 * One pill in the phone's filter row. Sort, Verified and County all share it,
 * so the row reads as one set of choices rather than three kinds of control.
 */
function MobileChip({
  active,
  onClick,
  children,
  ...rest
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold transition-colors active:opacity-70",
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-app text-main",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * The county picker on a phone. A Select's floating list of 47 names is a
 * small target to scroll with a thumb; a bottom sheet with its own search
 * gets there in a couple of letters.
 */
function CountySheet({
  open,
  onOpenChange,
  counties,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counties: string[];
  value: string;
  onChange: (county: string) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? counties.filter((name) => name.toLowerCase().includes(needle))
    : counties;

  function choose(county: string) {
    onChange(county);
    onOpenChange(false);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
    >
      <DrawerContent className="flex max-h-[85dvh] flex-col">
        <DrawerHeader className="shrink-0 px-4 pb-2 pt-2 text-left">
          <DrawerTitle className="text-base font-bold text-main">
            Choose a county
          </DrawerTitle>
        </DrawerHeader>

        <div className="shrink-0 px-4 pb-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            {/* 16px text: anything smaller and iOS zooms the page on focus. */}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search counties"
              aria-label="Search counties"
              className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-3 text-base text-main outline-none placeholder:text-muted focus:border-primary"
            />
          </div>
        </div>

        <div
          role="listbox"
          aria-label="Counties"
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {needle ? null : (
            <CountyOption
              label="All counties"
              selected={!value}
              onSelect={() => choose("")}
            />
          )}
          {matches.map((name) => (
            <CountyOption
              key={name}
              label={name}
              selected={value === name}
              onSelect={() => choose(name)}
            />
          ))}
          {matches.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No county matches “{query.trim()}”
            </p>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function CountyOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "flex h-12 w-full items-center justify-between text-left text-[15px] active:opacity-60",
        selected ? "font-semibold text-primary" : "text-main",
      )}
    >
      {label}
      {selected ? <Check className="h-4.5 w-4.5 shrink-0" aria-hidden /> : null}
    </button>
  );
}

// Same anatomy as StoreTile's two layouts, so tiles land without shifting.
function StoreTileSkeleton() {
  return (
    <>
      <div className="rounded-2xl border border-border bg-elevated p-3 md:hidden">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-2.5 h-3.5 w-4/5" />
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-lg" />
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <StoreTileSkeletonDesktop />
    </>
  );
}

function StoreTileSkeletonDesktop() {
  return (
    <div className="hidden flex-col overflow-hidden rounded-2xl border border-border bg-elevated md:flex">
      <Skeleton className="aspect-3/2 w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start gap-2.5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <div className="mt-1 flex items-center gap-2">
          <Skeleton className="h-8 flex-1 rounded-full" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function StoresPage({
  lang,
  counties,
  initialPage,
  initialFilters,
}: StoresPageProps) {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState(initialFilters.search ?? "");
  const [search, setSearch] = useState(initialFilters.search ?? "");
  const [county, setCounty] = useState(initialFilters.county ?? "");
  const [sort, setSort] = useState<StoreSort>(initialFilters.sort);
  const [verifiedOnly, setVerifiedOnly] = useState(
    initialFilters.verifiedOnly ?? false,
  );

  // Typing shouldn't fire a grouped aggregation on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Keep the URL in step with the filters so a filtered directory can be
  // shared and reopened. Replace, not push: filters aren't history steps.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (county) params.set("county", county);
    if (sort !== "LISTINGS") params.set("sort", sort);
    if (verifiedOnly) params.set("verified", "1");
    const qs = params.toString();
    router.replace(`/${lang}/stores${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [lang, search, county, sort, verifiedOnly, router]);

  const variables = useMemo(
    () => ({
      input: {
        search: search || undefined,
        county: county || undefined,
        sort,
        verifiedOnly: verifiedOnly || undefined,
        limit: PAGE_SIZE,
      },
    }),
    [search, county, sort, verifiedOnly],
  );

  const isInitialFilters =
    search === (initialFilters.search ?? "") &&
    county === (initialFilters.county ?? "") &&
    sort === initialFilters.sort &&
    verifiedOnly === (initialFilters.verifiedOnly ?? false);

  const { data, loading, fetchMore } = useQuery(STORES_QUERY, {
    variables,
    // Serve the server-rendered page from cache and revalidate behind it, so
    // changing a filter never blanks the grid that is already on screen.
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
  });

  const fetched = (data as { stores?: StoreDirectoryPage } | undefined)?.stores;
  const page: StoreDirectoryPage =
    fetched ??
    (isInitialFilters ? initialPage : { stores: [], total: 0, hasMore: false });

  const itemCount = page.stores.length;
  const guard = usePaginationGuard(itemCount);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = useCallback(() => {
    if (loadingMore || !page.hasMore || !page.nextCursor) return;
    const cursor = page.nextCursor;
    guard(cursor, itemCount, () => {
      setLoadingMore(true);
      return fetchMore({
        variables: { input: { ...variables.input, after: cursor } },
        // Append rather than replace. Cursor windows can still overlap if the
        // directory is reordered while you're reading, so ids already on screen
        // are dropped instead of rendering a duplicate card.
        updateQuery: (previous, { fetchMoreResult }) => {
          const prev = (previous as { stores?: StoreDirectoryPage }).stores;
          const next = (fetchMoreResult as { stores?: StoreDirectoryPage }).stores;
          if (!next) return previous;
          if (!prev) return fetchMoreResult;

          const seen = new Set(prev.stores.map((store: StoreCard) => store.id));
          return {
            stores: {
              ...next,
              stores: [
                ...prev.stores,
                ...next.stores.filter((store: StoreCard) => !seen.has(store.id)),
              ],
            },
          };
        },
      }).finally(() => setLoadingMore(false));
    });
  }, [
    fetchMore,
    guard,
    itemCount,
    loadingMore,
    page.hasMore,
    page.nextCursor,
    variables.input,
  ]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore: page.hasMore,
    loading: loadingMore,
    onLoadMore: loadMore,
    rootMargin: "1200px",
  });

  // Follow state is per-viewer, so it can't ride along in the directory's
  // shared cached payload — it comes back on its own, for exactly the sellers
  // currently on screen, and is merged in below.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const visibleIds = useMemo(
    () => page.stores.map((store) => store.id),
    [page.stores],
  );
  const { data: followData } = useQuery(FOLLOWED_STORE_IDS_QUERY, {
    variables: { userIds: visibleIds },
    skip: !isAuthenticated || visibleIds.length === 0,
    fetchPolicy: "cache-and-network",
  });
  const followedIds = useMemo(() => {
    const ids = (followData as { followedUserIds?: string[] } | undefined)
      ?.followedUserIds;
    return new Set(ids ?? []);
  }, [followData]);

  const clearAll = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setCounty("");
    setVerifiedOnly(false);
  }, []);

  const hasFilters = Boolean(search || county || verifiedOnly);
  const [countySheetOpen, setCountySheetOpen] = useState(false);
  const showSkeletons = loading && page.stores.length === 0;

  return (
    <div className="min-h-svh bg-app pb-24 md:pb-12">
      <header className="mx-auto w-full max-w-360 px-4 pt-4 pb-3 md:pt-6 md:pb-5 xl:px-8">
        <h1 className="flex items-baseline gap-2 text-xl font-bold text-main md:text-2xl xl:text-3xl">
          Stores
          {/* The live total sits with the title rather than on its own line
              above the grid — the active-filter chips already say what is
              narrowing it, so the number only needed saying once. */}
          <span className="text-base font-semibold text-muted md:text-lg xl:text-xl" aria-live="polite">
            · {page.total.toLocaleString("en-KE")}
          </span>
        </h1>
        <p className="mt-0.5 text-[13px] text-muted md:hidden">
          Browse sellers across Kenya
        </p>
        <p className="mt-1.5 hidden max-w-2xl text-sm text-muted md:block">
          Browse sellers across Kenya. Stock, reach and activity on every card
          are counted live from public listings.
        </p>
      </header>

      {/* Sticky below the desktop top nav, at the viewport edge on mobile —
          the same offset the feed and profile headers use. */}
      <div className="sticky top-0 z-20 border-y border-border bg-app/94 backdrop-blur-md md:top-(--desktop-top-nav-height,68px)">
        {/* Phone: search on top, every other filter one swipeable row of chips
            under it. Two short rows instead of three tall ones, so the sticky
            bar leaves the screen to the stores. */}
        <div className="flex flex-col gap-2.5 py-2.5 md:hidden">
          <div className="relative px-4">
            <Search
              className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            {/* 16px text: anything smaller and iOS zooms the page on focus. */}
            <input
              type="search"
              enterKeyHint="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search stores or @handle"
              aria-label="Search stores"
              className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-10 text-base text-main outline-none placeholder:text-muted focus:border-primary [&::-webkit-search-cancel-button]:hidden"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
                className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted active:bg-subtle"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div
            role="group"
            aria-label="Sort and filter stores"
            className="no-scroll-indicator flex items-center gap-2 overflow-x-auto px-4"
          >
            {/* Filters lead so an active one is always on screen; the sort,
                which always has a value, can sit past the fold. */}
            {hasFilters ? (
              <button
                type="button"
                onClick={clearAll}
                aria-label="Clear all filters"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-app text-main active:opacity-60"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}

            <MobileChip
              active={verifiedOnly}
              aria-pressed={verifiedOnly}
              onClick={() => setVerifiedOnly((on) => !on)}
            >
              <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden />
              Verified
            </MobileChip>

            {counties.length > 0 ? (
              <MobileChip
                active={Boolean(county)}
                aria-haspopup="dialog"
                onClick={() => setCountySheetOpen(true)}
              >
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                {county || "County"}
                <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </MobileChip>
            ) : null}

            <span className="h-5 w-px shrink-0 bg-border" aria-hidden />

            {SORTS.map((option) => (
              <MobileChip
                key={option.value}
                active={sort === option.value}
                aria-pressed={sort === option.value}
                onClick={() => setSort(option.value)}
              >
                {option.label}
              </MobileChip>
            ))}
          </div>
        </div>

        <div className="mx-auto hidden w-full max-w-360 flex-col gap-2.5 px-4 py-3 md:flex lg:flex-row lg:items-center xl:px-8">
          <div className="relative min-w-0 flex-1 lg:max-w-88">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search stores by name or @handle"
              aria-label="Search stores"
              className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-9 text-sm text-main outline-none placeholder:text-muted focus:border-primary"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-main"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {counties.length > 0 ? (
              <Select
                value={county || ALL_COUNTIES}
                onValueChange={(value) =>
                  setCounty(value === ALL_COUNTIES ? "" : value)
                }
              >
                <SelectTrigger
                  className="h-10 min-w-0 flex-1 rounded-full lg:w-52 lg:flex-none"
                  aria-label="Filter by county"
                >
                  <SelectValue placeholder="All counties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_COUNTIES}>All counties</SelectItem>
                  {counties.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {/* The API has always supported this filter; until now there was no
                way to ask for it. Trust is the reason people browse by shop. */}
            <button
              type="button"
              onClick={() => setVerifiedOnly((on) => !on)}
              aria-pressed={verifiedOnly}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                verifiedOnly
                  ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                  : "border-border bg-surface text-main hover:bg-subtle",
              )}
            >
              <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden />
              Verified
            </button>
          </div>

          <div
            role="group"
            aria-label="Sort stores"
            className="flex shrink-0 items-center gap-1 rounded-full bg-surface p-1 lg:ml-auto"
          >
            {SORTS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={sort === option.value}
                onClick={() => setSort(option.value)}
                className={cn(
                  "inline-flex h-8 flex-1 items-center justify-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold transition-colors lg:flex-none",
                  sort === option.value
                    ? "bg-primary text-white"
                    : "text-muted hover:text-main",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-360 px-4 pt-3 md:pt-5 xl:px-8">
        {/* On a phone the chip row above already shows every active filter
            and carries its own Clear, so this summary is desktop's alone. */}
        {hasFilters ? (
          <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
            {search ? (
              <FilterChip
                label={`“${search}”`}
                onClear={() => {
                  setSearchInput("");
                  setSearch("");
                }}
              />
            ) : null}
            {county ? (
              <FilterChip label={county} onClear={() => setCounty("")} />
            ) : null}
            {verifiedOnly ? (
              <FilterChip
                label="Verified only"
                onClear={() => setVerifiedOnly(false)}
              />
            ) : null}
            <button
              type="button"
              onClick={clearAll}
              className="text-[12px] font-semibold text-muted underline underline-offset-2 transition-colors hover:text-main"
            >
              Clear all
            </button>
          </div>
        ) : null}

        {showSkeletons ? (
          <div className={STORE_GRID_CLASS}>
            {Array.from({ length: 12 }).map((_, index) => (
              <StoreTileSkeleton key={index} />
            ))}
          </div>
        ) : page.stores.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center md:py-20">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
              <StoreIcon className="h-5 w-5 text-muted" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-semibold text-main">
              No stores match that
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              Try a different county, or drop the search and browse everyone.
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearAll}
                className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className={STORE_GRID_CLASS}>
              {page.stores.map((store) => (
                <StoreTile
                  key={store.id}
                  lang={lang}
                  store={store}
                  isFollowed={followedIds.has(store.id)}
                />
              ))}
            </div>

            <div ref={sentinelRef} className="h-1" aria-hidden />
            {loadingMore ? (
              <div className="mt-6 flex justify-center">
                <div className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-elevated px-6 text-[13px] font-bold text-muted">
                  Loading...
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <CountySheet
        open={countySheetOpen}
        onOpenChange={setCountySheetOpen}
        counties={counties}
        value={county}
        onChange={setCounty}
      />
    </div>
  );
}
