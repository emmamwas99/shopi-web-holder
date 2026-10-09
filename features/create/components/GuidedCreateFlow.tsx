/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Images,
  LockKeyhole,
  MapPin,
  Send,
  Upload,
  Users,
  WandSparkles,
} from "lucide-react";
import {
  AdvanceDraftStepDocument,
  CreateDraftDocument,
  DiscardDraftDocument,
  GetMediaAssetDocument,
  MyContactPhoneDocument,
  PublishDraftDocument,
  SuggestedPostLocationDocument,
} from "@/types/__generated__/graphql";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  useCreateStore,
  type DraftLocation,
  type GuidedStage,
} from "@/stores/create";
import { useMediaUpload } from "@/features/create/hooks/useMediaUpload";
import {
  captureImageFrame,
  captureVideoFrames,
} from "@/features/create/utils/captureVideoFrames";
import { getMediaPreviewSrc } from "@/features/create/utils/mediaPreview";
import {
  GUIDED_AUTOSAVE_DRAFT,
  GUIDED_EXTRACT_FROM_DRAFT,
  GUIDED_EXTRACT_FROM_FRAMES,
  SHOPI_AGENT_TURN,
  type AgentAsk,
  type AgentFieldTarget,
  type GuidedAutosaveInput,
  type GuidedExtractDetails,
} from "@/features/create/graphql/guided";
import { CategoryPickerDrawer } from "./CategoryPickerDrawer";
import { LocationPicker } from "./LocationPicker";
import { PhoneInput } from "./PhoneInput";
import { SpecsEditor } from "./SpecsEditor";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useSocket } from "@/hooks/useSocket";
import { trackPostPublished } from "@/lib/analytics";
import {
  WS_EVENTS,
  type AgentStreamDeltaPayload,
  type AgentStreamDonePayload,
} from "@/lib/socket/socket-events";
import { CreateBanner } from "./DesktopCreateFlow";
import {
  CreateSuccessPrimaryAction,
  CreateSuccessScreen,
} from "./CreateSuccessScreen";
import { TikTokIcon } from "@/components/ui/TikTokIcon";
import { OrDivider } from "./OrDivider";
import { TikTokImportDrawer } from "./TikTokImportDrawer";
import { DrawerLoadingIndicator } from "@/components/ui/drawer-loading-indicator";

const MAX_IMAGES = 10;
const ATTACH_TIMEOUT_MS = 30_000;
const RESUME_ANALYSIS_TIMEOUT_MS = 90_000;

const STAGE_ORDER: GuidedStage[] = [
  "intro",
  "media",
  "analyzing",
  "insights",
  "conversation",
  "options",
  "publishing",
  "done",
];

/** Stable-ish id for chat messages (no external dep). */
let messageSeq = 0;
function messageId(): string {
  messageSeq += 1;
  return `m${Date.now().toString(36)}-${messageSeq}`;
}

const QUICK_INTENTS = [
  "A phone I want to sell",
  "My car",
  "Furniture",
  "Clothes or shoes",
];

type Visibility = "public" | "friends_only" | "private";

function stageReached(current: GuidedStage, target: GuidedStage): boolean {
  return STAGE_ORDER.indexOf(current) >= STAGE_ORDER.indexOf(target);
}

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** How long the "thinking" indicator stays up for a turn that didn't actually
 *  wait on the AI (deterministic fallback, either client- or server-side).
 *  Keeps the pacing consistent — a question that shows up instantly right
 *  after one that took a couple of seconds reads as a glitch, not as "fast". */
const SIMULATED_THINKING_MS = 2000;

async function ensureMinElapsed(since: number, minMs: number): Promise<void> {
  const remaining = minMs - (Date.now() - since);
  if (remaining > 0) await delay(remaining);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read the selected media"));
    reader.readAsDataURL(blob);
  });
}

function locationInput(location: DraftLocation) {
  return {
    placeName: location.placeName,
    formattedAddress: location.formattedAddress,
    placeId: location.placeId,
    latitude: location.latitude,
    longitude: location.longitude,
    county: location.county,
    subregion: location.subregion,
  };
}

function visibilityToApi(
  visibility: Visibility,
): "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE" {
  if (visibility === "friends_only") return "FRIENDS_ONLY";
  if (visibility === "private") return "PRIVATE";
  return "PUBLIC";
}

export function GuidedCreateFlow({ lang }: { lang: string }) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const apolloClient = useApolloClient();
  const { user } = useAuthSession();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftSetupInFlightRef = useRef(false);
  const analysisInFlightRef = useRef<string | null>(null);
  const locationAutofilledRef = useRef(false);
  const phoneAutofilledRef = useRef(false);

  const store = useCreateStore();
  const {
    creationMode,
    guidedStage,
    guidedIntent,
    guidedInsights,
    agentMessages,
    agentAsk,
    agentReady,
    draftId,
    mediaItems,
    title,
    caption,
    categoryId,
    categoryName,
    subcategoryId,
    subcategoryName,
    specs,
    price,
    currency,
    negotiable,
    location,
    contactPhone,
    visibilityMode,
    allowDownload,
    hdEnabled,
    setCreationMode,
    setGuidedStage,
    setGuidedIntent,
    setGuidedInsights,
    addAgentMessage,
    setAgentAsk,
    setAgentReady,
    setDraftId,
    setContentType,
    setStep,
    setTitle,
    setCaption,
    setCategory,
    setSubcategory,
    setSpecs,
    setPrice,
    setNegotiable,
    setLocation,
    setContactPhone,
    setVisibilityMode,
    setAllowDownload,
    setHdEnabled,
    setHasExtracted,
    reset,
  } = store;

  const [hydrated, setHydrated] = useState(false);
  const [intentInput, setIntentInput] = useState(guidedIntent);
  const [priceInput, setPriceInput] = useState(
    price != null ? String(price) : "",
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [tiktokOpen, setTiktokOpen] = useState(false);
  const [publishedContentId, setPublishedContentId] = useState<string | null>(
    null,
  );

  const [createDraft] = useMutation(CreateDraftDocument);
  const [discardDraft] = useMutation(DiscardDraftDocument);
  const [autosaveDraft] = useMutation(GUIDED_AUTOSAVE_DRAFT);
  const [extractFromFrames] = useMutation(GUIDED_EXTRACT_FROM_FRAMES);
  const [extractFromDraft] = useMutation(GUIDED_EXTRACT_FROM_DRAFT);
  const [shopiAgentTurn] = useMutation(SHOPI_AGENT_TURN);
  const [advanceDraft] = useMutation(AdvanceDraftStepDocument);
  const [publishDraft] = useMutation(PublishDraftDocument);

  const [agentThinking, setAgentThinking] = useState(false);
  // True when the current question came from the deterministic fallback
  // planner rather than the AI (server returned `aiUsed: false`, or the
  // mutation itself failed and we dropped to the client-side planner). Either
  // way only generic/essential questions are asked — never a guessed
  // category-specific field — so this only needs to inform the seller, not
  // change what's rendered.
  const [aiDegraded, setAiDegraded] = useState(false);
  const agentTurnInFlightRef = useRef(false);
  const { startImageUpload, startVideoUpload } = useMediaUpload();

  // Live streamed assistant message for the in-flight turn. The server streams
  // the reply over the socket as Gemini generates it, so the seller sees text
  // appear immediately instead of waiting for the whole turn to resolve. The
  // authoritative message still arrives with the mutation and replaces this.
  const { on: onSocketEvent } = useSocket();
  const [streamingText, setStreamingText] = useState("");
  const streamingTextRef = useRef("");

  useEffect(() => {
    const isCurrentDraft = (draftIdOfEvent: string) =>
      draftIdOfEvent === useCreateStore.getState().draftId;

    const offDelta = onSocketEvent<AgentStreamDeltaPayload>(
      WS_EVENTS.AGENT_STREAM_DELTA,
      (payload) => {
        if (payload.channel !== "seller" || !isCurrentDraft(payload.draftId)) return;
        streamingTextRef.current += payload.delta;
        setStreamingText(streamingTextRef.current);
      },
    );
    const offDone = onSocketEvent<AgentStreamDonePayload>(
      WS_EVENTS.AGENT_STREAM_DONE,
      () => {
        // The final message arrives with the mutation result, which clears the
        // streaming preview; nothing to do here beyond letting it settle.
      },
    );
    return () => {
      offDelta();
      offDone();
    };
  }, [onSocketEvent]);

  const resetStreamingText = () => {
    streamingTextRef.current = "";
    setStreamingText("");
  };

  const { data: suggestedLocationData } = useQuery(
    SuggestedPostLocationDocument,
    { fetchPolicy: "cache-first" },
  );
  const { data: myPhoneData } = useQuery(MyContactPhoneDocument, {
    fetchPolicy: "cache-first",
  });

  useEffect(() => {
    if (useCreateStore.persist.hasHydrated()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot external-store hydration latch
      setHydrated(true);
      return;
    }
    return useCreateStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (creationMode === "choose") {
      router.replace(`/${lang}/upload`);
      return;
    }
    // Never silently reinterpret an existing manual/legacy draft as a guided
    // one just because its URL was typed directly.
    if (draftId && creationMode !== "ai") {
      router.replace(`/${lang}/upload/create-manual`);
      return;
    }
    if (!draftId && creationMode !== "ai") setCreationMode("ai");
  }, [creationMode, draftId, hydrated, lang, router, setCreationMode]);

  useEffect(() => {
    if (
      !hydrated ||
      draftId ||
      guidedStage !== "analyzing" ||
      draftSetupInFlightRef.current
    ) {
      return;
    }
    // A refresh in the tiny gap between "thinking" and createDraft completing
    // cancels that request. There is no server draft to resume, so return to the
    // media prompt with an actionable message.
    setGuidedStage("media");
    setFormError(
      "That setup didn’t finish. Choose your media again to continue.",
    );
  }, [draftId, guidedStage, hydrated, setGuidedStage]);

  useEffect(() => {
    if (!hydrated || locationAutofilledRef.current || location) return;
    const suggested = suggestedLocationData?.suggestedPostLocation;
    if (!suggested?.placeName || !suggested.placeId) return;
    locationAutofilledRef.current = true;
    setLocation({
      placeName: suggested.placeName,
      formattedAddress: suggested.formattedAddress ?? "",
      placeId: suggested.placeId,
      county: suggested.county ?? undefined,
      subregion: suggested.subregion ?? undefined,
    });
  }, [
    hydrated,
    location,
    setLocation,
    suggestedLocationData?.suggestedPostLocation,
  ]);

  useEffect(() => {
    if (!hydrated || phoneAutofilledRef.current || contactPhone) return;
    const saved = myPhoneData?.myContactPhone;
    if (!saved) return;
    phoneAutofilledRef.current = true;
    setContactPhone(saved);
  }, [contactPhone, hydrated, myPhoneData?.myContactPhone, setContactPhone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [guidedStage, mediaItems.length, agentMessages.length, agentAsk, agentThinking]);

  // Legacy resilience: a session persisted mid-flow under the old fixed stages
  // ("description"/"price"/"location") resumes in the new conversation stage.
  useEffect(() => {
    if (!hydrated) return;
    const legacy = ["description", "price", "location"];
    if (legacy.includes(guidedStage as string)) {
      setGuidedStage("conversation");
    }
  }, [hydrated, guidedStage, setGuidedStage]);

  const firstName =
    user?.profile?.firstName?.trim() ||
    user?.email?.split("@")[0]?.trim() ||
    "there";

  async function saveDraft(
    id: string,
    input: GuidedAutosaveInput,
  ): Promise<void> {
    const { error } = await autosaveDraft({ variables: { id, input } });
    if (error) throw new Error(error.message);
  }

  function submitIntent(raw = intentInput) {
    const value = raw.trim();
    if (!value) return;
    setGuidedIntent(value);
    setIntentInput(value);
    setGuidedStage("media");
    setFormError(null);
  }

  async function captureFrames(files: File[], kind: "image" | "video") {
    if (kind === "video") {
      return captureVideoFrames(files[0]);
    }
    const captured = await Promise.all(
      files.slice(0, 4).map((file) => captureImageFrame(file)),
    );
    return captured.filter((frame): frame is Blob => !!frame);
  }

  function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    void startWithFiles(picked);
  }

  /** TikTok import hands over the downloaded (or saved) video as a plain File. */
  function handleTiktokSelect(file: File) {
    setTiktokOpen(false);
    return startWithFiles([file], { isTiktokImport: true });
  }

  async function startWithFiles(
    picked: File[],
    { isTiktokImport = false }: { isTiktokImport?: boolean } = {},
  ) {
    if (picked.length === 0) return;

    const kind = picked[0].type.startsWith("video/") ? "video" : "image";
    const files =
      kind === "video"
        ? picked.slice(0, 1)
        : picked
            .filter((file) => file.type.startsWith("image/"))
            .slice(0, MAX_IMAGES);

    if (
      files.length === 0 ||
      (kind === "video" && picked.length !== 1) ||
      picked.some((file) =>
        kind === "video"
          ? !file.type.startsWith("video/")
          : !file.type.startsWith("image/"),
      )
    ) {
      setFormError(
        kind === "video" && picked.length > 1
          ? "Choose one video at a time."
          : "Choose either one video or a set of photos, not both.",
      );
      return;
    }

    const previousState = useCreateStore.getState();
    const replacingMedia =
      Boolean(previousState.draftId) || previousState.mediaItems.length > 0;

    draftSetupInFlightRef.current = true;
    setFormError(null);
    setAnalysisError(null);
    setGuidedStage("analyzing");

    const framesPromise = captureFrames(files, kind).catch(() => [] as Blob[]);
    let createdDraftId: string | null = null;

    try {
      if (replacingMedia) {
        if (previousState.draftId) {
          const response = await discardDraft({
            variables: { id: previousState.draftId },
          });
          if (response.error || !response.data?.discardDraft) {
            throw new Error(
              response.error?.message ?? "Could not replace the current media",
            );
          }
        }

        previousState.mediaItems.forEach((item) => {
          if (item.localUri?.startsWith("blob:")) {
            URL.revokeObjectURL(item.localUri);
          }
        });

        reset();
        locationAutofilledRef.current = false;
        phoneAutofilledRef.current = false;
        setCreationMode("ai");
        setGuidedIntent(previousState.guidedIntent);
        setIntentInput(previousState.guidedIntent);
        setPriceInput("");
        if (previousState.location) setLocation(previousState.location);
        if (previousState.contactPhone) {
          setContactPhone(previousState.contactPhone);
        }
        setGuidedStage("analyzing");
      }

      const { data, error } = await createDraft({
        variables: {
          input: {
            type: kind === "video" ? "VIDEO" : "IMAGE",
            // Only sent for the TikTok route: the type stays VIDEO, and the
            // admin uses the flag to see which create route the post took.
            ...(isTiktokImport ? { isTiktokImport: true } : {}),
          },
        },
      });
      if (error || !data?.createDraft) {
        throw new Error(error?.message ?? "Could not start your draft");
      }

      const id = data.createDraft.id;
      createdDraftId = id;
      analysisInFlightRef.current = id;
      setDraftId(id);
      setContentType(kind);
      setStep("edit");

      // Persist the broad intent so the API can use it to disambiguate media
      // classification. It is never used as title/specification evidence.
      await saveDraft(id, { caption: guidedIntent });

      if (kind === "video") {
        startVideoUpload(files[0], id);
      } else {
        files.forEach((file, index) => startImageUpload(file, id, index));
      }

      const frames = await framesPromise;
      let result: GuidedExtractDetails | null = null;
      if (frames.length > 0) {
        const dataUrls = await Promise.all(frames.map(blobToDataUrl));
        const response = await extractFromFrames({
          variables: { id, frames: dataUrls },
        });
        result = response.data?.extractDraftDetailsFromFrames ?? null;
      }

      if (!result) {
        result = await extractWhenMediaReady(id, 25_000);
      }
      await applyAnalysis(id, result);
    } catch (error) {
      if (!createdDraftId) {
        setFormError(
          error instanceof Error ? error.message : "Could not start your draft",
        );
        setGuidedStage("media");
      } else {
        await finishWithoutAnalysis(error);
      }
    } finally {
      draftSetupInFlightRef.current = false;
      analysisInFlightRef.current = null;
    }
  }

  async function extractWhenMediaReady(
    id: string,
    timeoutMs: number,
  ): Promise<GuidedExtractDetails | null> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const items = useCreateStore.getState().mediaItems;
      if (items.some((item) => item.status === "ready")) {
        const response = await extractFromDraft({ variables: { id } });
        return response.data?.extractDraftDetails ?? null;
      }
      if (items.length > 0 && items.every((item) => item.status === "error")) {
        return null;
      }

      // After a refresh the upload hook that owned the socket listener is gone,
      // while the worker continues normally. Poll real asset ids so this
      // resumable conversation can observe the worker's READY transition.
      const realItems = items.filter((item) => !item.id.startsWith("temp-"));
      if (realItems.length > 0) {
        await Promise.all(
          realItems.map(async (item) => {
            try {
              const { data } = await apolloClient.query({
                query: GetMediaAssetDocument,
                variables: { id: item.id },
                fetchPolicy: "network-only",
              });
              const asset = data?.mediaAsset;
              if (!asset) return;
              useCreateStore.getState().updateMediaItem(item.id, {
                status:
                  asset.status === "READY"
                    ? "ready"
                    : asset.status === "FAILED"
                      ? "error"
                      : "processing",
                thumbnailUrl: asset.thumbnailUrl ?? item.thumbnailUrl,
                r2Variants: asset.r2Variants ?? item.r2Variants,
                muxPlaybackId: asset.muxMeta?.playbackId ?? item.muxPlaybackId,
                errorMessage: asset.errorMessage ?? undefined,
              });
            } catch {
              // A transient polling failure should not interrupt the worker or
              // the overall timeout. The next iteration retries.
            }
          }),
        );
      }
      await delay(1_200);
    }
    return null;
  }

  async function resumeAnalysisFromDraft(id: string) {
    try {
      const result = await extractWhenMediaReady(
        id,
        RESUME_ANALYSIS_TIMEOUT_MS,
      );
      await applyAnalysis(id, result);
    } catch (error) {
      await finishWithoutAnalysis(error);
    } finally {
      analysisInFlightRef.current = null;
    }
  }

  // A refresh can interrupt the client-frame request while the R2/Mux upload
  // keeps running. Resume from processed server media instead of leaving the
  // seller on a permanent "thinking" bubble.
  useEffect(() => {
    if (
      !hydrated ||
      guidedStage !== "analyzing" ||
      !draftId ||
      analysisInFlightRef.current === draftId
    ) {
      return;
    }
    analysisInFlightRef.current = draftId;
    void resumeAnalysisFromDraft(draftId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, guidedStage, hydrated]);

  // Resume the conversation after a refresh: if we're in the conversation stage
  // with no pending question and nothing in flight, ask the agent for the next
  // step from the current draft state.
  useEffect(() => {
    if (
      !hydrated ||
      guidedStage !== "conversation" ||
      !draftId ||
      agentReady ||
      agentAsk ||
      agentThinking ||
      agentTurnInFlightRef.current
    ) {
      return;
    }
    void runAgentTurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, guidedStage, hydrated, agentReady, agentAsk, agentThinking]);

  async function applyAnalysis(
    id: string,
    result: GuidedExtractDetails | null,
  ) {
    if (!result) {
      const currentMedia = useCreateStore.getState().mediaItems;
      if (
        currentMedia.length > 0 &&
        currentMedia.every((item) => item.status === "error")
      ) {
        setAnalysisError(null);
        setFormError(
          "That upload did not finish. Choose the media again to continue.",
        );
        setGuidedStage("media");
        return;
      }
      await finishWithoutAnalysis(
        new Error(
          "I could not confidently read enough details from that media.",
        ),
      );
      return;
    }

    // The opening answer is broad intent, not verified listing data. Keep the
    // title empty when media analysis cannot identify the item so the seller
    // supplies an accurate one instead of publishing the opening answer.
    const nextTitle = result.title.trim();
    const cleanSpecs = result.specs
      .map((spec) => ({ key: spec.key.trim(), value: spec.value.trim() }))
      .filter((spec) => spec.key && spec.value);
    const initialPrice = result.price ?? result.suggestedPrice;
    const hasPreparedDetails =
      Boolean(result.description.trim()) ||
      cleanSpecs.length > 0 ||
      initialPrice != null;

    setAnalysisError(
      hasPreparedDetails
        ? null
        : "Shopi Agent found part of the listing. Complete or adjust the remaining details.",
    );

    setTitle(nextTitle);
    setCaption(result.description);
    setSpecs(cleanSpecs);
    if (result.categoryId) {
      setCategory(result.categoryId, result.level1, "ai");
    }
    if (initialPrice != null) {
      setPrice(initialPrice, initialPrice === 0);
      setPriceInput(String(initialPrice));
    }
    setGuidedInsights({
      subcategory: result.level2 ?? "",
      classificationConfidence: result.classificationConfidence,
      detectedPrice: result.price,
      suggestedPrice: result.suggestedPrice,
      priceRangeLow: result.priceRangeLow,
      priceRangeHigh: result.priceRangeHigh,
      pricingReason: result.pricingReason,
      pricingConfidence: result.pricingConfidence,
    });
    setHasExtracted(true);

    await saveDraft(id, {
      title: nextTitle,
      caption: result.description,
      categoryId: result.categoryId ?? undefined,
      specs: cleanSpecs,
      aiClassification:
        result.level1 || result.level2
          ? {
              level1: result.level1 ?? undefined,
              level2: result.level2 ?? undefined,
              confidence: result.classificationConfidence ?? undefined,
            }
          : undefined,
    }).catch(() => undefined);

    setGuidedStage("insights");
  }

  async function finishWithoutAnalysis(error: unknown) {
    const currentMedia = useCreateStore.getState().mediaItems;
    if (
      currentMedia.length > 0 &&
      currentMedia.every((item) => item.status === "error")
    ) {
      setAnalysisError(null);
      setFormError(
        "That upload did not finish. Choose the media again to continue.",
      );
      setGuidedStage("media");
      return;
    }

    setGuidedInsights({
      subcategory: "",
      classificationConfidence: null,
      detectedPrice: null,
      suggestedPrice: null,
      priceRangeLow: null,
      priceRangeHigh: null,
      pricingReason: null,
      pricingConfidence: null,
    });
    setAnalysisError(
      error instanceof Error
        ? error.message
        : "I could not confidently read enough details from that media.",
    );
    setGuidedStage("insights");
  }

  async function retryCurrentMedia() {
    if (!draftId || analysisInFlightRef.current) return;

    setFormError(null);
    setAnalysisError(null);
    setGuidedStage("analyzing");
    analysisInFlightRef.current = draftId;
    await resumeAnalysisFromDraft(draftId);
  }

  async function confirmInsights() {
    if (!draftId) return;
    if (!title.trim()) {
      setFormError("Add a clear title so buyers know what you are offering.");
      return;
    }
    if (!categoryId) {
      setFormError("Choose a category before we continue.");
      return;
    }
    setFormError(null);
    try {
      await saveDraft(draftId, {
        title: title.trim(),
        caption,
        categoryId,
        specs: specs
          .map((spec) => ({
            key: spec.key.trim(),
            value: spec.value.trim(),
          }))
          .filter((spec) => spec.key && spec.value),
        aiClassification: {
          level1: categoryName ?? undefined,
          level2: subcategoryName || guidedInsights?.subcategory || undefined,
          confidence: guidedInsights?.classificationConfidence ?? undefined,
        },
      });
      await startConversation();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  }

  // ── Shopi Agent conversation ────────────────────────────────────────────────
  //
  // After the seller confirms what the media analysis found, the agent runs a
  // dynamic, category-aware interview: it asks only for the details THIS item
  // still needs (land → size; car → mileage; …), then moves through the
  // essentials and hands off to the publish options. The number of questions is
  // decided per item by the API. If the turn mutation is unreachable, a local
  // deterministic planner keeps the exact same essentials flow going so nothing
  // ever dead-ends.

  function buildTranscript() {
    return useCreateStore.getState().agentMessages.map((m) => ({
      role: (m.role === "agent" ? "AGENT" : "USER") as "AGENT" | "USER",
      text: m.text,
    }));
  }

  async function startConversation() {
    setGuidedStage("conversation");
    const state = useCreateStore.getState();
    // Resume: if we already have a conversation (e.g. after a refresh), don't
    // restart it — just keep showing where the seller left off.
    if (state.agentMessages.length > 0 || state.agentReady || state.agentAsk) {
      return;
    }
    await runAgentTurn();
  }

  async function runAgentTurn(answered?: {
    answer?: string;
    answeredTarget?: AgentFieldTarget;
    answeredSpecKey?: string;
  }) {
    const id = useCreateStore.getState().draftId;
    if (!id || agentTurnInFlightRef.current) return;
    agentTurnInFlightRef.current = true;
    resetStreamingText();
    setAgentThinking(true);
    setFormError(null);
    const turnStartedAt = Date.now();
    try {
      const { data, error } = await shopiAgentTurn({
        variables: {
          id,
          input: {
            transcript: buildTranscript(),
            answer: answered?.answer,
            answeredTarget: answered?.answeredTarget,
            answeredSpecKey: answered?.answeredSpecKey,
            suggestedPrice:
              useCreateStore.getState().guidedInsights?.suggestedPrice ??
              undefined,
          },
        },
      });
      const turn = data?.shopiAgentTurn;
      if (error || !turn) {
        throw new Error(error?.message ?? "Shopi Agent is unavailable");
      }

      // Keep local specs in sync with anything the server upserted.
      if (Array.isArray(turn.specs)) {
        setSpecs(
          turn.specs
            .map((s) => ({ key: s.key.trim(), value: s.value.trim() }))
            .filter((s) => s.key && s.value),
        );
      }
      if (turn.message.trim()) {
        addAgentMessage({
          id: messageId(),
          role: "agent",
          text: turn.message.trim(),
        });
      }
      if (turn.readyToPublish || !turn.ask) {
        setAgentAsk(null);
        setAgentReady(true);
        setGuidedStage("options");
        setAiDegraded(false);
      } else {
        setAgentAsk(turn.ask);
        // `aiUsed: false` means the server itself fell back to the
        // deterministic listing-requirements planner (AI call failed or
        // timed out) — it still only asks generic/essential questions, never
        // a guessed category-specific one, but the seller should know why the
        // question feels more basic than usual.
        setAiDegraded(!turn.aiUsed);
      }
      // No real model call behind this turn — hold the "thinking" beat so it
      // doesn't feel like a different (broken) UI from the AI-driven turns.
      if (!turn.aiUsed) await ensureMinElapsed(turnStartedAt, SIMULATED_THINKING_MS);
    } catch {
      // The mutation itself failed (network / not deployed). Persist any pending
      // scalar answer ourselves, then continue with the deterministic essentials
      // flow so the seller can still finish the listing.
      if (answered && answered.answer !== undefined) {
        await persistScalarAnswer(answered).catch(() => undefined);
      }
      setAiDegraded(true);
      applyClientFallbackTurn();
      await ensureMinElapsed(turnStartedAt, SIMULATED_THINKING_MS);
    } finally {
      agentTurnInFlightRef.current = false;
      setAgentThinking(false);
      resetStreamingText();
    }
  }

  async function persistScalarAnswer(answered: {
    answer?: string;
    answeredTarget?: AgentFieldTarget;
    answeredSpecKey?: string;
  }) {
    const id = useCreateStore.getState().draftId;
    if (!id) return;
    const s = useCreateStore.getState();
    const patch: GuidedAutosaveInput = {};
    if (answered.answeredTarget === "TITLE") patch.title = s.title.trim();
    else if (answered.answeredTarget === "DESCRIPTION")
      patch.caption = s.caption.trim();
    else if (answered.answeredTarget === "SPEC")
      patch.specs = s.specs
        .map((spec) => ({ key: spec.key.trim(), value: spec.value.trim() }))
        .filter((spec) => spec.key && spec.value);
    else return;
    await saveDraft(id, patch);
  }

  /** Local mirror of the server's deterministic planner (used only if the turn mutation fails). */
  function clientFallbackAsk(): AgentAsk | null {
    const s = useCreateStore.getState();
    if (!s.title.trim()) {
      return {
        target: "TITLE",
        kind: "TEXT",
        specKey: null,
        label: "What are you selling?",
        helper: "A short, specific title works best.",
        placeholder: "e.g. Mazda CX-5 2018, Petrol",
        options: [],
        prefill: null,
        required: true,
      };
    }
    if (!s.caption.trim()) {
      return {
        target: "DESCRIPTION",
        kind: "LONGTEXT",
        specKey: null,
        label: "Describe your item",
        helper: "Condition, useful features and what comes with it.",
        placeholder: "Describe the condition, features and what is included.",
        options: [],
        prefill: null,
        required: true,
      };
    }
    if (s.price == null) {
      return {
        target: "PRICE",
        kind: "PRICE",
        specKey: null,
        label: "Your price",
        helper: "Enter 0 if you’d rather buyers ask.",
        placeholder: "Enter your price",
        options: [],
        prefill:
          s.guidedInsights?.suggestedPrice != null
            ? String(s.guidedInsights.suggestedPrice)
            : null,
        required: true,
      };
    }
    if (!s.location) {
      return {
        target: "LOCATION",
        kind: "LOCATION",
        specKey: null,
        label: "Where can buyers find this item?",
        helper: null,
        placeholder: null,
        options: [],
        prefill: null,
        required: true,
      };
    }
    if (!s.contactPhone) {
      return {
        target: "CONTACT_PHONE",
        kind: "PHONE",
        specKey: null,
        label: "A phone number so buyers can reach you",
        helper: "Shown only when a signed-in buyer asks to call.",
        placeholder: null,
        options: [],
        prefill: null,
        required: true,
      };
    }
    return null;
  }

  function applyClientFallbackTurn() {
    const ask = clientFallbackAsk();
    if (!ask) {
      setAgentAsk(null);
      setAgentReady(true);
      setGuidedStage("options");
      return;
    }
    setAgentAsk(ask);
  }

  // ── Answer handlers (one per input kind) ────────────────────────────────────

  async function answerScalar(ask: AgentAsk, rawValue: string) {
    const value = rawValue.trim();
    if (ask.required && !value) {
      setFormError("This one’s needed to keep your listing clear.");
      return;
    }

    // Apply locally so the live preview and any fallback stay accurate.
    if (ask.target === "TITLE") setTitle(value);
    else if (ask.target === "DESCRIPTION") setCaption(value);
    else if (ask.target === "SPEC" && ask.specKey) {
      const key = ask.specKey;
      const next = useCreateStore
        .getState()
        .specs.filter((s) => s.key.toLowerCase() !== key.toLowerCase());
      if (value) next.push({ key, value });
      setSpecs(next);
    }

    addAgentMessage({ id: messageId(), role: "user", text: value || "Skipped" });
    setAgentAsk(null);
    await runAgentTurn({
      answer: value,
      answeredTarget: ask.target,
      answeredSpecKey: ask.specKey ?? undefined,
    });
  }

  async function answerPrice(amount: number, isNegotiable: boolean) {
    const id = useCreateStore.getState().draftId;
    if (!id) return;
    setPrice(amount, amount === 0);
    setNegotiable(isNegotiable);
    setPriceInput(String(amount));
    // Persist before advancing so the next turn reads the confirmed price.
    try {
      await saveDraft(id, {
        price: { amount, currency, negotiable: isNegotiable },
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
      return;
    }
    addAgentMessage({
      id: messageId(),
      role: "user",
      text: `${currency} ${amount.toLocaleString()}${
        isNegotiable ? " · negotiable" : ""
      }`,
    });
    setAgentAsk(null);
    await runAgentTurn({ answeredTarget: "PRICE" });
  }

  async function answerLocation() {
    const id = useCreateStore.getState().draftId;
    const loc = useCreateStore.getState().location;
    if (!id || !loc) {
      setFormError("Choose a location so nearby buyers can find your listing.");
      return;
    }
    try {
      await saveDraft(id, { location: locationInput(loc) });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
      return;
    }
    addAgentMessage({ id: messageId(), role: "user", text: loc.placeName });
    setAgentAsk(null);
    await runAgentTurn({ answeredTarget: "LOCATION" });
  }

  async function answerPhone() {
    const id = useCreateStore.getState().draftId;
    const phone = useCreateStore.getState().contactPhone;
    if (!id || !phone) {
      setFormError("Add a valid phone number so interested buyers can call.");
      return;
    }
    // The server normalises/validates the number — keep the seller on this
    // question if it's rejected, so they can correct it.
    try {
      await saveDraft(id, { contactPhone: phone });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
      return;
    }
    addAgentMessage({ id: messageId(), role: "user", text: phone });
    setAgentAsk(null);
    await runAgentTurn({ answeredTarget: "CONTACT_PHONE" });
  }

  async function waitForMediaAttachment(): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < ATTACH_TIMEOUT_MS) {
      const items = useCreateStore.getState().mediaItems;
      if (
        items.length > 0 &&
        !items.some((item) => item.status === "uploading")
      ) {
        if (items.every((item) => item.status === "error")) {
          throw new Error("The media upload failed. Please start again.");
        }
        return;
      }
      await delay(300);
    }
    throw new Error(
      "Your media is still uploading. Please wait and try again.",
    );
  }

  async function handlePublish() {
    if (!draftId || !location || !contactPhone || !categoryId) {
      setFormError(
        "A required listing detail is missing. Please review the steps.",
      );
      return;
    }
    // Same label the picker displays and the payload sends (level2). Level 2 is
    // free-form, so an AI-filled subcategory has a name and no id — requiring
    // the id blocked a listing whose subcategory was visibly already set.
    const subcategoryLabel = subcategoryName || guidedInsights?.subcategory;
    if (!subcategoryId && !subcategoryLabel?.trim()) {
      setFormError("Choose a subcategory before posting.");
      setGuidedStage("options");
      return;
    }
    const parsedPrice = priceInput.trim() ? Number(priceInput) : (price ?? 0);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError("Enter a valid price before posting.");
      return;
    }

    setFormError(null);
    setGuidedStage("publishing");
    try {
      await waitForMediaAttachment();
      await saveDraft(draftId, {
        title: title.trim(),
        caption: caption.trim(),
        categoryId,
        specs: specs
          .map((spec) => ({
            key: spec.key.trim(),
            value: spec.value.trim(),
          }))
          .filter((spec) => spec.key && spec.value),
        aiClassification: {
          level1: categoryName ?? undefined,
          level2: subcategoryName || guidedInsights?.subcategory || undefined,
          confidence: guidedInsights?.classificationConfidence ?? undefined,
        },
        price: {
          amount: parsedPrice,
          currency,
          negotiable,
        },
        location: locationInput(location),
        contactPhone,
        visibilityMode: visibilityToApi(visibilityMode),
        allowDownload,
        hdEnabled,
      });

      let ready = false;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const response = await advanceDraft({ variables: { id: draftId } });
        if (response.error) throw new Error(response.error.message);
        if (response.data?.advanceDraftStep.currentStep === "READY") {
          ready = true;
          break;
        }
      }
      if (!ready) {
        throw new Error(
          "The draft is not ready yet. Review the required details and try again.",
        );
      }

      const response = await publishDraft({ variables: { id: draftId } });
      if (response.error || !response.data?.publishDraft) {
        throw new Error(
          response.error?.message ?? "Could not publish your post",
        );
      }

      const contentId = response.data.publishDraft.id;
      trackPostPublished("create");
      reset();
      setPublishedContentId(contentId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
      setGuidedStage("options");
    }
  }

  async function handleSaveDraft() {
    if (!draftId || savingDraft || guidedStage === "publishing") return;

    const parsedPrice = priceInput.trim() ? Number(priceInput) : (price ?? 0);
    setSavingDraft(true);
    setFormError(null);

    try {
      await saveDraft(draftId, {
        title: title.trim(),
        caption: caption.trim(),
        categoryId: categoryId ?? undefined,
        specs: specs
          .map((spec) => ({
            key: spec.key.trim(),
            value: spec.value.trim(),
          }))
          .filter((spec) => spec.key && spec.value),
        aiClassification: {
          level1: categoryName ?? undefined,
          level2: subcategoryName || guidedInsights?.subcategory || undefined,
          confidence: guidedInsights?.classificationConfidence ?? undefined,
        },
        price: {
          amount:
            Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0,
          currency,
          negotiable,
        },
        location: location ? locationInput(location) : undefined,
        contactPhone: contactPhone || undefined,
        visibilityMode: visibilityToApi(visibilityMode),
        allowDownload,
        hdEnabled,
      });
      reset();
      router.replace(`/${lang}/for-you`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingDraft(false);
    }
  }

  function closeFlow() {
    setCreationMode("choose");
    router.push(`/${lang}/upload`);
  }

  function switchToManual() {
    setCreationMode("manual");
    router.push(`/${lang}/upload/create-manual`);
  }

  // Wait for the breakpoint too: on desktop the flow renders inside a dialog,
  // on mobile full-screen. Deciding before `isDesktop` resolves would flash the
  // wrong layout for a frame.
  if (!hydrated || isDesktop === null) {
    return <DrawerLoadingIndicator className="min-h-svh bg-background" />;
  }

  if (publishedContentId) {
    return (
      <CreateSuccessScreen>
        <CreateSuccessPrimaryAction
          onClick={() => router.replace(`/${lang}/for-you`)}
        >
          Go to For You
        </CreateSuccessPrimaryAction>
      </CreateSuccessScreen>
    );
  }

  const flow = (
    <div
      className={`flex flex-col overflow-hidden bg-background ${
        isDesktop ? "h-full" : "h-svh"
      }`}
    >
      <header className="z-20 shrink-0 border-b border-border bg-elevated/95 backdrop-blur">
        <div
          className={`mx-auto flex h-16 w-full max-w-4xl items-center gap-3 px-3 md:px-6 ${
            isDesktop ? "pr-12 md:pr-14" : ""
          }`}
        >
          <button
            type="button"
            onClick={closeFlow}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
            aria-label="Back to post options"
          >
            <ChevronLeft size={22} />
          </button>
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Bot size={20} />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-elevated bg-success" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-foreground">
              Shopi Agent
            </h1>
            <p className="truncate text-xs text-muted">
              Online · You review every detail
            </p>
          </div>
          <button
            type="button"
            onClick={switchToManual}
            className="hidden h-9 items-center rounded-full border border-border px-3 text-xs font-semibold text-muted transition-colors hover:bg-surface hover:text-foreground sm:flex"
          >
            Use manual editor
          </button>
        </div>
      </header>

      <div className="h-0.5 shrink-0 overflow-hidden bg-border">
        {agentThinking || guidedStage === "analyzing" ? (
          <div className="h-full w-full animate-pulse bg-primary" />
        ) : null}
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto bg-surface/30">
        <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-3 py-5 sm:px-5 md:py-8">
          <AgentBubble>
            <p className="font-semibold">
              {greetingForNow()}, {firstName} 👋
            </p>
            <p className="mt-1">What are you selling today?</p>
          </AgentBubble>

          {guidedIntent ? <UserBubble>{guidedIntent}</UserBubble> : null}

          {stageReached(guidedStage, "media") ? (
            <AgentBubble>
              <p>Nice — add a few clear photos or a short video of it.</p>
              <p className="mt-1 text-sm text-muted">
                Already posted it on TikTok? You can import that video instead.
                I’ll look it over and get the details ready for you.
              </p>
            </AgentBubble>
          ) : null}

          {mediaItems.length > 0 ? (
            <UserBubble>
              <MediaStrip />
            </UserBubble>
          ) : null}

          {guidedStage === "analyzing" ? (
            <AgentBubble>
              <TypingState />
            </AgentBubble>
          ) : null}

          {stageReached(guidedStage, "insights") ? (
            <>
              <AgentBubble>
                {analysisError ? (
                  <>
                    <p>Hmm, I couldn’t quite make out every detail there.</p>
                    <p className="mt-1 text-sm text-muted">
                      No worries — just fill in or tweak anything below and
                      we’ll keep going.
                    </p>
                  </>
                ) : (
                  <>
                    <p>Nice one — here’s what I picked up from your photos.</p>
                    <p className="mt-1 text-sm text-muted">
                      Have a look and change anything that’s not quite right.
                    </p>
                  </>
                )}
              </AgentBubble>
              <AssistantCard>
                <div className="flex items-center gap-2">
                  <WandSparkles size={18} className="text-primary" />
                  <h2 className="font-black text-foreground">Item details</h2>
                </div>

                <Field label="Listing title">
                  <input
                    value={title}
                    maxLength={120}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="What are you selling?"
                    className="h-12 w-full rounded-xl border border-border bg-surface px-3 text-base text-foreground outline-none focus:border-primary"
                  />
                </Field>

                <Field label="Category">
                  <CategoryPickerDrawer
                    value={categoryId}
                    fallbackLabel={categoryName}
                    onChange={(id, name) => setCategory(id, name, "manual")}
                  />
                </Field>

                <Field
                  label="Subcategory"
                  hint="Pinpoints what buyers see this as, once you've picked a category"
                >
                  <CategoryPickerDrawer
                    value={subcategoryId}
                    fallbackLabel={subcategoryName ?? guidedInsights?.subcategory}
                    parentId={categoryId}
                    title="Subcategory"
                    placeholderLabel="Choose subcategory"
                    emptyLabel="No subcategories yet for this category."
                    onChange={(id, name) => setSubcategory(id, name)}
                  />
                </Field>

                <SpecsEditor specs={specs} onChange={setSpecs} />

                {guidedStage === "insights" ? (
                  <CardActions
                    primaryLabel="Looks good"
                    onPrimary={confirmInsights}
                  />
                ) : (
                  <ConfirmedLabel />
                )}
              </AssistantCard>
            </>
          ) : null}

          {stageReached(guidedStage, "conversation") ? (
            <>
              {agentMessages.map((message) =>
                message.role === "agent" ? (
                  <AgentBubble key={message.id}>
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  </AgentBubble>
                ) : (
                  <UserBubble key={message.id}>{message.text}</UserBubble>
                ),
              )}

              {agentThinking ? (
                <AgentBubble>
                  {streamingText ? (
                    <p className="whitespace-pre-wrap">
                      {streamingText}
                      <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
                    </p>
                  ) : (
                    <AgentTyping />
                  )}
                </AgentBubble>
              ) : null}

              {guidedStage === "conversation" && agentAsk && !agentThinking ? (
                <>
                  {aiDegraded ? (
                    <p className="px-1 text-xs text-muted">
                      AI assist is temporarily unavailable — showing standard
                      questions for now.
                    </p>
                  ) : null}
                  <AgentAskControl
                    key={`${agentAsk.target}:${agentAsk.specKey ?? ""}:${agentAsk.label}`}
                    ask={agentAsk}
                    onScalar={(value) => void answerScalar(agentAsk, value)}
                    onPrice={(amount, isNegotiable) =>
                      void answerPrice(amount, isNegotiable)
                    }
                    onLocation={() => void answerLocation()}
                    onPhone={() => void answerPhone()}
                  />
                </>
              ) : null}
            </>
          ) : null}

          {stageReached(guidedStage, "options") ? (
            <>
              <AgentBubble>
                <p>Almost there — choose who gets to see this listing.</p>
              </AgentBubble>
              <AssistantCard>
                <div className="flex items-center gap-2">
                  <LockKeyhole size={18} className="text-primary" />
                  <h2 className="font-black text-foreground">
                    Publishing options
                  </h2>
                </div>
                <VisibilityPicker
                  value={visibilityMode}
                  onChange={setVisibilityMode}
                />
                <div className="divide-y divide-border rounded-2xl border border-border bg-elevated px-3">
                  <OptionToggle
                    label="Allow downloads"
                    description="Let others save your media"
                    checked={allowDownload}
                    onChange={setAllowDownload}
                  />
                  <OptionToggle
                    label="HD quality"
                    description="Keep high-definition media when available"
                    checked={hdEnabled}
                    onChange={setHdEnabled}
                  />
                </div>
              </AssistantCard>
            </>
          ) : null}

          {guidedStage === "publishing" ? (
            <AgentBubble>
              <div className="flex items-center gap-3">
                <DrawerLoadingIndicator className="min-h-0 w-9 shrink-0" />
                <div>
                  <p className="font-semibold">Getting your listing live…</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Just saving the final details and preparing the media.
                  </p>
                </div>
              </div>
            </AgentBubble>
          ) : null}

          {guidedStage === "intro" ? (
            <div className="mt-2 flex flex-wrap gap-2 pl-11">
              {QUICK_INTENTS.map((intent) => (
                <button
                  key={intent}
                  type="button"
                  onClick={() => submitIntent(intent)}
                  className="rounded-full border border-border bg-elevated px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary-strong"
                >
                  {intent}
                </button>
              ))}
            </div>
          ) : null}

          {guidedStage === "media" ? (
            <div className="pl-0 sm:pl-11">
              {mediaItems.length === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[rgb(var(--color-border-strong))] bg-elevated px-5 py-9 text-center transition-colors hover:border-primary hover:bg-primary-soft/40"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform group-hover:scale-105">
                      <Upload size={26} />
                    </span>
                    <span className="mt-4 text-base font-semibold text-foreground">
                      Choose photos or a video
                    </span>
                    <span className="mt-1 text-xs text-muted">
                      Up to {MAX_IMAGES} photos, or one video
                    </span>
                  </button>
                  <OrDivider className="my-4" />

                  <button
                    type="button"
                    onClick={() => setTiktokOpen(true)}
                    className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-elevated px-4 py-3 text-left transition-colors hover:bg-surface active:scale-[0.99]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#010101] text-white">
                      <TikTokIcon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        Import from TikTok
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        Paste a link or reuse a saved video
                      </span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-muted" />
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-border bg-elevated p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Your selected media is still here
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Try preparing the listing again, or choose different media.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    {draftId ? (
                      <button
                        type="button"
                        onClick={retryCurrentMedia}
                        className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white"
                      >
                        Try again
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-surface"
                    >
                      Choose media
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleMediaChange}
              />
            </div>
          ) : null}

          {formError ? (
            <div className="ml-0 rounded-2xl border border-[rgb(var(--color-error)/0.25)] bg-[rgb(var(--color-error)/0.08)] px-4 py-3 text-sm font-medium text-error sm:ml-11">
              {formError}
            </div>
          ) : null}

          <div ref={bottomRef} className="h-2" />
        </div>
      </main>

      <TikTokImportDrawer
        open={tiktokOpen}
        onOpenChange={setTiktokOpen}
        onSelect={handleTiktokSelect}
      />

      {guidedStage === "intro" ? (
        <div className="shrink-0 border-t border-border bg-elevated px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 sm:px-5 md:px-6">
          <form
            className="mx-auto flex max-w-[820px] items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitIntent();
            }}
          >
            <textarea
              value={intentInput}
              onChange={(event) => setIntentInput(event.target.value)}
              rows={1}
              autoFocus
              placeholder="Tell me what you want to post…"
              className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground outline-none placeholder:text-muted focus:border-primary"
            />
            <button
              type="submit"
              disabled={!intentInput.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-md transition-transform active:scale-95 disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={19} />
            </button>
          </form>
        </div>
      ) : null}

      {guidedStage === "options" ? (
        <div className="shrink-0 border-t border-border bg-elevated/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 backdrop-blur md:px-6">
          <div className="mx-auto flex max-w-[820px] gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[rgb(var(--color-border-strong))] bg-transparent px-4 text-base font-semibold text-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {savingDraft ? (
                <DrawerLoadingIndicator className="min-h-0 w-9 shrink-0" />
              ) : (
                "Draft"
              )}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={savingDraft}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-base font-semibold text-white shadow-[0_6px_20px_rgb(var(--brand-primary)/0.4)] transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              Post now
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  // ── Desktop: host the flow in a centred dialog on the branded backdrop, so
  // the Shopi Agent surface matches the manual create flow and mode chooser. ──
  if (isDesktop) {
    return (
      <>
        <CreateBanner />
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) closeFlow();
          }}
        >
          <DialogContent className="flex h-[min(92vh,820px)] w-[min(96vw,720px)] max-w-none flex-col gap-0 overflow-hidden rounded-3xl border border-default bg-app p-0">
            <DialogTitle className="sr-only">Post with Shopi Agent</DialogTitle>
            <DialogDescription className="sr-only">
              Shopi Agent guides you through creating a post; you review every
              detail before publishing.
            </DialogDescription>
            {flow}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ── Mobile: full-screen (unchanged). ──
  return flow;
}

function AgentBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-[92%] items-start gap-2.5 self-start sm:max-w-[82%]">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Bot size={17} />
      </span>
      <div className="rounded-2xl rounded-tl-md border border-border bg-elevated px-4 py-3 text-sm leading-relaxed text-foreground">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[88%] self-end rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-relaxed text-white sm:max-w-[76%]">
      {children}
    </div>
  );
}

function AssistantCard({ children }: { children: ReactNode }) {
  return (
    <div className="ml-0 flex w-full flex-col gap-4 rounded-2xl border border-border bg-elevated p-4 shadow-sm sm:ml-11 sm:w-[calc(100%-2.75rem)] sm:p-5">
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
      </span>
      {hint ? (
        <span className="-mt-1 mb-2 block text-xs text-muted">{hint}</span>
      ) : null}
      {children}
    </div>
  );
}

function ConfirmedLabel() {
  return (
    <span className="inline-flex items-center gap-1.5 self-end rounded-full bg-[rgb(var(--color-success)/0.12)] px-3 py-1 text-xs font-bold text-success">
      <Check size={13} />
      Confirmed
    </span>
  );
}

function CardActions({
  primaryLabel,
  onPrimary,
  onBack,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
      <button
        type="button"
        onClick={onPrimary}
        className="flex min-h-12 w-full flex-none items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] sm:w-auto sm:flex-1"
      >
        {primaryLabel}
        <ArrowRight size={16} />
      </button>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-12 w-full flex-none items-center justify-center gap-1 rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-muted hover:bg-surface sm:w-auto"
        >
          <ChevronLeft size={16} />
          Back
        </button>
      ) : null}
    </div>
  );
}

function TypingState() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-2 w-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </span>
      <div>
        <p className="font-semibold">Looking closely at your media…</p>
        <p className="mt-0.5 text-xs text-muted">
          Identifying the item, useful specs and a sensible listing range.
        </p>
      </div>
    </div>
  );
}

function MediaStrip() {
  const { mediaItems, contentType } = useCreateStore();
  if (mediaItems.length === 0) return null;

  if (contentType === "video") {
    const item = mediaItems[0];
    const src = getMediaPreviewSrc(item);
    return src ? (
      <video
        src={src}
        muted
        playsInline
        controls
        className="max-h-56 w-40 rounded-xl bg-black object-contain"
      />
    ) : (
      <span>1 video selected</span>
    );
  }

  return (
    <div className="flex max-w-full gap-2 overflow-x-auto">
      {mediaItems.slice(0, 4).map((item) => {
        const src = getMediaPreviewSrc(item);
        return src ? (
          <img
            key={item.id}
            src={src}
            alt=""
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span
            key={item.id}
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white/15"
          >
            <Images size={22} />
          </span>
        );
      })}
      {mediaItems.length > 4 ? (
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xs font-bold">
          +{mediaItems.length - 4}
        </span>
      ) : null}
    </div>
  );
}

function AgentTyping() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-2 w-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </span>
      <p className="text-sm text-muted">Thinking…</p>
    </div>
  );
}

function AskHeader({ ask, icon }: { ask: AgentAsk; icon?: ReactNode }) {
  const heading =
    ask.target === "SPEC" && ask.specKey ? ask.specKey : ask.label;
  return (
    <div>
      <div className="flex items-center gap-2">
        {icon ?? <WandSparkles size={18} className="text-primary" />}
        <h2 className="font-black text-foreground">{heading}</h2>
      </div>
      {ask.helper ? (
        <p className="mt-1 text-sm text-muted">{ask.helper}</p>
      ) : null}
    </div>
  );
}

function AskPrimaryButton({
  label,
  onClick,
  disabled,
  inline,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  inline?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40 ${
        inline ? "" : "w-full"
      }`}
    >
      {label}
      <ArrowRight size={16} />
    </button>
  );
}

/**
 * Renders the inline input for the agent's current question. The control shape
 * is chosen from `ask.kind`, so the same conversation surface handles a chip
 * choice (transmission), a number (mileage), a price, the location picker, the
 * phone input or free text — whatever THIS listing needs next.
 */
function AgentAskControl({
  ask,
  onScalar,
  onPrice,
  onLocation,
  onPhone,
}: {
  ask: AgentAsk;
  onScalar: (value: string) => void;
  onPrice: (amount: number, negotiable: boolean) => void;
  onLocation: () => void;
  onPhone: () => void;
}) {
  const {
    currency,
    negotiable,
    setNegotiable,
    price,
    setPrice,
    location,
    setLocation,
    contactPhone,
    setContactPhone,
    guidedInsights,
  } = useCreateStore();

  const [text, setText] = useState(ask.prefill ?? "");
  const [priceText, setPriceText] = useState(
    ask.kind === "PRICE"
      ? (ask.prefill ?? (price != null ? String(price) : ""))
      : "",
  );

  const suggested = guidedInsights?.suggestedPrice ?? null;

  if (ask.kind === "CHOICE" || ask.kind === "CONFIRM") {
    return (
      <AssistantCard>
        <AskHeader ask={ask} />
        <div className="flex flex-wrap gap-2">
          {ask.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onScalar(option)}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-strong"
            >
              {option}
            </button>
          ))}
          {!ask.required ? (
            <button
              type="button"
              onClick={() => onScalar("")}
              className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-foreground"
            >
              Skip
            </button>
          ) : null}
        </div>
      </AssistantCard>
    );
  }

  if (ask.kind === "PRICE") {
    return (
      <AssistantCard>
        <AskHeader
          ask={ask}
          icon={
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-sm font-black text-primary-strong">
              KSh
            </span>
          }
        />
        <div className="flex h-13 items-center rounded-xl border border-border bg-surface px-3 focus-within:border-primary">
          <span className="mr-2 text-sm font-bold text-muted">{currency}</span>
          <input
            type="number"
            min="0"
            step="1"
            value={priceText}
            autoFocus
            onChange={(event) => {
              setPriceText(event.target.value);
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed) && parsed >= 0) {
                setPrice(parsed, parsed === 0);
              }
            }}
            placeholder={ask.placeholder ?? "Enter your price"}
            className="min-w-0 flex-1 bg-transparent text-lg font-bold text-foreground outline-none"
          />
        </div>
        {suggested != null && Number(priceText) !== suggested ? (
          <button
            type="button"
            onClick={() => {
              setPriceText(String(suggested));
              setPrice(suggested, false);
            }}
            className="self-start rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary-strong"
          >
            Use suggested: {currency} {suggested.toLocaleString()}
          </button>
        ) : null}
        <div className="flex items-center justify-between rounded-xl border border-border bg-elevated px-3 py-3">
          <div className="pr-4">
            <p className="text-sm font-semibold text-foreground">
              Price is negotiable
            </p>
            <p className="text-xs text-muted">
              Let buyers make reasonable offers
            </p>
          </div>
          <Switch
            checked={negotiable}
            onCheckedChange={setNegotiable}
            aria-label="Mark price as negotiable"
          />
        </div>
        <AskPrimaryButton
          label="Confirm price"
          onClick={() => {
            const parsed = priceText.trim() ? Number(priceText) : 0;
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onPrice(parsed, negotiable);
          }}
        />
      </AssistantCard>
    );
  }

  if (ask.kind === "LOCATION") {
    return (
      <AssistantCard>
        <AskHeader
          ask={ask}
          icon={<MapPin size={18} className="text-primary" />}
        />
        <LocationPicker
          value={location}
          onSelect={setLocation}
          onClear={() => setLocation(null)}
        />
        <AskPrimaryButton
          label="Continue"
          disabled={!location}
          onClick={onLocation}
        />
      </AssistantCard>
    );
  }

  if (ask.kind === "PHONE") {
    return (
      <AssistantCard>
        <AskHeader ask={ask} />
        <PhoneInput value={contactPhone} onChange={setContactPhone} error={null} />
        <AskPrimaryButton
          label="Continue"
          disabled={!contactPhone}
          onClick={onPhone}
        />
      </AssistantCard>
    );
  }

  if (ask.kind === "LONGTEXT") {
    return (
      <AssistantCard>
        <AskHeader ask={ask} />
        <textarea
          value={text}
          maxLength={2000}
          rows={6}
          autoFocus
          onChange={(event) => setText(event.target.value)}
          placeholder={ask.placeholder ?? "Type your answer…"}
          className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-3 text-base leading-relaxed text-foreground outline-none focus:border-primary"
        />
        <div className="flex items-center justify-between gap-2">
          {!ask.required ? (
            <button
              type="button"
              onClick={() => onScalar("")}
              className="text-sm font-semibold text-muted hover:text-foreground"
            >
              Skip
            </button>
          ) : (
            <span />
          )}
          <AskPrimaryButton
            label="Send"
            inline
            disabled={ask.required && !text.trim()}
            onClick={() => onScalar(text)}
          />
        </div>
      </AssistantCard>
    );
  }

  // TEXT / NUMBER
  return (
    <AssistantCard>
      <AskHeader ask={ask} />
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onScalar(text);
        }}
      >
        <input
          type={ask.kind === "NUMBER" ? "number" : "text"}
          value={text}
          autoFocus
          onChange={(event) => setText(event.target.value)}
          placeholder={ask.placeholder ?? "Type your answer…"}
          className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-base text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={ask.required && !text.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </form>
      {!ask.required ? (
        <button
          type="button"
          onClick={() => onScalar("")}
          className="self-start text-sm font-semibold text-muted hover:text-foreground"
        >
          Skip
        </button>
      ) : null}
    </AssistantCard>
  );
}

function VisibilityPicker({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (value: Visibility) => void;
}) {
  const options = [
    {
      value: "public" as const,
      label: "Everyone",
      description: "Anyone can discover this post",
      icon: Globe,
    },
    {
      value: "friends_only" as const,
      label: "Friends only",
      description: "People you follow",
      icon: Users,
    },
    {
      value: "private" as const,
      label: "Only me",
      description: "Keep it private",
      icon: LockKeyhole,
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-2xl border p-3 text-left transition-colors ${
              selected
                ? "border-primary bg-primary-soft"
                : "border-border bg-elevated hover:bg-surface"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <Icon
                size={18}
                className={selected ? "text-primary" : "text-muted"}
              />
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  selected ? "border-primary" : "border-border"
                }`}
              >
                {selected ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                ) : null}
              </span>
            </div>
            <p className="mt-3 text-sm font-bold text-foreground">
              {option.label}
            </p>
            <p className="mt-0.5 text-xs text-muted">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function OptionToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
