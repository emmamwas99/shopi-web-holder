import Image from "next/image";
import { Camera, Search } from "lucide-react";

/**
 * Photo search as it looks in the app: the camera in the search bar, the
 * photo being read, then similar listings. Decorative — the section's text
 * says the same thing — and it shows no prices, because they would be made up.
 */
export function PhotoSearchIllustration({
  searchPlaceholder,
  resultsTitle,
  resultsBody,
}: {
  searchPlaceholder: string;
  resultsTitle: string;
  resultsBody: string;
}) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-md bg-landing-tint p-5 sm:p-8 md:aspect-4/3"
      aria-hidden
    >
      <div className="w-full max-w-sm rounded-xl border border-landing-line bg-landing-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 rounded-full border border-landing-line bg-landing-surface py-1.5 pl-3.5 pr-1.5">
          <Search className="size-4 shrink-0 text-landing-muted" />
          <span className="flex-1 truncate text-sm text-landing-muted">{searchPlaceholder}</span>
          <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <span className="absolute inset-0 rounded-full bg-primary/40 motion-safe:animate-ping [animation-duration:2s]" />
            <Camera className="relative size-4" />
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-landing-line">
            <Image src="/assets/blog/sofa.jpg" alt="" fill sizes="56px" className="object-cover" />
            <span className="shopi-image-scan" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-landing-ink">{resultsTitle}</p>
            <p className="truncate text-xs text-landing-muted">{resultsBody}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {["object-[20%_50%]", "object-[60%_40%]", "object-[85%_60%]"].map((position) => (
            <div key={position}>
              <div className="relative aspect-square overflow-hidden rounded-md bg-landing-surface">
                <Image src="/assets/blog/sofa.jpg" alt="" fill sizes="96px" className={`object-cover ${position}`} />
              </div>
              <span className="mt-1.5 block h-2 w-4/5 rounded-full bg-landing-line" />
              <span className="mt-1 block h-2 w-1/2 rounded-full bg-landing-line" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
