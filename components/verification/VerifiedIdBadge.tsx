import { cn } from "@/lib/utils";
import { VerifiedTick } from "./VerifiedTick";

/** What hovering (or a screen reader) learns about the badge. */
export const VERIFIED_ID_HINT =
  "Shopi checked this seller's business permit, shop and location";

/**
 * "Verified ID" — the small badge every listing from a verified shop carries.
 *
 * `chip` sits in a line of text (the price row of a feed card or a listing
 * page): a quiet blue tint, never louder than the price beside it. `overlay`
 * sits on a photo (the corner of a grid tile), where a tint would vanish into
 * the picture, so it takes the same dark glass as the tile's other corner chips.
 */
export function VerifiedIdBadge({
  variant = "chip",
  className,
}: {
  variant?: "chip" | "overlay";
  className?: string;
}) {
  return (
    <span
      title={VERIFIED_ID_HINT}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-semibold leading-none",
        variant === "chip"
          ? "bg-[#1D9BF0]/10 px-2 py-1 text-[11px] text-[#0F6FB8] dark:bg-[#1D9BF0]/15 dark:text-[#6CC3FF] md:text-[12px]"
          : "bg-black/55 px-2 py-1 text-[10px] text-white backdrop-blur-md",
        className,
      )}
    >
      <VerifiedTick size={variant === "chip" ? 12 : 11} label={null} />
      Verified ID
      <span className="sr-only"> — {VERIFIED_ID_HINT}</span>
    </span>
  );
}
