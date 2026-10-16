"use client";

/**
 * CreateErrorDialog — clean shadcn dialog for draft-creation failures on the
 * upload entry points (photo, video and TikTok import alike).
 *
 * Known backend errors get friendly copy (e.g. "Maximum active drafts
 * reached"); anything else falls back to a generic title with the raw message.
 */

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Unwrap Apollo/Error wrappers down to the human-readable message. */
export function createErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // ApolloError exposes the first GraphQL error via .message already, but
    // String(err) style prefixes ("ApolloError: …", "Error: …") may have been
    // baked in by callers — strip them.
    return err.message.replace(/^(ApolloError|Error):\s*/, "");
  }
  return String(err).replace(/^(ApolloError|Error):\s*/, "");
}

function copyFor(message: string): { title: string; body: string } {
  if (/maximum active drafts/i.test(message)) {
    return {
      title: "Draft limit reached",
      body: "You have too many unfinished drafts. Publish or delete one from your Profile → Drafts, then try again.",
    };
  }
  return {
    title: "Couldn't create your post",
    body: message || "Something went wrong. Please try again.",
  };
}

export function CreateErrorDialog({
  message,
  onClose,
  title,
}: {
  /** The error to show; null renders nothing. */
  message: string | null;
  onClose: () => void;
  /** Override the default creation-error title for publish and save failures. */
  title?: string;
}) {
  if (message === null) return null;
  const copy = copyFor(createErrorMessage(message));
  const dialogTitle = title ?? copy.title;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        // Must win over full-screen hosts that sit above the default Dialog
        // z-50 (e.g. the mobile TikTok picker view at z-60) — this dialog is
        // a blocking confirmation and should always render on top.
        className="z-90 w-[min(92vw,420px)] rounded-3xl border border-default bg-app p-6"
        overlayClassName="z-90"
      >
        <DialogHeader className="items-center text-center sm:text-center">
          <span
            className="mb-1 flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              backgroundColor: "rgb(var(--color-error) / 0.1)",
              color: "rgb(var(--color-error))",
            }}
          >
            <CircleAlert size={24} />
          </span>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {copy.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={onClose}
            className="h-11 w-full rounded-2xl font-semibold text-white sm:w-40"
            style={{ backgroundColor: "rgb(var(--brand-primary))" }}
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
