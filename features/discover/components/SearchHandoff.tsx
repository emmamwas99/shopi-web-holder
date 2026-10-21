"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FeedLoader } from "@/components/ui/feed-loader";
import { hasPendingListing, takePendingListing } from "@/lib/searchHandoff";

/**
 * Opens the listing a homepage search suggestion was tapped for, once Browse
 * has arrived beneath it (see lib/searchHandoff.ts). Covers Browse meanwhile,
 * so the reader goes from the suggestion to a loader to the listing without
 * the results flashing past.
 *
 * Coming back to Browse later finds nothing waiting and renders nothing.
 */
export function SearchHandoff() {
  const router = useRouter();
  const [handingOff] = useState(hasPendingListing);

  useEffect(() => {
    // Taken in the effect, not during render, so React's development double
    // render can't consume it before the push.
    const href = takePendingListing();
    if (href) router.push(href);
  }, [router]);

  if (!handingOff) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-app">
      <FeedLoader label="Opening listing" />
    </div>
  );
}
