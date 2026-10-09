"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MapPin, Paperclip, Play, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Conversation, StagedMedia } from "../types";
import { QuickReplies } from "./QuickReplies";

interface Props {
  composer: string;
  conversation?: Conversation | null;
  currentUserId?: string | null;
  stagedMedia: StagedMedia | null;
  isUploading: boolean;
  disabledReason?: string | null;
  requireAuth: () => boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onQuickReply: (text: string) => void;
  onShareLocation: (
    latitude: number,
    longitude: number,
    locationLabel?: string,
  ) => void;
  onStageMedia: (file: File, kind: "image" | "video") => void;
  onClearStagedMedia: () => void;
}

const MAX_TEXTAREA_HEIGHT = 120; // px — ~5 lines before it scrolls internally

/** Message composer — staged-media preview, auto-sizing input, send button. */
export function Composer({
  composer,
  conversation,
  currentUserId,
  stagedMedia,
  isUploading,
  disabledReason,
  requireAuth,
  onChange,
  onSend,
  onQuickReply,
  onShareLocation,
  onStageMedia,
  onClearStagedMedia,
}: Props) {
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [locating, setLocating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Tapping the pin opens a confirm dialog first (sharing your live location is
  // privacy-sensitive). Auth + availability are checked before showing it.
  const openLocationConfirm = () => {
    if (!requireAuth()) return;
    if (!navigator.geolocation) {
      toast.error("Location isn't available on this device");
      return;
    }
    setConfirmOpen(true);
  };

  // Confirmed: capture the sender's current GPS position and share it as a
  // location pin. Reverse-geocoding for a human label is best-effort — the
  // coords are what matter (the receiver opens them in their maps app).
  const handleShareLocation = () => {
    setConfirmOpen(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let label: string | undefined;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=16`,
            { headers: { "Accept-Language": "en" } },
          );
          const json = await res.json();
          label = json?.display_name || undefined;
        } catch {
          // best-effort; send without a label
        }
        onShareLocation(latitude, longitude, label);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Allow location access to share your location"
            : "Couldn't get your location",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  // Auto-grow the textarea to fit its content (capped), so it behaves like
  // WhatsApp: one line by default, expanding as you type.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [composer]);

  const disabled = Boolean(disabledReason);
  const canSend =
    !disabled && (Boolean(stagedMedia) || composer.trim().length > 0);

  const handleSendClick = () => {
    if (!canSend) return;
    onSend();
    // Close the keyboard on send and let the list scroll to the latest message.
    textareaRef.current?.blur();
  };

  return (
    <div
      className="sticky bottom-0 z-10 shrink-0 no-scroll-indicator border-t px-4 pt-3"
      style={{
        borderColor: "rgb(var(--color-border))",
        backgroundColor: "rgb(var(--color-bg))",
        // Pin to the bottom of the viewport and keep clear of the home-indicator
        // / device safe area, plus a little breathing room above it.
        paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)",
      }}
    >
      {/* ── Quick-reply chips ("peels") — only when idle (no draft/media) ── */}
      {!stagedMedia && composer.trim().length === 0 ? (
        <div>
          <QuickReplies
            disabled={disabled}
            conversation={conversation}
            currentUserId={currentUserId}
            onSend={onQuickReply}
          />
        </div>
      ) : null}

      {/* ── Staged-media preview (above the input row) ── */}
      {stagedMedia ? (
        <div className="mb-2 flex items-center gap-3">
          <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-black/5">
            {stagedMedia.previewUrl ? (
              <Image
                src={stagedMedia.previewUrl}
                alt="Attachment preview"
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 bg-black/20" />
            )}
            {stagedMedia.kind === "video" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play size={16} className="text-white" fill="currentColor" />
              </div>
            ) : null}
          </div>
          <span className="flex-1 truncate text-xs text-muted">
            {stagedMedia.kind === "video" ? "Video" : "Photo"} ready to send
          </span>
          <button
            type="button"
            onClick={onClearStagedMedia}
            aria-label="Remove attachment"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 dark:bg-white/10"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      <div className="flex no-scroll-indicator items-end gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={() => {
            if (!requireAuth()) return;
            mediaInputRef.current?.click();
          }}
          disabled={isUploading || disabled}
          aria-label="Attach photo or video"
        >
          <Paperclip size={15} />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={openLocationConfirm}
          disabled={locating || disabled}
          aria-label="Share my location"
          title="Share my location"
        >
          {locating ? (
            <InterlockingBalls size={15} />
          ) : (
            <MapPin size={15} />
          )}
        </Button>

        <textarea
          ref={textareaRef}
          value={composer}
          onChange={(event) => onChange(event.target.value)}
          placeholder={disabledReason || "Message..."}
          rows={1}
          disabled={disabled}
          className="flex-1 overflow-y-auto no-scroll-indicator resize-none rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-sm focus:ring-1 focus:ring-gray-700"
          style={{
            borderColor: "rgb(var(--color-border))",
            maxHeight: MAX_TEXTAREA_HEIGHT,
            // Belt-and-suspenders: kill the scroll indicator + native textarea
            // chrome inline so it doesn't depend on the utility class compiling.
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitAppearance: "none",
            resize: "none",
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSendClick();
            }
          }}
        />

        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={handleSendClick}
          disabled={!canSend}
        >
          <Send className="text-white" size={18} />
        </Button>
      </div>

      {/* One attachment input — kind is derived from the file's MIME type.
          Selecting only STAGES the file; upload happens on Send. */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            const kind = file.type.startsWith("video/") ? "video" : "image";
            onStageMedia(file, kind);
            // Refocus so the keyboard/caption flow stays active.
            textareaRef.current?.focus();
          }
          event.currentTarget.value = "";
        }}
      />

      {/* Confirm before sharing live location — privacy-sensitive action. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              Share your location
            </DialogTitle>
            <DialogDescription>
              This sends your current location to this chat. The other person
              can open it in their maps app to find you.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="text-white"
              type="button"
              onClick={handleShareLocation}
            >
              Share location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
