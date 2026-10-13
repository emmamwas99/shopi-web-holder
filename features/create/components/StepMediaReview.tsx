"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

/**
 * StepMediaReview — shows the selected media with inline upload status.
 *
 * Key behaviours (async-first):
 *  - Media shows immediately from local blob URI — no waiting.
 *  - Items with status "uploading" / "processing" show a pulsing overlay.
 *  - "Next" is always available; the publish step guards readiness server-side.
 *  - When WS media:ready fires, the item upgrades to CDN url silently.
 *  - "Add more" fires new background uploads while user continues editing.
 */

import { useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useCreateStore, MediaItem } from "@/stores/create";
import { useMediaUpload } from "@/features/create/hooks/useMediaUpload";
import { getMediaPreviewSrc } from "@/features/create/utils/mediaPreview";
import {
  DetachMediaAssetDocument,
  ReorderDraftMediaDocument,
} from "@/types/__generated__/graphql";

export function StepMediaReview({ onBack }: { onBack?: () => void }) {
  const { draftId, mediaItems, contentType, removeMediaItem, setStep, error } =
    useCreateStore();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string | null>(
    mediaItems[0]?.id ?? null,
  );

  const [detachMediaAsset] = useMutation(DetachMediaAssetDocument);
  const [reorderDraftMedia] = useMutation(ReorderDraftMediaDocument);
  const { startImageUpload } = useMediaUpload();

  // Any non-error item is enough to proceed; backend gates publish on READY
  const canProceed =
    mediaItems.length > 0 && mediaItems.some((m) => m.status !== "error");
  const anyProcessing = mediaItems.some(
    (m) => m.status === "uploading" || m.status === "processing",
  );

  async function handleRemove(item: MediaItem) {
    if (!draftId) return;
    removeMediaItem(item.id);
    if (selected === item.id) {
      setSelected(mediaItems.find((m) => m.id !== item.id)?.id ?? null);
    }
    // Best-effort detach — ignore if fails (asset may not be attached yet if still uploading)
    await detachMediaAsset({
      variables: { draftId, mediaAssetId: item.id },
    }).catch(() => undefined);
  }

  function handleAddMore(files: FileList) {
    if (!draftId || !files.length) return;
    const remaining = 10 - mediaItems.length;
    const base = mediaItems.length;
    Array.from(files)
      .slice(0, remaining)
      .forEach((file, i) => {
        startImageUpload(file, draftId, base + i);
      });
  }

  async function handleNext() {
    if (!canProceed || !draftId) return;
    // Sync current order to backend (fire-and-forget — don't block UX)
    const orderedIds = mediaItems
      .filter((m) => m.status !== "error")
      .map((m) => m.id);
    reorderDraftMedia({
      variables: { draftId, orderedAssetIds: orderedIds },
    }).catch(() => undefined);
    setStep("edit");
  }

  const preview = mediaItems.find((m) => m.id === selected) ?? mediaItems[0];
  const previewSrc = getMediaPreviewSrc(preview);

  return (
    <div className="flex flex-col h-full">
      {/* Header — sticky so Next button is always reachable while scrolling */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 z-10"
        style={{ backgroundColor: "rgb(var(--color-bg))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to media selection"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-surface"
          style={{
            color: "rgb(var(--color-text-muted))",
          }}
        >
          <ChevronLeft size={23} strokeWidth={2.2} />
        </button>
        <h2
          className="font-semibold"
          style={{
            fontSize: "var(--text-lg)",
            color: "rgb(var(--color-text))",
          }}
        >
          {contentType === "video" ? "Video" : `Photos (${mediaItems.length})`}
        </h2>
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="font-semibold px-4 py-1.5 rounded-full transition-opacity"
          style={{
            backgroundColor: canProceed
              ? "rgb(var(--brand-primary))"
              : "rgb(var(--color-border))",
            color: "white",
            fontSize: "var(--text-sm)",
            opacity: canProceed ? 1 : 0.4,
          }}
        >
          Next
        </button>
      </div>

      {/* Processing banner — images only. Video uploads run silently in the
          background (the post is published instantly and goes live once Mux
          finishes), so we never show a "processing" indicator for video. */}
      {anyProcessing && contentType !== "video" && (
        <div
          className="mx-4 mb-2 rounded-xl px-3 py-2 flex items-center gap-2"
          style={{
            backgroundColor: "rgb(var(--brand-primary) / 0.08)",
            border: "1px solid rgb(var(--brand-primary) / 0.2)",
          }}
        >
          <MiniSpinner />
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "rgb(var(--brand-primary))",
            }}
          >
            Processing images in background…
          </span>
        </div>
      )}

      {/* Main preview */}
      <div
        className="mx-4 rounded-2xl overflow-hidden relative"
        style={{
          aspectRatio: contentType === "video" ? "9/16" : "1/1",
          maxHeight: 460,
          backgroundColor: "rgb(var(--color-bg-subtle))",
        }}
      >
        {preview ? (
          <>
            {preview.type === "video" && preview.localUri ? (
              /* Always use local blob for video preview — fast, no Mux needed */
              <video
                key={preview.localUri}
                src={preview.localUri}
                className="w-full h-full object-contain"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : previewSrc ? (
              <Image
                src={previewSrc}
                alt="preview"
                fill
                sizes="(max-width: 768px) 100vw, 460px"
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }} />
            )}

            {/* Status badge. Uploads run silently in the background for BOTH
                video and images — the user already sees their local preview,
                so "Uploading…/Processing…" noise only makes the flow feel
                slow. Only genuine failures surface. */}
            {preview.status === "error" && (
              <div
                className="absolute top-3 left-3 rounded-full px-3 py-1 flex items-center gap-1.5"
                style={{
                  backgroundColor: "rgb(0 0 0 / 0.82)",
                }}
              >
                <span
                  style={{ fontSize: "var(--text-xs)", color: "#ff5555" }}
                >
                  ✕ Failed
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <InterlockingBalls size={24} />
          </div>
        )}
      </div>

      {/* Thumbnail strip — multi-image only */}
      {contentType === "image" && (
        <div className="flex gap-2 px-4 mt-3 overflow-x-auto pb-1">
          {mediaItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item.id)}
              className="relative flex-shrink-0 rounded-xl overflow-hidden"
              style={{
                width: 104,
                height: 104,
                border:
                  selected === item.id
                    ? "2.5px solid rgb(var(--brand-primary))"
                    : "2px solid transparent",
              }}
            >
              {getMediaPreviewSrc(item) && (
                <Image
                  src={getMediaPreviewSrc(item)!}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
              )}
              {/* Failure overlay only — processing runs silently in the
                  background, same as video. */}
              {item.status === "error" && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: "rgb(0 0 0 / 0.45)" }}
                >
                  <span style={{ color: "#ff5555", fontSize: 16 }}>✕</span>
                </div>
              )}
              {/* Remove */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(item);
                }}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgb(0 0 0 / 0.6)" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6 6 18M6 6l12 12"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </button>
          ))}

          {/* Add more */}
          {mediaItems.length < 10 && (
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex-shrink-0 rounded-xl flex items-center justify-center"
              style={{
                width: 104,
                height: 104,
                backgroundColor: "rgb(var(--color-bg-subtle))",
                border: "1.5px dashed rgb(var(--color-border-strong))",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="rgb(var(--color-text-muted))"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="mx-4 mt-3 rounded-xl px-4 py-3"
          style={{
            backgroundColor: "rgb(var(--color-error) / 0.08)",
            border: "1px solid rgb(var(--color-error) / 0.2)",
            color: "rgb(var(--color-error))",
            fontSize: "var(--text-sm)",
          }}
        >
          {error}
        </div>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleAddMore(e.target.files)}
      />
    </div>
  );
}

function MiniSpinner() {
  return <InterlockingBalls size={14} />;
}
