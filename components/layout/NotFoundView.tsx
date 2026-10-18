"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { isValidLocale, type Locale } from "@/i18n/config";
import { homeHref } from "@/lib/home-url";
import { cn } from "@/lib/utils";

const COPY: Record<
  Locale,
  { title: string; body: string; home: string; browse: string }
> = {
  en: {
    title: "This page isn’t here",
    body: "It may have been removed, or the link is wrong.",
    home: "Go home",
    browse: "Browse listings",
  },
  sw: {
    title: "Ukurasa huu haupo",
    body: "Huenda umeondolewa, au kiungo si sahihi.",
    home: "Rudi mwanzo",
    browse: "Angalia matangazo",
  },
};

/**
 * The one 404 screen, for every way a page can be missing: a deleted shop or
 * listing, a mistyped URL, an old link. Never a dead end — "Go home" and
 * "Browse listings" are always one tap away.
 *
 * Used by app/[lang]/not-found.tsx (any notFound() under a locale), the app
 * shell's not-found files (kept inside the shell so its nav stays), and
 * app/global-not-found.tsx (URLs that match no route), which passes `lang`
 * because it sits outside [lang].
 */
export function NotFoundView({
  lang: langProp,
  inShell = false,
}: {
  lang?: string;
  /** Inside the app shell, whose nav already takes some of the screen. */
  inShell?: boolean;
}) {
  const params = useParams<{ lang?: string }>();
  const candidate = langProp ?? params?.lang ?? "";
  const lang: Locale = isValidLocale(candidate) ? candidate : "en";
  const t = COPY[lang];

  return (
    <main
      className={cn(
        "flex w-full flex-1 flex-col items-center justify-center px-6 py-16 text-center",
        inShell ? "min-h-[70svh]" : "min-h-svh",
      )}
    >
      <Link href={homeHref(lang)} aria-label="Shopi home">
        <Logo size={64} />
      </Link>
      <p className="mt-8 font-display text-sm font-bold tracking-[0.2em] text-primary">
        404
      </p>
      <h1 className="mt-2 text-balance font-display text-[1.75rem] font-bold leading-tight text-default md:text-[2.25rem]">
        {t.title}
      </h1>
      <p className="mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-muted">
        {t.body}
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Link
          href={homeHref(lang)}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-[0.9375rem] font-semibold text-white no-underline transition-opacity hover:opacity-90 active:opacity-80"
        >
          {t.home}
        </Link>
        <Link
          href={`/${lang}/explore`}
          className="inline-flex h-12 items-center justify-center rounded-full border border-border px-6 text-[0.9375rem] font-semibold text-default no-underline transition-colors hover:bg-subtle"
        >
          {t.browse}
        </Link>
      </div>
    </main>
  );
}
