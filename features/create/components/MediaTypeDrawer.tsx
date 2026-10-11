"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SHOW_TIKTOK_CREATE_OPTIONS } from "@/features/create/utils/tiktokAvailability";
import { goBackOr } from "@/lib/useAppBack";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickVideo: () => void;
  onPickImage: () => void;
  onPickText: () => void;
  lang: string;
}

type MediaTypeOption = {
  key: string;
  label: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
  badge: string | null;
  icon: ReactNode;
};

export function MediaTypeDrawer({ open, onOpenChange, onPickVideo, onPickImage, onPickText, lang }: Props) {
  const router = useRouter();

  function handleClose() {
    onOpenChange(false);
    goBackOr(router, `/${lang}/for-you`);
  }

  const options: MediaTypeOption[] = [
    {
      key: "video",
      label: "Video",
      description: "MP4 or MOV · up to 10 min",
      onClick: onPickVideo,
      disabled: false,
      badge: null,
      icon: (
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgb(var(--brand-primary) / 0.12)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="5" width="15" height="14" rx="2.5"
              stroke="rgb(var(--brand-primary))" strokeWidth="1.8" fill="none" />
            <path d="M17 9l5-3v12l-5-3V9Z"
              stroke="rgb(var(--brand-primary))" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      ),
    },
    {
      key: "image",
      label: "Photos",
      description: "Up to 10 images",
      onClick: onPickImage,
      disabled: false,
      badge: null,
      icon: (
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgb(var(--brand-accent) / 0.12)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="4"
              stroke="rgb(var(--brand-accent))" strokeWidth="1.8" fill="none" />
            <circle cx="8.5" cy="8.5" r="2" fill="rgb(var(--brand-accent))" fillOpacity={0.7} />
            <path d="M2 15l5-5 4 4 3-3 8 8"
              stroke="rgb(var(--brand-accent))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ),
    },
    {
      key: "text",
      label: "Text Post",
      description: "Share thoughts, links or a question",
      onClick: onPickText,
      disabled: false,
      badge: null,
      icon: (
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgb(var(--brand-highlight) / 0.12)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="4"
              stroke="rgb(var(--brand-highlight))" strokeWidth="1.8" fill="none" />
            <path d="M7 8h10M7 12h10M7 16h6"
              stroke="rgb(var(--brand-highlight))" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      ),
    },
  ];
  if (SHOW_TIKTOK_CREATE_OPTIONS) {
    options.push({
      key: "tiktok",
      label: "Import from TikTok",
      description: "Paste a link or reuse a saved video",
      onClick: () => router.push(`/${lang}/upload/tiktok`),
      disabled: false,
      badge: null,
      icon: (
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgb(var(--color-bg-subtle))", border: "1px solid rgb(var(--color-border))" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.22 8.22 0 0 0 4.82 1.56V6.8a4.85 4.85 0 0 1-1.05-.11Z"
              fill="rgb(var(--color-text-muted))" />
          </svg>
        </div>
      ),
    });
  }

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <DrawerTitle>New Post</DrawerTitle>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface text-muted active:opacity-60 transition-opacity"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </DrawerHeader>

        <div className="flex flex-col gap-2 px-4 pb-8">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={opt.disabled ? undefined : () => { onOpenChange(false); opt.onClick(); }}
              disabled={opt.disabled}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left active:scale-[0.98] transition-all"
              style={{
                backgroundColor: "rgb(var(--color-bg-subtle))",
                border: "1px solid rgb(var(--color-border))",
                opacity: opt.disabled ? 0.45 : 1,
              }}
            >
              {opt.icon}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-default leading-tight" style={{ fontSize: "var(--text-md)" }}>
                  {opt.label}
                </p>
                <p className="text-muted mt-0.5" style={{ fontSize: "var(--text-sm)" }}>
                  {opt.description}
                </p>
              </div>
              {opt.badge ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: "rgb(var(--color-border))", color: "rgb(var(--color-text-muted))" }}>
                  {opt.badge}
                </span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
