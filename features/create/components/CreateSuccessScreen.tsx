"use client";

import type { ReactNode } from "react";
import { Celebration, SuccessBadge } from "./Celebration";
import celebrationStyles from "./Celebration.module.css";

export function CreateSuccessScreen({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-background">
      <Celebration>
        <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-5 px-6 text-center">
          <SuccessBadge />

          <div className={celebrationStyles.celebrateText}>
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
              Your post is in
            </h2>
            <p className="text-[15px] leading-relaxed text-muted">
              We’re reviewing it now. Once it’s approved, buyers will see.
            </p>
          </div>

          {children}
        </div>
      </Celebration>
    </div>
  );
}

export function CreateSuccessPrimaryAction({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${celebrationStyles.celebrateCta} mt-2 h-12 w-full max-w-xs rounded-full bg-primary px-6 text-base font-semibold text-white transition-transform active:scale-[0.97]`}
    >
      {children}
    </button>
  );
}
