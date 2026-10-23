"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { TikTokLibrary } from "./TikTokLibrary";

/**
 * Bottom sheet over the agent flow. Paste box on top; videos already
 * downloaded from TikTok underneath when there are any. With no history it is
 * just the paste box, so a first-time import is a single short sheet.
 */
export function TikTokImportDrawer({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (shareUrl: string) => void | Promise<void>;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[88svh] max-w-xl">
        <DrawerHeader className="pb-2 text-left">
          <DrawerTitle>Import from TikTok</DrawerTitle>
          <DrawerDescription>
            Paste a link, or reuse a video you&apos;ve already downloaded.
          </DrawerDescription>
        </DrawerHeader>
        <div
          data-vaul-no-drag
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        >
          <TikTokLibrary onSelectUrl={onSelect} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
