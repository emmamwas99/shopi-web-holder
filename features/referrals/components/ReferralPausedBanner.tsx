import { cn } from "@/lib/utils";

/**
 * The notice shown while referral rewards are paused. Plain type on a soft
 * fill, no icon: it is a status, not a promotion.
 *
 */
export function ReferralPausedBanner({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      aria-label="Referral update"
      className={cn(
        "block w-full rounded-xl bg-surface text-left",
        compact ? "px-4 py-3.5" : "px-4 py-4 sm:px-5",
        className,
      )}
    >
      <p className={cn("font-semibold leading-tight text-main", compact ? "text-sm" : "text-base")}>
        Referral programme paused
      </p>
      <p className={cn("mt-1 leading-snug text-muted", compact ? "text-[13px]" : "text-sm")}>
        {compact
          ? "Referral links are disabled. A seller profile link does not count as an invite."
          : "Referral links are disabled, so new signups and listings do not earn referral rewards. A seller profile link shares your shop, but it is not a referral link. Existing referral records remain on your account."}
      </p>
    </section>
  );
}
