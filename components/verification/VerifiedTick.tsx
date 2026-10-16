import { cn } from "@/lib/utils";

/** The verified blue, shared by every tick and badge so they read as one mark. */
export const VERIFIED_BLUE = "#1D9BF0";

/**
 * The blue tick a verified shop carries next to its name.
 *
 * A rosette rather than a plain circle: it is the shape people already read as
 * "verified" from the big social apps, and it stays distinct from the round
 * avatars it sits beside. Sized to the line it follows (12px meta lines, 15px
 * names, 18px headings).
 */
export function VerifiedTick({
  size = 16,
  className,
  label = "Verified shop",
}: {
  size?: number;
  className?: string;
  /** Read by screen readers; null when the surrounding text already says it. */
  label?: string | null;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {label ? <title>{label}</title> : null}
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill={VERIFIED_BLUE}
      />
      <path
        d="m8.6 12.2 2.4 2.4 4.5-4.8"
        stroke="#fff"
        strokeWidth={size <= 13 ? 2.6 : 2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
