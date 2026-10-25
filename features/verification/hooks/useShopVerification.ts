"use client";

import { useCallback, useEffect } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import type { ApolloCache } from "@apollo/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useAuthStore } from "@/stores/auth";
import { refreshAccessToken } from "@/lib/auth/refresh-token";
import { useSocket } from "@/hooks/useSocket";
import { WS_EVENTS } from "@/lib/socket/socket-events";
import type { NotificationSocketPayload } from "@/features/notifications/types";
import {
  MY_SHOP_VERIFICATION,
  REMOVE_SHOP_VERIFICATION_DOCUMENT,
  SAVE_SHOP_VERIFICATION_DRAFT,
  SUBMIT_SHOP_VERIFICATION,
  UPDATE_VERIFIED_SHOP_LOCATION,
  WITHDRAW_SHOP_VERIFICATION,
  type MyShopVerification,
  type ShopVerification,
  type ShopVerificationDocumentKind,
} from "../api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** The API refuses anything bigger; say so before a slow upload finds out. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/**
 * The seller's verification, shared by every surface that shows it — the
 * profile menu row, the dashboard, the profile header and the screen itself —
 * so they all read one cached copy and update together.
 */
export function useMyShopVerification(options: { fetchPolicy?: "cache-first" | "cache-and-network" } = {}) {
  const { isAuthenticated } = useAuthSession();
  const query = useQuery(MY_SHOP_VERIFICATION, {
    skip: !isAuthenticated,
    fetchPolicy: options.fetchPolicy ?? "cache-first",
    errorPolicy: "all",
  });
  const { refetch } = query;
  const { on } = useSocket();

  // A decision lands as a notification: refresh straight away, so the menu
  // row, the profile tick and an open verification screen all move with it.
  useEffect(() => {
    if (!isAuthenticated) return;
    return on<NotificationSocketPayload>(WS_EVENTS.NOTIFICATION, (payload) => {
      if (payload?.notification?.type === "SHOP_VERIFICATION") void refetch();
    });
  }, [isAuthenticated, on, refetch]);

  return { ...query, verification: query.data?.myShopVerification ?? null, isAuthenticated };
}

/** Where the seller stands, in one word the menus can use. */
export type VerificationStage = "none" | "draft" | "pending" | "changes" | "removed" | "verified";

export function verificationStage(verification: MyShopVerification | null | undefined): VerificationStage {
  const status = verification?.application?.status;
  if (status === "PENDING") return "pending";
  if (status === "APPROVED") return "verified";
  if (status === "REJECTED") return "changes";
  if (verification?.isVerified) return "verified";
  if (status === "REVOKED") return "removed";
  if (status === "DRAFT") return "draft";
  return "none";
}

function writeApplication(cache: ApolloCache, application: ShopVerification) {
  cache.updateQuery({ query: MY_SHOP_VERIFICATION }, (data) =>
    data ? { myShopVerification: { ...data.myShopVerification, application } } : data,
  );
}

export class UploadError extends Error {}

/**
 * POST one file with real progress (fetch can't report upload progress). A
 * stale access token gets one refresh-and-retry, the same as GraphQL calls.
 */
function postFile(
  kind: ShopVerificationDocumentKind,
  file: File,
  token: string | null,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<{ status: number; error?: string; retryAfterSeconds?: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/verification/documents/${kind === "PERMIT" ? "permit" : "shop-photo"}`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let body: { error?: string; retryAfterSeconds?: number } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      resolve({ status: xhr.status, error: body?.error, retryAfterSeconds: body?.retryAfterSeconds });
    };
    xhr.onerror = () => reject(new UploadError("Upload failed — check your connection and try again."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

/**
 * A 20MP phone photo is 8–12 MB, which crawls up a mobile connection. Above
 * 8 MB, scale it to 3200px first — still sharp enough to read a permit. Smaller
 * photos go up untouched, so the reviewer still sees the camera details.
 */
async function shrinkIfHuge(file: File): Promise<File> {
  const shrinkable = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  if (!shrinkable || file.size <= 8 * 1024 * 1024 || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 3200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function useShopVerificationActions() {
  const client = useApolloClient();
  const [saveDraft, saveState] = useMutation(SAVE_SHOP_VERIFICATION_DRAFT, {
    update: (cache, { data }) => data && writeApplication(cache, data.saveShopVerificationDraft),
  });
  const [removeDocument, removeState] = useMutation(REMOVE_SHOP_VERIFICATION_DOCUMENT, {
    update: (cache, { data }) => data && writeApplication(cache, data.removeShopVerificationDocument),
  });
  const [submit, submitState] = useMutation(SUBMIT_SHOP_VERIFICATION, {
    update: (cache, { data }) => data && writeApplication(cache, data.submitShopVerification),
  });
  const [withdraw, withdrawState] = useMutation(WITHDRAW_SHOP_VERIFICATION, {
    update: (cache, { data }) => data && writeApplication(cache, data.withdrawShopVerification),
  });
  const [updateVerifiedLocation, updateLocationState] = useMutation(UPDATE_VERIFIED_SHOP_LOCATION, {
    update: (cache, { data }) => data && writeApplication(cache, data.updateVerifiedShopLocation),
  });

  const upload = useCallback(
    async (
      kind: ShopVerificationDocumentKind,
      original: File,
      onProgress: (fraction: number) => void,
      signal?: AbortSignal,
    ): Promise<void> => {
      const file = await shrinkIfHuge(original);
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new UploadError("That file is larger than 15 MB. Try a photo from your camera, or a smaller PDF.");
      }

      let result = await postFile(kind, file, useAuthStore.getState().accessToken, onProgress, signal);
      if (result.status === 401) {
        const fresh = await refreshAccessToken();
        if (!fresh) throw new UploadError("Your session has ended. Sign in again to continue.");
        result = await postFile(kind, file, fresh, onProgress, signal);
      }
      if (result.status === 429) {
        const minutes = Math.max(1, Math.ceil((result.retryAfterSeconds ?? 600) / 60));
        throw new UploadError(`You've uploaded a lot in a short time. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
      }
      if (result.status >= 400) throw new UploadError(result.error ?? "Upload failed. Please try again.");

      // The REST reply has no cache metadata; read the application back through
      // GraphQL so every screen showing it updates together.
      await client.query({ query: MY_SHOP_VERIFICATION, fetchPolicy: "network-only" });
    },
    [client],
  );

  return {
    saveDraft,
    removeDocument,
    submit,
    withdraw,
    updateVerifiedLocation,
    upload,
    saving: saveState.loading,
    removing: removeState.loading,
    submitting: submitState.loading,
    withdrawing: withdrawState.loading,
    updatingLocation: updateLocationState.loading,
  };
}
