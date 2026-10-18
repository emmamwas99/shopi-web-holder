"use client";

import Link from "next/link";
import { ShopiLogo } from "@/features/auth/components/AuthIcons";
import { useAppBack } from "@/lib/useAppBack";
import { homeHref } from "@/lib/home-url";

export function LegalNav({ lang }: { lang: string }) {
  // Legal pages are mostly opened from a link elsewhere (a footer, an app
  // store listing); with nothing of ours behind, Back goes to the homepage.
  const goBack = useAppBack(`/${lang}`);

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border bg-app "
    >
      <div
        className="mx-auto flex h-14 max-w-215 items-center justify-between px-4"
      >
        {/* Back button */}
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted active:opacity-60 transition-opacity"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>

        {/* Logo → home */}
        <Link href={homeHref(lang)} aria-label="Shopi home" className="absolute left-1/2 -translate-x-1/2">
          <ShopiLogo className="h-11 w-auto" />
        </Link>

        {/* Spacer to balance the back button */}
        <div className="w-16" aria-hidden />
      </div>
    </header>
  );
}
