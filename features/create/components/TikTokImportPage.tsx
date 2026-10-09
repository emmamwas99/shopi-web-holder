"use client";

/**
 * TikTokImportPage - the standalone /upload/tiktok route.
 *
 * The create flow no longer navigates here (the TikTok picker renders inline
 * in the desktop create dialog and in the mobile picker page; see TikTokPicker).
 * This route stays for deep links and older entry points, hosting the same
 * shared picker (paste a link, or reuse an already-imported video) in its own
 * shell.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TikTokPicker } from "./TikTokPicker";
import { CreateErrorDialog } from "./CreateErrorDialog";

interface Props {
  lang: string;
}

export function TikTokImportPage({ lang }: Props) {
  const router = useRouter();
  const isDesktop = useIsDesktop({ ssrDefault: false });
  // Draft-creation failures (e.g. "Maximum active drafts reached") shown in a
  // dialog, same as the other create-flow entry points.
  const [createError, setCreateError] = useState<string | null>(null);

  // After the draft is created from the imported video, desktop resumes inside the /upload
  // dialog; mobile continues on the full-page flow.
  function handleUsed() {
    if (isDesktop) {
      router.push(`/${lang}/upload`);
      return;
    }
      router.push(`/${lang}/upload/create-manual`);
  }

  return (
    <PageShell lang={lang}>
      <CreateErrorDialog
        message={createError}
        onClose={() => setCreateError(null)}
      />
      <TikTokPicker
        lang={lang}
        onUsed={handleUsed}
        onError={(message) => setCreateError(message)}
      />
    </PageShell>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

function PageShell({
  lang,
  children,
}: {
  lang: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop({ ssrDefault: false });

  function goBackToPicker() {
    // The picker pushed us here, so plain Back reopens it (as the intercepted
    // modal) over whatever page it was opened from. Fall back to a direct
    // navigation when this page was the entry point (hard load / shared link).
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(`/${lang}/upload`);
  }

  const shellBody = (
    <div className="flex flex-col bg-app overflow-hidden fixed inset-0 md:static md:inset-auto md:w-[860px] md:max-w-[95vw] md:max-h-[90vh] md:min-h-[600px]">
      <div
        className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-4"
        style={{ borderBottom: "1px solid rgb(var(--color-border))" }}
      >
        <button
          onClick={goBackToPicker}
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
          aria-label="Back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1
          className="font-semibold"
          style={{
            fontSize: "var(--text-xl)",
            color: "rgb(var(--color-text))",
          }}
        >
          Add from TikTok
        </h1>
      </div>
      {children}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) goBackToPicker();
        }}
      >
        <DialogContent className="w-[min(94vw,900px)] max-w-none overflow-hidden rounded-3xl border border-default bg-app p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Add from TikTok</DialogTitle>
            <DialogDescription>
              Paste a TikTok link or reuse a saved video, then continue
              creating a Shopi post.
            </DialogDescription>
          </DialogHeader>
          {shellBody}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    /*
     * Mobile: fixed full-viewport column, only list scrolls.
     */
    shellBody
  );
}
