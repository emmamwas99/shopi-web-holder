"use client";

import type { ReactNode, Ref } from "react";
import { ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * The frame for one of the seller's own records — a post or a draft — opened
 * from a list, built like the admin's record panel: a title and one line of
 * context over a divider, then the body. A full-screen page on a phone, a
 * side panel on desktop. The caller owns Back handling (useBackDismiss) and
 * passes its `requestClose`, so the X, swipe-down and an overlay tap all close
 * the way Back does.
 */
export function DetailSheet({
  open,
  desktop,
  title,
  subtitle,
  contentRef,
  onRequestClose,
  children,
}: {
  open: boolean;
  desktop: boolean | null;
  title: string;
  subtitle?: string;
  contentRef?: Ref<HTMLDivElement>;
  onRequestClose: () => void;
  children: ReactNode;
}) {
  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={(next) => !next && onRequestClose()}>
        <SheetContent
          ref={contentRef}
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
    <Dialog open={open} onOpenChange={(next) => !next && onRequestClose()}>
      <DialogContent
        ref={contentRef}
        overlayClassName="z-[70] bg-black/50"
        className="!fixed !inset-0 !left-0 !top-0 !z-[80] !flex !h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 !flex-col !gap-0 !rounded-none !border-0 !bg-app !p-0 !shadow-none [&>button:last-child]:hidden"
      >
        <div
          className="grid min-h-14 shrink-0 grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2 border-b border-default px-3 py-2"
          style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)" }}
        >
          <button
            type="button"
            onClick={onRequestClose}
            aria-label="Back to list"
            className="flex size-10 items-center justify-center rounded-full text-main transition-colors active:bg-surface"
          >
            <ChevronLeft size={23} strokeWidth={2.2} />
          </button>
          <div className="min-w-0 text-center">
            <DialogTitle className="truncate text-[15px] font-semibold leading-snug text-main">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-xs text-muted">
              {subtitle || "Details"}
            </DialogDescription>
          </div>
          <span aria-hidden="true" />
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
