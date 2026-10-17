"use client";

import { ChevronLeftIcon } from "lucide-react";
import { useAppBack } from "@/lib/useAppBack";

/**
 * The "leave this screen" control on the auth pages.
 *
 * It used to be a Home link pointing at `/`. That made no sense for the way
 * people actually reach auth: the guard sends them here mid-session from the
 * feed, a profile, a listing — and the escape hatch answered by throwing them
 * out to the marketing page, somewhere they had already left.
 *
 * Going back is the honest action, and history gives it for free: whether they
 * came from the feed or from the landing page, back returns them there. The
 * fallback only matters for someone who opened an auth URL directly, and it
 * prefers `from` — the page the guard recorded before redirecting — over a
 * guess.
 */
export function AuthExitButton({
  lang,
  from,
  className,
  iconOnly = false,
}: {
  lang: string;
  /** Where the guard sent them from, when it was the guard that sent them. */
  from?: string;
  className?: string;
  /** A bare chevron, as in a phone nav bar. */
  iconOnly?: boolean;
}) {
  // Only same-origin paths. `from` arrives in the query string, so treating it
  // as a destination without this check is an open redirect.
  const fallback =
    from && from.startsWith("/") && !from.startsWith("//")
      ? from
      : `/${lang}`;
  const goBack = useAppBack(fallback);

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={goBack}
        aria-label="Back"
        className={className}
      >
        <ChevronLeftIcon size={26} strokeWidth={2.2} aria-hidden />
      </button>
    );
  }

  return (
    <button type="button" onClick={goBack} className={className}>
      <ChevronLeftIcon className="h-4 w-4" />
      Back
    </button>
  );
}
