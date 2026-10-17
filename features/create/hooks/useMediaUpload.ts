"use client";

/**
 * useMediaUpload — async-first media upload hook.
 *
 * Both kinds
 *   1. Add the item with its local blob → "uploading" (with progress)
 *   2. Ask the API for an upload URL, attach the asset to the draft, and PUT
 *      the original straight to R2
 *   3. Tell the API it arrived → "processing" (Sharp variants for a photo, Mux
 *      for a video). The seller can carry on: the blob previews meanwhile.
 *   4. media:ready over the socket, or the asset poll → "ready"
 *
 * Only two things are errors: a file that never reached storage, and media the
 * API reports FAILED. Both keep the File so the seller can tap Retry. Slow
 * processing is not an error — the original is safe in R2 and a post may go
 * out while its media finishes — so the item just stays "processing". Polling
 * the asset also lets the API finish it when its worker or Redis is down: it
 * checks Mux/R2 itself when the owner asks about a processing asset.
 */

import { useCallback } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { useCreateStore } from "@/stores/create";
import { trackPostJourney } from "@/lib/analytics";
import {
  RequestImageUploadDocument,
  NotifyImageUploadedDocument,
  RequestVideoUploadDocument,
  NotifyVideoUploadedDocument,
  GetMediaAssetDocument,
  AttachMediaAssetDocument,
  DetachMediaAssetDocument,
  type MediaAssetFieldsFragment,
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

const POLL_FAST_MS = 3_000;
const POLL_SLOW_MS = 8_000;
const POLL_FAST_FOR_MS = 60_000;
/** Past this the item is left "processing"; the API finishes it regardless. */
const POLL_GIVE_UP_MS = 20 * 60_000;
/** An upload that sends nothing for this long has dropped. */
const UPLOAD_STALL_MS = 45_000;

type Kind = "image" | "video";

/** The files behind failed items, so Retry can send the same file again. */
const retryableFiles = new Map<string, { file: File; sortOrder: number }>();

/** A failure whose message is already written for the seller. */
class UploadError extends Error {}

function label(kind: Kind) {
  return kind === "image" ? "photo" : "video";
}

function offlineMessage(kind: Kind) {
  return `Your ${label(kind)} couldn't upload. Check your connection and tap Retry.`;
}

/** What to tell the seller about a failed upload. */
function sellerMessage(err: unknown, kind: Kind): string {
  if (err instanceof UploadError) return err.message;
  const raw = err instanceof Error ? err.message : String(err);
  if (
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    /failed to fetch|network ?error|load failed|networkerror|timed? ?out/i.test(raw)
  ) {
    return offlineMessage(kind);
  }
  if (/not found in storage|never finished/i.test(raw)) {
    return `Your ${label(kind)} didn't finish uploading. Tap Retry.`;
  }
  // The API's own refusals are already worded for sellers (e.g. the 10-item cap).
  if (/at most \d+ media|draft/i.test(raw)) return raw;
  return `Your ${label(kind)} didn't upload. Tap Retry.`;
}

/** PUT a file to its presigned R2 URL, reporting progress; rejects on a stall. */
function putToStorage(
  url: string,
  file: File,
  contentType: string,
  kind: Kind,
  onProgress: (share: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    const armStall = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        xhr.abort();
        reject(
          new UploadError(
            `Your ${label(kind)} stopped uploading. Check your connection and tap Retry.`,
          ),
        );
      }, UPLOAD_STALL_MS);
    };

    xhr.upload.onprogress = (event) => {
      armStall();
      if (event.lengthComputable && event.total > 0) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      clearTimeout(stallTimer);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new UploadError(
            xhr.status === 403
              ? `The upload link for your ${label(kind)} expired. Tap Retry.`
              : `Your ${label(kind)} didn't upload. Tap Retry.`,
          ),
        );
      }
    };
    xhr.onerror = () => {
      clearTimeout(stallTimer);
      reject(new UploadError(offlineMessage(kind)));
    };
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    armStall();
    xhr.send(file);
  });
}

function readyPayload(
  mediaAssetId: string,
  a: Pick<MediaAssetFieldsFragment, "type" | "thumbnailUrl" | "r2Variants" | "muxMeta">,
): MediaReadyPayload {
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

type Outcome =
  | { kind: "ready"; ready: MediaReadyPayload }
  | { kind: "failed" }
  /** Removed from the composer, or still processing when we stopped asking. */
  | { kind: "left" };

export function useMediaUpload() {
  const { addMediaItem, updateMediaItem } = useCreateStore();
  const { on } = useSocket();
  const client = useApolloClient();

  const [requestImageUpload] = useMutation(RequestImageUploadDocument);
  const [notifyImageUploaded] = useMutation(NotifyImageUploadedDocument);
  const [requestVideoUpload] = useMutation(RequestVideoUploadDocument);
  const [notifyVideoUploaded] = useMutation(NotifyVideoUploadedDocument);
  const [attachMediaAsset] = useMutation(AttachMediaAssetDocument);
  const [detachMediaAsset] = useMutation(DetachMediaAssetDocument);

  /**
   * Resolve when the asset is ready or failed: whichever of the socket event
   * and the poll says so first. Never rejects — see the header.
   */
  const waitForAsset = useCallback(
    (mediaAssetId: string) =>
      new Promise<Outcome>((resolve) => {
        const started = Date.now();
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const finish = (outcome: Outcome) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          offReady();
          offFailed();
          resolve(outcome);
        };

        const offReady = on<MediaReadyPayload>(WS_EVENTS.MEDIA_READY, (p) => {
          if (p.mediaAssetId === mediaAssetId) finish({ kind: "ready", ready: p });
        });
        const offFailed = on<MediaFailedPayload>(WS_EVENTS.MEDIA_FAILED, (p) => {
          if (p.mediaAssetId === mediaAssetId) finish({ kind: "failed" });
        });

        const poll = async () => {
          if (settled) return;
          const stillHere = useCreateStore
            .getState()
            .mediaItems.some((m) => m.id === mediaAssetId);
          if (!stillHere || Date.now() - started > POLL_GIVE_UP_MS) {
            finish({ kind: "left" });
            return;
          }
          try {
            const { data } = await client.query({
              query: GetMediaAssetDocument,
              variables: { id: mediaAssetId },
              fetchPolicy: "network-only",
            });
            const a = data?.mediaAsset;
            if (a?.status === "READY") return finish({ kind: "ready", ready: readyPayload(mediaAssetId, a) });
            if (a?.status === "FAILED") return finish({ kind: "failed" });
          } catch {
            // A moment offline: keep asking.
          }
          if (settled) return;
          timer = setTimeout(
            poll,
            Date.now() - started < POLL_FAST_FOR_MS ? POLL_FAST_MS : POLL_SLOW_MS,
          );
        };
        timer = setTimeout(poll, POLL_FAST_MS);
      }),
    [on, client],
  );

  /** Steps 2–4 for one file whose item (`itemId`) is already in the store. */
  const runUpload = useCallback(
    async (file: File, did: string, sortOrder: number, kind: Kind, itemId: string) => {
      const method = useCreateStore.getState().creationMode ?? "unknown";
      let id = itemId;
      try {
        const contentType = file.type || (kind === "image" ? "image/jpeg" : "video/mp4");
        let uploadUrl: string;
        let mediaAssetId: string;
        if (kind === "image") {
          const { data, error } = await requestImageUpload({
            variables: { draftId: did, mimeType: contentType },
          });
          if (error || !data?.requestImageUpload) throw error ?? new Error("No upload URL");
          ({ uploadUrl, mediaAssetId } = data.requestImageUpload);
        } else {
          const { data, error } = await requestVideoUpload({ variables: { draftId: did } });
          if (error || !data?.requestVideoUpload) throw error ?? new Error("No upload URL");
          ({ uploadUrl, mediaAssetId } = data.requestVideoUpload);
        }

        // Removed while the upload was starting: don't attach it after all.
        if (!useCreateStore.getState().mediaItems.some((m) => m.id === id)) return;
        // Swap the placeholder id for the real one in place, so photos keep
        // the order they were picked in.
        updateMediaItem(id, { id: mediaAssetId });
        id = mediaAssetId;

        const attached = await attachMediaAsset({
          variables: { draftId: did, mediaAssetId, sortOrder },
        });
        if (attached.error) throw attached.error;

        await putToStorage(uploadUrl, file, contentType, kind, (progress) =>
          updateMediaItem(mediaAssetId, { progress }),
        );

        const notified =
          kind === "image"
            ? await notifyImageUploaded({ variables: { mediaAssetId } })
            : await notifyVideoUploaded({ variables: { mediaAssetId } });
        if (notified.error) throw notified.error;
        updateMediaItem(mediaAssetId, { status: "processing", progress: 1 });
        // Kept until it's ready, so a processing failure can still be retried.
        retryableFiles.set(mediaAssetId, { file, sortOrder });

        const outcome = await waitForAsset(mediaAssetId);
        if (outcome.kind === "ready") {
          retryableFiles.delete(mediaAssetId);
          const { ready } = outcome;
          const current = useCreateStore.getState().mediaItems.find((m) => m.id === mediaAssetId);
          updateMediaItem(
            mediaAssetId,
            kind === "image"
              ? {
                  status: "ready",
                  localUri: ready.url ?? current?.localUri ?? "",
                  thumbnailUrl: ready.thumbnailUrl ?? ready.url ?? current?.localUri,
                }
              : {
                  status: "ready",
                  thumbnailUrl: ready.thumbnailUrl ?? current?.localUri,
                  muxPlaybackId: ready.muxPlaybackId,
                },
          );
          trackPostJourney("post_media_upload_completed", { media_type: kind, method });
        } else if (outcome.kind === "failed") {
          updateMediaItem(mediaAssetId, {
            status: "error",
            errorMessage: `We couldn't process this ${label(kind)}. Tap Retry, or remove it.`,
          });
          trackPostJourney("post_media_upload_failed", { media_type: kind, method });
        } else {
          retryableFiles.delete(mediaAssetId);
        }
      } catch (err) {
        trackPostJourney("post_media_upload_failed", { media_type: kind, method });
        retryableFiles.set(id, { file, sortOrder });
        updateMediaItem(id, {
          status: "error",
          progress: undefined,
          errorMessage: sellerMessage(err, kind),
        });
      }
    },
    [
      requestImageUpload,
      requestVideoUpload,
      attachMediaAsset,
      notifyImageUploaded,
      notifyVideoUploaded,
      updateMediaItem,
      waitForAsset,
    ],
  );

  const startImageUpload = useCallback(
    (file: File, did: string, sortOrder = 0): string => {
      trackPostJourney("post_media_upload_started", {
        media_type: "image",
        method: useCreateStore.getState().creationMode ?? "unknown",
      });
      const localUri = URL.createObjectURL(file);
      const tempId = `temp-img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      addMediaItem({ id: tempId, localUri, type: "image", status: "uploading", progress: 0 });

      // Downscale a small JPEG of the picked image NOW (instant, no R2/Sharp
      // wait) so the edit step can run AI auto-fill immediately — the exact
      // mirror of the video flow's frame capture. Best-effort — never blocks
      // or fails the upload.
      captureImageFrame(file)
        .then((frame) => {
          if (frame) appendCachedFrames(did, [frame]);
        })
        .catch(() => undefined);

      void runUpload(file, did, sortOrder, "image", tempId);
      return tempId;
    },
    [addMediaItem, runUpload],
  );

  const startVideoUpload = useCallback(
    (file: File, did: string): string => {
      trackPostJourney("post_media_upload_started", {
        media_type: "video",
        method: useCreateStore.getState().creationMode ?? "unknown",
      });
      const localUri = URL.createObjectURL(file);
      const tempId = `temp-vid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      addMediaItem({ id: tempId, localUri, type: "video", status: "uploading", progress: 0 });

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

      void runUpload(file, did, 0, "video", tempId);
      return tempId;
    },
    [addMediaItem, runUpload],
  );

  /** Whether a failed item still has its file, so Retry can be offered. */
  const canRetry = useCallback((itemId: string) => retryableFiles.has(itemId), []);

  /**
   * Send a failed item's file again, in the same place in the grid. The old
   * asset (if the API had one) is detached so the draft doesn't keep it.
   */
  const retryUpload = useCallback(
    (itemId: string, did: string): boolean => {
      const saved = retryableFiles.get(itemId);
      const item = useCreateStore.getState().mediaItems.find((m) => m.id === itemId);
      if (!saved || !item) return false;
      retryableFiles.delete(itemId);

      if (!itemId.startsWith("temp-")) {
        detachMediaAsset({ variables: { draftId: did, mediaAssetId: itemId } }).catch(
          () => undefined,
        );
      }
      const tempId = `temp-retry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      updateMediaItem(itemId, {
        id: tempId,
        status: "uploading",
        progress: 0,
        errorMessage: undefined,
      });
      void runUpload(saved.file, did, saved.sortOrder, item.type, tempId);
      return true;
    },
    [detachMediaAsset, updateMediaItem, runUpload],
  );

  return { startImageUpload, startVideoUpload, retryUpload, canRetry };
}
