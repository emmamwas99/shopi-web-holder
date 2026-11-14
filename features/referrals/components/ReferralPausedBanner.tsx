import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The notice shown while referral rewards are paused. Plain type on a soft
 * fill, no icon: it is a status, not a promotion.
 *
 * Given `onOpen` or `href` it becomes the way into the referrals section, so a
 * referrer can still see their existing referral details.
 */
export function ReferralPausedBanner({
  className,
  compact = false,
  onOpen,
  href,
  active = false,
}: {
  className?: string;
  compact?: boolean;
  onOpen?: () => void;
  href?: string;
  /** The referrals section is open beside the menu (desktop only). */
  active?: boolean;
}) {
  const actionable = Boolean(onOpen || href);

  const body = (
    <>
      <p className={cn("font-semibold leading-tight text-main", compact ? "text-sm" : "text-base")}>
        Referral programme paused
      </p>
      <p className={cn("mt-1 leading-snug text-muted", compact ? "text-[13px]" : "text-sm")}>
        {compact
          ? "Referral links are disabled. A seller profile link does not count as an invite."
          : "Referral links are disabled, so new signups and listings do not earn referral rewards. A seller profile link shares your shop, but it is not a referral link. You can still view referrals already recorded on your account."}
      </p>
      {actionable && (
        <p
          className={cn(
            "mt-2.5 text-[13px] font-semibold underline underline-offset-2",
            active ? "text-main md:text-primary" : "text-main",
          )}
        >
          View your referrals
        </p>
      )}
    </>
  );

  const boxClass = cn(
    "block w-full rounded-xl bg-surface text-left",
    compact ? "px-4 py-3.5" : "px-4 py-4 sm:px-5",
    actionable && "transition-opacity hover:opacity-80 active:opacity-60",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={boxClass}>
        {body}
      </Link>
    );
  }

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "page" : undefined}
        className={boxClass}
      >
        {body}
      </button>
    );
  }

  return (
    <section aria-label="Referral update" className={boxClass}>
      {body}
    </section>
  );
}
