"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useParams } from "next/navigation";
import {
  onOpenCookieSettings,
  openCookieSettings,
  setCookieConsent,
  useCookieConsent,
} from "@/lib/cookieConsent";

/**
 * Google Tag Manager, loaded only once the visitor accepts analytics cookies.
 *
 * "lazyOnload" defers it until after the window load event, so tags never
 * compete with feed content. Events the app pushed to `window.dataLayer`
 * before this loads are processed when the container arrives.
 */
export function ConsentedTagManager({ gtmId }: { gtmId?: string }) {
  const consent = useCookieConsent();
  if (!gtmId || consent !== "granted") return null;
  return (
    <>
      <Script id="gtm-datalayer" strategy="lazyOnload">
        {`window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});`}
      </Script>
      <Script
        id="gtm"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtm.js?id=${gtmId}`}
      />
    </>
  );
}

/**
 * Asks once for analytics cookies. Accept and Decline carry equal weight —
 * declining is as easy as accepting, and nothing non-essential loads until a
 * choice is made. "Cookie settings" in the footer re-opens it.
 */
export function CookieConsentBanner() {
  const consent = useCookieConsent();
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang ?? "en";
  const [reopened, setReopened] = useState(false);

  useEffect(() => onOpenCookieSettings(() => setReopened(true)), []);

  // undefined: not hydrated yet, so render nothing rather than flash.
  if (consent === undefined) return null;
  if (consent !== null && !reopened) return null;

  function choose(value: "granted" | "denied") {
    setCookieConsent(value);
    setReopened(false);
  }

  return (
    <div
      role="region"
      aria-label="Cookie choices"
      className="fixed inset-x-3 bottom-[calc(var(--nav-height,0px)+var(--safe-bottom,0px)+0.75rem)] z-[70] mx-auto max-w-xl rounded-2xl border border-border bg-elevated p-4 text-main shadow-lg md:bottom-4"
    >
      <p className="text-sm leading-relaxed">
        We&apos;d like to use analytics cookies (Google Analytics and the Meta
        Pixel) to understand how Shopi is used. Cookies that keep you signed in
        are always on.{" "}
        <Link
          href={`/${lang}/cookies`}
          className="font-semibold text-primary underline underline-offset-2"
        >
          Cookie Policy
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choose("denied")}
          className="h-10 flex-1 cursor-pointer rounded-full border border-border bg-elevated px-4 text-sm font-semibold text-main transition-colors hover:bg-surface"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          className="h-10 flex-1 cursor-pointer rounded-full border border-border bg-elevated px-4 text-sm font-semibold text-main transition-colors hover:bg-surface"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

/** Re-opens the cookie banner, e.g. from the footer or the Cookie Policy. */
export function CookieSettingsButton({
  className,
  children = "Cookie settings",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className={className ?? "cursor-pointer underline underline-offset-2"}
    >
      {children}
    </button>
  );
}
