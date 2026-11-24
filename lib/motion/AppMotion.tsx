"use client";

import type { ReactNode } from "react";
import { LazyMotion } from "framer-motion";

const loadFeatures = () => import("./domAnimation").then((mod) => mod.default);

/** Easing shared by the app's slide-in/slide-out chrome (bars, headers). */
export const CHROME_EASE = [0.22, 1, 0.36, 1] as const;
export const CHROME_TRANSITION = { type: "tween", duration: 0.3, ease: CHROME_EASE } as const;

/**
 * Framer for app chrome that is on screen at first paint (the For You header,
 * the bottom bar). The `m` components inside render their initial state
 * straight away; the animation features arrive in the background, so the
 * first scroll-hide after that slides instead of jumping.
 */
export function AppMotion({ children }: { children: ReactNode }) {
  return <LazyMotion features={loadFeatures}>{children}</LazyMotion>;
}
