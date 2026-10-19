/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  Download,
  FilePen,
  Globe,
  ImageIcon,
  Images,
  Lock,
  MapPin,
  Pencil,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { useCreateStore, type MediaItem, type TiktokEmbed } from "@/stores/create";
import { TikTokIcon } from "@/components/ui/TikTokIcon";
import { listingPriceText } from "@/lib/format";
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
import { createErrorMessage } from "./CreateErrorDialog";
import {
  PUBLISH_TIMEOUT_MESSAGE,
  PUBLISH_UNCONFIRMED_MESSAGE,
  publishTimeout,
} from "@/features/create/utils/publishTimeout";
import { FormNotice } from "./FormIssues";

const POST_TO_TIKTOK = gql`
  mutation PostToTiktokOptions($contentId: String!) {
    postToTiktok(contentId: $contentId)
  }
`;

const SHOW_TIKTOK_CROSSPOST = process.env.NODE_ENV !== "production";

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
  icon: LucideIcon;
  desc: string;
}[] = [
  {
    value: "public",
    label: "Everyone",
    icon: Globe,
    desc: "Anyone on Shopi can find it",
  },
  {
    value: "friends_only",
    label: "Friends only",
    icon: Users,
    desc: "Only people you follow",
  },
  {
    value: "private",
    label: "Only me",
    icon: Lock,
    desc: "Hidden from everyone else",
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
    negotiable,
    mediaItems,
    contentType,
    categoryName,
    subcategoryName,
    location,
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
    const timeout = publishTimeout();

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
      // Idempotent there, so a retry after a timeout returns the same post.
      const { data: pubData, error: publishError } = await publishDraftNow({
        variables: { id: draftId },
        context: timeout.context,
      });
      if (publishError) {
        setError(
          timeout.timedOut()
            ? PUBLISH_TIMEOUT_MESSAGE
            : (publishError.message ?? "Failed to publish"),
        );
        return;
      }
      if (!pubData?.publishDraftNow) {
        setError(PUBLISH_UNCONFIRMED_MESSAGE);
        return;
      }

      const contentId = pubData.publishDraftNow.id;
      didPublish = true;
      setPublished(true);
      trackPostPublished("create", { category: categoryName, contentType });

      // 4. Optional TikTok cross-post
      if (SHOW_TIKTOK_CROSSPOST && postOnTiktok && contentId) {
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
      setError(timeout.timedOut() ? PUBLISH_TIMEOUT_MESSAGE : createErrorMessage(err));
    } finally {
      timeout.done();
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
  const busy = publishing || advancing;

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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Header — hidden when embedded: the dialog header owns back + stepper */}
      {!embedded && (
        <div className="sticky top-0 z-50 flex shrink-0 items-center justify-between border-b border-border bg-background px-4 pb-3 pt-4">
          <button
            type="button"
            onClick={() => setStep("edit")}
            aria-label="Back to details"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <ChevronLeft size={23} strokeWidth={2.2} />
          </button>
          <h2 className="text-lg font-semibold text-foreground">Review and post</h2>
          <span aria-hidden className="w-10 shrink-0" />
        </div>
      )}

      <div
        className={`flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-6 ${embedded ? "px-8 pt-6" : "px-4 pt-4"}`}
      >
        {/* What's about to go out. The dialog has its own live preview, so
            this card is the phone's. */}
        {!embedded && (
          <section aria-labelledby="review-listing">
            <SectionHeader
              id="review-listing"
              title="Your listing"
              action={
                <button
                  type="button"
                  onClick={() => setStep("edit")}
                  className="-mr-2 flex h-8 items-center gap-1.5 rounded-full px-2 text-[13px] font-semibold text-primary transition-colors active:bg-primary-soft"
                >
                  <Pencil size={14} aria-hidden />
                  Edit
                </button>
              }
            />
            <ListingSummary
              cover={cover}
              mediaCount={mediaItems.length}
              tiktokEmbed={tiktokEmbed}
              title={title}
              price={price}
              currency={currency}
              negotiable={negotiable}
              category={[categoryName, subcategoryName].filter(Boolean).join(" · ")}
              place={location?.placeName}
            />
          </section>
        )}

        <section aria-labelledby="review-audience">
          <SectionHeader id="review-audience" title="Who can see it" />
          <div
            role="radiogroup"
            aria-labelledby="review-audience"
            className="overflow-hidden rounded-[14px] border border-border bg-elevated"
          >
            {VISIBILITY_OPTIONS.map((opt, index) => {
              const active = visibilityMode === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setVisibilityMode(opt.value)}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-surface ${
                    index > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <IconTile active={active}>
                    <Icon size={18} aria-hidden />
                  </IconTile>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-main">{opt.label}</span>
                    <span className="block text-[13px] text-muted">{opt.desc}</span>
                  </span>
                  <RadioDot active={active} />
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="review-options">
          <SectionHeader id="review-options" title="Options" />
          <div className="overflow-hidden rounded-[14px] border border-border bg-elevated">
            <ToggleRow
              icon={<Download size={18} aria-hidden />}
              label="Allow downloads"
              description="Let people save your media"
              value={allowDownload}
              onChange={setAllowDownload}
            />
            <ToggleRow
              icon={<Sparkles size={18} aria-hidden />}
              label="HD quality"
              description="Show your media in high definition"
              value={hdEnabled}
              onChange={setHdEnabled}
              divided
            />
            {SHOW_TIKTOK_CROSSPOST && contentType === "video" && (
              <ToggleRow
                icon={<TikTokIcon size={17} className="" />}
                label="Also post on TikTok"
                description={
                  connectingTiktok
                    ? "Connecting to TikTok…"
                    : isTiktokConnected
                      ? "Share this video to your TikTok too"
                      : "Connect TikTok to share there too"
                }
                value={postOnTiktok}
                onChange={() => void handleTiktokToggle()}
                disabled={connectingTiktok}
                divided
              />
            )}
          </div>
        </section>

        <p className="flex items-start gap-2.5 px-1 text-[13px] leading-5 text-muted">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          <span>
            The Shopi team checks every post before it appears in the feed.
            Drafts stay on your profile until you post them.
          </span>
        </p>
      </div>

      {/* ── Bottom bar: Save draft + Post. Sticky, like Details' Next: the
             page scrolls as a whole on a phone. ── */}
      <div
        className={`sticky bottom-0 z-50 shrink-0 border-t border-border bg-background pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] ${embedded ? "px-8" : "px-4"}`}
      >
        {error && (
          <FormNotice title="Couldn’t finish your post">
            {friendlyError(error)}
          </FormNotice>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            aria-busy={advancing}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-[rgb(var(--color-border-strong))] text-base font-semibold text-main transition-transform active:scale-[0.98]"
          >
            {advancing ? (
              <>
                <InterlockingBalls size={18} />
                Saving
              </>
            ) : (
              <>
                <FilePen size={18} aria-hidden />
                Save draft
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handlePost}
            aria-busy={publishing}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-white transition-transform active:scale-[0.98] ${
              busy ? "" : "shadow-[0_6px_20px_rgb(var(--brand-primary)/0.35)]"
            }`}
          >
            {publishing ? (
              <>
                <InterlockingBalls size={18} />
                Posting
              </>
            ) : (
              <>
                <Send size={18} aria-hidden />
                Post
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** The API's message, minus wrappers, with the known ones said plainly. */
function friendlyError(message: string): string {
  const text = createErrorMessage(message);
  if (/maximum active drafts/i.test(text)) {
    return "You have too many unfinished drafts. Post or delete one from your profile, then try again.";
  }
  return text || "Something went wrong. Please try again.";
}

function SectionHeader({
  id,
  title,
  action,
}: {
  id: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex min-h-8 items-center justify-between px-1">
      <h3 id={id} className="text-[13px] font-semibold text-muted">
        {title}
      </h3>
      {action}
    </div>
  );
}

function ListingSummary({
  cover,
  mediaCount,
  tiktokEmbed,
  title,
  price,
  currency,
  negotiable,
  category,
  place,
}: {
  cover: MediaItem | undefined;
  mediaCount: number;
  tiktokEmbed: TiktokEmbed | null;
  title: string;
  price: number | null;
  currency: string;
  negotiable: boolean;
  category: string;
  place?: string;
}) {
  const priceText = listingPriceText(price ? { amount: price, currency } : null);
  // A video picked on this device previews from its own file; a restored one
  // comes back with a poster frame.
  const localVideo =
    cover?.type === "video" && !cover.thumbnailUrl && cover.localUri?.startsWith("blob:");
  const coverSrc = cover?.thumbnailUrl || getMediaPreviewSrc(cover);

  return (
    <div className="flex gap-3 rounded-[14px] border border-border bg-elevated p-3">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-[10px] border border-border bg-surface">
        {tiktokEmbed ? (
          <TikTokCreatePreview embed={tiktokEmbed} className="size-full" sizes="80px" />
        ) : localVideo ? (
          <video
            src={cover.localUri}
            className="absolute inset-0 size-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-muted">
            <ImageIcon size={20} aria-hidden />
          </span>
        )}
        {cover?.type === "video" ? (
          <span className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white">
            <Play size={10} fill="currentColor" strokeWidth={0} className="ml-px" aria-hidden />
          </span>
        ) : mediaCount > 1 ? (
          <span className="absolute bottom-1 right-1 flex h-5 items-center gap-1 rounded-full bg-black/60 px-1.5 text-[11px] font-semibold text-white">
            <Images size={11} aria-hidden />
            {mediaCount}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-main">
          {title.trim() || "Untitled listing"}
        </p>
        <p className="mt-1 text-sm font-semibold text-main">
          {priceText ?? "Price on request"}
          {negotiable && priceText && (
            <span className="font-normal text-muted"> · Negotiable</span>
          )}
        </p>
        {category && <MetaLine icon={<Tag size={13} aria-hidden />}>{category}</MetaLine>}
        {place && <MetaLine icon={<MapPin size={13} aria-hidden />}>{place}</MetaLine>}
      </div>
    </div>
  );
}

function MetaLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </p>
  );
}

function IconTile({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-colors ${
        active ? "bg-primary-soft text-primary" : "bg-surface text-muted"
      }`}
    >
      {children}
    </span>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        active ? "border-primary" : "border-[rgb(var(--color-border-strong))]"
      }`}
    >
      {active && <span className="size-2.5 rounded-full bg-primary" />}
    </span>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
  disabled,
  divided,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  divided?: boolean;
}) {
  return (
    // The whole row toggles, not just the switch, so the target is the row.
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-surface disabled:opacity-60 ${
        divided ? "border-t border-border" : ""
      }`}
    >
      <IconTile active={value}>{icon}</IconTile>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-main">{label}</span>
        <span className="block text-[13px] text-muted">{description}</span>
      </span>
      <span
        aria-hidden
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${
          value ? "bg-primary" : "bg-[rgb(var(--color-border-strong))]"
        }`}
      >
        <span
          className={`block size-5 rounded-full bg-white shadow-md transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
