/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useEffect, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { useCreateStore } from "@/stores/create";
import type { CreateStep } from "@/stores/create";
import { StepEdit } from "./StepEdit";
import { StepMediaReview } from "./StepMediaReview";
import { StepOptions } from "./StepOptions";
import { useRouter } from "next/navigation";
import { GetDraftDocument, GetMediaAssetDocument } from "@/types/__generated__/graphql";
import type { DraftStep, ContentType } from "@/types/__generated__/graphql";
import { useIsDesktop } from "@/hooks/useIsDesktop";

interface CreateFlowProps {
  lang: string;
  /**
   * True when rendered inside the desktop create dialog (DesktopCreateFlow).
   * Embedded mode never navigates between routes — "back to picker" just
   * resets the store so the dialog's picker step shows — and the steps hide
   * their own headers/side panels (the dialog provides stepper + preview).
   */
  embedded?: boolean;
}

/** Map backend DraftStep → frontend CreateStep */
function mapDraftStep(apiStep: DraftStep): CreateStep {
  switch (apiStep) {
    case "MEDIA_UPLOAD":
      return "edit";
    case "EDITING":
      return "edit";
    case "PUBLISHING_OPTIONS":
      return "options";
    case "READY":
      // Preview step removed — a draft left at READY resumes on the settings
      // step, where the user posts directly.
      return "options";
    default:
      return "edit";
  }
}

function mapContentType(
  type: ContentType | null | undefined,
): "image" | "video" | null {
  if (type === "IMAGE") return "image";
  if (type === "VIDEO") return "video";
  return null;
}

function getAssetPreviewUrl(asset: {
  r2Variants?: Array<{ variant: string; url: string }> | null;
  thumbnailUrl?: string | null;
}): string | undefined {
  return (
    asset.r2Variants?.find((v) => v.variant === "original")?.url ??
    asset.r2Variants?.find((v) => v.variant === "large")?.url ??
    asset.r2Variants?.find((v) => v.variant === "medium")?.url ??
    asset.r2Variants?.[0]?.url ??
    asset.thumbnailUrl ??
    undefined
  );
}

export function CreateFlow({ lang, embedded = false }: CreateFlowProps) {
  const store = useCreateStore();
  const {
    step,
    draftId,
    draftPending,
    mediaItems,
    setStep,
    setTitle,
    setCaption,
    setHashtags,
    setCategory,
    setContentType,
    setPrice,
    setNegotiable,
    setSpecs,
    setVisibilityMode,
    setAllowDownload,
    setHdEnabled,
    setError,
    addMediaItem,
    updateMediaItem,
    setTiktokEmbed,
  } = store;

  const router = useRouter();
  const apolloClient = useApolloClient();
  const isDesktop = useIsDesktop();

  // Desktop no longer uses this full-page route — the whole flow lives in the
  // /upload dialog (DesktopCreateFlow). Redirect there; the store is
  // session-persisted so the dialog resumes on the same step.
  useEffect(() => {
    if (!embedded && isDesktop) {
      router.replace(`/${lang}/upload`);
    }
  }, [embedded, isDesktop, lang, router]);

  /** Leave the flow back to the picker without a route change (embedded). */
  function backToPicker() {
    const returnToManualPicker =
      useCreateStore.getState().creationMode === "manual";
    useCreateStore.getState().reset();
    if (!embedded) {
      router.replace(
        returnToManualPicker
          ? `/${lang}/upload/create-manual`
          : `/${lang}/upload`,
      );
    }
  }

  // Track whether Zustand persist has finished loading from sessionStorage.
  // Until it has, we render nothing — avoids acting on stale DEFAULT_STATE.
  const [hydrated, setHydrated] = useState(false);
  // True while we're fetching the draft from the API to restore step on reload
  const [restoring, setRestoring] = useState(false);

  // Step 1: wait for Zustand to rehydrate from sessionStorage
  useEffect(() => {
    // If already hydrated synchronously (SSR / no persist data) finish immediately
    if (useCreateStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useCreateStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    return unsub;
  }, []);

  // Step 2: once hydrated, decide what to do
  useEffect(() => {
    if (!hydrated) return;

    if (!draftId) {
      // A draft is being created in the background (instant-open flow) — wait
      // for its id instead of bouncing back to the picker.
      if (draftPending) return;
      // Nothing in session — send back to picker
      backToPicker();
      return;
    }

    // Store has a real step already (persisted from before the reload).
    // Still need to re-hydrate media items whose blob localUris were stripped.
    if (step !== "pick") {
      const missingBlobs = mediaItems.filter((m) => !m.localUri);
      if (missingBlobs.length > 0) {
        missingBlobs.forEach((item) => {
          apolloClient
            .query({
              query: GetMediaAssetDocument,
              variables: { id: item.id },
              fetchPolicy: "network-only",
            })
            .then(({ data }) => {
              const a = data?.mediaAsset;
              if (!a) return;
              const url = getAssetPreviewUrl(a);
              updateMediaItem(item.id, {
                status: a.status === "READY" ? "ready" : a.status === "FAILED" ? "error" : "processing",
                localUri: url ?? item.localUri,
                thumbnailUrl: a.thumbnailUrl ?? undefined,
                r2Variants: a.r2Variants ?? undefined,
                muxPlaybackId: a.muxMeta?.playbackId ?? item.muxPlaybackId,
                errorMessage: a.errorMessage ?? undefined,
              });
            })
            .catch(() => undefined);
        });
      }
      return;
    }

    // draftId exists but step got reset to "pick" (e.g. sessionStorage only had
    // a partial write). Re-fetch from the API to get the authoritative step.
    let cancelled = false;
    setRestoring(true);

    apolloClient
      .query({
        query: GetDraftDocument,
        variables: { id: draftId },
        fetchPolicy: "network-only",
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.draft) {
          backToPicker();
          return;
        }

        const d = data.draft;
        setStep(mapDraftStep(d.currentStep));
        setContentType(mapContentType(d.type));
        setTitle(d.title ?? "");
        setCaption(d.caption ?? "");
        setHashtags(d.hashtags ?? []);
        setCategory(d.categoryId ?? null);
        setSpecs((d.specs ?? []).map((s) => ({ key: s.key, value: s.value })));
        setVisibilityMode(
          (d.visibilityMode?.toLowerCase() as
            | "public"
            | "friends_only"
            | "private") ?? "public",
        );
        setAllowDownload(d.allowDownload ?? true);
        setHdEnabled(d.hdEnabled ?? true);
        if (d.price) {
          setPrice(d.price.amount, d.price.amount === 0);
          setNegotiable(d.price.negotiable);
        }

        // ── Embed-backed draft (TikTok) ──────────────────────────────────────
        // No MediaAssets — the video streams from TikTok. Restore the embed ref
        // and synthesize a read-only cover media item so the create-flow steps
        // (which key off mediaItems[0]) render a preview and pass their gates.
        if (d.source === "TIKTOK_EMBED" && d.tiktokEmbed) {
          const e = d.tiktokEmbed;
          setTiktokEmbed({
            videoId: e.videoId,
            shareUrl: e.shareUrl,
            coverImageUrl: e.coverImageUrl ?? undefined,
            authorUsername: e.authorUsername ?? undefined,
            authorName: e.authorName ?? undefined,
            title: e.title ?? undefined,
            duration: e.duration ?? undefined,
          });
          const embedItemId = `tiktok-embed:${e.videoId}`;
          const known = new Set(useCreateStore.getState().mediaItems.map((m) => m.id));
          if (!known.has(embedItemId)) {
            addMediaItem({
              id: embedItemId,
              localUri: e.coverImageUrl ?? "",
              type: "video",
              status: "ready",
              thumbnailUrl: e.coverImageUrl ?? undefined,
            });
          }
          return;
        }

        // Re-hydrate media items from the API — blob localUris are not persisted
        const knownIds = new Set(useCreateStore.getState().mediaItems.map((m) => m.id));
        const type = mapContentType(d.type) ?? "image";
        const newIds = (d.mediaAssetIds ?? []).filter((id) => !knownIds.has(id));
        newIds.forEach((id) => {
          apolloClient
            .query({
              query: GetMediaAssetDocument,
              variables: { id },
              fetchPolicy: "network-only",
            })
            .then(({ data: ad }) => {
              const a = ad?.mediaAsset;
              if (!a || cancelled) return;
              const url = getAssetPreviewUrl(a);
              addMediaItem({
                id,
                localUri: url ?? "",
                type,
                status: a.status === "READY" ? "ready" : a.status === "FAILED" ? "error" : "processing",
                thumbnailUrl: a.thumbnailUrl ?? undefined,
                r2Variants: a.r2Variants ?? undefined,
                muxPlaybackId: a.muxMeta?.playbackId ?? undefined,
                errorMessage: a.errorMessage ?? undefined,
              });
            })
            .catch(() => undefined);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Background draft creation failed (pending cleared, still no id) — don't
  // strand the user on a blank editor; send them back to the picker.
  useEffect(() => {
    if (hydrated && !draftId && !draftPending && step !== "pick") {
      backToPicker();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, draftId, draftPending, step]);

  function handleBack() {
    // Reset draft so the picker doesn't immediately redirect back here, then
    // return to the PICKER (the previous step) — not all the way to the feed.
    backToPicker();
  }

  // ── Not yet rehydrated from sessionStorage ────────────────────────────────
  if (!hydrated || restoring) {
    return (
      <div
        className={
          embedded
            ? "flex flex-1 items-center justify-center"
            : "flex items-center justify-center min-h-screen"
        }
      >
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <InterlockingBalls size={32} />
          <span className="text-sm">Restoring your draft…</span>
        </div>
      </div>
    );
  }

  // ── Redirecting (no draftId or step === "pick") ───────────────────────────
  if (step === "pick") return null;

  const steps = (
    <>
      {step === "media" && <StepMediaReview onBack={handleBack} />}
      {step === "edit" && <StepEdit onBack={handleBack} embedded={embedded} />}
      {step === "options" && <StepOptions lang={lang} embedded={embedded} />}
    </>
  );

  // Embedded (desktop dialog): the dialog owns the chrome — just fill it.
  if (embedded) {
    return <div className="flex min-h-0 flex-1 flex-col">{steps}</div>;
  }

  // Mobile full-page route (desktop redirects to /upload above).
  return (
    <div className="create-flow-card flex w-full flex-col bg-app">
      <div className="flex-1 flex flex-col">{steps}</div>
    </div>
  );
}
