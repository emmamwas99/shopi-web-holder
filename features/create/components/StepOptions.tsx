/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { useCreateStore } from "@/stores/create";
import {
  AutosaveDraftDocument,
  AdvanceDraftStepDocument,
  TiktokConnectUrlDocument,
  MeDocument,
} from "@/types/__generated__/graphql";
import type { VisibilityMode } from "@/types/__generated__/graphql";
import { getMediaPreviewSrc } from "@/features/create/utils/mediaPreview";
import { trackPostJourney, trackPostPublished } from "@/lib/analytics";
import {
  awaitDraftAutosaves,
  blockDraftAutosave,
  isDraftAutosaveBlocked,
  trackDraftAutosave,
  unblockDraftAutosave,
} from "@/features/create/utils/draftAutosave";
import celebrationStyles from "./Celebration.module.css";
import {
  CreateSuccessPrimaryAction,
  CreateSuccessScreen,
} from "./CreateSuccessScreen";
import { TikTokCreatePreview } from "./TikTokCreatePreview";

const POST_TO_TIKTOK = gql`
  mutation PostToTiktokOptions($contentId: String!) {
    postToTiktok(contentId: $contentId)
  }
`;

const PUBLISH_DRAFT_NOW: TypedDocumentNode<
  { publishDraftNow: { id: string; type: string; title: string } | null },
  { id: string }
> = gql`
  mutation PublishDraftNow($id: String!) {
    publishDraftNow(id: $id) {
      id
      type
      title
    }
  }
`;

interface StepOptionsProps {
  lang: string;
  onExit?: () => void;
  /** Inside the desktop create dialog: it owns the header (back/stepper) and
   *  the live preview panel, so this step renders only the settings column. */
  embedded?: boolean;
}

type Visibility = "public" | "friends_only" | "private";

const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    value: "public",
    label: "Everyone",
    icon: "🌍",
    desc: "Anyone can see this post",
  },
  {
    value: "friends_only",
    label: "Friends only",
    icon: "👥",
    desc: "Only people you follow",
  },
  {
    value: "private",
    label: "Only me",
    icon: "🔒",
    desc: "Only visible to you",
  },
];

function toVisibilityMode(mode: Visibility): VisibilityMode {
  switch (mode) {
    case "friends_only":
      return "FRIENDS_ONLY";
    case "private":
      return "PRIVATE";
    case "public":
    default:
      return "PUBLIC";
  }
}

export function StepOptions({ lang, embedded = false, onExit }: StepOptionsProps) {
  const {
    draftId,
    price,
    currency,
    title,
    isFree,
    negotiable,
    mediaItems,
    contentType,
    categoryName,
    tiktokEmbed,
    visibilityMode,
    allowDownload,
    hdEnabled,
    postOnTiktok,
    setVisibilityMode,
    setAllowDownload,
    setHdEnabled,
    setPostOnTiktok,
    setStep,
    setError,
    error,
    reset,
  } = useCreateStore();

  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [tiktokReconnectNeeded, setTiktokReconnectNeeded] = useState(false);
  const [connectingTiktok, setConnectingTiktok] = useState(false);

  function exitAfterCreate() {
    reset();
    if (onExit) onExit();
    else router.push(`/${lang}/for-you`);
  }

  const { data: meData, refetch: refetchMe } = useQuery(MeDocument, {
    fetchPolicy: "cache-and-network",
  });
  const isTiktokConnected = meData?.me?.authProviders?.tiktok ?? false;

  const [autosave] = useMutation(AutosaveDraftDocument);
  const [advanceStep] = useMutation(AdvanceDraftStepDocument);
  const [publishDraftNow] = useMutation(PUBLISH_DRAFT_NOW);
  const [postToTiktok] = useMutation(POST_TO_TIKTOK) as any;
  const [getTiktokConnectUrl] = useMutation(TiktokConnectUrlDocument);

  const queueAutosave = useCallback(
    (input: {
      price?: { amount: number; currency: string; negotiable: boolean };
      visibilityMode?: VisibilityMode;
      allowDownload?: boolean;
      hdEnabled?: boolean;
    }) => {
      if (!draftId) return null;
      return trackDraftAutosave(
        draftId,
        autosave({
          variables: {
            id: draftId,
            input,
          },
        }),
      );
    },
    [autosave, draftId],
  );

  async function handleTiktokToggle() {
    if (postOnTiktok) {
      setPostOnTiktok(false);
      return;
    }
    if (isTiktokConnected) {
      setPostOnTiktok(true);
      return;
    }
    // Not connected — open OAuth popup then re-check
    setConnectingTiktok(true);
    try {
      const { data } = await getTiktokConnectUrl({
        variables: { returnUrl: undefined },
      });
      const url = data?.tiktokConnectUrl;
      if (!url) return;
      const popup = window.open(url, "tiktok-connect", "width=520,height=680");
      // Poll until popup closes
      const poll = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(poll);
          setConnectingTiktok(false);
          const { data: fresh } = await refetchMe();
          if (fresh?.me?.authProviders?.tiktok) {
            setPostOnTiktok(true);
          }
        }
      }, 800);
    } catch {
      setConnectingTiktok(false);
    }
  }

  useEffect(() => {
    if (!draftId) return;
    // No autosaves once a publish starts or has succeeded: publishing moves the
    // draft out of ACTIVE, so a late debounced save gets rejected by the API
    // ("Cannot edit a non-active draft"). Depending on `publishing` also clears
    // any timer that was scheduled just before Post was clicked.
    if (publishing || published) return;

    const timer = setTimeout(() => {
      // Re-check at fire time: another component may have started a publish
      // after this timer was scheduled.
      if (isDraftAutosaveBlocked(draftId)) return;
      queueAutosave({
        visibilityMode: toVisibilityMode(visibilityMode),
        allowDownload,
        hdEnabled,
      })?.catch(() => undefined);
    }, 250);

    return () => clearTimeout(timer);
  }, [
    allowDownload,
    draftId,
    hdEnabled,
    visibilityMode,
    publishing,
    published,
    queueAutosave,
  ]);

  /**
   * Post: save settings, advance the draft to READY (the backend requires READY
   * before publish), then publish — all without a separate preview screen.
   * Optionally cross-posts to TikTok for videos.
   */
  async function handlePost() {
    if (!draftId || publishing || advancing) return;
    setError(null);
    setPublishing(true);
    trackPostJourney("post_publish_started", {
      method: useCreateStore.getState().creationMode ?? "unknown",
      category: categoryName ?? "unknown",
      content_type: contentType ?? "unknown",
    });

    // Stop every component's debounced autosave for this draft before anything
    // else — publishing moves the draft out of ACTIVE, so a save that fires
    // mid-publish would be rejected ("Cannot edit a non-active draft").
    blockDraftAutosave(draftId);

    const parsedPrice = price ?? 0;
    let didPublish = false;

    try {
      // Let saves that were already on the wire settle, so the publish reads a
      // fully-written draft rather than racing the last edit.
      await awaitDraftAutosaves(draftId);

      // 1. Autosave options
      const saveResult = await queueAutosave({
        price: { amount: parsedPrice, currency, negotiable },
        visibilityMode: toVisibilityMode(visibilityMode),
        allowDownload,
        hdEnabled,
      });
      const saveError = saveResult?.error;
      if (saveError) {
        setError(saveError.message ?? "Failed to save settings");
        return;
      }

      // The API validates any remaining draft steps and publishes in one request.
      const { data: pubData, error: publishError } = await publishDraftNow({
        variables: { id: draftId },
      });
      if (publishError) {
        setError(publishError.message ?? "Failed to publish");
        return;
      }
      if (!pubData?.publishDraftNow) return;

      const contentId = pubData.publishDraftNow.id;
      didPublish = true;
      setPublished(true);
      trackPostPublished("create", { category: categoryName, contentType });

      // 4. Optional TikTok cross-post
      if (postOnTiktok && contentId) {
        try {
          const tiktokResult = await postToTiktok({ variables: { contentId } });
          const tiktokErrors = tiktokResult?.errors ?? [];
          const needsReconnect = tiktokErrors.some((e: { message?: string }) =>
            (e.message ?? "").includes("TIKTOK_RECONNECT_REQUIRED"),
          );
          if (needsReconnect) {
            setTiktokReconnectNeeded(true);
            return; // hold on the success screen so user can reconnect
          }
        } catch {
          // network error — user still lands on the success screen
        }
      }

      // No auto-redirect — the success screen stays up until the user taps
      // "Go to For You". The post is already submitted and will appear once it
      // clears automated review in the background.
    } catch (err) {
      setError(String(err));
    } finally {
      setPublishing(false);
      // Publish failed — the draft is still ACTIVE, so let autosave resume and
      // keep the user's edits safe while they retry.
      if (!didPublish) {
        trackPostJourney("post_publish_failed", {
          method: useCreateStore.getState().creationMode ?? "unknown",
          category: categoryName ?? "unknown",
          content_type: contentType ?? "unknown",
        });
        unblockDraftAutosave(draftId);
      }
    }
  }

  /** Save all options and leave a complete draft ready to publish from Drafts. */
  async function handleSaveDraft() {
    if (!draftId || publishing || advancing) return;
    setError(null);
    setAdvancing(true);
    try {
      // Do not let a prior debounced settings save overwrite this final save.
      await awaitDraftAutosaves(draftId);
      const saveResult = await queueAutosave({
        price: { amount: price ?? 0, currency, negotiable },
        visibilityMode: toVisibilityMode(visibilityMode),
        allowDownload,
        hdEnabled,
      });
      if (saveResult?.error) {
        setError(saveResult.error.message ?? "Failed to save settings");
        return;
      }

      // Drafts only offers direct publishing for READY drafts. Advance here so
      // selecting this saved draft later leaves Publish as the only action.
      let ready = false;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data, error: stepError } = await advanceStep({
          variables: { id: draftId },
        });
        if (stepError) {
          setError(stepError.message ?? "Could not save draft");
          return;
        }
        if (data?.advanceDraftStep?.currentStep === "READY") {
          ready = true;
          break;
        }
      }
      if (!ready) {
        setError("Complete the required post details before saving this draft.");
        return;
      }

      trackPostJourney("post_draft_saved", {
        method: useCreateStore.getState().creationMode ?? "unknown",
        category: categoryName ?? "unknown",
        content_type: contentType ?? "unknown",
      });
      exitAfterCreate();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdvancing(false);
    }
  }

  const cover = mediaItems[0];
  const coverSrc = getMediaPreviewSrc(cover);

  // ── Published success ──────────────────────────────────────────────────────
  if (published) {
    return (
      <CreateSuccessScreen>
        {!tiktokReconnectNeeded && (
          <CreateSuccessPrimaryAction
            onClick={() => {
              exitAfterCreate();
            }}
          >
            {onExit ? "Back to listings" : "Go to For You"}
          </CreateSuccessPrimaryAction>
        )}

        {tiktokReconnectNeeded && (
          <div
            className={`${celebrationStyles.celebrateText} w-full max-w-xs rounded-2xl border border-border bg-elevated px-4 py-4 text-center shadow-(--shadow-sm)`}
          >
            <p className="mb-1 text-sm font-semibold text-foreground">
              TikTok cross-post needs reconnect
            </p>
            <p className="mb-3 text-xs text-muted">
              Your TikTok connection needs the posting permission. Reconnect
              once and it will work automatically next time.
            </p>
            <button
              onClick={async () => {
                try {
                  const { data: urlData } = await getTiktokConnectUrl({
                    variables: { returnUrl: undefined },
                  });
                  const url = urlData?.tiktokConnectUrl;
                  if (url)
                    window.open(
                      url,
                      "tiktok-connect",
                      "width=520,height=680",
                    );
                } catch {
                  /* ignore */
                }
              }}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
            >
              Reconnect TikTok
            </button>
            <button
              onClick={() => {
                exitAfterCreate();
              }}
              className="mx-auto mt-2 block text-xs font-medium text-muted"
            >
              {onExit ? "Back to listings" : "Go to For You"}
            </button>
          </div>
        )}
      </CreateSuccessScreen>
    );
  }

  // ── Shared form sections ──────────────────────────────────────────────────

  const visibilitySection = (
    <Section title="Audience">
      <div className="flex flex-col gap-2">
        {VISIBILITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setVisibilityMode(opt.value)}
            className={`flex items-center gap-3 rounded-xl border-[1.5px] px-3 py-3 transition-all ${
              visibilityMode === opt.value
                ? "border-[rgb(var(--brand-primary)/0.4)] bg-[rgb(var(--brand-primary)/0.08)]"
                : "border-transparent bg-surface"
            }`}
          >
            <span className="text-[20px]">{opt.icon}</span>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-foreground">
                {opt.label}
              </p>
              <p className="text-xs text-muted">{opt.desc}</p>
            </div>
            <RadioDot active={visibilityMode === opt.value} />
          </button>
        ))}
      </div>
    </Section>
  );

  const togglesSection = (
    <Section title="More options">
      <div className="flex flex-col">
        <ToggleRow
          label="Allow downloads"
          description="Let others save your content"
          value={allowDownload}
          onChange={setAllowDownload}
        />
        <div className="my-0.5 h-px bg-border" />
        <ToggleRow
          label="HD quality"
          description="Upload and serve in high definition"
          value={hdEnabled}
          onChange={setHdEnabled}
        />
      </div>
    </Section>
  );

  const tiktokSection = contentType === "video" && (
    <Section title="Share">
      <div className="flex flex-col">
        <ToggleRow
          label="Post on TikTok"
          description={
            connectingTiktok
              ? "Connecting to TikTok…"
              : isTiktokConnected
                ? "Cross-post this video to your TikTok"
                : "Connect TikTok to enable cross-posting"
          }
          value={postOnTiktok}
          onChange={handleTiktokToggle}
          disabled={connectingTiktok}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={postOnTiktok ? "text-primary" : "text-muted"}
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.27 8.27 0 0 0 4.84 1.55V6.85a4.85 4.85 0 0 1-1.07-.16z" />
            </svg>
          }
        />
      </div>
    </Section>
  );

  return (
    <div className="flex flex-col md:flex-row h-full flex-1">
      {/* ── Desktop left — summary card (standalone page only; the dialog
             shows the live preview panel instead) ── */}
      {!embedded && (
        <div className="hidden w-80 shrink-0 border-r border-border bg-surface md:flex md:flex-col md:justify-center md:items-center md:gap-5 md:p-8">
          {/* Cover thumbnail */}
          {cover && (
            <div className="relative h-[213px] w-40 overflow-hidden rounded-2xl border border-border bg-background">
              {tiktokEmbed ? (
                <TikTokCreatePreview
                  embed={tiktokEmbed}
                  className="absolute inset-0 h-full w-full"
                  sizes="160px"
                />
              ) : cover.type === "video" && cover.localUri ? (
                <video
                  src={cover.localUri}
                  className="absolute inset-0 w-full h-full object-contain"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : coverSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverSrc}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 bg-surface" />
              )}
            </div>
          )}

          {/* Summary rows */}
          <div className="w-full max-w-[240px] flex flex-col gap-2">
            <SummaryRow label="Title" value={title || "—"} />
            <SummaryRow
              label="Price"
              value={`${isFree || !price ? "Custom" : `${currency} ${price}`}${
                negotiable ? " · Negotiable" : ""
              }`}
            />
            <SummaryRow
              label="Files"
              value={`${mediaItems.length} ${mediaItems.length === 1 ? "file" : "files"}`}
            />
          </div>
        </div>
      )}

      {/* ── Right / mobile — settings form ── */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        {/* Header — hidden when embedded: the dialog header owns back + stepper */}
        {!embedded && (
          <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
            <button
              type="button"
              onClick={() => setStep("edit")}
              aria-label="Back to details"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <ChevronLeft size={23} strokeWidth={2.2} />
            </button>
            <h2 className="text-lg font-semibold text-foreground">Settings</h2>
            {/* Spacer to keep the title centered (Post/Draft live in the bottom bar) */}
            <div className="w-12.5" />
          </div>
        )}

        <div
          className={`flex-1 overflow-y-auto pb-8 flex flex-col gap-5 ${embedded ? "px-8 pt-6" : "px-4"}`}
        >
          {visibilitySection}
          {togglesSection}
          {tiktokSection}

          {error && (
            <div className="rounded-xl border border-[rgb(var(--color-error)/0.2)] bg-[rgb(var(--color-error)/0.08)] px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}
        </div>

        {/* ── Fixed bottom action bar: Draft (outline) + Post (primary) ── */}
        <div
          className={`flex shrink-0 gap-3 border-t border-border pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] ${embedded ? "px-8" : "px-4"}`}
        >
          <button
            onClick={handleSaveDraft}
            disabled={advancing || publishing}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[rgb(var(--color-border-strong))] bg-transparent text-base font-semibold text-foreground transition-transform active:scale-[0.98] ${
              advancing || publishing ? "opacity-60" : ""
            }`}
          >
            {advancing ? <MiniSpinnerDark /> : "Draft"}
          </button>
          <button
            onClick={handlePost}
            disabled={publishing || advancing}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-white transition-transform active:scale-[0.98] ${
              publishing
                ? "opacity-80"
                : "shadow-[0_6px_20px_rgb(var(--brand-primary)/0.4)]"
            }`}
          >
            {publishing ? <MiniSpinner /> : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniSpinner() {
  return <InterlockingBalls size={18} />;
}

function MiniSpinnerDark() {
  return <InterlockingBalls size={18} />;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-elevated px-3 py-2.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="line-clamp-1 max-w-35 text-right text-xs font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <div
      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
        active ? "border-primary" : "border-[rgb(var(--color-border-strong))]"
      }`}
    >
      {active && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
  icon,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-3 ${disabled ? "opacity-60" : ""}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative h-[26px] w-11 flex-shrink-0 rounded-full transition-colors ${
          value ? "bg-primary" : "bg-[rgb(var(--color-border-strong))]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5.5 w-5.5 rounded-full bg-white shadow-sm transition-transform ${
            value ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
