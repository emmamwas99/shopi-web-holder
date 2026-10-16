"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * The frame for one of the seller's own records — a post or a draft — opened
 * from a list: a tall bottom sheet on a phone, a side panel on desktop (the
 * admin's post panel, sized for a seller). The caller owns Back handling
 * (useBackDismiss) and passes its `requestClose` here, so the X, swipe-down
 * and an overlay tap all close the same way Back does.
 */
export function DetailSheet({
  open,
  desktop,
  title,
  subtitle,
  onRequestClose,
  footer,
  children,
}: {
  open: boolean;
  desktop: boolean | null;
  title: string;
  subtitle?: string;
  onRequestClose: () => void;
  /** Pinned under the scroller, clear of the home indicator. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={(next) => !next && onRequestClose()}>
        <SheetContent
          side="right"
          className="z-[80] flex h-full w-full flex-col gap-0 border-l border-default bg-app p-0 sm:max-w-[460px]"
          overlayClassName="z-[70] bg-black/40"
        >
          <div className="shrink-0 border-b border-default px-6 py-5 pr-12">
            <SheetTitle className="line-clamp-2 text-[17px] font-bold leading-snug text-main">
              {title}
            </SheetTitle>
            <SheetDescription className="mt-1 text-[13px] text-muted">
              {subtitle || "Details"}
            </SheetDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="shrink-0 border-t border-default px-6 py-4">{footer}</div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onRequestClose()}>
      {/* A fixed height with its own scroller: the gallery plus details run
          past one screen, and a sheet that grew to fit pushed its actions off
          the bottom. 92svh leaves the list peeking above it, which is what
          keeps it reading as a sheet over the list rather than a new page. */}
      <DrawerContent className="mx-auto flex h-[92svh] w-full max-w-[480px] flex-col rounded-t-[24px] border-default bg-app outline-none">
        <div className="flex shrink-0 items-start gap-3 px-4 pb-3 pt-2.5">
          <div className="min-w-0 flex-1">
            <DrawerTitle className="line-clamp-2 text-left text-[17px] font-bold leading-snug text-main">
              {title}
            </DrawerTitle>
            <DrawerDescription className="mt-0.5 text-left text-[13px] text-muted">
              {subtitle || "Details"}
            </DrawerDescription>
          </div>
          <button
            type="button"
            onClick={onRequestClose}
            aria-label="Close"
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-main active:opacity-70"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>
        {/* overscroll-contain: a flick at the end of the details must not
            drag the list behind the sheet. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
          style={{
            paddingBottom: footer ? "1.25rem" : "max(env(safe-area-inset-bottom), 1.5rem)",
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            className="shrink-0 border-t border-default px-4 pt-3"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
          >
            {footer}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
