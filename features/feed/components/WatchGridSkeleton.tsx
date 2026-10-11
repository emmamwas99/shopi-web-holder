import { Skeleton } from "@/components/ui/skeleton";

/**
 * Tiles shown per breakpoint, always in complete rows of WatchGrid's column
 * count: 3 rows of 2 / 3 on phones and tablets, 2 rows of 4–6 above that.
 * A flat count (it was 6) left most of a 5- or 6-column row empty.
 */
function fullRowsClass(index: number, desktopLayout: boolean) {
  if (desktopLayout) {
    // 2 → 3 → 5 → 6 columns: show 6, 9, 10, 12.
    if (index >= 10) return "hidden xl:block";
    if (index >= 9) return "hidden lg:block";
    if (index >= 6) return "hidden sm:block";
    return undefined;
  }
  // 2 → 3 → 4 columns: show 6, 9, 8. The 9th tile is sm-only.
  if (index >= 9) return "hidden";
  if (index >= 8) return "hidden sm:block lg:hidden";
  if (index >= 6) return "hidden sm:block";
  return undefined;
}

/** Same frame and tile anatomy as WatchGrid: 9:16 poster, play button, caption. */
export function WatchGridSkeleton({ desktopLayout = false }: { desktopLayout?: boolean }) {
  return (
    <section
      aria-label="Loading videos"
      className={desktopLayout ? "px-0 pt-3 pb-8" : "px-2 pt-4 pb-8"}
    >
      <div
        className={
          desktopLayout
            ? "mx-auto grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
            : "mx-auto grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
        }
      >
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={fullRowsClass(i, desktopLayout)} aria-hidden>
            <div className="relative aspect-[9/16] overflow-hidden rounded-xl">
              <Skeleton className="absolute inset-0 rounded-xl" />
              <span className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/10 dark:bg-white/10" />
              <span className="absolute inset-x-0 bottom-0 space-y-1.5 p-3">
                <span className="block h-3.5 w-4/5 rounded-md bg-black/10 dark:bg-white/10" />
                <span className="block h-3 w-1/2 rounded-md bg-black/10 dark:bg-white/10" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
