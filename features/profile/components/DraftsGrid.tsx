"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  FileEdit,
  ImagePlus,
  Play,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import {
  MyDraftsDocument,
  PublishDraftDocument,
  DiscardDraftDocument,
  type DraftFieldsFragment,
  type DraftStep,
} from "@/types/__generated__/graphql";
import { useCreateStore } from "@/stores/create";
import { trackPostPublished } from "@/lib/analytics";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useBackDismiss } from "@/hooks/useBackDismiss";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";
import {
  CreateErrorDialog,
  createErrorMessage,
} from "@/features/create/components/CreateErrorDialog";
import { shortDate, TONE_CLASSES } from "../lib/managedPost";
import { ConfirmSheet } from "./ConfirmSheet";
import { DetailSheet } from "./DetailSheet";
import { InventoryControls } from "./InventoryControls";
import { StatusPill } from "./ManagedPostRow";

interface Props {
  lang: string;
  hideHeading?: boolean;
}

type Draft = DraftFieldsFragment;
type DraftFilter = "all" | "ready" | "progress";
type DraftSort = "recent" | "oldest";

const DRAFT_SORTS: { key: DraftSort; label: string }[] = [
  { key: "recent", label: "Recently edited" },
  { key: "oldest", label: "Oldest first" },
];

/** The composer's steps, in order. A draft is saved at whichever it reached. */
const STEPS: { step: DraftStep; label: string }[] = [
  { step: "MEDIA_UPLOAD", label: "Media" },
  { step: "EDITING", label: "Details" },
  { step: "PUBLISHING_OPTIONS", label: "Options" },
  { step: "READY", label: "Ready" },
];

function stepIndex(step: DraftStep): number {
  return Math.max(0, STEPS.findIndex((item) => item.step === step));
}

function isReady(draft: Draft): boolean {
  return draft.currentStep === "READY";
}

function draftTitle(draft: Draft): string {
  return draft.title?.trim() || "Untitled draft";
}

function draftEdited(draft: Draft): string {
  return String(draft.updatedAt ?? draft.createdAt ?? "");
}

function draftPrice(draft: Draft): string | null {
  const price = draft.price;
  if (!price || !(price.amount > 0)) return null;
  return `${price.currency} ${Math.round(price.amount).toLocaleString("en-KE")}`;
}

function mapType(type?: string | null): "image" | "video" | null {
  if (type === "IMAGE") return "image";
  if (type === "VIDEO") return "video";
  return null;
}

/** "Ready to post", or how far the draft got: "Step 2 of 4 · Details". */
function DraftProgress({ draft }: { draft: Draft }) {
  if (isReady(draft)) return <StatusPill label="Ready to post" tone="success" />;
  const index = stepIndex(draft.currentStep);
  return (
    <StatusPill
      label={`Step ${index + 1} of ${STEPS.length} · ${STEPS[index].label}`}
      tone="neutral"
    />
  );
}

function DraftCover({
  draft,
  className,
  sizes,
}: {
  draft: Draft;
  className?: string;
  sizes: string;
}) {
  const cover = draft.coverThumbnailUrl;
  return (
    <span className={cn("relative block overflow-hidden bg-surface", className)}>
      {cover ? (
        <Image src={cover} alt="" fill sizes={sizes} className="object-cover" />
      ) : (
        // An empty draft is the normal state for one left at the upload
        // step, so it says so instead of looking like a broken image.
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
          <ImagePlus size={20} strokeWidth={1.8} aria-hidden />
        </span>
      )}
      {mapType(draft.type) === "video" && cover && (
        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
          <Play size={9} fill="currentColor" strokeWidth={0} className="ml-px" aria-hidden />
        </span>
      )}
    </span>
  );
}

/**
 * The seller's unfinished posts: a list on a phone and a tile grid on desktop,
 * each opening the draft's sheet — what's done, what's left, and the one next
 * step (Post now, or Continue editing). Back closes the sheet.
 */
export function DraftsGrid({ lang, hideHeading = false }: Props) {
  const router = useRouter();
  const isDesktop = useIsDesktop({ ssrDefault: false });
  const { reset, setCreationMode, setDraftId, setGuidedStage, setContentType, setStep } =
    useCreateStore();

  const { data, loading, refetch } = useQuery(MyDraftsDocument, {
    variables: { limit: 30 },
    fetchPolicy: "cache-and-network",
  });
  const [publishDraft] = useMutation(PublishDraftDocument);
  const [discardDraft] = useMutation(DiscardDraftDocument);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [discardTarget, setDiscardTarget] = useState<Draft | null>(null);
  const [filter, setFilter] = useState<DraftFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<DraftSort>("recent");

  const drafts = useMemo(() => (data?.myDrafts ?? []) as Draft[], [data]);
  const openDraft = useMemo(
    () => (openId ? (drafts.find((draft) => draft.id === openId) ?? null) : null),
    [drafts, openId],
  );

  const chips = useMemo(
    () => [
      { key: "all" as const, label: "All", count: drafts.length },
      {
        key: "ready" as const,
        label: "Ready to post",
        count: drafts.filter(isReady).length,
        attention: true,
      },
      {
        key: "progress" as const,
        label: "In progress",
        count: drafts.filter((draft) => !isReady(draft)).length,
      },
    ],
    [drafts],
  );

  const visibleDrafts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matched = drafts.filter(
      (draft) =>
        (filter === "all" || (filter === "ready") === isReady(draft)) &&
        (!needle ||
          [draft.title, draft.caption]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(needle))),
    );
    const time = (draft: Draft) => new Date(draftEdited(draft)).getTime() || 0;
    return matched.sort((a, b) =>
      sort === "oldest" ? time(a) - time(b) : time(b) - time(a),
    );
  }, [drafts, filter, search, sort]);

  const closeSheet = useCallback(() => setOpenId(null), []);

  /** Into the composer at the step the draft was left at. */
  function continueEditing(draft: Draft, navigate: (href: string) => void) {
    reset();
    setDraftId(draft.id);
    setContentType(mapType(draft.type));
    setStep("edit");
    if (draft.bulkStage === "COMPLETE") {
      setCreationMode("ai");
      setGuidedStage("analyzing");
      navigate(`/${lang}/upload/create-ai`);
      return;
    }
    setCreationMode("manual");
    navigate(`/${lang}/upload/create-manual`);
  }

  async function handlePublish(draft: Draft) {
    if (busyId) return;
    setBusyId(draft.id);
    try {
      const { data: res, error } = await publishDraft({ variables: { id: draft.id } });
      if (error || !res?.publishDraft) {
        throw new Error(error?.message ?? "Could not publish");
      }
      trackPostPublished("drafts");
      // New posts wait for admin review before they reach the feed.
      toast.success("Posted! It'll show on the feed once it's approved.");
      setOpenId(null);
      await refetch();
    } catch (err) {
      setPublishError(createErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDiscard() {
    if (!discardTarget || busyId) return;
    setBusyId(discardTarget.id);
    try {
      await discardDraft({ variables: { id: discardTarget.id } });
      toast.success("Draft discarded");
      setDiscardTarget(null);
      setOpenId(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not discard");
    } finally {
      setBusyId(null);
    }
  }

  if (loading && drafts.length === 0) {
    return (
      <section className="px-4 py-4 sm:px-6 lg:px-8">
        <Skeleton className="mb-3 h-10 w-full rounded-full" />
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!loading && drafts.length === 0) {
    return (
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-72 max-w-sm flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface text-primary">
            <FileEdit size={24} />
          </div>
          <h2 className="text-[17px] font-bold text-main">No drafts</h2>
          <p className="mt-2 text-[14px] leading-6 text-muted">
            Anything you save before posting waits here, so you can finish it later.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/${lang}/upload`)}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-white active:opacity-80"
          >
            <Plus size={17} strokeWidth={2.4} /> New post
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-4 sm:px-6 lg:px-8">
      {!hideHeading && (
        <div className="mb-4">
          {/* On a phone the screen's own top bar already says "Drafts". */}
          <h2 className="hidden text-[15px] font-bold leading-tight text-main md:block">
            Drafts
          </h2>
          <p className="text-[13px] text-muted md:mt-1">
            {drafts.length === 1 ? "1 draft" : `${drafts.length} drafts`}
            {chips[1].count > 0 && ` · ${chips[1].count} ready to post`}
          </p>
        </div>
      )}

      <InventoryControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search drafts"
        chips={chips}
        filter={filter}
        onFilterChange={setFilter}
        sortOptions={DRAFT_SORTS}
        sort={sort}
        onSortChange={setSort}
      />

      {visibleDrafts.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <p className="text-[15px] font-semibold text-main">No drafts match</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
            className="mt-4 h-9 rounded-full bg-surface px-4 text-[14px] font-semibold text-main active:opacity-70"
          >
            Show all drafts
          </button>
        </div>
      ) : isDesktop ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 md:gap-x-4 md:gap-y-6 xl:grid-cols-4 min-[90rem]:grid-cols-5">
          {visibleDrafts.map((draft) => (
            <article key={draft.id} data-scroll-anchor={draft.id} className="flex flex-col">
              <button
                type="button"
                onClick={() => setOpenId(draft.id)}
                className="text-left"
                aria-label={`Open ${draftTitle(draft)}`}
              >
                <DraftCover
                  draft={draft}
                  className="aspect-4/5 w-full rounded-xl"
                  sizes="(max-width: 1279px) 33vw, 20vw"
                />
                <span className="mt-2 block truncate px-0.5 text-[14px] font-semibold text-main">
                  {draftTitle(draft)}
                </span>
                <span className="mt-1 flex items-center gap-2 px-0.5">
                  <DraftProgress draft={draft} />
                </span>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visibleDrafts.map((draft) => (
            <li key={draft.id} data-scroll-anchor={draft.id}>
              <button
                type="button"
                onClick={() => setOpenId(draft.id)}
                className="flex w-full items-center gap-3 py-3 text-left transition-colors active:bg-surface"
              >
                <DraftCover draft={draft} className="h-16 w-16 shrink-0 rounded-xl" sizes="64px" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-[15px] font-semibold leading-5 text-main">
                    {draftTitle(draft)}
                  </span>
                  <span className="flex min-w-0 items-center gap-2 text-[12px] text-muted">
                    <DraftProgress draft={draft} />
                    <span className="ml-auto shrink-0">
                      {draftPrice(draft) ?? shortDate(draftEdited(draft))}
                    </span>
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <DraftSheet
        draft={openDraft}
        desktop={isDesktop}
        busy={Boolean(busyId)}
        onClose={closeSheet}
        onPublish={(draft) => void handlePublish(draft)}
        onContinue={continueEditing}
        onDiscard={setDiscardTarget}
      />

      <ConfirmSheet
        open={Boolean(discardTarget)}
        desktop={isDesktop}
        title="Discard this draft?"
        description="The photos and details you added will be deleted. This can't be undone."
        confirmLabel="Discard draft"
        busy={Boolean(busyId)}
        onClose={() => setDiscardTarget(null)}
        onConfirm={() => void handleDiscard()}
      />

      <CreateErrorDialog
        message={publishError}
        title="Couldn't publish your draft"
        onClose={() => setPublishError(null)}
      />
    </section>
  );
}

function DraftSheet({
  draft,
  desktop,
  busy,
  onClose,
  onPublish,
  onContinue,
  onDiscard,
}: {
  draft: Draft | null;
  desktop: boolean | null;
  busy: boolean;
  onClose: () => void;
  onPublish: (draft: Draft) => void;
  onContinue: (draft: Draft, navigate: (href: string) => void) => void;
  onDiscard: (draft: Draft) => void;
}) {
  const router = useRouter();
  const open = Boolean(draft);
  // Keep showing the last draft while the sheet animates closed.
  const [shown, setShown] = useState(draft);
  if (draft && draft !== shown) setShown(draft);

  const { requestClose, release } = useBackDismiss(open, onClose);

  if (!shown) return null;

  const ready = isReady(shown);
  const current = stepIndex(shown.currentStep);
  const place = [shown.location?.placeName, shown.location?.county]
    .filter((part, index, parts): part is string => Boolean(part) && parts.indexOf(part) === index)
    .join(", ");
  const media = shown.mediaAssetIds.length;

  // Into the composer: hand the sheet's history entry to it, so Back from the
  // composer comes to the drafts list rather than an empty sheet step.
  const navigate = (href: string) => {
    const replace = release();
    onClose();
    if (replace) router.replace(href);
    else router.push(href);
  };

  const footer = ready ? (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onContinue(shown, navigate)}
        disabled={busy}
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-surface text-[15px] font-semibold text-main active:opacity-70 disabled:opacity-50"
      >
        <FileEdit size={17} aria-hidden /> Edit
      </button>
      <button
        type="button"
        onClick={() => onPublish(shown)}
        disabled={busy}
        className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-bold text-white active:opacity-80 disabled:opacity-60"
      >
        {busy ? <InterlockingBalls size={20} /> : <Send size={17} aria-hidden />}
        {busy ? "Posting…" : "Post now"}
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => onContinue(shown, navigate)}
      disabled={busy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-bold text-white active:opacity-80 disabled:opacity-60"
    >
      <FileEdit size={17} aria-hidden /> Continue editing
    </button>
  );

  return (
    <DetailSheet
      open={open}
      desktop={desktop}
      title={draftTitle(shown)}
      subtitle={`Draft · edited ${shortDate(draftEdited(shown))}`}
      onRequestClose={requestClose}
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        <DraftCover
          draft={shown}
          className="h-[min(40svh,380px)] w-full rounded-2xl"
          sizes="(max-width: 768px) 100vw, 460px"
        />

        {/* Where the draft is: four steps, done ones ticked. */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-muted">Progress</h3>
            <span className="text-[13px] font-semibold text-main">
              {ready ? "Ready to post" : `Step ${current + 1} of ${STEPS.length}`}
            </span>
          </div>
          <ol className="grid grid-cols-4 gap-1.5">
            {STEPS.map((item, index) => {
              const done = ready || index < current;
              const active = !ready && index === current;
              return (
                <li key={item.step} className="flex flex-col gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 rounded-full",
                      done ? TONE_CLASSES.success.dot : active ? "bg-primary" : "bg-surface",
                    )}
                  />
                  <span
                    className={cn(
                      "flex items-center gap-1 text-[12px]",
                      done || active ? "font-semibold text-main" : "text-muted",
                    )}
                  >
                    {done && <Check size={12} aria-hidden />}
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ol>
          {!ready && (
            <p className="mt-3 text-[13px] leading-snug text-muted">
              Continue where you left off — your photos and details are saved.
            </p>
          )}
        </section>

        <section>
          <h3 className="mb-1 text-[13px] font-semibold text-muted">Details</h3>
          <dl className="divide-y divide-border">
            <Detail label="Price">
              {draftPrice(shown) ?? "Not set"}
              {shown.price?.negotiable && shown.price.amount > 0 ? " · negotiable" : ""}
            </Detail>
            <Detail label={mapType(shown.type) === "video" ? "Video" : "Photos"}>
              {mapType(shown.type) === "video"
                ? media > 0
                  ? "Added"
                  : "Not added"
                : media > 0
                  ? `${media} added`
                  : "None yet"}
            </Detail>
            <Detail label="Location">{place || "Not set"}</Detail>
            <Detail label="Started">{shortDate(String(shown.createdAt ?? ""))}</Detail>
            <Detail label="Last edited">{shortDate(draftEdited(shown))}</Detail>
          </dl>
        </section>

        {shown.caption?.trim() && (
          <section>
            <h3 className="mb-1.5 text-[13px] font-semibold text-muted">Description</h3>
            <p className="line-clamp-6 whitespace-pre-wrap text-[14px] leading-relaxed text-main">
              {shown.caption.trim()}
            </p>
          </section>
        )}

        <button
          type="button"
          onClick={() => onDiscard(shown)}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/10 text-[15px] font-semibold text-rose-600 transition-opacity active:opacity-70 disabled:opacity-50 dark:text-rose-400"
        >
          <Trash2 size={17} aria-hidden />
          Discard draft
        </button>
      </div>
    </DetailSheet>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-[14px]">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-main">{children}</dd>
    </div>
  );
}
