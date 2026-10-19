"use client";

import Link from "next/link";
import { Clapperboard, Search, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SHOW_ASK_SHOPI } from "@/features/feed/utils/askShopiAvailability";

type Tab = "for-you" | "watch" | "ask-shopi";

interface Props {
  onTabChange: (tab: Tab) => void;
  onSearchOpen?: () => void;
  lang: string;
}

export function FeedHeader({ onTabChange, onSearchOpen, lang }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-app px-4">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between">
        <Link href={`/${lang}/for-you`} aria-label="Shopi home" className="inline-flex items-center">
          <Logo variant="wordmark" size={44} />
        </Link>

        <div className="flex items-center gap-2">
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
            onClick={() => onTabChange("watch")}
            aria-label="Open videos"
            className="grid size-10 place-items-center rounded-full bg-surface text-foreground transition-colors active:bg-border"
          >
            <Clapperboard size={21} strokeWidth={2.1} />
          </button>
        </div>
      </div>
    </header>
  );
}
