"use client";

import { useEffect, useState } from "react";

export const TABLET_QUERY =
  "(min-width: 768px) and (max-width: 1279px), (min-width: 768px) and (pointer: coarse)";

export function isTabletViewportNow(): boolean {
  return typeof window !== "undefined" && window.matchMedia(TABLET_QUERY).matches;
}

/** Treat medium touch displays as tablets even when their CSS width is large. */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(TABLET_QUERY);
    const update = () => setIsTablet(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isTablet;
}
