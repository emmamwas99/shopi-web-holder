"use client";

import { useRef } from "react";
import Image from "next/image";
import { useMutation } from "@apollo/client/react";
import { Camera, CircleAlert } from "lucide-react";
import { useCreateStore } from "@/stores/create";
import type { MediaItem } from "@/stores/create";
import { useMediaUpload } from "@/features/create/hooks/useMediaUpload";
import { DetachMediaAssetDocument } from "@/types/__generated__/graphql";
import {
  getMediaPreviewSrc,
  shouldUnoptimizeMedia,
} from "@/features/create/utils/mediaPreview";
import { TikTokCreatePreview } from "./TikTokCreatePreview";

const MAX_IMAGES = 10;

/**
 * MediaPicker — the media zone shown on the details (edit) step.
 *
 *  • Empty → a clean dotted picker. Tapping it opens the native file picker,
 *    accepting images (multiple) or a single video depending on the draft type.
 *  • Photos → a 3-column grid of thumbnails, each with an "×" remove button,
 *    plus an "add more" dotted tile until MAX_IMAGES is reached.
 *  • Video → an autoplay/muted/looping preview so the user always sees their
 *    clip (tap to unmute); replaceable via a small overlay button.
 *
 * The native file picker only opens when the user taps the dotted zone — the
 * type chooser no longer triggers it.
 */
export function MediaPicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { draftId, contentType, mediaItems, tiktokEmbed } = useCreateStore();
  const { startImageUpload, startVideoUpload } = useMediaUpload();
  const [detachMediaAsset] = useMutation(DetachMediaAssetDocument);

  const isVideo = contentType === "video";

  function openPicker() {
    inputRef.current?.click();
  }

  function openCamera() {
    cameraInputRef.current?.click();
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length || !draftId) return;
    if (isVideo) {
      startVideoUpload(files[0], draftId);
    } else {
      const remaining = MAX_IMAGES - mediaItems.length;
      const existing = mediaItems.length;
      Array.from(files)
        .slice(0, Math.max(0, remaining))
        .forEach((file, i) => startImageUpload(file, draftId, existing + i));
    }
    // Allow re-selecting the same file again after removal
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleRemove(item: MediaItem) {
    useCreateStore.getState().removeMediaItem(item.id);
    // Only detach server-side if it was actually attached (real asset id, not a
    // temp placeholder for an in-flight upload).
    if (draftId && !item.id.startsWith("temp-")) {
      detachMediaAsset({
        variables: { draftId, mediaAssetId: item.id },
      }).catch(() => undefined);
    }
  }

  const hiddenInput = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={isVideo ? "video/*" : "image/*"}
        multiple={!isVideo}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {!isVideo ? (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      ) : null}
    </>
  );

  // ── Empty state — dotted picker ────────────────────────────────────────────
  if (mediaItems.length === 0) {
    return (
      <div>
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl py-10 active:scale-[0.99] transition-transform"
          style={{
            border: "2px dashed rgb(var(--color-border))",
            backgroundColor: "rgb(var(--color-bg-subtle))",
            color: "rgb(var(--color-text-muted))",
          }}
        >
          <span
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 56,
              height: 56,
              backgroundColor: "rgb(var(--brand-primary) / 0.1)",
              color: "rgb(var(--brand-primary))",
            }}
          >
            {isVideo ? ICON_VIDEO : ICON_PHOTO}
          </span>
          <span
            className="font-semibold"
            style={{
              fontSize: "var(--text-md)",
              color: "rgb(var(--color-text))",
            }}
          >
            {isVideo ? "Add a video" : "Add photos"}
          </span>
          <span style={{ fontSize: "var(--text-sm)" }}>
            {isVideo
              ? "MP4 or MOV · up to 10 min"
              : `Up to ${MAX_IMAGES} images`}
          </span>
        </button>
        {!isVideo ? (
          <button
            type="button"
            onClick={openCamera}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-elevated px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
          >
            <Camera size={18} />
            Take photo
          </button>
        ) : null}
        {hiddenInput}
      </div>
    );
  }

  // ── Video — always show the buffer/preview ─────────────────────────────────
  if (isVideo) {
    if (tiktokEmbed) {
      return (
        <div>
          <TikTokCreatePreview
            embed={tiktokEmbed}
            className="mx-auto aspect-[9/16] max-w-60 rounded-2xl border border-border"
          />
        </div>
      );
    }

    const item = mediaItems[0];
    const src = getMediaPreviewSrc(item);
    return (
      <div>
        <div
          className="relative overflow-hidden rounded-2xl mx-auto"
          style={{
            aspectRatio: "9/16",
            maxWidth: 240,
            backgroundColor: "rgb(var(--color-bg))",
            border: "1px solid rgb(var(--color-border))",
          }}
        >
          {src ? (
            <video
              key={src}
              src={src}
              className="absolute inset-0 h-full w-full object-contain bg-black"
              autoPlay
              muted
              loop
              playsInline
              controls
              onClick={(e) => {
                // Tap to toggle mute (TikTok-style)
                e.currentTarget.muted = !e.currentTarget.muted;
              }}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ color: "rgb(var(--color-text-muted))" }}
            >
              {ICON_VIDEO}
            </div>
          )}

          {/* Replace button */}
          <button
            type="button"
            onClick={openPicker}
            className="absolute top-2 right-2 z-20 rounded-full px-3 py-1 text-white"
            style={{
              background: "rgba(0,0,0,0.55)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
            }}
          >
            Replace
          </button>
        </div>
        {hiddenInput}
      </div>
    );
  }

  // ── Photos — 3-col grid + add-more tile ────────────────────────────────────
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {mediaItems.map((item) => {
          const src = getMediaPreviewSrc(item);
          return (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-xl"
              style={{
                aspectRatio: "1/1",
                backgroundColor: "rgb(var(--color-bg-subtle))",
                border: "1px solid rgb(var(--color-border))",
              }}
            >
              {src ? (
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized={shouldUnoptimizeMedia(src)}
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ color: "rgb(var(--color-text-muted))" }}
                >
                  {ICON_PHOTO}
                </div>
              )}

              {/* Failure only — upload/processing runs silently in the
                  background (same as video); the local preview is already
                  showing, so a spinner overlay just makes it feel slow. */}
              {item.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
                  <CircleAlert size={20} className="text-white" aria-label="Upload failed" />
                </div>
              )}

              {/* Remove */}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 z-20 flex items-center justify-center rounded-full text-white active:opacity-70"
                style={{ width: 22, height: 22, background: "rgba(0,0,0,0.6)" }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* Add-more tile */}
        {mediaItems.length < MAX_IMAGES && (
          <>
            <button
              type="button"
              onClick={openPicker}
              className="flex flex-col items-center justify-center gap-1 rounded-xl active:scale-[0.97] transition-transform"
              style={{
                aspectRatio: "1/1",
                border: "2px dashed rgb(var(--color-border))",
                backgroundColor: "rgb(var(--color-bg-subtle))",
                color: "rgb(var(--color-text-muted))",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>
                Add
              </span>
            </button>
            <button
              type="button"
              onClick={openCamera}
              className="flex flex-col items-center justify-center gap-1 rounded-xl active:scale-[0.97] transition-transform"
              style={{
                aspectRatio: "1/1",
                border: "2px dashed rgb(var(--color-border))",
                backgroundColor: "rgb(var(--color-bg-subtle))",
                color: "rgb(var(--color-text-muted))",
              }}
            >
              <Camera size={22} />
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>
                Camera
              </span>
            </button>
          </>
        )}
      </div>
      <p
        className="mt-2"
        style={{
          fontSize: "var(--text-xs)",
          color: "rgb(var(--color-text-muted))",
        }}
      >
        {mediaItems.length}/{MAX_IMAGES} photos
      </p>
      {hiddenInput}
    </div>
  );
}

const ICON_VIDEO = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <rect
      x="2"
      y="5"
      width="14"
      height="14"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="M16 9.5l6-3v11l-6-3v-5Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const ICON_PHOTO = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <path
      d="M3 15l5-5 4 4 3-3 6 6"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);
