import { cn } from "@/lib/utils";

/**
 * "icon" is the square badge on its own; "lockup" is the badge plus the
 * wordmark; "wordmark" renders only the Shopi lettering.
 */
type LogoVariant = "icon" | "lockup" | "wordmark";

type LogoProps = {
  variant?: LogoVariant;
  /** Painted height in px. Width derives from the artwork's aspect ratio. */
  size?: number;
  /** Kept for API compatibility. */
  tone?: "rose" | "mono";
  className?: string;
};

const ART: Record<LogoVariant, { src: string; aspect: number }> = {
  // 96 x 96.
  icon: { src: "/assets/shopi-logo.svg", aspect: 1 },
  // 358 x 98.06 — taller than the badge's 96 because "shopi" has a descender
  // and an i-dot, so its ink outruns the badge at a matched x-height. Both are
  // wholly pink, so this reads on a light or a dark surface and needs no
  // second file.
  lockup: { src: "/assets/shopi-lockup.svg", aspect: 358 / 98.06 },
  // Cropped vector artwork containing only the Shopi lettering.
  wordmark: { src: "/assets/shopi-wordmark.svg", aspect: 243 / 98.06 },
};

/**
 * `size` has meant "painted height / 0.72" since the badge artwork went
 * full-bleed — SideNav passes 58 to get 42px. Kept so that call site does not
 * shift, and applied to every variant so `size` means one thing.
 */
const LOGO_VISUAL_SCALE = 0.72;

export function Logo({ variant = "icon", size = 32, className }: LogoProps) {
  const art = ART[variant];
  const height = Math.round(size * LOGO_VISUAL_SCALE);
  const width = Math.round(height * art.aspect);
  return (
    // Local SVG asset — served directly (next/image would need
    // dangerouslyAllowSVG).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={art.src}
      alt="Shopi"
      width={width}
      height={height}
      style={{ height, width: "auto" }}
      className={cn("inline-block shrink-0", className)}
    />
  );
}
