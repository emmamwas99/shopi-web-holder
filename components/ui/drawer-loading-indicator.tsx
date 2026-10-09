import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type InterlockingBallsStyle = CSSProperties & {
  "--shopi-loader-size": string;
  "--shopi-loader-overlap": string;
};

/** Compact Shopi loading animation for inline and full-page loading states. */
export function InterlockingBalls({
  size = 36,
  className,
  label = "Loading",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn("shopi-drawer-loader", className)}
      style={{
        "--shopi-loader-size": `${size}px`,
        "--shopi-loader-overlap": `${size / 4}px`,
      } as InterlockingBallsStyle}
      role="status"
      aria-label={label}
    >
      <span className="shopi-drawer-loader__ball shopi-drawer-loader__ball--primary" />
      <span className="shopi-drawer-loader__ball shopi-drawer-loader__ball--secondary" />
    </span>
  );
}

/** Small centered brand loader for drawer and sheet content while it fetches. */
export function DrawerLoadingIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] w-full items-center justify-center",
        className,
      )}
    >
      <InterlockingBalls />
    </div>
  );
}
