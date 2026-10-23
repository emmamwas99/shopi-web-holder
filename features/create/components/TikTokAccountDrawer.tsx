"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { TiktokImportPanel } from "@/features/profile/components/TiktokImportPanel";

export function TikTokAccountDrawer({
  open,
  onOpenChange,
  onSelect,
  lang,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (shareUrl: string) => void | Promise<void>;
  lang: string;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[88svh] max-w-xl">
        <DrawerHeader className="pb-2 text-left">
          <DrawerTitle>My TikTok videos</DrawerTitle>
          <DrawerDescription>
            Connect your TikTok account, then choose a video for your post.
          </DrawerDescription>
        </DrawerHeader>
        <div
          data-vaul-no-drag
          className="min-h-0 flex-1 overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        >
          <TiktokImportPanel
            lang={lang}
            onUseSelectedVideo={(video) => onSelect(video.shareUrl)}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
