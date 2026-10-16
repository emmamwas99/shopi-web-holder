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
 * from a list, built like the admin's record panel: a title and one line of
 * context over a divider, then the body. A tall bottom sheet on a phone, a
 * side panel on desktop. The caller owns Back handling (useBackDismiss) and
 * passes its `requestClose`, so the X, swipe-down and an overlay tap all close
 * the way Back does.
 */
export function DetailSheet({
  open,
  desktop,
  title,
  subtitle,
  onRequestClose,
  children,
}: {
  open: boolean;
  desktop: boolean | null;
  title: string;
  subtitle?: string;
  onRequestClose: () => void;
  children: ReactNode;
}) {
  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={(next) => !next && onRequestClose()}>
        <SheetContent
          side="right"
          className="z-[80] flex h-full w-full flex-col gap-0 border-l border-default bg-app p-0 sm:max-w-[480px]"
          overlayClassName="z-[70] bg-black/40"
        >
          <div className="shrink-0 border-b border-default px-5 py-4 pr-12">
            <SheetTitle className="truncate text-base font-semibold leading-snug text-main">
              {title}
            </SheetTitle>
            <SheetDescription className="mt-0.5 truncate text-[13px] text-muted">
              {subtitle || "Details"}
            </SheetDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onRequestClose()}>
      {/* A fixed height with its own scroller, so the actions near the top
          never move as the body changes length. 92svh leaves the list
          peeking above, which keeps it reading as a sheet, not a new page. */}
      <DrawerContent className="mx-auto flex h-[92svh] w-full max-w-[480px] flex-col rounded-t-[20px] border-default bg-app outline-none">
        <div className="flex shrink-0 items-center gap-3 border-b border-default px-4 pb-3 pt-2">
          <div className="min-w-0 flex-1">
            <DrawerTitle className="truncate text-left text-base font-semibold leading-snug text-main">
              {title}
            </DrawerTitle>
            <DrawerDescription className="mt-0.5 truncate text-left text-[13px] text-muted">
              {subtitle || "Details"}
            </DrawerDescription>
          </div>
          <button
            type="button"
            onClick={onRequestClose}
            aria-label="Close"
            className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-[8px] text-muted transition-colors active:bg-surface"
          >
            <X size={20} />
          </button>
        </div>
        {/* overscroll-contain: a flick at the end of the details must not
            drag the list behind the sheet. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
