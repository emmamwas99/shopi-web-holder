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
            <h2 className="mb-2 text-2xl font-bold text-foreground">
              Posted
            </h2>
            <p className="text-[15px] leading-relaxed text-muted">
              The Shopi team is giving it a quick check. It shows up in the feed
              as soon as it’s approved.
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
      className={`${celebrationStyles.celebrateCta} mt-1 h-11 rounded-full bg-primary px-6 text-base font-semibold text-white shadow-[0_8px_24px_rgb(var(--brand-primary)/0.4)] transition-transform active:scale-[0.97]`}
    >
      {children}
    </button>
  );
}
