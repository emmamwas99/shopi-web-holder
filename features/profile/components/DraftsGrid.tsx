"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { FileEdit, ImagePlus, Plus, Send, Trash2, Play } from "lucide-react";
import {
  MyDraftsDocument,
  PublishDraftDocument,
  DiscardDraftDocument,
  type DraftFieldsFragment,
} from "@/types/__generated__/graphql";
import { useCreateStore } from "@/stores/create";
import { trackPostPublished } from "@/lib/analytics";

interface Props {
  lang: string;
}

function mapType(type?: string | null): "image" | "video" | null {
  if (type === "IMAGE") return "image";
  if (type === "VIDEO") return "video";
  return null;
}

function formatDate(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DraftsGrid({ lang }: Props) {
  const router = useRouter();
  const { setDraftId, setContentType, setStep } = useCreateStore();

  const { data, loading, refetch } = useQuery(MyDraftsDocument, {
    variables: { limit: 30 },
    fetchPolicy: "cache-and-network",
  });
  const [publishDraft] = useMutation(PublishDraftDocument);
  const [discardDraft] = useMutation(DiscardDraftDocument);

  const [busyId, setBusyId] = useState<string | null>(null);

  const drafts = (data?.myDrafts ?? []) as DraftFieldsFragment[];

  function continueEditing(draft: DraftFieldsFragment) {
    setDraftId(draft.id);
    setContentType(mapType(draft.type));
    setStep("edit");
    router.push(`/${lang}/upload/create`);
  }

  async function handlePublish(draft: DraftFieldsFragment) {
    if (busyId) return;
    setBusyId(draft.id);
    try {
      const { data: res, error } = await publishDraft({
        variables: { id: draft.id },
      });
      if (error || !res?.publishDraft) {
        throw new Error(error?.message ?? "Could not publish");
      }
      trackPostPublished("drafts");
      // New posts wait for admin review before they reach the feed.
      toast.success("Posted! It’ll show on the feed once it’s approved.");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDiscard(draft: DraftFieldsFragment) {
    if (busyId) return;
    if (!window.confirm("Discard this draft? This cannot be undone.")) return;
    setBusyId(draft.id);
    try {
      await discardDraft({ variables: { id: draft.id } });
      toast.success("Draft discarded");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not discard");
    } finally {
      setBusyId(null);
    }
  }

  // ── Loading skeleton (2-grid, matches Posts/TikTok) ──────────────────────────
  if (loading && drafts.length === 0) {
    return (
      <section className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-5 xl:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-9/10 rounded-xl"
              style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
            />
          ))}
        </div>
      </section>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!loading && drafts.length === 0) {
    return (
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-80  flex-col items-center justify-center text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg border"
            style={{
              backgroundColor: "rgb(var(--color-bg-elevated))",
              borderColor: "rgb(var(--color-border))",
              color: "rgb(var(--brand-primary))",
            }}
          >
            <FileEdit size={26} strokeWidth={2} />
          </div>
          <h2
            className="font-bold"
            style={{
              fontSize: "var(--text-lg)",
              color: "rgb(var(--color-text))",
            }}
          >
            No drafts yet
          </h2>
          <p
            className="mt-2 max-w-sm leading-snug"
            style={{
              fontSize: "var(--text-base)",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            When you save a post as a draft, it shows up here so you can finish
            and publish it later.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/${lang}/upload`)}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 font-semibold text-white active:opacity-80"
            style={{
              fontSize: "var(--text-sm)",
              background:
                "linear-gradient(135deg, rgb(var(--brand-primary)), rgb(var(--brand-highlight)))",
            }}
          >
            <Plus size={16} strokeWidth={2.4} /> New post
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full ">
        {/* Header — same heading/description pattern + sizes as the Storefront
            (Posts) tab for consistency across subtabs. */}
        <div className="mb-4">
          <h2
            className="font-bold leading-tight"
            style={{
              fontSize: "var(--text-base)",
              color: "rgb(var(--color-text))",
            }}
          >
            Drafts
          </h2>
          <p
            className="mt-1"
            style={{
              fontSize: "var(--text-sm)",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            {drafts.length} {drafts.length === 1 ? "draft" : "drafts"}
          </p>
        </div>

        {/* Same columns as Explore, Saved and Posts, so a draft sits in the
            same grid rhythm as everything else the profile shows. */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 md:gap-x-4 md:gap-y-6 xl:grid-cols-4 min-[90rem]:grid-cols-5">
          {drafts.map((draft) => {
            const busy = busyId === draft.id;
            const isVideo = mapType(draft.type) === "video";
            const cover = draft.coverThumbnailUrl;
            // The server only publishes a draft that reached READY, and
            // rejects anything earlier with a step name in the message. Tapping
            // Post on a half-finished draft therefore produced a toast reading
            // "Draft must be at READY step to publish. Current step:
            // media_upload". Offer the action that actually applies instead.
            const readyToPost = draft.currentStep === "READY";
            return (
              // Photo-first, no card border. The bordered panel this replaces
              // wrapped every tile in chrome and made a grid of six drafts
              // read as a spreadsheet rather than a shelf of work in progress.
              <article key={draft.id} className="group flex flex-col">
                <button
                  type="button"
                  onClick={() => continueEditing(draft)}
                  className="relative block aspect-3/4 w-full overflow-hidden rounded-xl md:aspect-4/5"
                  style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                  aria-label={`Continue editing ${draft.title?.trim() || "untitled draft"}`}
                >
                  {cover ? (
                    <Image
                      src={cover}
                      alt={draft.title ?? "Draft"}
                      fill
                      sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 20vw"
                      className="object-cover"
                    />
                  ) : (
                    // An empty draft is the normal state for one abandoned at
                    // the upload step, so it says so. A bare grey icon was
                    // indistinguishable from a cover that had failed to load.
                    <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center">
                      <ImagePlus
                        size={22}
                        strokeWidth={1.8}
                        style={{ color: "rgb(var(--color-text-muted))" }}
                        aria-hidden
                      />
                      <span
                        className="text-[11px] font-medium leading-tight"
                        style={{ color: "rgb(var(--color-text-muted))" }}
                      >
                        No photos yet
                      </span>
                    </span>
                  )}

                  {isVideo && cover && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                        <Play size={15} fill="currentColor" strokeWidth={0} className="ml-0.5" />
                      </span>
                    </span>
                  )}

                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    Draft
                  </span>
                </button>

                {/* Fixed two rows, like the Posts tiles, so the grid stays
                    aligned whatever the title length. */}
                <div className="flex min-w-0 flex-col gap-0.5 px-0.5 pt-2">
                  <p
                    className="truncate font-semibold"
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "rgb(var(--color-text))",
                    }}
                  >
                    {draft.title?.trim() || "Untitled draft"}
                  </p>
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "rgb(var(--color-text-muted))",
                    }}
                  >
                    {formatDate(draft.updatedAt ?? draft.createdAt)}
                  </p>
                </div>

                <div className="mt-2 flex items-center gap-2 px-0.5">
                  {readyToPost ? (
                    <button
                      type="button"
                      onClick={() => handlePublish(draft)}
                      disabled={busy}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-60"
                      style={{
                        fontSize: "var(--text-sm)",
                        backgroundColor: "rgb(var(--brand-primary))",
                      }}
                    >
                      <Send size={14} /> {busy ? "Posting…" : "Post"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => continueEditing(draft)}
                      disabled={busy}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border font-semibold transition-opacity active:opacity-80 disabled:opacity-60"
                      style={{
                        fontSize: "var(--text-sm)",
                        borderColor: "rgb(var(--color-border))",
                        color: "rgb(var(--color-text))",
                      }}
                    >
                      <FileEdit size={14} /> Continue
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDiscard(draft)}
                    disabled={busy}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity active:opacity-80 disabled:opacity-60"
                    style={{
                      color: "rgb(var(--color-error))",
                      backgroundColor: "rgb(var(--color-error) / 0.1)",
                    }}
                    aria-label={`Discard ${draft.title?.trim() || "untitled draft"}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
