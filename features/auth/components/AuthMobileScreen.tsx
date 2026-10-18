// Server component — no "use client" needed

import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { BackLink } from "@/components/layout/BackLink";
import { homeHref } from "@/lib/home-url";
import { ShopiLogo } from "./AuthIcons";

/**
 * Phone layout for the auth form screens (sign in, sign up, password reset).
 *
 * Laid out like a native app screen rather than a web page: a nav bar with a
 * bare back chevron, a left-aligned title, and the form full-bleed on the page
 * background — no bordered, shadowed card around it. `footer` sits at the
 * bottom of the screen on tall phones and simply follows the form on short
 * ones. Both bars clear the notch and home indicator (viewport-fit=cover).
 */
export function AuthMobileScreen({
  lang,
  backHref,
  title,
  subtitle,
  footer,
  children,
}: {
  lang: string;
  backHref: string;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-svh max-w-107.5 flex-col bg-app lg:hidden">
      <header className="sticky top-0 z-10 bg-app px-2 pt-[env(safe-area-inset-top)]">
        <div className="flex h-12 items-center">
          <BackLink
            href={backHref}
            aria-label="Back"
            className="flex h-11 w-11 items-center justify-center rounded-full text-default transition-opacity active:opacity-60"
          >
            <ChevronLeftIcon size={26} strokeWidth={2.2} aria-hidden />
          </BackLink>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="pb-7 pt-2">
          <Link href={homeHref(lang)} aria-label="Shopi home" className="inline-block">
            <ShopiLogo height={56} />
          </Link>
          <h1 className="mt-5 font-display text-[28px] font-bold leading-tight tracking-tight text-default">
            {title}
          </h1>
          <p className="app-subcopy mt-1.5">{subtitle}</p>
        </div>

        {children}

        {footer && <div className="mt-auto pt-4">{footer}</div>}
      </main>
    </div>
  );
}
