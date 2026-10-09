import { Skeleton } from "@/components/ui/skeleton";

export function WatchGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton
          key={i}
          className="aspect-[9/16] rounded-xl"
        />
      ))}
    </div>
  );
}
