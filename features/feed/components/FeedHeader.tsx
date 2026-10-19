"use client";

import {
  Clapperboard,
  MapPin,
  Newspaper,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SHOW_ASK_SHOPI } from "@/features/feed/utils/askShopiAvailability";
import { useFeedPreferencesStore } from "@/stores/feedPreferences";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";

type Tab = "for-you" | "watch" | "ask-shopi";

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onSearchOpen?: () => void;
}

export function FeedHeader({ activeTab, onTabChange, onSearchOpen }: Props) {
  const [headerHidden, setHeaderHidden] = useState(false);
  const previousScrollY = useRef(0);
  const directionDistance = useRef(0);
  const nearbyActive = useFeedPreferencesStore((s) => s.homeNearbyFilterActive);
  const nearbyRadiusKm = useFeedPreferencesStore((s) => s.homeNearbyRadiusKm);
  const setNearbyRadiusKm = useFeedPreferencesStore((s) => s.setHomeNearbyRadiusKm);
  const setNearbyActive = useFeedPreferencesStore((s) => s.setHomeNearbyFilterActive);

  useEffect(() => {
    let frame = 0;

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const currentScrollY = Math.max(0, window.scrollY);
        const scrollDelta = currentScrollY - previousScrollY.current;

        if (scrollDelta === 0) return;

        if (
          directionDistance.current !== 0 &&
          Math.sign(scrollDelta) !== Math.sign(directionDistance.current)
        ) {
          directionDistance.current = scrollDelta;
        } else {
          directionDistance.current += scrollDelta;
        }

        if (currentScrollY <= 24) {
          setHeaderHidden(false);
          directionDistance.current = 0;
        } else if (directionDistance.current <= -32) {
          setHeaderHidden(false);
          directionDistance.current = 0;
        } else if (currentScrollY > 72 && directionDistance.current >= 48) {
          setHeaderHidden(true);
          directionDistance.current = 0;
        }

        previousScrollY.current = currentScrollY;
      });
    };

    previousScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div className="h-[57px]" aria-hidden="true" />
      <header
        className="feed-scroll-header fixed inset-x-0 top-0 z-30 border-b border-border/70 bg-white px-4 md:px-6"
        data-hidden={headerHidden}
      >
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 md:max-w-5xl">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
            {onSearchOpen ? (
              <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-transparent bg-subtle pl-3.5 pr-2 transition-colors focus-within:border-primary focus-within:bg-app">
                <Search size={16} className="shrink-0 text-muted" aria-hidden />
                <input
                  type="search"
                  enterKeyHint="search"
                  readOnly
                  onClick={onSearchOpen}
                  placeholder="Search anything on Shopi"
                  aria-label="Search listings"
                  className="h-full min-w-0 flex-1 appearance-none bg-transparent text-[16px] leading-5 text-main outline-none text-ellipsis placeholder:!text-[15px] placeholder:text-[rgb(var(--color-text-placeholder))] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                />
              </div>
            ) : null}

            <div className="relative shrink-0">
              <Select
                value={nearbyActive ? String(nearbyRadiusKm) : ""}
                onValueChange={(value) => {
                  if (value === "clear") {
                    setNearbyActive(false);
                    return;
                  }
                  setNearbyRadiusKm(Number(value));
                  setNearbyActive(true);
                }}
              >
                <SelectTrigger
                  className={`relative size-10 shrink-0 justify-center rounded-full border-0 p-0 shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg:last-child]:hidden ${
                    nearbyActive
                      ? "bg-primary/10 text-primary"
                      : "bg-surface text-foreground"
                  }`}
                  aria-label={
                    nearbyActive
                      ? `Nearby filter, within ${nearbyRadiusKm} kilometers`
                      : "Filter listings by distance"
                  }
                  title={
                    nearbyActive ? `Within ${nearbyRadiusKm} km` : "Filter by distance"
                  }
                >
                  <MapPin size={20} strokeWidth={2.1} aria-hidden />
                  {nearbyActive ? (
                    <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-primary ring-2 ring-white" />
                  ) : null}
                </SelectTrigger>
                <SelectContent align="end" className="min-w-44">
                  <SelectGroup>
                    <SelectLabel>Show listings within</SelectLabel>
                    {[5, 10, 20, 50, 100, 200, 400].map((km) => (
                      <SelectItem key={km} value={String(km)}>
                        {km} km
                      </SelectItem>
                    ))}
                    {nearbyActive ? (
                      <SelectItem value="clear">Clear nearby filter</SelectItem>
                    ) : null}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <h1 className="sr-only shrink-0 text-base font-bold tracking-tight text-main md:not-sr-only md:text-lg">
            For you
          </h1>

          <div className="hidden min-w-0 items-center gap-1.5 md:flex md:gap-2">
            <div className="flex items-center gap-1">
            <Select
              value={nearbyActive ? String(nearbyRadiusKm) : ""}
              onValueChange={(value) => {
                if (value === "clear") {
                  setNearbyActive(false);
                  return;
                }
                setNearbyRadiusKm(Number(value));
                setNearbyActive(true);
              }}
            >
              <SelectTrigger
                className={`h-9 w-auto min-w-9 gap-1.5 rounded-full border-border px-2.5 text-xs font-medium focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                  nearbyActive
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-surface text-foreground"
                }`}
                aria-label={
                  nearbyActive
                    ? `Nearby filter, within ${nearbyRadiusKm} kilometers`
                    : "Filter listings by distance"
                }
                title={
                  nearbyActive ? `Within ${nearbyRadiusKm} km` : "Filter by distance"
                }
              >
                <MapPin size={19} strokeWidth={2.2} aria-hidden />
                <span className="whitespace-nowrap text-xs font-semibold tabular-nums">
                  {nearbyActive ? `${nearbyRadiusKm} km` : "Nearby"}
                </span>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-44">
                <SelectGroup>
                  <SelectLabel>Show listings within</SelectLabel>
                  {[5, 10, 20, 50, 100, 200, 400].map((km) => (
                    <SelectItem key={km} value={String(km)}>
                      {km} km
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {nearbyActive ? (
              <button
                type="button"
                onClick={() => setNearbyActive(false)}
                aria-label="Clear nearby filter"
                title="Clear nearby filter"
                className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                <X size={15} strokeWidth={2.4} />
              </button>
            ) : null}
            </div>
            {onSearchOpen ? (
              <button
                type="button"
                onClick={onSearchOpen}
                aria-label="Search Shopi"
                className="grid size-10 place-items-center rounded-full bg-surface text-foreground transition-colors active:bg-border"
              >
                <Search size={22} strokeWidth={2.2} />
              </button>
            ) : null}
            {SHOW_ASK_SHOPI ? (
              <button
                type="button"
                onClick={() => onTabChange("ask-shopi")}
                aria-label="Ask Shopi"
                className="grid size-10 place-items-center rounded-full bg-surface text-foreground transition-colors active:bg-border"
              >
                <Sparkles size={21} strokeWidth={2.1} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onTabChange(activeTab === "watch" ? "for-you" : "watch")}
              aria-label={activeTab === "watch" ? "Back to For You" : "Open videos"}
              className="tablet-feed-watch-control grid size-10 place-items-center rounded-full bg-surface text-foreground transition-colors active:bg-border"
            >
              {activeTab === "watch" ? (
                <Newspaper size={21} strokeWidth={2.1} />
              ) : (
                <Clapperboard size={21} strokeWidth={2.1} />
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
