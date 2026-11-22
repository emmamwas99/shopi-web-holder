"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { recordFacebookSaverEvent } from "@/lib/facebook-saver-analytics";

/**
 * A link on the Facebook downloader page that leads further into Shopi (post
 * a listing, Marketplace alternatives, the TikTok tools). Counted as a CTA
 * click so the admin can see how much of the tool's search traffic turns into
 * Shopi visits — the same as TiktokToolCtaLink.
 */
export function FacebookToolCtaLink({
  cta,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { cta: string }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        recordFacebookSaverEvent({ type: "CTA_CLICK", cta });
        onClick?.(event);
      }}
    />
  );
}
