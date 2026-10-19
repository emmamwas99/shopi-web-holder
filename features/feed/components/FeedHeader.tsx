"use client";

import Link from "next/link";
import {
  Clapperboard,
  MapPin,
  Newspaper,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
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
  lang: string;
}

export function FeedHeader({ activeTab, onTabChange, onSearchOpen, lang }: Props) {
  const nearbyActive = useFeedPreferencesStore((s) => s.homeNearbyFilterActive);
  const nearbyRadiusKm = useFeedPreferencesStore((s) => s.homeNearbyRadiusKm);
  const setNearbyRadiusKm = useFeedPreferencesStore((s) => s.setHomeNearbyRadiusKm);
  const setNearbyActive = useFeedPreferencesStore((s) => s.setHomeNearbyFilterActive);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-app px-4">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between">
        <Link href={`/${lang}/for-you`} aria-label="Shopi home" className="inline-flex items-center">
          <Logo
            variant="wordmark"
            size={44}
            className="dark:brightness-0 dark:invert"
          />
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Select
              value={nearbyActive ? String(nearbyRadiusKm) : ""}
              onValueChange={(value) => {
                setNearbyRadiusKm(Number(value));
                setNearbyActive(true);
              }}
            >
              <SelectTrigger
                className={`h-9 w-auto min-w-9 gap-1.5 rounded-full border-border px-2.5 text-[11px] focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
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
                {nearbyActive ? (
                  <span className="text-[11px] font-bold tabular-nums">
                    {nearbyRadiusKm} km
                  </span>
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
            className="grid size-10 place-items-center rounded-full bg-surface text-foreground transition-colors active:bg-border"
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
  );
}
