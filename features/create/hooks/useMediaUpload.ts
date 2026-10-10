"use client";

/**
 * useMediaUpload — async-first media upload hook.
 *
 * Image flow
 *   1. Add item with localUri (blob) → status "uploading"
 *   2. Request a presigned R2 URL + upload the raw image directly to R2
 *   3. Notify the API → Sharp variants run in the background worker
 *   4. User CAN PROCEED immediately — blob shows until CDN variants are ready
 *
 * Video flow
 *   1. Add item with localUri (blob) → status "uploading"
 *   2. Get Mux upload URL + PUT to Mux (background)
 *   3. User CAN PROCEED immediately — blob plays in preview
 *   4. WS media:ready fires → attach muxPlaybackId, "ready"
 *      Fallback: poll if socket not connected
 */

import { useCallback } from "react";
import { useMutation, useLazyQuery } from "@apollo/client/react";
import { useCreateStore } from "@/stores/create";
import { trackPostJourney } from "@/lib/analytics";
import {
  RequestImageUploadDocument,
  NotifyImageUploadedDocument,
  RequestVideoUploadDocument,
  NotifyVideoUploadedDocument,
  GetMediaAssetDocument,
  AttachMediaAssetDocument,
} from "@/types/__generated__/graphql";
import { useSocket } from "@/hooks/useSocket";
import {
  WS_EVENTS,
  type MediaReadyPayload,
  type MediaFailedPayload,
} from "@/lib/socket";
import {
  captureVideoFrames,
  setCachedVideoFrames,
  captureImageFrame,
  appendCachedFrames,
} from "@/features/create/utils/captureVideoFrames";

const WS_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 40;

export function useMediaUpload() {
  const { addMediaItem, updateMediaItem } = useCreateStore();
  const { on } = useSocket();

  const [requestImageUpload] = useMutation(RequestImageUploadDocument);
  const [notifyImageUploaded] = useMutation(NotifyImageUploadedDocument);
  const [requestVideoUpload] = useMutation(RequestVideoUploadDocument);
  const [notifyVideoUploaded] = useMutation(NotifyVideoUploadedDocument);
  const [attachMediaAsset] = useMutation(AttachMediaAssetDocument);
  const [getMediaAsset] = useLazyQuery(GetMediaAssetDocument, {
    fetchPolicy: "network-only",
  });

  // ── Wait for WS media:ready for a specific asset ───────────────────────────
  const waitForReady = useCallback(
    (mediaAssetId: string): Promise<MediaReadyPayload> => {
      return new Promise<MediaReadyPayload>((resolve, reject) => {
        let done = false;

        const finish = (fn: () => void) => {
          if (done) return;
          done = true;
          fn();
        };

        const offReady = on<MediaReadyPayload>(WS_EVENTS.MEDIA_READY, (p) => {
          if (p.mediaAssetId !== mediaAssetId) return;
          offReady(); offFailed(); clearTimeout(timer);
          finish(() => resolve(p));
        });

        const offFailed = on<MediaFailedPayload>(WS_EVENTS.MEDIA_FAILED, (p) => {
          if (p.mediaAssetId !== mediaAssetId) return;
          offReady(); offFailed(); clearTimeout(timer);
          finish(() => reject(new Error(p.errorMessage || "Processing failed")));
        });

        const timer = setTimeout(async () => {
          offReady(); offFailed();
          if (done) return;
          try {
            const { data } = await getMediaAsset({ variables: { id: mediaAssetId } });
            const a = data?.mediaAsset;
            if (a?.status === "READY") {
              finish(() => resolve({
                mediaAssetId,
                type: a.type === "VIDEO" ? "video" : "image",
                thumbnailUrl: a.thumbnailUrl ?? undefined,
                url: a.r2Variants?.find((v) => v.variant === "medium")?.url ?? a.thumbnailUrl ?? undefined,
                muxPlaybackId: a.muxMeta?.playbackId ?? undefined,
                aspectRatio: a.muxMeta?.aspectRatio ?? undefined,
                duration: a.muxMeta?.duration ?? undefined,
              }));
            } else {
              finish(() => reject(new Error("Timed out waiting for media processing")));
            }
          } catch {
            finish(() => reject(new Error("Timed out waiting for media processing")));
          }
        }, WS_TIMEOUT_MS);
      });
    },
    [on, getMediaAsset],
  );

  // ── Poll fallback (no socket) ──────────────────────────────────────────────
  const pollUntilReady = useCallback(
    async (mediaAssetId: string): Promise<MediaReadyPayload> => {
      for (let i = 0; i < MAX_POLLS; i++) {
        await sleep(POLL_INTERVAL_MS);
        const { data } = await getMediaAsset({ variables: { id: mediaAssetId } });
        const a = data?.mediaAsset;
        if (!a) continue;
        if (a.status === "READY") {
          return {
            mediaAssetId,
            type: a.type === "VIDEO" ? "video" : "image",
            thumbnailUrl: a.thumbnailUrl ?? undefined,
            url: a.r2Variants?.find((v) => v.variant === "medium")?.url ?? a.thumbnailUrl ?? undefined,
            muxPlaybackId: a.muxMeta?.playbackId ?? undefined,
            aspectRatio: a.muxMeta?.aspectRatio ?? undefined,
            duration: a.muxMeta?.duration ?? undefined,
          };
        }
        if (a.status === "FAILED") throw new Error(a.errorMessage ?? "Processing failed");
      }
      throw new Error("Timed out waiting for media processing");
    },
    [getMediaAsset],
  );

  const waitForAsset = useCallback(
    async (mediaAssetId: string): Promise<MediaReadyPayload> => {
      const { getSocket } = await import("@/lib/socket");
      return getSocket().connected
        ? waitForReady(mediaAssetId)
        : pollUntilReady(mediaAssetId);
    },
    [waitForReady, pollUntilReady],
  );

  // ── Image: direct PUT to R2, then queued Sharp processing ──────────────────
  const startImageUpload = useCallback(
    (file: File, did: string, sortOrder = 0): string => {
      trackPostJourney("post_media_upload_started", {
        media_type: "image",
        method: useCreateStore.getState().creationMode ?? "unknown",
      });
      const localUri = URL.createObjectURL(file);
      const tempId = `temp-img-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      addMediaItem({ id: tempId, localUri, type: "image", status: "uploading" });

      // Downscale a small JPEG of the picked image NOW (instant, no R2/Sharp
      // wait) so the edit step can run AI auto-fill immediately — the exact
      // mirror of the video flow's frame capture. Best-effort — never blocks
      // or fails the upload.
      captureImageFrame(file)
        .then((frame) => {
          if (frame) appendCachedFrames(did, [frame]);
        })
        .catch(() => undefined);

      (async () => {
        let mediaAssetId: string | null = null;
        try {
          const { data, error } = await requestImageUpload({
            variables: {
              draftId: did,
              mimeType: file.type || "image/jpeg",
            },
          });
          if (error || !data?.requestImageUpload) {
            throw new Error(error?.message ?? "Image upload URL failed");
          }

          mediaAssetId = data.requestImageUpload.mediaAssetId;
          const { uploadUrl } = data.requestImageUpload;

          useCreateStore.getState().removeMediaItem(tempId);
          addMediaItem({ id: mediaAssetId, localUri, type: "image", status: "uploading" });

          await attachMediaAsset({
            variables: { draftId: did, mediaAssetId, sortOrder },
          });

          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type || "image/jpeg" },
          });
          if (!uploadRes.ok) throw new Error(`R2 upload failed: ${uploadRes.status}`);

          await notifyImageUploaded({ variables: { mediaAssetId } });
          updateMediaItem(mediaAssetId, { status: "processing" });

          const ready = await waitForAsset(mediaAssetId);
          updateMediaItem(mediaAssetId, {
            status: "ready",
            localUri: ready.url ?? localUri,
            thumbnailUrl: ready.thumbnailUrl ?? ready.url ?? localUri,
          });
          trackPostJourney("post_media_upload_completed", {
            media_type: "image",
            method: useCreateStore.getState().creationMode ?? "unknown",
          });
        } catch (err) {
          trackPostJourney("post_media_upload_failed", {
            media_type: "image",
            method: useCreateStore.getState().creationMode ?? "unknown",
          });
          const id = mediaAssetId ?? tempId;
          updateMediaItem(id, { status: "error", errorMessage: String(err) });
          if (mediaAssetId && mediaAssetId !== tempId) {
            useCreateStore.getState().removeMediaItem(tempId);
          }
        }
      })();

      return tempId;
    },
    [
      addMediaItem,
      updateMediaItem,
      requestImageUpload,
      notifyImageUploaded,
      attachMediaAsset,
      waitForAsset,
    ],
  );

  // ── Video: fire-and-forget — user gets preview IMMEDIATELY from blob ────────
  const startVideoUpload = useCallback(
    (file: File, did: string): string => {
      trackPostJourney("post_media_upload_started", {
        media_type: "video",
        method: useCreateStore.getState().creationMode ?? "unknown",
      });
      const localUri = URL.createObjectURL(file);
      const tempId = `temp-vid-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      addMediaItem({ id: tempId, localUri, type: "video", status: "uploading" });

      // Snapshot a few frames from the local file NOW (instant, no Mux wait) so
      // the AI-guided flow can extract immediately. Cached by draftId and
      // consumed once. Best-effort — never blocks the upload.
      //
      // Skipped in manual mode: that composer is fully hand-written and never
      // reads the cache, so decoding frames there is pure wasted work on the
      // user's device (and on mobile, wasted memory) for a result nobody uses.
      if (useCreateStore.getState().creationMode !== "manual") {
        captureVideoFrames(file)
          .then((frames) => {
            if (frames.length > 0) setCachedVideoFrames(did, frames);
          })
          .catch(() => undefined);
      }

      (async () => {
        let mediaAssetId: string | null = null;
        try {
          const { data, error } = await requestVideoUpload({
            variables: { draftId: did },
          });
          if (error || !data?.requestVideoUpload) throw new Error(error?.message ?? "Upload URL failed");
          mediaAssetId = data.requestVideoUpload.mediaAssetId;
          const { uploadUrl } = data.requestVideoUpload;

          useCreateStore.getState().removeMediaItem(tempId);
          addMediaItem({ id: mediaAssetId, localUri, type: "video", status: "processing" });

          await attachMediaAsset({
            variables: { draftId: did, mediaAssetId, sortOrder: 0 },
          });

          const res = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type || "video/mp4" },
          });
          if (!res.ok) throw new Error(`Mux upload failed: ${res.status}`);

          await notifyVideoUploaded({ variables: { mediaAssetId } });

          const ready = await waitForAsset(mediaAssetId);
          updateMediaItem(mediaAssetId, {
            status: "ready",
            thumbnailUrl: ready.thumbnailUrl ?? localUri,
            muxPlaybackId: ready.muxPlaybackId,
          });
          trackPostJourney("post_media_upload_completed", {
            media_type: "video",
            method: useCreateStore.getState().creationMode ?? "unknown",
          });
        } catch (err) {
          trackPostJourney("post_media_upload_failed", {
            media_type: "video",
            method: useCreateStore.getState().creationMode ?? "unknown",
          });
          const id = mediaAssetId ?? tempId;
          updateMediaItem(id, { status: "error", errorMessage: String(err) });
          if (mediaAssetId && mediaAssetId !== tempId) {
            useCreateStore.getState().removeMediaItem(tempId);
          }
        }
      })();

      return tempId;
    },
    [addMediaItem, updateMediaItem, requestVideoUpload, notifyVideoUploaded, attachMediaAsset, waitForAsset],
  );

  return { startImageUpload, startVideoUpload };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
