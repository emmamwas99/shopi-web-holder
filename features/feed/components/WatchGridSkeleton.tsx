import { Skeleton } from "@/components/ui/skeleton";

export function WatchGridSkeleton({ desktopLayout = false }: { desktopLayout?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 ${desktopLayout ? "lg:grid-cols-5 xl:grid-cols-6" : "lg:grid-cols-4"}`}>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton
          key={i}
          className="aspect-[9/16] rounded-xl"
        />
      ))}
    </div>
  );
}
