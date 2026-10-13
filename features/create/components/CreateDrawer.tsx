"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useMutation } from "@apollo/client/react";
import { useCreateStore } from "@/stores/create";
import { useMediaUpload } from "@/features/create/hooks/useMediaUpload";
import { SHOW_TIKTOK_CREATE_OPTIONS } from "@/features/create/utils/tiktokAvailability";
import { CreateDraftDocument } from "@/types/__generated__/graphql";
import { Button } from "@/components/ui/button";

export function CreateDrawer({ lang }: { lang: string }) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageCameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const {
    draftId,
    step,
    setDraftId,
    setContentType,
    setStep,
    setDraftPending,
    setError,
    reset,
  } = useCreateStore();
  const [createDraft] = useMutation(CreateDraftDocument);
  const { startImageUpload, startVideoUpload } = useMediaUpload();

  // Full-screen "Preparing…" overlay shown while navigating to the TikTok
  // import page, so we give immediate feedback instead of a frozen tab bar.
  const [preparingTiktok, setPreparingTiktok] = useState(false);

  // Prefetch the TikTok import route as soon as the drawer opens so navigation
  // itself is near-instant once the user taps.
  useEffect(() => {
    router.prefetch(`/${lang}/upload/tiktok`);
  }, [router, lang]);

  function handleTiktokImport() {
    setPreparingTiktok(true);
    router.replace(`/${lang}/upload/tiktok`);
  }

  function handleClose() {
    // If there's a draft in progress, resume it instead of going to feed
    if (draftId && step !== "pick") {
      router.push(`/${lang}/upload/create-manual`);
    } else {
      window.location.href = `/${lang}/for-you`;
    }
  }

  function handleFiles(files: FileList, kind: "image" | "video") {
    if (!files.length) return;
    setError(null);

    // Start fresh for a new upload — wipes any previous draft
    reset();

    // ── Open the editor INSTANTLY ──────────────────────────────────────────
    // Creating the draft is a network round-trip; don't block the UI on it.
    // We set the type + step and navigate immediately, then create the draft
    // and start the uploads in the background. CreateFlow tolerates a pending
    // draft (draftId still null) without bouncing back to the picker.
    setContentType(kind);
    setStep("edit");
    setDraftPending(true);
    router.push(`/${lang}/upload/create-manual`);

    const list = Array.from(files).slice(0, kind === "video" ? 1 : 10);

    (async () => {
      try {
        const { data, error } = await createDraft({
          variables: { input: { type: kind === "video" ? "VIDEO" : "IMAGE" } },
        });
        if (error || !data?.createDraft)
          throw new Error(error?.message ?? "Failed to create draft");

        const did = data.createDraft.id;
        setDraftId(did);
        setDraftPending(false);

        // Uploads need the draft id, so they start once it's resolved.
        list.forEach((file, i) => {
          if (kind === "image") startImageUpload(file, did, i);
          else startVideoUpload(file, did);
        });
      } catch (err) {
        setDraftPending(false);
        setError(String(err));
      }
    })();
  }

  // function handleText() {
  //   reset();
  //   setContentType(null);
  //   router.push(`/${lang}/upload/create-manual`);
  // }

  function handleVideoClick() {
    videoInputRef.current?.click();
  }

  function handleImageClick() {
    imageInputRef.current?.click();
  }

  function handleCameraClick() {
    imageCameraInputRef.current?.click();
  }

  const hasDraft = Boolean(draftId && step !== "pick");

  return (
    <>
      {/* Preparing overlay — covers the screen the moment TikTok import is
          tapped, until the import page mounts and takes over. */}
      {preparingTiktok && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 "
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-app px-8 py-7 shadow-2xl">
            <InterlockingBalls size={36} />
            <p className="text-md font-medium text-default">Opening TikTok import...</p>
          </div>
        </div>
      )}

      <Drawer
        open
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DrawerContent>
          <div className="flex flex-col">
            {/* Resume draft — only shown when a draft is in progress */}
            {hasDraft && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${lang}/upload/create-manual`)}
                  className="w-full h-14 rounded-none active:bg-surface transition-colors"
                >
                  <span className="text-md font-medium text-primary">Continue draft</span>
                </Button>
                <div className="h-px bg-border" />
              </>
            )}

            {/* Video option */}
            <Button
              variant="ghost"
              onClick={handleVideoClick}
              className="w-full h-14 rounded-none active:bg-surface transition-colors"
            >
              <span className="text-md font-medium">Video</span>
            </Button>

            <div className="h-px bg-border" />

            {/* Image option */}
            <Button
              variant="ghost"
              onClick={handleImageClick}
              className="w-full h-14 rounded-none active:bg-surface transition-colors"
            >
              <span className="text-md font-medium">Photos</span>
            </Button>

            <div className="h-px bg-border" />

            {/* Camera option */}
            <Button
              variant="ghost"
              onClick={handleCameraClick}
              className="w-full h-14 rounded-none active:bg-surface transition-colors"
            >
              <span className="text-md font-medium">Camera</span>
            </Button>

            {SHOW_TIKTOK_CREATE_OPTIONS && (
              <>
                <div className="h-px bg-border" />

                <Button
                  variant="ghost"
                  onClick={handleTiktokImport}
                  disabled={preparingTiktok}
                  className="w-full h-14 rounded-none active:bg-surface transition-colors"
                >
                  <span className="text-md font-medium">TikTok import</span>
                </Button>
              </>
            )}
          </div>

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* Cancel button */}
          <Button
            variant="ghost"
            onClick={handleClose}
            className="w-full h-14 rounded-none active:bg-surface transition-colors"
          >
            <span className="text-md font-medium text-muted-foreground">
              Cancel
            </span>
          </Button>
        </DrawerContent>
      </Drawer>

      {/* Hidden file inputs */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files, "video")}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files, "image")}
      />
      <input
        ref={imageCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files, "image")}
      />
    </>
  );
}
