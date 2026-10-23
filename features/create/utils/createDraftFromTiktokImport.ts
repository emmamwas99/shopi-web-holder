import { gql, type TypedDocumentNode } from "@apollo/client";
import type { useApolloClient } from "@apollo/client/react";
import {
  CreateDraftFromTiktokImportDocument,
  ImportTiktokVideoDocument,
  type DownloadStatus,
} from "@/types/__generated__/graphql";

const TIKTOK_DOWNLOAD_STATUS = gql`
  query TiktokDownloadStatus($id: String!) {
    tiktokDownload(id: $id) {
      id
      status
      errorMessage
    }
  }
` as TypedDocumentNode<TiktokDownloadStatusQuery, TiktokDownloadStatusVariables>;

const IMPORT_POLL_INTERVAL_MS = 1_500;
const IMPORT_POLL_ATTEMPTS = 120;

type ApolloClientInstance = ReturnType<typeof useApolloClient>;

type TiktokDownloadStatusQuery = {
  tiktokDownload: {
    id: string;
    status: DownloadStatus;
    errorMessage: string | null;
  } | null;
};

type TiktokDownloadStatusVariables = { id: string };

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reuse the API's Mux-backed TikTok import when one already exists. If the
 * import is new or still processing, wait for the API worker before creating
 * a draft, so the browser never downloads and uploads the same video again.
 */
export async function createDraftFromTiktokShareUrl(
  client: ApolloClientInstance,
  shareUrl: string,
): Promise<string> {
  const { data: importData, error: importError } = await client.mutate({
    mutation: ImportTiktokVideoDocument,
    variables: { shareUrl },
  });
  if (importError || !importData?.importTiktokVideo) {
    throw new Error(importError?.message ?? "Could not prepare that TikTok video");
  }

  const requestedImport = importData.importTiktokVideo;
  let status = requestedImport.status;
  let importErrorMessage = requestedImport.errorMessage;

  for (let attempt = 0; status !== "COMPLETED"; attempt += 1) {
    if (status === "FAILED") {
      throw new Error(importErrorMessage ?? "TikTok could not prepare that video");
    }
    if (attempt >= IMPORT_POLL_ATTEMPTS) {
      throw new Error("TikTok is still preparing that video. Please try again shortly.");
    }

    await wait(IMPORT_POLL_INTERVAL_MS);
    const { data: statusData, error: statusError } = await client.query({
      query: TIKTOK_DOWNLOAD_STATUS,
      variables: { id: requestedImport.id },
      fetchPolicy: "network-only",
    });
    if (statusError || !statusData?.tiktokDownload) {
      throw new Error(statusError?.message ?? "Could not check TikTok import status");
    }
    status = statusData.tiktokDownload.status;
    importErrorMessage = statusData.tiktokDownload.errorMessage;
  }

  const { data: draftData, error: draftError } = await client.mutate({
    mutation: CreateDraftFromTiktokImportDocument,
    variables: { downloadId: requestedImport.id },
  });
  if (draftError || !draftData?.createDraftFromTiktokImport) {
    throw new Error(draftError?.message ?? "Could not start your draft");
  }

  return draftData.createDraftFromTiktokImport.id;
}
