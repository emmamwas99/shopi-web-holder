"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import {
  NotifyImageUploadedDocument,
  NotifyVideoUploadedDocument,
  RequestImageUploadDocument,
  RequestVideoUploadDocument,
} from "@/types/__generated__/graphql";
import { putToStorage, type Kind } from "@/features/create/hooks/useMediaUpload";

/**
 * Upload one photo or video for a post being edited: the create flow's
 * MediaAsset path (presigned PUT straight to R2, then notify), without a
 * draft. Resolves with the asset id once the original is safely stored; Sharp
 * or Mux finishes it in the background, and the post accepts it meanwhile.
 */
export function usePostMediaUpload() {
  const [requestImageUpload] = useMutation(RequestImageUploadDocument);
  const [requestVideoUpload] = useMutation(RequestVideoUploadDocument);
  const [notifyImageUploaded] = useMutation(NotifyImageUploadedDocument);
  const [notifyVideoUploaded] = useMutation(NotifyVideoUploadedDocument);

  return useCallback(
    async (file: File, kind: Kind, onProgress: (share: number) => void): Promise<string> => {
      const contentType = file.type || (kind === "image" ? "image/jpeg" : "video/mp4");
      let uploadUrl: string;
      let mediaAssetId: string;
      if (kind === "image") {
        const { data, error } = await requestImageUpload({
          variables: { mimeType: contentType },
        });
        if (error || !data?.requestImageUpload) throw error ?? new Error("No upload URL");
        ({ uploadUrl, mediaAssetId } = data.requestImageUpload);
      } else {
        const { data, error } = await requestVideoUpload({ variables: {} });
        if (error || !data?.requestVideoUpload) throw error ?? new Error("No upload URL");
        ({ uploadUrl, mediaAssetId } = data.requestVideoUpload);
      }

      await putToStorage(uploadUrl, file, contentType, kind, onProgress);

      const notified =
        kind === "image"
          ? await notifyImageUploaded({ variables: { mediaAssetId } })
          : await notifyVideoUploaded({ variables: { mediaAssetId } });
      if (notified.error) throw notified.error;
      return mediaAssetId;
    },
    [requestImageUpload, requestVideoUpload, notifyImageUploaded, notifyVideoUploaded],
  );
}
