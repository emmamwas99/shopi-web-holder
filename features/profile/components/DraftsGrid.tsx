"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import {
  ChevronRight,
  CircleCheck,
  CircleX,
  FileEdit,
  ImageIcon,
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
import { listingDescriptionProblem, listingTitleProblem } from "@/lib/listingText";
import { formatStoredPhone } from "@/lib/phone";
import { timeAgo, timeAgoLong } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreateErrorDialog,
  createErrorMessage,
} from "@/features/create/components/CreateErrorDialog";
import { ConfirmSheet } from "./ConfirmSheet";
import { DetailSheet } from "./DetailSheet";
import { InventoryControls } from "./InventoryControls";
import { ActionButton, Detail, MoreMenu } from "./ManagedPostSheet";
import { StatusBadge } from "./ManagedPostRow";

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

const STEP_ORDER: DraftStep[] = ["MEDIA_UPLOAD", "EDITING", "PUBLISHING_OPTIONS", "READY"];

const STEP_LABELS: Record<DraftStep, string> = {
  MEDIA_UPLOAD: "Adding photos",
  EDITING: "Writing details",
  PUBLISHING_OPTIONS: "Choosing options",
  READY: "Ready to post",
};

type DraftIssue = { code: string; label: string; message: string };

/**
 * What would stop this draft from posting, in the order a seller meets it.
 *
 * The same rules the API applies on publish (and the admin's "What's stopping
 * it" list shows): photos, the title and description rules in lib/listingText,
 * and — only while the draft is still at or before the details step, where
 * the API checks them on the way out — the location and phone number.
 */
function draftIssues(draft: Draft): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const video = draft.type === "VIDEO";
  if (draft.source !== "TIKTOK_EMBED" && draft.mediaAssetIds.length === 0) {
    issues.push({
      code: "media",
      label: video ? "No video" : "No photos",
      message: video
        ? "Add a video so buyers can see the item."
        : "Add at least one photo so buyers can see the item.",
    });
  }
  const title = listingTitleProblem(draft.title);
  if (title) issues.push({ code: "title", label: "Title too short", message: title });
  const description = listingDescriptionProblem(draft.caption);
  if (description) {
    issues.push({ code: "description", label: "Description too short", message: description });
  }
  if (STEP_ORDER.indexOf(draft.currentStep) <= STEP_ORDER.indexOf("EDITING")) {
    if (!draft.location?.placeName) {
      issues.push({
        code: "location",
        label: "No location",
        message: "Choose where the item is, so nearby buyers find it.",
      });
    }
    if (!draft.contactPhone) {
      issues.push({
        code: "phone",
        label: "No phone number",
        message: "Add a phone number buyers can call.",
      });
    }
  }
  return issues;
}

/** Posting needs the last step reached and nothing in the way. */
function canPost(draft: Draft): boolean {
  return draft.currentStep === "READY" && draftIssues(draft).length === 0;
}

function draftTitle(draft: Draft): string {
  return draft.title?.trim() || "Untitled draft";
}

function edited(draft: Draft): string {
  return String(draft.updatedAt ?? draft.createdAt ?? "");
}

function draftPrice(draft: Draft): string | null {
  const price = draft.price;
  if (!price || !(price.amount > 0)) return null;
  return `${price.currency} ${Math.round(price.amount).toLocaleString("en-KE")}`;
}

function mediaNoun(draft: Draft, count: number): string {
  const noun = draft.type === "VIDEO" ? "video" : "photo";
  return count === 1 ? noun : `${noun}s`;
}

function mapType(type?: string | null): "image" | "video" | null {
  if (type === "IMAGE") return "image";
  if (type === "VIDEO") return "video";
  return null;
}

/** Where a draft stands and the one thing most worth knowing — the admin's status line. */
function DraftStatusLine({ draft }: { draft: Draft }) {
  const issues = draftIssues(draft);
  if (canPost(draft)) return <StatusBadge tone="success">Ready to post</StatusBadge>;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      {issues[0] ? (
        <StatusBadge tone="warning">{issues[0].label}</StatusBadge>
      ) : (
        <StatusBadge tone="neutral">{STEP_LABELS[draft.currentStep]}</StatusBadge>
      )}
      {issues.length > 1 && <span className="text-xs text-muted">+{issues.length - 1} more</span>}
    </span>
  );
}

function DraftThumb({ draft, className }: { draft: Draft; className?: string }) {
  const cover = draft.coverThumbnailUrl;
  const count = draft.mediaAssetIds.length;
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-[8px] border border-default bg-surface",
        className,
      )}
    >
      {cover ? (
        <Image src={cover} alt="" fill sizes="48px" className="object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center text-muted">
          <ImageIcon size={16} aria-hidden />
        </span>
      )}
      {mapType(draft.type) === "video" && cover ? (
        <span className="absolute bottom-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white">
          <Play size={8} fill="currentColor" strokeWidth={0} className="ml-px" aria-hidden />
        </span>
      ) : count > 1 ? (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[10px] font-medium leading-4 text-white">
          {count}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The seller's unfinished posts: a list on a phone and a tile grid on desktop,
 * each opening the draft's sheet — what is done, what is stopping it, and the
 * next step. Back closes the sheet.
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

  const readyCount = useMemo(() => drafts.filter(canPost).length, [drafts]);
  const chips = useMemo(
    () => [
      { key: "all" as const, label: "All", count: drafts.length },
      { key: "ready" as const, label: "Ready to post", count: readyCount, attention: true },
      { key: "progress" as const, label: "In progress", count: drafts.length - readyCount },
    ],
    [drafts.length, readyCount],
  );

  const visibleDrafts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matched = drafts.filter(
      (draft) =>
        (filter === "all" || (filter === "ready") === canPost(draft)) &&
        (!needle ||
          [draft.title, draft.caption]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(needle))),
    );
    const time = (draft: Draft) => new Date(edited(draft)).getTime() || 0;
    return matched.sort((a, b) => (sort === "oldest" ? time(a) - time(b) : time(b) - time(a)));
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
        <Skeleton className="mb-3 h-10 w-full rounded-xl" />
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="size-12 shrink-0 rounded-[8px]" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
                <Skeleton className="h-4 w-24 rounded-[6px]" />
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
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-surface text-primary">
            <FileEdit size={22} />
          </div>
          <h2 className="text-base font-semibold text-main">No drafts</h2>
          <p className="mt-1.5 text-sm text-muted">
            Anything you save before posting waits here, so you can finish it later.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/${lang}/upload`)}
            className="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-primary px-3.5 text-sm font-medium text-white active:opacity-80"
          >
            <Plus className="size-4" /> New post
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
          <h2 className="hidden text-[15px] font-bold leading-tight text-main md:block">Drafts</h2>
          <p className="hidden text-[13px] text-muted md:mt-1 md:block">
            {drafts.length === 1 ? "1 draft" : `${drafts.length} drafts`}
            {readyCount > 0 && ` · ${readyCount} ready to post`}
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
          <p className="text-sm font-medium text-main">No drafts match</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
            className="mt-3 h-9 rounded-[8px] border border-default px-3.5 text-sm font-medium text-main active:opacity-70"
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
                <span className="relative block aspect-4/5 w-full overflow-hidden rounded-xl bg-surface">
                  {draft.coverThumbnailUrl ? (
                    <Image
                      src={draft.coverThumbnailUrl}
                      alt=""
                      fill
                      sizes="(max-width: 1279px) 33vw, 20vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-muted">
                      <ImageIcon size={22} aria-hidden />
                    </span>
                  )}
                </span>
                <span className="mt-2 block truncate px-0.5 text-sm font-medium text-main">
                  {draftTitle(draft)}
                </span>
                <span className="mt-1 flex px-0.5">
                  <DraftStatusLine draft={draft} />
                </span>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visibleDrafts.map((draft) => {
            const count = draft.mediaAssetIds.length;
            const price = draftPrice(draft);
            return (
              <li key={draft.id} data-scroll-anchor={draft.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(draft.id)}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors active:bg-surface"
                >
                  <DraftThumb draft={draft} className="size-12" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm font-medium",
                          draft.title?.trim() ? "text-main" : "text-muted",
                        )}
                      >
                        {draftTitle(draft)}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(edited(draft))}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {count === 0 ? `No ${mediaNoun(draft, 2)}` : `${count} ${mediaNoun(draft, count)}`}
                      {price ? ` · ${price}` : ""}
                    </span>
                    <span className="mt-1.5 flex">
                      <DraftStatusLine draft={draft} />
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            );
          })}
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

/**
 * One draft — the admin's draft panel, for its seller: the cover, where it
 * stands, the price, the next step, and what is stopping it from posting.
 */
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

  const issues = draftIssues(shown);
  const ready = canPost(shown);
  const count = shown.mediaAssetIds.length;
  const price = draftPrice(shown);
  const place = [shown.location?.placeName, shown.location?.subregion, shown.location?.county]
    .filter((part, index, parts): part is string => Boolean(part) && parts.indexOf(part) === index)
    .join(", ");

  // Into the composer: hand the sheet's history entry to it, so Back from the
  // composer comes to the drafts list rather than an empty sheet step.
  const navigate = (href: string) => {
    const replace = release();
    onClose();
    if (replace) router.replace(href);
    else router.push(href);
  };

  return (
    <DetailSheet
      open={open}
      desktop={desktop}
      title={draftTitle(shown)}
      subtitle={`Draft · started ${timeAgoLong(shown.createdAt)}`}
      onRequestClose={requestClose}
    >
      <div className="space-y-5">
        <div className="mx-auto w-full max-w-[13rem] space-y-2">
          {shown.coverThumbnailUrl ? (
            <div className="relative aspect-square w-full overflow-hidden rounded-[8px] border border-default bg-surface">
              <Image
                src={shown.coverThumbnailUrl}
                alt={draftTitle(shown)}
                fill
                sizes="208px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[8px] border border-default bg-surface text-center text-sm text-muted">
              <ImageIcon className="size-5" />
              No {mediaNoun(shown, 2)} yet
            </div>
          )}
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span>
              {count === 0 ? `No ${mediaNoun(shown, 2)}` : `${count} ${mediaNoun(shown, count)}`}
            </span>
            {count > 0 && <StatusBadge tone="success">Added</StatusBadge>}
          </div>
        </div>

        <div className="space-y-4">
          <DraftStatusLine draft={shown} />

          <div>
            <p className={cn("text-lg font-semibold tabular-nums", price ? "text-main" : "text-muted")}>
              {price ?? "No price yet"}
            </p>
            {shown.price?.negotiable && price && <p className="text-xs text-muted">Negotiable</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ready ? (
              <>
                <ActionButton primary icon={Send} onClick={() => onPublish(shown)} disabled={busy}>
                  {busy ? "Posting…" : "Post now"}
                </ActionButton>
                <ActionButton icon={FileEdit} onClick={() => onContinue(shown, navigate)} disabled={busy}>
                  Edit details
                </ActionButton>
              </>
            ) : (
              <ActionButton
                primary
                icon={FileEdit}
                onClick={() => onContinue(shown, navigate)}
                disabled={busy}
              >
                Continue editing
              </ActionButton>
            )}
            <MoreMenu
              disabled={busy}
              actions={[
                {
                  key: "discard",
                  label: "Discard draft",
                  icon: Trash2,
                  onSelect: () => onDiscard(shown),
                  danger: true,
                },
              ]}
            />
          </div>
        </div>

        {ready ? (
          <p className="flex items-center gap-2 rounded-[8px] bg-emerald-500/12 px-3 py-2 text-[13px] text-emerald-700 dark:text-emerald-400">
            <CircleCheck className="size-4 shrink-0" />
            Nothing is stopping this draft. You can post it now.
          </p>
        ) : issues.length > 0 ? (
          <section>
            <p className="mb-1.5 text-xs font-medium text-muted">What&apos;s stopping it</p>
            <ul className="divide-y divide-border rounded-xl border border-default">
              {issues.map((issue) => (
                <li key={issue.code} className="flex items-start gap-2.5 px-3 py-2.5 text-[13px]">
                  <CircleX className="mt-px size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span className="text-main">{issue.message}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="rounded-xl bg-subtle px-3 py-2.5 text-[13px] text-muted">
            Almost there — open it to finish the last step, then post.
          </p>
        )}

        {shown.caption?.trim() && (
          <section>
            <p className="mb-1.5 text-xs font-medium text-muted">Description</p>
            <p className="whitespace-pre-wrap text-sm text-main">{shown.caption.trim()}</p>
          </section>
        )}

        {shown.specs.length > 0 && (
          <section>
            <p className="mb-1.5 text-xs font-medium text-muted">Specifications</p>
            <dl className="divide-y divide-border rounded-xl border border-default px-3">
              {shown.specs.map((spec) => (
                <Detail key={spec.key} label={spec.key}>
                  {spec.value}
                </Detail>
              ))}
            </dl>
          </section>
        )}

        <dl className="divide-y divide-border rounded-xl border border-default px-3">
          <Detail label="Step">
            {/* At the last step but blocked isn't "ready to post". */}
            {shown.currentStep === "READY" && !ready ? "Last step" : STEP_LABELS[shown.currentStep]}
          </Detail>
          <Detail label="Location">{place || "—"}</Detail>
          <Detail label="Phone">
            <span className="tabular-nums">
              {shown.contactPhone ? formatStoredPhone(shown.contactPhone) : "—"}
            </span>
          </Detail>
          <Detail label="Started">{timeAgoLong(shown.createdAt)}</Detail>
          <Detail label="Last saved">{timeAgoLong(edited(shown))}</Detail>
        </dl>
      </div>
    </DetailSheet>
  );
}
