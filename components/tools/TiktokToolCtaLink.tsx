"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import type { TiktokSaverMode } from "@/lib/tiktokSaver";
import { recordTiktokSaverEvent } from "@/lib/tiktok-saver-analytics";

/**
 * A link on a TikTok tool page that leads further into Shopi (list an item,
 * how selling works, the other tools). Counted as a CTA click so the admin can
 * see how much of the downloader's search traffic turns into Shopi visits.
 */
export function TiktokToolCtaLink({
  cta,
  mode,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { cta: string; mode: TiktokSaverMode }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        recordTiktokSaverEvent({ type: "CTA_CLICK", mode, cta });
        onClick?.(event);
      }}
    />
  );
}
