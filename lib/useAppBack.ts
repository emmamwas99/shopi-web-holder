"use client";

import { useCallback, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { canGoBackInApp } from "@/lib/appHistory";

type BackRouter = {
  back: () => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

/**
 * Go back when that stays inside the app, otherwise land on `fallback`.
 *
 * Going back — never pushing the parent screen again — is what returns the
 * user to the screen they came from exactly as they left it: the same tab,
 * the same filters, the same scroll (RouteScrollRestoration restores it on a
 * traversal). The fallback is for a screen opened with nothing of ours behind
 * it, a shared link or a search result, where back() would leave the site or
 * do nothing. It replaces, so dismissing a screen does not leave a forward
 * entry pointing at the thing that was just closed.
 */
export function goBackOr(router: BackRouter, fallback: string) {
  if (canGoBackInApp()) {
    router.back();
    return;
  }
  router.replace(fallback, { scroll: false });
}

/** A back handler that cannot strand the user. See `goBackOr`. */
export function useAppBack(fallback: string) {
  const router = useRouter();

  return useCallback(() => goBackOr(router, fallback), [router, fallback]);
}

/**
 * onClick for a back control that is a real link to its parent screen (so it
 * still says where it goes, and opens in a new tab): a plain click goes back
 * instead whenever that stays in the app. Give the link `replace` so the
 * no-history case does not stack the parent on top of the closed screen.
 */
export function useBackLinkClick() {
  const router = useRouter();

  return useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !canGoBackInApp()
      ) {
        return;
      }
      event.preventDefault();
      router.back();
    },
    [router],
  );
}
