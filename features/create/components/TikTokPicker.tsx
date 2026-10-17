"use client";

/**
 * TikTokPicker - the TikTok import surface for the manual create flow, free of
 * route/dialog chrome so it renders inline wherever the host puts it: the
 * desktop create dialog, the mobile picker page, or the /upload/tiktok route.
 *
 * Paste a link to download a video, or reuse one already downloaded on this
 * device. Either way the video goes through the same draft + background upload
 * as any other video, then control returns through `onUsed`.
 */

import { useMutation } from "@apollo/client/react";
import { useCreateStore } from "@/stores/create";
import { CreateDraftDocument } from "@/types/__generated__/graphql";
import { useMediaUpload } from "@/features/create/hooks/useMediaUpload";
import { createErrorMessage } from "./CreateErrorDialog";
import { getSuspendedAccountMessage } from "@/lib/apollo/suspended-account";
import { TikTokLibrary } from "./TikTokLibrary";
import { useDraftRequestKeys } from "@/features/create/utils/draftRequestKeys";

export function TikTokPicker({
  onUsed,
  onError,
}: {
  lang: string;
  /** Called after the draft is created and the store enters "edit". */
  onUsed: () => void;
  /** Draft-creation failures (e.g. "Maximum active drafts reached"). */
  onError?: (message: string) => void;
}) {
  const { setContentType, setStep, setDraftId, setCreationMode, reset } =
    useCreateStore();
  const [createDraft] = useMutation(CreateDraftDocument);
  const { startVideoUpload } = useMediaUpload();
  const draftKeys = useDraftRequestKeys();

  async function handleSelect(file: File) {
    try {
      const { data, error } = await createDraft({
        // The type stays VIDEO; the flag records that it came from TikTok.
        variables: {
          input: {
            type: "VIDEO",
            isTiktokImport: true,
            clientRequestId: draftKeys.get("tiktok"),
          },
        },
      });
      if (error || !data?.createDraft) {
        throw new Error(error?.message ?? "Could not start your draft");
      }
      draftKeys.done("tiktok");
      const id = data.createDraft.id;

      // Start fresh, but stay in the mode the seller chose (manual skips the
      // AI frame capture inside startVideoUpload).
      const mode = useCreateStore.getState().creationMode;
      reset();
      if (mode) setCreationMode(mode);
      setDraftId(id);
      setContentType("video");
      startVideoUpload(file, id);
      setStep("edit");
      onUsed();
    } catch (error) {
      if (getSuspendedAccountMessage(error)) return;
      onError?.(createErrorMessage(error));
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
      <div className="mx-auto w-full max-w-xl">
        <TikTokLibrary onSelect={handleSelect} />
      </div>
    </div>
  );
}
