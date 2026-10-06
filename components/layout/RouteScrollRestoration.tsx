"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  handleRouteCommit,
  installScrollTracking,
  scrollUrlKey,
} from "@/lib/scrollRestoration";
import { rememberNavTabUrl } from "@/lib/navTabMemory";

// Existing callers import these from here.
export {
  markScrollRestore,
  rememberScrollBeforeNavigation,
} from "@/lib/scrollRestoration";

/**
 * Owns the window scroll position across client-side navigation. The rules and
 * the reasoning live in lib/scrollRestoration.ts; this component only tells it
 * when a navigation has committed.
 *
 * Navigations across the app pass `scroll: false` and leave the position to
 * this component. It is mounted once for every route (RouteProviders), not
 * just the app shell group, so pages outside it still start at the top.
 */
export function RouteScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = scrollUrlKey(pathname, searchParams.toString());

  // A layout effect, so the decision — restore, top, or leave alone — is
  // applied after the new page's DOM is in place but before it is painted.
  useLayoutEffect(() => {
    handleRouteCommit();
    rememberNavTabUrl();
  }, [routeKey]);

  useEffect(() => installScrollTracking(), []);

  return null;
}
