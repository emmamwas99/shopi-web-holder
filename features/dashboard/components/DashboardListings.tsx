"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Download, Eye, FileSpreadsheet, Loader2, Package, Plus, Trash2, Upload, WandSparkles, X } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { refreshAccessToken } from "@/lib/auth/refresh-token";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useMyManagedPosts, type ManagedPost } from "@/features/profile/hooks/useManagedPosts";
import { useInfiniteScroll } from "@/features/feed/hooks/useInfiniteScroll";
import { LocationPicker } from "@/features/create/components/LocationPicker";
import { CategoryPickerDrawer } from "@/features/create/components/CategoryPickerDrawer";
import { PhoneInput } from "@/features/create/components/PhoneInput";
import { SpecsEditor } from "@/features/create/components/SpecsEditor";
import { GUIDED_EXTRACT_FROM_DRAFT } from "@/features/create/graphql/guided";
import type { DraftLocation } from "@/stores/create";
import {
  AdvanceDraftStepDocument,
  AttachMediaAssetDocument,
  AutosaveDraftDocument,
  CategoriesDocument,
  CompleteBulkImportDraftDocument,
  DetachMediaAssetDocument,
  DiscardDraftDocument,
  GetMediaAssetDocument,
  MyPendingBulkUploadDraftsDocument,
  MyContactPhoneDocument,
  NotifyImageUploadedDocument,
  NotifyVideoUploadedDocument,
  PublishDraftDocument,
  RequestImageUploadDocument,
  RequestVideoUploadDocument,
  type DraftFieldsFragment,
} from "@/types/__generated__/graphql";
import { DashboardListingActions } from "./DashboardListingActions";

function formatPrice(post: ManagedPost) {
  if (post.price.amount <= 0) return "Price on request";
  return `${post.price.currency} ${Math.round(post.price.amount).toLocaleString("en-KE")}`;
}

function formatStatus(post: ManagedPost) {
  if (post.visibility !== "PUBLIC") return { label: "Hidden", style: "bg-surface text-muted" };
  if (post.status === "ACTIVE" && post.isLive) return { label: "Live", style: "bg-emerald-50 text-emerald-700" };
  if (post.status === "PENDING_REVIEW" || post.status === "UNDER_REVIEW") return { label: "In review", style: "bg-amber-50 text-amber-700" };
  if (post.status === "REJECTED" || post.status === "FAILED") return { label: post.status === "FAILED" ? "Failed" : "Needs attention", style: "bg-rose-50 text-rose-700" };
  if (post.status === "PROCESSING") return { label: "Processing", style: "bg-sky-50 text-sky-700" };
  if (post.status === "ACTIVE") return { label: "Approved", style: "bg-emerald-50 text-emerald-700" };
  return { label: "Draft", style: "bg-surface text-muted" };
}

function getThumbnail(post: ManagedPost) {
  const media = post.media?.[0];
  return media?.thumbnailUrl ?? media?.muxMeta?.thumbnailUrl ?? media?.r2Variants?.[0]?.url ?? media?.url ?? null;
}

type BulkDraftAgentState = "analyzing" | "ready" | "error";
type BulkDraftEdit = {
  title: string;
  caption: string;
  categoryId: string | null;
  specs: Array<{ key: string; value: string }>;
  price: string;
  negotiable: boolean;
  contactPhone: string | null;
};

function PostItemMenu({
  onSingleUpload,
  onBulkUpload,
  className,
}: {
  onSingleUpload: () => void;
  onBulkUpload: () => void;
  className: string;
}) {
  const [popoverContainer, setPopoverContainer] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerDown={(event) =>
            setPopoverContainer(
              event.currentTarget.closest<HTMLElement>('[role="dialog"]'),
            )
          }
          className={className}
        >
          <Plus className="h-4 w-4" aria-hidden /> Post a listing
        </button>
      </PopoverTrigger>
      <PopoverContent container={popoverContainer} align="end" className="w-52 rounded-xl border-border bg-elevated p-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => { setOpen(false); onSingleUpload(); }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-main transition-colors hover:bg-surface"
        >
          <Plus className="h-4 w-4 text-primary" aria-hidden />
          Single upload
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); onBulkUpload(); }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-main transition-colors hover:bg-surface"
        >
          <Upload className="h-4 w-4 text-primary" aria-hidden />
          Bulk upload from Excel
        </button>
      </PopoverContent>
    </Popover>
  );
}

export function DashboardListings({
  lang,
  onSingleUpload,
  autoOpenBulk = false,
  onBulkUploadHandled,
}: {
  lang: string;
  onSingleUpload: () => void;
  autoOpenBulk?: boolean;
  onBulkUploadHandled?: () => void;
}) {
  const { isAuthenticated } = useAuthSession();
  const apolloClient = useApolloClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const { data, loading, error, fetchMore, refetch } = useMyManagedPosts(25, !isAuthenticated);
  const { data: pendingBulkData, loading: pendingBulkLoading, refetch: refetchPendingBulk } = useQuery(
    MyPendingBulkUploadDraftsDocument,
    { skip: !isAuthenticated, fetchPolicy: "network-only", pollInterval: 5_000 },
  );
  const pendingBulkInitialLoading = pendingBulkLoading && !pendingBulkData;
  const pendingBulkDrafts = useMemo(
    () => (pendingBulkData?.myPendingBulkUploadDrafts ?? []) as DraftFieldsFragment[],
    [pendingBulkData?.myPendingBulkUploadDrafts],
  );
  const { data: categoryData } = useQuery(CategoriesDocument, { fetchPolicy: "cache-first" });
  const { data: contactData } = useQuery(MyContactPhoneDocument, { skip: !isAuthenticated, fetchPolicy: "cache-first" });
  const [requestImageUpload] = useMutation(RequestImageUploadDocument);
  const [requestVideoUpload] = useMutation(RequestVideoUploadDocument);
  const [attachMediaAsset] = useMutation(AttachMediaAssetDocument);
  const [detachMediaAsset] = useMutation(DetachMediaAssetDocument);
  const [notifyImageUploaded] = useMutation(NotifyImageUploadedDocument);
  const [notifyVideoUploaded] = useMutation(NotifyVideoUploadedDocument);
  const [completeBulkImportDraft] = useMutation(CompleteBulkImportDraftDocument);
  const [autosaveDraft] = useMutation(AutosaveDraftDocument);
  const [advanceDraftStep] = useMutation(AdvanceDraftStepDocument);
  const [publishDraft] = useMutation(PublishDraftDocument);
  const [extractBulkDraft] = useMutation(GUIDED_EXTRACT_FROM_DRAFT);
  const [discardDraft] = useMutation(DiscardDraftDocument);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [dismissPendingBulk, setDismissPendingBulk] = useState(false);
  const [mediaUploadStates, setMediaUploadStates] = useState<Record<string, { uploading: boolean; error?: string }>>({});
  const [bulkAgentStates, setBulkAgentStates] = useState<Record<string, BulkDraftAgentState>>({});
  const [bulkEdits, setBulkEdits] = useState<Record<string, BulkDraftEdit>>({});
  const [bulkActionErrors, setBulkActionErrors] = useState<Record<string, string>>({});
  const [publishingBulkId, setPublishingBulkId] = useState<string | null>(null);
  const startedBulkAgentRef = useRef(new Set<string>());
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"upload" | null>(null);
  const [message, setMessage] = useState("");
  const [bulkLocation, setBulkLocation] = useState<DraftLocation | null>(null);
  const [bulkLocationTouched, setBulkLocationTouched] = useState(false);
  const [listingsScrollRoot, setListingsScrollRoot] = useState<HTMLDivElement | null>(null);
  const [importSummary, setImportSummary] = useState<{
    updated: number;
    drafts: number;
    failed: number;
    rows: Array<{ row: number; action: "updated" | "draft" | "error"; message?: string }>;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const handledAutoOpenBulkRef = useRef(false);
  const result = data?.myManagedContent;
  const posts = result?.items ?? [];
  const hasMorePosts = Boolean(result?.hasMore && result.nextCursor);
  const loadMorePosts = useCallback(() => {
    const cursor = result?.nextCursor;
    if (!cursor || !hasMorePosts || loading) return;
    void fetchMore({
      variables: { afterId: cursor, limit: 25 },
      updateQuery(previous, { fetchMoreResult }) {
        if (!fetchMoreResult) return previous;
        const existingIds = new Set(previous.myManagedContent.items.map((post) => post.id));
        return {
          myManagedContent: {
            ...fetchMoreResult.myManagedContent,
            items: [
              ...previous.myManagedContent.items,
              ...fetchMoreResult.myManagedContent.items.filter((post) => !existingIds.has(post.id)),
            ],
          },
        };
      },
    });
  }, [fetchMore, hasMorePosts, loading, result?.nextCursor]);
  const { sentinelRef } = useInfiniteScroll({
    root: listingsScrollRoot,
    hasMore: hasMorePosts,
    loading,
    onLoadMore: loadMorePosts,
  });
  const latestLocation = posts[0]?.location;
  const defaultBulkLocation: DraftLocation | null = latestLocation
    ? (() => {
        const placeName = latestLocation.placeName?.trim() || latestLocation.subregion?.trim() || latestLocation.county?.trim();
        if (!placeName) return null;
        return {
          placeName,
          formattedAddress: [latestLocation.placeName, latestLocation.subregion, latestLocation.county]
            .filter((part): part is string => Boolean(part?.trim()))
            .join(", "),
          placeId: "",
          county: latestLocation.county ?? undefined,
          subregion: latestLocation.subregion ?? undefined,
        };
      })()
    : null;
  const selectedBulkLocation = bulkLocationTouched ? bulkLocation : defaultBulkLocation;
  const bulkDialogOpen = bulkOpen || (pendingBulkDrafts.length > 0 && !dismissPendingBulk);
  const bulkWorkflowComplete = pendingBulkDrafts.length > 0 && pendingBulkDrafts.every(
    (draft) => draft.bulkStage === "COMPLETE" && bulkAgentStates[draft.id] === "ready",
  );
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!autoOpenBulk) {
      handledAutoOpenBulkRef.current = false;
      return;
    }
    if (handledAutoOpenBulkRef.current) return;
    handledAutoOpenBulkRef.current = true;
    setBulkOpen(true);
    onBulkUploadHandled?.();
  }, [autoOpenBulk, onBulkUploadHandled]);

  async function downloadTemplate() {
    setMessage("");
    try {
      const response = await authorizedFetch(`${apiUrl}/listings/template.xlsx`);
      if (!response.ok) throw new Error("The sample Excel file could not be downloaded. Please try again.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "shopi-listings-template.xlsx";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Download failed. Please try again.");
      setBulkOpen(true);
    }
  }

  async function importWorkbook() {
    if (!file) return;
    if (!selectedBulkLocation?.placeName) {
      setMessage("Choose one location to apply to every listing.");
      return;
    }
    setBusy("upload");
    setMessage("");
    setImportSummary(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("location", JSON.stringify(selectedBulkLocation));
      const response = await authorizedFetch(`${apiUrl}/listings/import.xlsx`, {
        method: "POST",
        body,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "The Excel file could not be imported.");
      setImportSummary(payload);
      setDismissPendingBulk(false);
      setBulkOpen(true);
      setMessage(payload.drafts > 0
        ? `Added ${payload.drafts} new listing${payload.drafts === 1 ? "" : "s"}. Add media below and Shopi Agent will finish each listing here. ${payload.failed} row${payload.failed === 1 ? " needs" : "s need"} attention.`
        : `Updated ${payload.updated} listing${payload.updated === 1 ? "" : "s"}; ${payload.failed} row${payload.failed === 1 ? " needs" : "s need"} attention.`);
      void refetchPendingBulk();
      if (payload.updated > 0) void refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadBulkDraftMedia(draftId: string, file: File) {
    setMediaUploadStates((current) => ({ ...current, [draftId]: { uploading: true } }));
    let mediaAssetId: string | null = null;
    try {
      const isVideo = file.type.startsWith("video/");
      if (!isVideo && !file.type.startsWith("image/")) {
        throw new Error("Choose an image or video file.");
      }

      let uploadUrl: string | undefined;
      if (isVideo) {
        const { data, error } = await requestVideoUpload({ variables: { draftId } });
        if (error || !data?.requestVideoUpload) throw new Error(error?.message ?? "Could not prepare the video upload.");
        mediaAssetId = data.requestVideoUpload.mediaAssetId;
        uploadUrl = data.requestVideoUpload.uploadUrl;
      } else {
        const { data, error } = await requestImageUpload({ variables: { draftId, mimeType: file.type || "image/jpeg" } });
        if (error || !data?.requestImageUpload) throw new Error(error?.message ?? "Could not prepare the image upload.");
        mediaAssetId = data.requestImageUpload.mediaAssetId;
        uploadUrl = data.requestImageUpload.uploadUrl;
      }
      if (!mediaAssetId || !uploadUrl) throw new Error("Could not prepare the media upload.");

      await attachMediaAsset({ variables: { draftId, mediaAssetId, sortOrder: 0 } });
      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || (isVideo ? "video/mp4" : "image/jpeg") },
      });
      if (!response.ok) throw new Error(`Media upload failed (${response.status}). Please try again.`);

      if (isVideo) await notifyVideoUploaded({ variables: { mediaAssetId } });
      else await notifyImageUploaded({ variables: { mediaAssetId } });
      await completeBulkImportDraft({ variables: { id: draftId, mediaType: isVideo ? "VIDEO" : "IMAGE" } });

      await refetchPendingBulk();
      setMediaUploadStates((current) => ({ ...current, [draftId]: { uploading: false } }));
    } catch (error) {
      if (mediaAssetId) {
        await detachMediaAsset({ variables: { draftId, mediaAssetId } }).catch(() => undefined);
      }
      setMediaUploadStates((current) => ({
        ...current,
        [draftId]: { uploading: false, error: error instanceof Error ? error.message : "Upload failed. Try again." },
      }));
    }
  }

  const runBulkAgent = useCallback(async (draft: DraftFieldsFragment) => {
    startedBulkAgentRef.current.add(draft.id);
    setBulkAgentStates((current) => ({ ...current, [draft.id]: "analyzing" }));
    setBulkActionErrors((current) => ({ ...current, [draft.id]: "" }));
    try {
      if (draft.mediaAssetIds.length === 0) throw new Error("Add a photo or video before Shopi Agent can continue.");
      const deadline = Date.now() + 120_000;
      let hasReadyMedia = false;
      while (Date.now() < deadline && !hasReadyMedia) {
        const assets = await Promise.all(draft.mediaAssetIds.map(async (id) => {
          const response = await apolloClient.query({
            query: GetMediaAssetDocument,
            variables: { id },
            fetchPolicy: "network-only",
          });
          return response.data?.mediaAsset;
        }));
        if (assets.some((asset) => asset?.status === "READY")) {
          hasReadyMedia = true;
          break;
        }
        if (assets.length > 0 && assets.every((asset) => asset?.status === "FAILED")) {
          throw new Error("Media processing failed. Remove it and upload another file.");
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1_500));
      }
      if (!hasReadyMedia) throw new Error("Media is still processing. Try again in a moment.");

      const { data, error } = await extractBulkDraft({ variables: { id: draft.id } });
      if (error) throw new Error(error.message);
      const extracted = data?.extractDraftDetails;
      if (!extracted) throw new Error("Shopi Agent could not read enough from this media. Try again or edit the details below.");

      const specs = extracted.specs
        .map((spec) => ({ key: spec.key.trim(), value: spec.value.trim() }))
        .filter((spec) => spec.key && spec.value);
      const saved = await autosaveDraft({
        variables: {
          id: draft.id,
          input: {
            ...(extracted.categoryId ? { categoryId: extracted.categoryId } : {}),
            specs,
            aiClassification:
              extracted.level1 || extracted.level2
                ? {
                    level1: extracted.level1 ?? undefined,
                    level2: extracted.level2 ?? undefined,
                    confidence: extracted.classificationConfidence ?? undefined,
                  }
                : undefined,
          },
        },
      });
      if (saved.error) throw new Error(saved.error.message);

      setBulkEdits((current) => {
        const existing = current[draft.id];
        return {
          ...current,
          [draft.id]: {
            title: existing?.title ?? draft.title ?? "",
            caption: existing?.caption ?? draft.caption ?? "",
            categoryId: extracted.categoryId ?? existing?.categoryId ?? draft.categoryId,
            specs,
            price: existing?.price || (draft.price?.amount ? String(draft.price.amount) : ""),
            negotiable: existing?.negotiable ?? draft.price?.negotiable ?? false,
            contactPhone: existing?.contactPhone ?? draft.contactPhone ?? contactData?.myContactPhone ?? null,
          },
        };
      });
      setBulkAgentStates((current) => ({ ...current, [draft.id]: "ready" }));
      await refetchPendingBulk();
    } catch (error) {
      setBulkAgentStates((current) => ({ ...current, [draft.id]: "error" }));
      setBulkActionErrors((current) => ({
        ...current,
        [draft.id]: error instanceof Error ? error.message : "Shopi Agent could not complete this listing.",
      }));
    }
  }, [apolloClient, autosaveDraft, contactData?.myContactPhone, extractBulkDraft, refetchPendingBulk]);

  async function publishBulkDraft(draft: DraftFieldsFragment) {
    if (publishingBulkId) return;
    const edit = bulkEdits[draft.id];
    if (!edit?.title.trim()) {
      setBulkActionErrors((current) => ({ ...current, [draft.id]: "Add a title before publishing." }));
      return;
    }
    if (!edit.categoryId) {
      setBulkActionErrors((current) => ({ ...current, [draft.id]: "Choose a category before publishing." }));
      return;
    }
    if (!edit.contactPhone) {
      setBulkActionErrors((current) => ({ ...current, [draft.id]: "Add a contact phone number before publishing." }));
      return;
    }

    setPublishingBulkId(draft.id);
    setBulkActionErrors((current) => ({ ...current, [draft.id]: "" }));
    try {
      const priceAmount = Number(edit.price);
      if (edit.price && (!Number.isFinite(priceAmount) || priceAmount < 0)) {
        throw new Error("Enter a valid price, or leave it blank for price on request.");
      }
      const saved = await autosaveDraft({
        variables: {
          id: draft.id,
          input: {
            title: edit.title.trim(),
            caption: edit.caption.trim(),
            ...(edit.categoryId ? { categoryId: edit.categoryId } : {}),
            specs: edit.specs,
            price: {
              amount: edit.price ? priceAmount : 0,
              currency: draft.price?.currency ?? "KES",
              negotiable: edit.negotiable,
            },
            contactPhone: edit.contactPhone,
          },
        },
      });
      if (saved.error || !saved.data?.autosaveDraft) throw new Error(saved.error?.message ?? "Could not save listing details.");

      let currentStep = saved.data.autosaveDraft.currentStep;
      while (currentStep !== "READY") {
        const advanced = await advanceDraftStep({ variables: { id: draft.id } });
        if (advanced.error || !advanced.data?.advanceDraftStep) {
          throw new Error(advanced.error?.message ?? "Complete the required listing details before publishing.");
        }
        currentStep = advanced.data.advanceDraftStep.currentStep;
      }

      const published = await publishDraft({ variables: { id: draft.id } });
      if (published.error || !published.data?.publishDraft) throw new Error(published.error?.message ?? "Could not publish this listing.");
      setBulkEdits((current) => { const next = { ...current }; delete next[draft.id]; return next; });
      setBulkAgentStates((current) => { const next = { ...current }; delete next[draft.id]; return next; });
      setMessage("Listing submitted for review.");
      await Promise.all([refetchPendingBulk(), refetch()]);
    } catch (error) {
      setBulkActionErrors((current) => ({
        ...current,
        [draft.id]: error instanceof Error ? error.message : "Could not finish this listing.",
      }));
    } finally {
      setPublishingBulkId(null);
    }
  }

  useEffect(() => {
    for (const draft of pendingBulkDrafts) {
      if (draft.bulkStage !== "COMPLETE") continue;
      setBulkEdits((current) => current[draft.id] ? current : ({
        ...current,
        [draft.id]: {
          title: draft.title ?? "",
          caption: draft.caption ?? "",
          categoryId: draft.categoryId,
          specs: draft.specs.map((spec) => ({ key: spec.key, value: spec.value })),
          price: draft.price?.amount ? String(draft.price.amount) : "",
          negotiable: draft.price?.negotiable ?? false,
          contactPhone: draft.contactPhone ?? contactData?.myContactPhone ?? null,
        },
      }));
      if (draft.categoryId && draft.specs.length > 0) {
        setBulkAgentStates((current) => current[draft.id] ? current : ({ ...current, [draft.id]: "ready" }));
        startedBulkAgentRef.current.add(draft.id);
        continue;
      }
      if (startedBulkAgentRef.current.has(draft.id)) continue;
      startedBulkAgentRef.current.add(draft.id);
      void runBulkAgent(draft);
    }
  }, [pendingBulkDrafts, contactData?.myContactPhone, runBulkAgent]);

  async function deleteBulkDraft(draftId: string) {
    if (!window.confirm("Delete this listing draft? This cannot be undone.")) return;
    try {
      await discardDraft({ variables: { id: draftId } });
      setBulkEdits((current) => { const next = { ...current }; delete next[draftId]; return next; });
      setBulkAgentStates((current) => { const next = { ...current }; delete next[draftId]; return next; });
      await refetchPendingBulk();
    } catch {
      setMessage("This draft could not be deleted. Please try again.");
    }
  }

  function updateBulkEdit(draftId: string, patch: Partial<BulkDraftEdit>) {
    const draft = pendingBulkDrafts.find((item) => item.id === draftId);
    setBulkEdits((current) => ({
      ...current,
      [draftId]: {
        ...(
          current[draftId] ?? {
            title: draft?.title ?? "",
            caption: draft?.caption ?? "",
            categoryId: draft?.categoryId ?? null,
            specs: draft?.specs.map((spec) => ({ key: spec.key, value: spec.value })) ?? [],
            price: draft?.price?.amount ? String(draft.price.amount) : "",
            negotiable: draft?.price?.negotiable ?? false,
            contactPhone: draft?.contactPhone ?? contactData?.myContactPhone ?? null,
          }
        ),
        ...patch,
      },
    }));
  }

  async function authorizedFetch(url: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    const token = useAuthStore.getState().accessToken ?? accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    let response = await fetch(url, { ...init, headers });
    if (response.status === 401) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        headers.set("Authorization", `Bearer ${refreshedToken}`);
        response = await fetch(url, { ...init, headers });
      }
    }
    return response;
  }

  function openBulkUpload() {
    setBulkOpen(true);
    setDismissPendingBulk(false);
    setFile(null);
    setImportSummary(null);
    setMessage("");
    setBulkLocation(null);
    setBulkLocationTouched(false);
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
        <h1 className="text-xl font-extrabold text-main">Sign in to see your listings</h1>
        <p className="mt-2 text-xs text-muted">Your posts and their performance will appear here.</p>
        <Link href={`/${lang}/auth/login`} className="mt-5 inline-flex h-9 items-center rounded-xl bg-primary px-4 text-xs font-bold text-white">Sign in</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col px-5 md:px-8">
      <header className="z-10 flex shrink-0 flex-wrap items-end justify-between gap-3 bg-app pb-4 pt-5 md:pb-5 md:pt-6">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-main">My listings</h1>
          <p className="mt-1 text-xs text-muted">Manage your posts and see how they are performing.</p>
        </div>
        <div className="flex items-center gap-2">
          <PostItemMenu
            onSingleUpload={onSingleUpload}
            onBulkUpload={openBulkUpload}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-bold text-white hover:opacity-90"
          />
        </div>
      </header>

      <div ref={setListingsScrollRoot} className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-elevated shadow-sm">
          <table className="w-full min-w-[790px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-surface text-[10px] font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-right">Saves</th>
                <th className="px-4 py-3">Posted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && posts.length === 0 ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg" /><Skeleton className="h-4 w-40" /></div></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="ml-auto h-4 w-8" /></td>
                    <td className="px-4 py-3"><Skeleton className="ml-auto h-4 w-8" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="ml-auto h-7 w-7 rounded-lg" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted">Your listings could not be loaded. Please try again.</td></tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <Package className="mx-auto h-6 w-6 text-primary" aria-hidden />
                    <p className="mt-3 text-sm font-semibold text-main">No listings yet</p>
                    <p className="mt-1 text-xs text-muted">Your posts will appear here once you publish one.</p>
                    <PostItemMenu
                      onSingleUpload={onSingleUpload}
                      onBulkUpload={openBulkUpload}
                      className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-white hover:opacity-90"
                    />
                  </td>
                </tr>
              ) : posts.map((post) => {
                const status = formatStatus(post);
                const thumbnail = getThumbnail(post);
                return (
                  <tr key={post.id} className="transition-colors hover:bg-surface/50">
                    <td className="max-w-[340px] px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
                          {thumbnail ? <Image src={thumbnail} alt="" fill sizes="40px" className="object-cover" /> : <Package className="h-4 w-4 text-muted" aria-hidden />}
                        </div>
                        <span className="truncate font-semibold text-main">{post.title || "Untitled listing"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${status.style}`}>{status.label}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-main">{formatPrice(post)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted"><span className="inline-flex items-center justify-end gap-1.5"><Eye className="h-3.5 w-3.5" aria-hidden />{post.stats.views.toLocaleString("en-KE")}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{post.stats.saves.toLocaleString("en-KE")}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{new Date(post.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-2 text-right"><DashboardListingActions post={post} lang={lang} onRefresh={() => refetch()} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        {hasMorePosts ? (
          <div className="flex min-h-14 flex-col items-center justify-center gap-2 border-t border-border py-3" aria-live="polite">
            <div ref={sentinelRef} className="h-px w-full" aria-hidden />
            {loading && posts.length > 0 ? (
              <span className="inline-flex items-center gap-2 text-xs font-medium text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading more listings…
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <BulkListingsDialog
        open={bulkDialogOpen}
        onOpenChange={(open) => {
          setBulkOpen(open);
          if (open) setDismissPendingBulk(false);
          else if (pendingBulkDrafts.length > 0) setDismissPendingBulk(true);
        }}
        file={file}
        setFile={(nextFile) => { setFile(nextFile); setImportSummary(null); setMessage(""); }}
        fileInput={fileInput}
        location={selectedBulkLocation}
        setLocation={(location) => { setBulkLocationTouched(true); setBulkLocation(location); }}
        busy={busy === "upload"}
        message={message}
        summary={importSummary}
        pendingDrafts={pendingBulkDrafts}
        pendingInitialLoading={pendingBulkInitialLoading}
        uploadStates={mediaUploadStates}
        agentStates={bulkAgentStates}
        edits={bulkEdits}
        actionErrors={bulkActionErrors}
        categories={categoryData?.categories ?? []}
        publishingId={publishingBulkId}
        workflowComplete={bulkWorkflowComplete}
        onUploadMedia={(draftId, selectedFile) => void uploadBulkDraftMedia(draftId, selectedFile)}
        onDeleteDraft={(draftId) => void deleteBulkDraft(draftId)}
        onRetryAgent={(draft) => void runBulkAgent(draft)}
        onPublish={(draft) => void publishBulkDraft(draft)}
        onEdit={updateBulkEdit}
        onDownloadTemplate={() => void downloadTemplate()}
        onImport={() => void importWorkbook()}
      />
    </section>
  );
}

function BulkListingsDialog({
  open,
  onOpenChange,
  file,
  setFile,
  fileInput,
  location,
  setLocation,
  busy,
  message,
  summary,
  pendingDrafts,
  pendingInitialLoading,
  uploadStates,
  agentStates,
  edits,
  actionErrors,
  categories,
  publishingId,
  workflowComplete,
  onUploadMedia,
  onDeleteDraft,
  onRetryAgent,
  onPublish,
  onEdit,
  onDownloadTemplate,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  fileInput: React.RefObject<HTMLInputElement | null>;
  location: DraftLocation | null;
  setLocation: (location: DraftLocation | null) => void;
  busy: boolean;
  message: string;
  summary: { updated: number; drafts: number; failed: number; rows: Array<{ row: number; action: "updated" | "draft" | "error"; message?: string }> } | null;
  pendingDrafts: DraftFieldsFragment[];
  pendingInitialLoading: boolean;
  uploadStates: Record<string, { uploading: boolean; error?: string }>;
  agentStates: Record<string, BulkDraftAgentState>;
  edits: Record<string, BulkDraftEdit>;
  actionErrors: Record<string, string>;
  categories: Array<{ id: string; name: string }>;
  publishingId: string | null;
  workflowComplete: boolean;
  onUploadMedia: (draftId: string, file: File) => void;
  onDeleteDraft: (draftId: string) => void;
  onRetryAgent: (draft: DraftFieldsFragment) => void;
  onPublish: (draft: DraftFieldsFragment) => void;
  onEdit: (id: string, patch: Partial<BulkDraftEdit>) => void;
  onDownloadTemplate: () => void;
  onImport: () => void;
}) {
  const mediaWaiting = pendingDrafts.filter((draft) => draft.bulkStage !== "COMPLETE").length;
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] min-w-0 w-[min(760px,94vw)] max-w-[760px] flex-col overflow-hidden rounded-2xl border-border bg-elevated p-0 text-main">
        <div className="min-w-0 border-b border-border px-6 py-5 pr-12">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-extrabold"><FileSpreadsheet className="h-5 w-5 text-primary" /> Agent-powered bulk upload</DialogTitle>
            <DialogDescription className="mt-1 break-words text-sm text-muted">Add listings faster with less typing. Shopi Agent fills in category and product specs, then you can review and publish every listing here.</DialogDescription>
          </DialogHeader>
        </div>
        <div className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-6 py-5">
          {pendingDrafts.length > 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                <p className="font-bold text-main">Finish your bulk listings here</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {mediaWaiting > 0
                    ? `${mediaWaiting} listing${mediaWaiting === 1 ? " is" : "s are"} still waiting for media. Once uploaded, Shopi Agent fills in the details below. You can close this window; the checklist returns when you open Listings again.`
                    : "Media is uploaded. Review the agent-filled details and publish each listing below."}
                </p>
              </div>
              {workflowComplete ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> All listings are ready to finish here.
                </div>
              ) : null}
              <div className="min-w-0 max-h-[58vh] space-y-3 overflow-y-auto overflow-x-hidden pr-1">
                {pendingDrafts.map((draft) => {
                  const uploadState = uploadStates[draft.id];
                  const agentState = agentStates[draft.id] ?? (draft.categoryId && draft.specs.length > 0 ? "ready" : "analyzing");
                  const edit = edits[draft.id] ?? {
                    title: draft.title ?? "",
                    caption: draft.caption ?? "",
                    categoryId: draft.categoryId,
                    specs: draft.specs.map((spec) => ({ key: spec.key, value: spec.value })),
                    price: draft.price?.amount ? String(draft.price.amount) : "",
                    negotiable: draft.price?.negotiable ?? false,
                    contactPhone: draft.contactPhone,
                  };
                  const waitingForMedia = draft.bulkStage !== "COMPLETE";
                  const isPublishing = publishingId === draft.id;
                  const mediaInputId = `bulk-media-${draft.id}`;
                  return (
                    <article key={draft.id} className="min-w-0 rounded-xl border border-border bg-elevated p-4">
                      <div className="mb-3 flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-main">{edit.title.trim() || "Untitled listing"}</h3>
                          <p className="mt-1 text-xs text-muted">
                            {waitingForMedia ? "Waiting for media" : agentState === "analyzing" ? "Shopi Agent is filling in the details…" : agentState === "error" ? "Agent needs another try" : "Review the details and finish this listing"}
                          </p>
                          {uploadState?.uploading ? <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p> : null}
                          {uploadState?.error ? <p role="alert" className="mt-1 text-xs font-semibold text-rose-700">{uploadState.error}</p> : null}
                        </div>
                        {waitingForMedia ? (
                          <>
                            <input
                              id={mediaInputId}
                              type="file"
                              accept="image/*,video/*"
                              className="sr-only"
                              disabled={uploadState?.uploading}
                              onChange={(event) => {
                                const selectedFile = event.target.files?.[0];
                                if (selectedFile) onUploadMedia(draft.id, selectedFile);
                                event.target.value = "";
                              }}
                            />
                            <label htmlFor={mediaInputId} className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white ${uploadState?.uploading ? "pointer-events-none opacity-50" : ""}`}>
                              <Upload className="h-3.5 w-3.5" aria-hidden /> Add media
                            </label>
                          </>
                        ) : null}
                        <button type="button" onClick={() => onDeleteDraft(draft.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-700 hover:bg-rose-50" aria-label={`Delete ${edit.title.trim() || "untitled listing"}`}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>

                      {waitingForMedia ? (
                        <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted">Add one photo or video to let Shopi Agent continue.</p>
                      ) : (
                        <div className="space-y-3 border-t border-border pt-3">
                          {agentState === "analyzing" ? (
                            <p className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs font-medium text-primary"><WandSparkles className="h-4 w-4" /><Loader2 className="h-3.5 w-3.5 animate-spin" /> Agent is analyzing the media…</p>
                          ) : null}
                          {agentState === "error" ? (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
                              <span>{actionErrors[draft.id] || "Shopi Agent could not finish this listing."}</span>
                              <button type="button" onClick={() => onRetryAgent(draft)} className="font-bold underline">Try again</button>
                            </div>
                          ) : null}
                          <label className="block space-y-1 text-xs font-semibold text-muted">
                            Title
                            <input value={edit.title} maxLength={120} onChange={(event) => onEdit(draft.id, { title: event.target.value })} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm font-normal text-main outline-none focus:border-primary" />
                          </label>
                          <label className="block space-y-1 text-xs font-semibold text-muted">
                            Description
                            <textarea value={edit.caption} maxLength={2000} onChange={(event) => onEdit(draft.id, { caption: event.target.value })} rows={3} className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-main outline-none focus:border-primary" />
                          </label>
                          <div className="space-y-1 text-xs font-semibold text-muted">
                            Category
                            <CategoryPickerDrawer
                              value={edit.categoryId}
                              fallbackLabel={categoryNames.get(edit.categoryId ?? "")}
                              onChange={(id) => onEdit(draft.id, { categoryId: id })}
                            />
                          </div>
                          <div>
                            <SpecsEditor specs={edit.specs} onChange={(specs) => onEdit(draft.id, { specs })} aiGenerated />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                            <label className="block space-y-1 text-xs font-semibold text-muted">
                              Price (KES)
                              <input type="number" min="0" value={edit.price} onChange={(event) => onEdit(draft.id, { price: event.target.value })} placeholder="Price on request" className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm font-normal text-main outline-none focus:border-primary" />
                            </label>
                            <label className="flex h-10 items-center gap-2 text-xs font-medium text-muted">
                              <input type="checkbox" checked={edit.negotiable} onChange={(event) => onEdit(draft.id, { negotiable: event.target.checked })} className="h-4 w-4 accent-primary" /> Price is negotiable
                            </label>
                          </div>
                          <div className="space-y-1 text-xs font-semibold text-muted">
                            Contact phone
                            <PhoneInput value={edit.contactPhone} onChange={(contactPhone) => onEdit(draft.id, { contactPhone })} id={`bulk-phone-${draft.id}`} />
                          </div>
                          {actionErrors[draft.id] && agentState !== "error" ? <p role="alert" className="text-xs font-semibold text-rose-700">{actionErrors[draft.id]}</p> : null}
                          <div className="flex justify-end border-t border-border pt-3">
                            <button type="button" disabled={isPublishing || agentState === "analyzing" || !edit.categoryId} onClick={() => onPublish(draft)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              {isPublishing ? "Finishing…" : "Publish listing"}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : pendingInitialLoading ? (
            <p className="rounded-xl border border-border p-4 text-sm text-muted">Checking for listings waiting for media…</p>
          ) : null}

          {pendingDrafts.length === 0 && !pendingInitialLoading ? (
            <>
              <div className="rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-muted">
                <p className="font-bold text-main">How it works</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Download the blank Excel template and enter one listing per row.</li>
                  <li>Enter each listing’s title, optional description, price and whether the price is negotiable.</li>
                  <li>Choose one location below to apply to all listings.</li>
                  <li>Upload the workbook, add media, review Shopi Agent’s details and publish here.</li>
                </ol>
                <p className="mt-3 text-xs">No category or specification fields are needed in Excel. Imports are limited to 500 rows. You can close the window while the workbook is being prepared.</p>
              </div>
              <button type="button" onClick={onDownloadTemplate} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-elevated px-4 text-sm font-bold text-primary hover:bg-surface">
                <Download className="h-4 w-4" aria-hidden /> Download sample Excel
              </button>
              <div className="space-y-2">
                <label className="text-sm font-bold text-main">Location for all listings</label>
                <LocationPicker value={location} onSelect={(value) => setLocation(value)} onClear={() => setLocation(null)} />
              </div>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
              <div
                role="group"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!file && !busy) setFile(event.dataTransfer.files?.[0] ?? null);
                }}
                className={`relative flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition-colors ${file ? "border-emerald-500 bg-emerald-50/60" : "border-border bg-surface hover:border-primary/50"} ${!file && !busy ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" : "cursor-default"}`}
              >
                {!file && !busy ? (
                  <button
                    type="button"
                    aria-label="Choose an Excel workbook"
                    onClick={() => fileInput.current?.click()}
                    className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  />
                ) : null}
                <div className="pointer-events-none relative z-[1] flex max-w-full flex-col items-center">
                  {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden /> : file ? <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden /> : <Upload className="h-6 w-6 text-primary" aria-hidden />}
                  <span className={`mt-2 max-w-full truncate text-sm font-bold ${file ? "text-emerald-800" : "text-main"}`}>{busy ? "Preparing your listings…" : file?.name ?? "Drop your Excel workbook here"}</span>
                  <span className="mt-1 text-xs text-muted">{busy ? "New listings will appear here as they are ready." : file ? "Workbook selected" : "or choose a .xlsx file (up to 5 MB)"}</span>
                </div>
                {file && !busy ? (
                  <button
                    type="button"
                    aria-label="Remove selected workbook"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFile(null);
                      if (fileInput.current) fileInput.current.value = "";
                    }}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-800 transition-colors hover:bg-emerald-100"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
          {message ? <p role="status" className="text-sm font-semibold text-main">{message}</p> : null}
          {summary?.rows.some((row) => row.action === "error") ? (
            <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-border p-3 text-xs">
              {summary.rows.filter((row) => row.action === "error").map((row) => <p key={row.row} className="text-rose-700">Row {row.row}: {row.message}</p>)}
            </div>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-xl border border-border bg-elevated px-4 text-sm font-bold text-main">{workflowComplete ? "Done" : "Close"}</button>
            {pendingDrafts.length === 0 && !pendingInitialLoading ? <button type="button" onClick={onImport} disabled={!file || busy} className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Preparing listings…" : "Upload workbook"}</button> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
