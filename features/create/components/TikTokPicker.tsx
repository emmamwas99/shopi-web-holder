"use client";

/**
 * TikTokPicker - the TikTok import surface for the manual create flow, free of
 * route/dialog chrome so it renders inline wherever the host puts it: the
 * desktop create dialog, the mobile picker page, or the /upload/tiktok route.
 *
 * Paste a link or reuse a saved TikTok video. The API reuses its Mux-backed
 * import when available, so this flow doesn't download and upload the same
 * video again.
 */

import { useApolloClient } from "@apollo/client/react";
import { useCreateStore } from "@/stores/create";
import { createErrorMessage } from "./CreateErrorDialog";
import { getSuspendedAccountMessage } from "@/lib/apollo/suspended-account";
import { TikTokLibrary } from "./TikTokLibrary";
import { createDraftFromTiktokShareUrl } from "@/features/create/utils/createDraftFromTiktokImport";

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
  const apolloClient = useApolloClient();

  async function handleSelectUrl(url: string) {
    try {
      const draftId = await createDraftFromTiktokShareUrl(apolloClient, url);
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
    <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
      <div className="mx-auto w-full max-w-xl">
        <TikTokLibrary onSelectUrl={handleSelectUrl} />
      </div>
    </div>
  );
}
