"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useBackLinkClick } from "@/lib/useAppBack";

/**
 * The back control of a pushed screen, as a real link to its parent: it still
 * says where it goes, works before hydration and opens in a new tab.
 *
 * A plain tap goes back instead whenever that stays in the app, so the parent
 * returns as it was left — scroll included — rather than as a fresh copy
 * pushed on top, which also left the closed screen one Back away. Only with
 * nothing of ours behind does it follow `href`, replacing the current entry.
 */
export function BackLink({
  onClick,
  replace = true,
  ...props
}: ComponentProps<typeof Link>) {
  const goBack = useBackLinkClick();

  return (
    <Link
      {...props}
      replace={replace}
      onClick={(event) => {
        onClick?.(event);
        goBack(event);
      }}
    />
  );
}
