"use client";

import { useMutation } from "@apollo/client/react";
import { useCreateStore } from "@/stores/create";
import { CreateDraftDocument } from "@/types/__generated__/graphql";
import { useMediaUpload } from "@/features/create/hooks/useMediaUpload";
import { createErrorMessage } from "./CreateErrorDialog";
import { getSuspendedAccountMessage } from "@/lib/apollo/suspended-account";
import { useDraftRequestKeys } from "@/features/create/utils/draftRequestKeys";
import { TiktokImportPanel } from "@/features/profile/components/TiktokImportPanel";

export function TikTokAccountPicker({
  lang,
  onUsed,
  onError,
}: {
  lang: string;
  onUsed: () => void;
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

      const mode = useCreateStore.getState().creationMode;
      reset();
      if (mode) setCreationMode(mode);
      setDraftId(data.createDraft.id);
      setContentType("video");
      startVideoUpload(file, data.createDraft.id);
      setStep("edit");
      onUsed();
    } catch (error) {
      if (getSuspendedAccountMessage(error)) return;
      onError?.(createErrorMessage(error));
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-xl">
        <TiktokImportPanel
          lang={lang}
          onSelectVideo={(_video, file) => handleSelect(file)}
        />
      </div>
    </div>
  );
}
