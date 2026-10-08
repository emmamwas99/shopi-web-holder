"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useQuery } from "@apollo/client/react";
import { useUnreadMessageCount } from "@/features/messaging/hooks/useUnreadCount";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/useUnreadNotificationCount";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { DISCOVERY_CATEGORIES } from "@/features/discover/categories";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useDiscoverFiltersStore } from "@/stores/discoverFilters";
import {
  DistanceFilter,
  POSTED_WITHIN_OPTIONS,
  PriceRangeFields,
} from "@/features/discover/components/DiscoverFilterControls";
import { useSearchStore } from "@/stores/search";
import { useThemeStore } from "@/stores/theme";
import { useNavTabHref } from "@/lib/navTabMemory";
import { Logo } from "@/components/ui/Logo";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { NavSearchDropdown } from "@/components/layout/NavSearchDropdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function SideNav({ lang = "en" }: { lang: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop({ ssrDefault: false });
  const { user } = useAuthSession();
  // Two icons, two counts. The combined total that BottomNav uses is right for
  // the phone, where Messages and Notifications share one Inbox tab — here they
  // are separate buttons, so a combined badge on one of them counts things that
  // button doesn't open.
  const unreadMessages = useUnreadMessageCount();
  const unreadNotifications = useUnreadNotificationCount();
  // The tabs return to the screen they were left on (sub-tab, search,
  // filters); RouteScrollRestoration restores the scroll to match.
  const feedHref = useNavTabHref("feed", `/${lang}/for-you`);
  const browseHref = useNavTabHref("explore", `/${lang}/explore`);
  const storesHref = useNavTabHref("stores", `/${lang}/stores`);

  if (
    pathname.includes("/upload/create") ||
    pathname.includes("/upload/tiktok")
  ) {
    return null;
  }

  const displayName =
    user?.profile?.firstName ||
    user?.email?.split("@")[0] ||
    (user ? "Seller" : "Guest");
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "S";
  const homeActive =
    pathname === `/${lang}` || pathname.startsWith(`/${lang}/for-you`);
  const browseActive =
    pathname.startsWith(`/${lang}/explore`) ||
    pathname.startsWith(`/${lang}/search`);
  const storesActive = pathname.startsWith(`/${lang}/stores`);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 hidden h-(--desktop-top-nav-height,68px) border-b border-border bg-elevated/95 backdrop-blur md:block">
        <div className="flex h-full items-center">
          {/* The logo sits in its own column, the same width and padding as the
              side rail below it (w-(--side-nav-width) px-6), so it lines up
              over "Hi {name}!" and everything after it begins exactly on the
              main content's left edge — MainShell offsets that content by the
              same variable. A plain shrink-0 logo left the nav starting at
              whatever the wordmark happened to measure, which is what put it
              out of line with the column below. */}
          <Link
            href={`/${lang}?view=home`}
            className="flex h-full w-(--side-nav-width,280px) shrink-0 items-center px-6"
            aria-label="Shopi home"
          >
            {/* The full lockup, so the wordmark is the real artwork rather than
                live text set beside the badge.

                The artwork is 358 x 98.06 and its badge is 96 of that height,
                so `size` 60 paints the box 43px tall — a 42px badge, the same
                as the mark-only logo had here — and 157px wide, well inside the
                232px this column leaves after its padding. */}
            <Logo variant="lockup" size={60} />
          </Link>

          {/* Everything right of the logo column. The gap and the right padding
              live here rather than on the row, so no gap is inserted before
              this group and it starts flush on the 280px column edge. */}
          <div className="flex h-full min-w-0 flex-1 items-center gap-5 pr-6">
            <nav className="flex shrink-0 items-center gap-1 text-[13px] font-bold">
              <TopNavLink href={feedHref} navTab="feed" active={homeActive}>
                For You
              </TopNavLink>
              <TopNavLink
                href={browseHref}
                navTab="explore"
                active={browseActive}
              >
                Browse
              </TopNavLink>
              {/* Desktop only, deliberately. This whole header is `hidden
                  md:block`, and Stores is not added to BottomNav: the phone bar
                  is five tabs of things you do (feed, search, post, inbox,
                  profile), and browsing shops is a lean-back desktop intent that
                  would push that bar to six. Sellers are still reachable on a
                  phone from any listing's seller row. */}
              <TopNavLink
                href={storesHref}
                navTab="stores"
                active={storesActive}
              >
                Stores
              </TopNavLink>
            </nav>

            {/* The wrapper keeps the flex-1 slot at every width even though the
              field itself only appears at lg. Below lg DiscoverPage renders its
              own sticky search bar, so showing this one too would put two
              search boxes on /explore and /search — the thing it replaced. The
              slot still has to grow, or the whole right-hand cluster collapses
                  back against the Browse link. */}
            <div className="flex min-w-0 flex-1 items-center">
              <NavSearch lang={lang} className="hidden w-full lg:flex" />
            </div>

            {/* Present on every desktop route, the feed included. Posting is
                the one action the whole app exists for, and hiding it on the
                busiest page meant the nav changed shape as you moved around. */}
            <Link
              href={`/${lang}/upload`}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-surface px-4 text-[13px] font-bold text-main transition-colors hover:bg-subtle"
            >
              Sell item
            </Link>

            <div className="flex items-center gap-0.5">
              {/* Messages/Inbox/Saved all need an account behind them — for a
                  signed-out visitor they're dead ends that just bounce to
                  login, so skip straight to the one control that applies:
                  the log in button below. */}
              {user ? (
                <>
                  {/* Both buttons land on the same screen, so "which tab is
                      open" has to be read the way that screen reads it: it
                      defaults to Messages and only shows Notifications on an
                      explicit ?tab=notifications. Testing for `!== "messages"`
                      lit the bell on a bare /notifications, which is the
                      Messages tab. */}
                  <IconNavButton
                    href={`/${lang}/notifications?tab=messages`}
                    label="Messages"
                    active={
                      pathname.startsWith(`/${lang}/notifications`) &&
                      searchParams.get("tab") !== "notifications"
                    }
                  >
                    <MessageCircle className="h-4.5 w-4.5" />
                    {unreadMessages > 0 ? (
                      <UnreadDot count={unreadMessages} />
                    ) : null}
                  </IconNavButton>
                  <IconNavButton
                    href={`/${lang}/notifications?tab=notifications`}
                    label="Notifications"
                    active={
                      pathname.startsWith(`/${lang}/notifications`) &&
                      searchParams.get("tab") === "notifications"
                    }
                  >
                    <Bell className="h-4.5 w-4.5" />
                    {unreadNotifications > 0 ? (
                      <UnreadDot count={unreadNotifications} />
                    ) : null}
                  </IconNavButton>
                  <IconNavButton
                    href={`/${lang}/profile?tab=saved`}
                    label="Saved"
                    active={
                      pathname.startsWith(`/${lang}/profile`) &&
                      searchParams.get("tab") === "saved"
                    }
                  >
                    <Heart className="h-4.5 w-4.5" />
                  </IconNavButton>
                </>
              ) : null}
              <ThemeIconButton />
            </div>

            {user ? (
              <AccountMenu
                lang={lang}
                displayName={displayName}
                email={user.email}
                initials={initials}
              />
            ) : (
              <Link
                href={`/${lang}/auth/login`}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-primary px-4 text-[13px] font-bold text-white transition-colors hover:opacity-90"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-(--desktop-top-nav-height,68px) z-40 hidden w-(--side-nav-width,280px) flex-col border-r border-border bg-elevated px-6 py-6 md:flex">
        <div className="border-b border-border pb-4">
          <h2 className="text-base font-black tracking-normal text-main">
            Hi {displayName}!
          </h2>
        </div>

        {isDesktop ? <BrowseCategories lang={lang} /> : null}
      </aside>
    </>
  );
}

/**
 * The app's one desktop search box. On /explore and /search it is a live
 * control: it writes straight into the shared draft (stores/search.ts) that
 * DiscoverPage debounces into a query, so typing filters results in place,
 * exactly as the in-page box it replaced did.
 *
 * Everywhere else nothing is listening to that draft, so submitting navigates
 * to /search?q=… and DiscoverPage seeds itself from the param on mount.
 */
function NavSearch({ lang, className }: { lang: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const draft = useSearchStore((s) => s.draft);
  const setDraft = useSearchStore((s) => s.setDraft);
  const formRef = useRef<HTMLFormElement>(null);
  const [focused, setFocused] = useState(false);

  const isDiscoverRoute =
    pathname.startsWith(`/${lang}/explore`) ||
    pathname.startsWith(`/${lang}/search`);

  // Leaving the discover pages drops the term, so the box is not still holding
  // last visit's search when it reappears over the feed. On the discover pages
  // DiscoverPage owns the seeding instead, including from a ?q= deep link.
  useEffect(() => {
    if (!isDiscoverRoute) setDraft("");
  }, [isDiscoverRoute, setDraft]);

  // A click anywhere outside the search box dismisses the results preview.
  // `mousedown` (not `click`) so it fires before a result's own click handler
  // would otherwise be raced by React re-rendering the input away.
  useEffect(() => {
    if (!focused) return;
    function onPointerDown(event: MouseEvent) {
      if (!formRef.current?.contains(event.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [focused]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const term = draft.trim();
    // On a discover route the store already filtered as they typed, so there is
    // nothing left to do and navigating would only throw away scroll position.
    if (isDiscoverRoute) return;
    // /explore, not /search — same DiscoverPage UI either way, but landing on
    // Browse (with its category rail and filters) reads as one continuous
    // place to search from, rather than bouncing to a separate results route.
    router.push(
      term
        ? `/${lang}/explore?q=${encodeURIComponent(term)}`
        : `/${lang}/explore`,
    );
  }

  return (
    <form
      ref={formRef}
      role="search"
      onSubmit={submit}
      className={[
        "relative",
        // Hairline border over the nav's own surface rather than a grey fill,
        // so it reads as an outline rather than a well. No inset shadow, for
        // the same reason. Height is a touch over the reference's ~34px.
        "h-9.5 min-w-0 items-center gap-2.5 rounded-full border border-border bg-transparent px-4 transition-colors focus-within:border-border-strong hover:border-border-strong",
        className ?? "flex",
      ].join(" ")}
    >
      <Search className="h-4.25 w-4.25 shrink-0 text-muted" aria-hidden />
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="Search anything on Shopi"
        aria-label="Search Shopi"
        // Safari paints its own clear affordance on type=search, which would
        // sit next to ours.
        className="min-w-0 flex-1 bg-transparent placeholder:text-xs text-sm font-medium text-default outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => setDraft("")}
          className="shrink-0 text-muted transition-colors hover:text-default"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {/* Live results preview — everywhere except the discover pages, which
          already filter their own grid inline as you type. Lets a search
          started from, say, /notifications land straight on a listing's PDP
          instead of forcing a detour through /explore first. */}
      {!isDiscoverRoute && focused && draft.trim() ? (
        <NavSearchDropdown
          lang={lang}
          term={draft}
          onNavigate={() => setFocused(false)}
        />
      ) : null}
    </form>
  );
}

function TopNavLink({
  href,
  navTab,
  active,
  children,
}: {
  href: string;
  /** Which tab this is — see `data-nav-tab` in lib/scrollRestoration.ts. */
  navTab: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      data-nav-tab={navTab}
      className={[
        "inline-flex h-8 min-w-20 items-center justify-center rounded-full px-4 transition-colors",
        active ? "bg-primary text-white" : "text-main hover:bg-surface",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function IconNavButton({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      // Shortcuts to one exact screen (a specific inbox tab, Saved): arriving
      // returns to where that screen was left. Not a tab, so no re-tap to top
      // — Messages and Notifications share a path and differ only by ?tab=.
      data-scroll-restore=""
      aria-label={label}
      title={label}
      className={[
        "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        active ? "bg-primary/10 text-primary" : "text-main hover:bg-surface",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function UnreadDot({ count }: { count: number }) {
  return (
    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function BrowseCategories({ lang }: { lang: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDiscoverRoute =
    pathname.startsWith(`/${lang}/explore`) ||
    pathname.startsWith(`/${lang}/search`);
  const activeCategory = searchParams.get("category");
  const feedHref = useNavTabHref("feed", `/${lang}/for-you`);
  const { data, loading } = useQuery(DISCOVERY_CATEGORIES, {
    fetchPolicy: "cache-first",
    nextFetchPolicy: "cache-first",
  });
  // Only the very first load is empty-handed — cache-first means a revisit
  // already has `data` and just revalidates in the background, so this never
  // re-flashes skeletons over a populated list.
  const categoriesLoading = loading && !data;

  const liveCategories = (data?.discoveryFacets.categories ?? [])
    .filter((category) => category.count > 0)
    .slice(0, 8)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    }));
  const categories = [{ name: "For You", slug: "for-you" }, ...liveCategories];

  return (
    <div className="mt-4 min-h-0 overflow-y-auto pb-10 pr-1">
      <nav className="flex flex-col gap-0.5" aria-label="Browse categories">
        {categories.map((category, index) => {
          const href =
            index === 0
              ? feedHref
              : `/${lang}/explore?category=${encodeURIComponent(category.slug)}`;
          const active =
            index === 0
              ? pathname === `/${lang}` || pathname.startsWith(`/${lang}/for-you`)
              : activeCategory === category.slug;

          return (
            <Link
              key={`${category.slug}-${index}`}
              href={href}
              scroll={false}
              // "For You" is the feed tab; a category is a fresh listing that
              // starts at the top.
              data-nav-tab={index === 0 ? "feed" : undefined}
              className={[
                "block rounded-md py-2 text-sm font-semibold tracking-normal transition-colors",
                active
                  ? "text-primary"
                  : "text-muted hover:text-main dark:hover:text-foreground",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              {category.name}
            </Link>
          );
        })}

        {/* "For You" above is static and always real; only the categories
            fetched from discoveryFacets need a loading stand-in — without
            one, the list just looked permanently empty until the query
            resolved. */}
        {categoriesLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="py-2">
                <Skeleton
                  className="h-4"
                  style={{ width: `${64 - index * 4}%` }}
                />
              </div>
            ))
          : null}
      </nav>

      {isDiscoverRoute ? <DiscoverSidebarFilters /> : null}
    </div>
  );
}

const SORT_OPTIONS = [
  { value: "RELEVANCE", label: "Best match" },
  { value: "NEWEST", label: "Newest" },
  { value: "PRICE_LOW_TO_HIGH", label: "Price: low to high" },
  { value: "PRICE_HIGH_TO_LOW", label: "Price: high to low" },
] as const;

const CONTENT_TYPE_OPTIONS = [
  { value: null, label: "All types" },
  { value: "IMAGE", label: "Photos" },
  { value: "VIDEO", label: "Videos" },
] as const;

function DiscoverSidebarFilters() {
  const selectedCategory = useDiscoverFiltersStore((s) => s.selectedCategory);
  const selectedSubcategory = useDiscoverFiltersStore(
    (s) => s.selectedSubcategory,
  );
  const selectedType = useDiscoverFiltersStore((s) => s.selectedType);
  const selectedCounty = useDiscoverFiltersStore((s) => s.selectedCounty);
  const selectedSubCounty = useDiscoverFiltersStore((s) => s.selectedSubCounty);
  const selectedWard = useDiscoverFiltersStore((s) => s.selectedWard);
  const sort = useDiscoverFiltersStore((s) => s.sort);
  const minPrice = useDiscoverFiltersStore((s) => s.minPrice);
  const maxPrice = useDiscoverFiltersStore((s) => s.maxPrice);
  const negotiableOnly = useDiscoverFiltersStore((s) => s.negotiableOnly);
  const subcategories = useDiscoverFiltersStore((s) => s.subcategories);
  const specFacets = useDiscoverFiltersStore((s) => s.specFacets);
  const specs = useDiscoverFiltersStore((s) => s.specs);
  const setSpec = useDiscoverFiltersStore((s) => s.setSpec);
  const nearby = useDiscoverFiltersStore((s) => s.nearby);
  const postedWithinDays = useDiscoverFiltersStore((s) => s.postedWithinDays);
  const setPostedWithinDays = useDiscoverFiltersStore(
    (s) => s.setPostedWithinDays,
  );
  const setSelectedSubcategory = useDiscoverFiltersStore(
    (s) => s.setSelectedSubcategory,
  );
  const setSelectedType = useDiscoverFiltersStore((s) => s.setSelectedType);
  const setSort = useDiscoverFiltersStore((s) => s.setSort);
  const setNegotiableOnly = useDiscoverFiltersStore(
    (s) => s.setNegotiableOnly,
  );
  const openLocationPicker = useDiscoverFiltersStore(
    (s) => s.openLocationPicker,
  );
  const clearLocation = useDiscoverFiltersStore((s) => s.clearLocation);
  const clearAll = useDiscoverFiltersStore((s) => s.clearAll);

  const locationLabel =
    selectedWard?.name ??
    selectedSubCounty?.name ??
    selectedCounty?.name ??
    "All Kenya";
  const hasActiveFilters = Boolean(
    selectedCategory ||
      selectedSubcategory ||
      selectedType ||
      selectedCounty ||
      selectedSubCounty ||
      selectedWard ||
      minPrice ||
      maxPrice ||
      negotiableOnly ||
      nearby ||
      postedWithinDays ||
      specs.length > 0 ||
      sort !== "RELEVANCE",
  );
  const specValue = (key: string) =>
    specs.find((spec) => spec.key === key)?.value?.toLowerCase();
  const optionClass = (active: boolean) =>
    [
      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
      active
        ? "bg-primary/10 font-black text-primary"
        : "font-semibold text-muted hover:bg-surface hover:text-main",
    ].join(" ");

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wide text-main">
          Filters
        </p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-bold text-primary hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="divide-y divide-border">
        <details open className="group py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-main">
            Type
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 space-y-1">
            {CONTENT_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value ?? "all"}
                type="button"
                onClick={() => setSelectedType(option.value)}
                className={[
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  selectedType === option.value
                    ? "bg-primary/10 font-black text-primary"
                    : "font-semibold text-muted hover:bg-surface hover:text-main",
                ].join(" ")}
              >
                {option.label}
                {selectedType === option.value ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
              </button>
            ))}
          </div>
        </details>

        <details open className="group py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-main">
            Location
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={openLocationPicker}
              className="flex w-full items-center justify-between rounded-lg border border-border px-2.5 py-2 text-left text-xs font-semibold text-main transition-colors hover:bg-surface"
            >
              <span className="truncate">{locationLabel}</span>
              <MapPin className="h-4 w-4 shrink-0 text-muted" />
            </button>
            {locationLabel !== "All Kenya" ? (
              <button
                type="button"
                onClick={clearLocation}
                className="text-xs font-semibold text-muted hover:text-main"
              >
                Clear location
              </button>
            ) : null}
          </div>
        </details>

        <details open={Boolean(nearby)} className="group py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-main">
            Distance
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2">
            <DistanceFilter compact />
          </div>
        </details>

        <details open className="group py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-main">
            Sort by
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 space-y-1">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
                className={[
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  sort === option.value
                    ? "bg-primary/10 font-black text-primary"
                    : "font-semibold text-muted hover:bg-surface hover:text-main",
                ].join(" ")}
              >
                {option.label}
                {sort === option.value ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
            ))}
          </div>
        </details>

        {selectedCategory && subcategories.length > 0 ? (
          <details open className="group py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-main">
              Product types
              <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => setSelectedSubcategory(null)}
                className={[
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  !selectedSubcategory
                    ? "bg-primary/10 font-black text-primary"
                    : "font-semibold text-muted hover:bg-surface hover:text-main",
                ].join(" ")}
              >
                All
                {!selectedSubcategory ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
              {subcategories.slice(0, 10).map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() =>
                    setSelectedSubcategory(
                      selectedSubcategory === item.name ? null : item.name,
                    )
                  }
                  className={[
                    "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    selectedSubcategory === item.name
                      ? "bg-primary/10 font-black text-primary"
                      : "font-semibold text-muted hover:bg-surface hover:text-main",
                  ].join(" ")}
                >
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </details>
        ) : null}

        {/* Spec fields for the chosen category — Make, Model, Year… — from
            what its listings actually carry. */}
        {specFacets.map((facet) => {
          const current = specValue(facet.key);
          return (
            <details key={facet.key} open={Boolean(current)} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-main">
                {facet.label}
                <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSpec(facet.key, null)}
                  className={optionClass(!current)}
                >
                  Any
                  {!current ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
                {facet.values.map((item) => {
                  const active = current === item.value.toLowerCase();
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSpec(facet.key, active ? null : item.value)}
                      className={optionClass(active)}
                    >
                      <span className="truncate">{item.value}</span>
                      <span className="shrink-0 text-[11px] text-muted">{item.count}</span>
                    </button>
                  );
                })}
              </div>
            </details>
          );
        })}

        <details className="group py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-main">
            Price
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2">
            <PriceRangeFields compact />
          </div>
        </details>

        <details open={Boolean(postedWithinDays)} className="group py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-main">
            Posted
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 space-y-1">
            {POSTED_WITHIN_OPTIONS.map((option) => {
              const active = postedWithinDays === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setPostedWithinDays(option.value)}
                  className={optionClass(active)}
                >
                  {option.label}
                  {active ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
              );
            })}
          </div>
        </details>

        <details className="group py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-main">
            Listing options
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <label className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-main">
            Negotiable only
            <Switch
              checked={negotiableOnly}
              onCheckedChange={setNegotiableOnly}
              aria-label="Toggle negotiable only"
            />
          </label>
        </details>
      </div>
    </div>
  );
}

function AccountMenu({
  lang,
  displayName,
  email,
  initials,
}: {
  lang: string;
  displayName: string;
  email?: string | null;
  initials: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { logout, loading } = useLogout(lang);

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary-soft text-[13px] font-black text-primary-strong shadow-sm transition-colors hover:bg-primary/15"
            aria-label="Open account menu"
          >
            {initials.slice(0, 1)}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={10}
          className="w-72 rounded-2xl border border-border bg-elevated p-2 shadow-xl"
        >
          <div className="px-3 py-3">
            <p className="truncate text-sm font-black text-main">
              {displayName}
            </p>
            {email ? (
              <p className="mt-0.5 truncate text-xs text-muted">{email}</p>
            ) : null}
          </div>
          <div className="border-t border-border py-1">
            <Link
              href={`/${lang}/profile`}
              scroll={false}
              data-nav-tab="profile"
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-main transition-colors hover:bg-surface"
            >
              View profile
            </Link>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-error transition-colors hover:bg-error/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-border bg-elevated p-0 shadow-2xl">
          <DialogHeader className="px-6 pb-2 pt-6 text-left">
            <DialogTitle className="text-lg font-black text-main">
              Sign out?
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-muted">
              You&apos;ll need to sign in again to post items, message buyers,
              or manage your profile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 border-t border-border px-6 py-4 sm:space-x-0">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="h-10 rounded-full border border-border px-5 text-sm font-bold text-main transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={logout}
              disabled={loading}
              className="h-10 rounded-full bg-primary px-5 text-sm font-bold text-white transition-opacity disabled:opacity-60"
            >
              {loading ? "Signing out..." : "Sign out"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ThemeIconButton() {
  const { resolvedTheme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Matches IconNavButton's footprint so it sits flush in the same row before
  // the theme is known, rather than the row reflowing once it mounts.
  if (!mounted) return <span aria-hidden className="h-9 w-9 shrink-0" />;

  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-full text-main transition-colors hover:bg-surface"
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  );
}
