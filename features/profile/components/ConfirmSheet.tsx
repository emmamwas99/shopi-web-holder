"use client";

import { useCallback, type ReactNode } from "react";
import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useBackDismiss } from "@/hooks/useBackDismiss";

/**
 * A destructive confirmation — delete a post, discard a draft. A short sheet
 * on a phone, a dialog on desktop. It opens over the record's own sheet, and
 * Back cancels it, returning there.
 */
export function ConfirmSheet({
  open,
  desktop,
  title,
  description,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  desktop: boolean | null;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const attemptClose = useCallback((): boolean => {
    if (busy) return false;
    onClose();
    return true;
  }, [busy, onClose]);
  const { requestClose } = useBackDismiss(open, attemptClose);

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
        <DialogContent
          className="z-[85] w-[min(92vw,440px)] rounded-[24px] border border-default bg-app p-0"
          overlayClassName="z-[82]"
        >
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children && <div className="px-6">{children}</div>}
          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={requestClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={busy}>
              {busy ? <InterlockingBalls size={20} /> : null}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && requestClose()}>
      <DrawerContent className="mx-auto w-full max-w-[480px] rounded-t-[24px] border-default bg-app">
        <DrawerHeader className="px-4 text-left">
          <DrawerTitle className="text-[17px] font-bold">{title}</DrawerTitle>
          <DrawerDescription className="text-[14px] text-muted">{description}</DrawerDescription>
        </DrawerHeader>
        {children && <div className="px-4 pb-2">{children}</div>}
        <DrawerFooter
          className="gap-2 px-4 pt-3"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
        >
          <Button
            variant="destructive"
            className="h-12 rounded-full text-[15px] font-semibold"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <InterlockingBalls size={20} /> : null}
            {confirmLabel}
          </Button>
          <Button
            variant="ghost"
            className="h-12 rounded-full text-[15px] font-semibold"
            onClick={requestClose}
            disabled={busy}
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
