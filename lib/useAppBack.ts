"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * The history length when this document first loaded.
 *
 * Module scope, so it is captured once per document rather than per mount —
 * every client-side navigation after that leaves this value alone, which is
 * exactly what makes the comparison below meaningful.
 */
const ENTRY_HISTORY_LENGTH =
  typeof window === "undefined" ? 0 : window.history.length;

/**
 * Whether going back would stay inside the app.
 *
 * `history.length > entry length` means this document has pushed at least one
 * entry of its own, so there is somewhere of ours to go back to. If they are
 * equal the user arrived directly — a shared link, a search result, a pasted
 * URL — and `back()` would either do nothing or eject them to WhatsApp.
 *
 * Deliberately not `history.length > 1`: a tab that reached us from an
 * external page already has a length above 1, so that test reports "safe" for
 * precisely the shared-link case it is supposed to catch. `document.referrer`
 * alone is no better — it describes how the document was entered and never
 * updates across client-side navigation — so it is only the fallback for a
 * document that was itself entered from one of our pages.
 */
function canGoBackInApp(): boolean {
  if (typeof window === "undefined") return false;
  if (window.history.length > ENTRY_HISTORY_LENGTH) return true;
  // This document was loaded in full (hard link, reload) but from one of our
  // own pages — the entry behind it is still the app, so back stays inside.
  return window.history.length > 1 && isSameOriginReferrer();
}

function isSameOriginReferrer(): boolean {
  try {
    return (
      document.referrer !== "" &&
      new URL(document.referrer).origin === window.location.origin
    );
  } catch {
    return false;
  }
}

/**
 * A back handler that cannot strand the user.
 *
 * Goes back when there is app history to go back to, otherwise lands on
 * `fallback`. Uses `replace` for the fallback so dismissing a screen does not
 * leave a forward entry pointing at the thing that was just closed — pressing
 * back again should leave the site, not reopen it.
 */
export function useAppBack(fallback: string) {
  const router = useRouter();

  return useCallback(() => {
    if (canGoBackInApp()) {
      router.back();
      return;
    }
    router.replace(fallback);
  }, [router, fallback]);
}

/** The same fallback rule for callers that already own their navigation. */
export function goBackOr(
  router: { back: () => void; replace: (href: string) => void },
  fallback: string,
) {
  if (canGoBackInApp()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
