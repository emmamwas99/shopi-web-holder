"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Menu, X, ArrowUpRight, Search } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { ShopiLogo } from "@/features/auth/components/AuthIcons";
import { usePathname, useRouter } from "next/navigation";
import { trackHomepageButtonClick } from "@/lib/analytics";
import { ThemeSelect } from "@/components/ui/ThemeSelect";
import { homeHref } from "@/lib/home-url";
import { browseSearchHref, openListingAfterBrowse } from "@/lib/searchHandoff";

// The homepage ships without Apollo (see RouteProviders), so the suggestions
// and the client they query load on demand — warmed when the search box is
// focused, the way HomepageSupportChat loads them for the chat.
const loadApolloWrapper = () =>
  import("@/lib/apollo/ApolloWrapper").then((module) => module.ApolloWrapper);
const loadSearchDropdown = () =>
  import("@/components/layout/NavSearchDropdown").then(
    (module) => module.NavSearchDropdown,
  );
const ApolloWrapper = dynamic(loadApolloWrapper, { ssr: false });
const NavSearchDropdown = dynamic(loadSearchDropdown, { ssr: false });

export function LandingNav({ lang }: { lang: Locale }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const sw = lang === "sw";
  const onHome = pathname === `/${lang}`;
  const browsePath = `/${lang}/explore`;
  const trackSellClick = () => {
    if (onHome) {
      trackHomepageButtonClick("sell_item", "navigation", "/en/upload");
    }
  };

  // A tap anywhere outside the search box closes the suggestions. mousedown,
  // not click, so it fires before a suggestion's own click is raced by the
  // dropdown re-rendering away (the same as the app's nav search).
  useEffect(() => {
    if (!searchOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen]);

  // Return without picking a suggestion: Browse, filtered to the term. The
  // form also works without JS, as a plain GET to /explore.
  const submitSearch = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const href = browseSearchHref(lang, query.trim());
    setSearchOpen(false);
    inputRef.current?.blur();
    if (onHome) {
      // The destination without the query: search terms stay out of analytics.
      trackHomepageButtonClick("search", "navigation", browsePath);
    }
    router.push(href);
  };

  // A suggestion opens its listing on top of Browse, so Back from the listing
  // shows the results for this search instead of the homepage.
  const openListing = (href: string) => {
    if (onHome) trackHomepageButtonClick("search_result", "navigation", href);
    openListingAfterBrowse(href);
    router.prefetch(href);
    router.push(browseSearchHref(lang, query.trim()));
  };
  const forYouLabel = sw ? "Kwa ajili yako" : "For you";
  const links = [
    { href: "#how-it-works", label: sw ? "Jinsi inavyofanya kazi" : "How it works" },
    { href: "/en/shopi-agent", label: "Shopi Agent" },
    { href: `/${lang}/explore`, label: sw ? "Angalia bidhaa" : "Browse" },
  ];
  const mobileLinks = links.map((item) =>
    item.href === `/${lang}/explore`
      ? { ...item, label: sw ? "Vinjari matangazo" : "Browse listings" }
      : item,
  );

  return (
    <header className="sticky top-0 z-50 bg-landing-page text-landing-ink">
      {/* Phones: logo and menu on the first row, search full width on the
          second, like a native app's header. From md the search sits inline
          and the nav is one row; the text links wait for xl so the search
          keeps room for its placeholder. */}
      <nav aria-label={sw ? "Menyu kuu" : "Main navigation"} className="mx-auto flex w-[calc(100%-2rem)] max-w-[1500px] flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5 md:h-22 md:w-[calc(100%-4rem)] md:flex-nowrap md:py-0">
        <Link href={homeHref(lang)} aria-label="Shopi home" className="flex shrink-0 items-center gap-2 no-underline">
          <ShopiLogo className="h-9 w-9" />
          <span className="text-xl font-bold text-landing-ink">Shopi</span>
        </Link>
        <form
          ref={searchRef}
          role="search"
          action={browsePath}
          method="get"
          onSubmit={submitSearch}
          className="relative order-last flex h-11 w-full min-w-0 items-center gap-2 rounded-full border border-transparent bg-landing-surface pl-3.5 pr-2 transition-colors focus-within:border-primary focus-within:bg-landing-page md:order-none md:max-w-xl md:flex-1"
        >
          <Search size={16} className="shrink-0 text-landing-muted" aria-hidden />
          {/* 16px text: iOS zooms the page into any focused field set smaller. */}
          <input
            ref={inputRef}
            type="search"
            name="q"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              setSearchOpen(true);
              void loadApolloWrapper();
              void loadSearchDropdown();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSearchOpen(false);
            }}
            placeholder={sw ? "Unatafuta nini?" : "What are you looking for?"}
            aria-label={sw ? "Tafuta matangazo" : "Search listings"}
            className="h-full min-w-0 flex-1 appearance-none bg-transparent text-[16px] leading-5 text-landing-ink outline-none text-ellipsis placeholder:text-[15px] placeholder:text-landing-muted [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center"
              aria-label={sw ? "Futa utafutaji" : "Clear search"}
            >
              <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-landing-line-strong text-landing-page">
                <X size={12} strokeWidth={3} aria-hidden />
              </span>
            </button>
          ) : null}
          {/* Live suggestions, the same preview the app's own nav search
              shows: tap one to open it, or press return for every match on
              Browse. */}
          {searchOpen && query.trim() ? (
            <ApolloWrapper>
              <NavSearchDropdown
                lang={lang}
                term={query}
                onNavigate={() => setSearchOpen(false)}
                onOpenListing={openListing}
              />
            </ApolloWrapper>
          ) : null}
        </form>
        <div className="hidden shrink-0 items-center gap-4 xl:flex xl:gap-8">
          {links.map((item) => <Link key={item.href} href={item.href} className="whitespace-nowrap text-sm font-medium text-landing-ink no-underline hover:text-primary">{item.label}</Link>)}
        </div>
        <div className="hidden shrink-0 items-center gap-2 lg:flex xl:gap-3">
          <ThemeSelect lang={lang} />
          <Link href={`/${lang}/for-you`} className="whitespace-nowrap rounded-full border border-landing-ink px-5 py-2.5 text-sm font-semibold text-landing-ink no-underline">{forYouLabel}</Link>
          <Link href="/en/upload" onClick={trackSellClick} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white no-underline hover:opacity-90">{sw ? "Uza bidhaa" : "Sell an item"}<ArrowUpRight size={17} aria-hidden /></Link>
        </div>
        <button type="button" className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-landing-line xl:hidden" aria-label={open ? (sw ? "Funga menyu" : "Close menu") : (sw ? "Fungua menyu" : "Open menu")} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>
      {open && <div className="absolute inset-x-0 top-full border-t border-landing-line bg-landing-page px-5 py-4 shadow-lg xl:hidden">
        {mobileLinks.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block border-b border-landing-line py-3 font-medium text-landing-ink no-underline">{item.label}</Link>)}
        {/* From lg the theme picker and Sell button are already in the bar. */}
        <div className="mt-4 flex items-center justify-between gap-3 lg:hidden">
          <span className="text-sm font-medium text-landing-muted">{sw ? "Mandhari" : "Theme"}</span>
          <ThemeSelect lang={lang} className="min-w-36" />
        </div>
        <div className="mt-5 lg:hidden">
          <Link href="/en/upload" onClick={trackSellClick} className="block rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-white no-underline">{sw ? "Uza bidhaa" : "Sell an item"}</Link>
        </div>
      </div>}
    </header>
  );
}
