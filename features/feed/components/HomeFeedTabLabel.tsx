"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";
import { useHomeFeedLoading } from "@/lib/homeFeedRefresh";

/** Preserve the tab dimensions while replacing its label with the brand loader. */
export function HomeFeedTabLabel({ label }: { label: string }) {
  const loading = useHomeFeedLoading();
  return (
    <span className="relative inline-flex items-center justify-center" aria-busy={loading}>
      <span className={loading ? "invisible" : undefined}>{label}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <InterlockingBalls size={18} label="Loading feed" />
        </span>
      )}
    </span>
  );
}
