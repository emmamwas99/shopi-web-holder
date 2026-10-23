"use client";

import { useApolloClient } from "@apollo/client/react";
import { useCreateStore } from "@/stores/create";
import type { GetMyTiktokVideosQuery } from "@/types/__generated__/graphql";
import { createErrorMessage } from "./CreateErrorDialog";
import { getSuspendedAccountMessage } from "@/lib/apollo/suspended-account";
import { TiktokImportPanel } from "@/features/profile/components/TiktokImportPanel";
import { createDraftFromTiktokShareUrl } from "@/features/create/utils/createDraftFromTiktokImport";

type TiktokVideo = NonNullable<
  GetMyTiktokVideosQuery["myTiktokVideos"]["videos"][number]
>;

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
  const apolloClient = useApolloClient();

  async function handleSelect(video: TiktokVideo) {
    try {
      const draftId = await createDraftFromTiktokShareUrl(
        apolloClient,
        video.shareUrl,
      );

      const mode = useCreateStore.getState().creationMode;
      reset();
      if (mode) setCreationMode(mode);
      setDraftId(draftId);
      setContentType("video");
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
          onUseSelectedVideo={handleSelect}
        />
      </div>
    </div>
  );
}
