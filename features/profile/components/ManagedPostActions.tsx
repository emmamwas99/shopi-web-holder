"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { toast } from "sonner";
import type { Reference } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";
import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";
import { useBackDismiss } from "@/hooks/useBackDismiss";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CategoryPickerDrawer } from "@/features/create/components/CategoryPickerDrawer";
import { changedListingTextProblems } from "@/lib/listingText";
import { useManagedPostMutations, type ManagedPost } from "../hooks/useManagedPosts";
import { isHidden } from "../lib/managedPost";
import { ConfirmSheet } from "./ConfirmSheet";
import {
  EditPostMedia,
  editMediaChanged,
  editMediaFromPost,
  editMediaInput,
  editMediaProblem,
  type EditMediaItem,
} from "./EditPostMedia";

type EditFormState = {
  title: string;
  caption: string;
  amount: string;
  currency: string;
  negotiable: boolean;
  categoryId: string | null;
  categoryLabel: string | null;
  subcategoryId: string | null;
  subcategory: string | null;
  media: EditMediaItem[];
};

/**
 * Everything a seller can do to one of their posts — edit, hide/show,
 * delete — with the sheets those actions open. Shared by the posts list
 * (desktop side panel) and the post's own page, so both behave the same.
 *
 * Render `surfaces` once wherever the hook is used.
 */
export function useManagedPostActions({
  desktop,
  onRefresh,
  onDeleted,
}: {
  desktop: boolean | null;
  /** Refetch whatever shows the post; runs after an edit or a delete. */
  onRefresh: () => Promise<unknown> | void;
  /** The post is gone: close or leave whatever was showing it. */
  onDeleted?: (post: ManagedPost) => void;
}): {
  openEdit: (post: ManagedPost) => void;
  toggleHidden: (post: ManagedPost) => void;
  requestDelete: (post: ManagedPost) => void;
  busy: boolean;
  surfaces: ReactNode;
} {
  const isDesktop = desktop;
  const client = useApolloClient();
  const [editingPost, setEditingPost] = useState<ManagedPost | null>(null);
  const [editState, setEditState] = useState<EditFormState | null>(null);
  // Title/description problems show once Save has been tried, then follow the
  // typing (see lib/listingText — only text the seller changed is checked).
  const [editTried, setEditTried] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedPost | null>(null);

  const {
    updatePost,
    updateMedia,
    setHidden,
    deletePost: removePost,
    loading: mutationBusy,
  } = useManagedPostMutations();

  const openEdit = (post: ManagedPost) => {
    setEditTried(false);
    setEditingPost(post);
    setEditState({
      title: post.title ?? "",
      caption: post.caption ?? "",
      amount: post.price.amount > 0 ? String(post.price.amount) : "",
      currency: post.price.currency ?? "KES",
      negotiable: post.price.negotiable ?? false,
      categoryId: post.categoryId ?? null,
      categoryLabel: post.category?.name ?? null,
      subcategoryId: null,
      subcategory: null,
      media: editMediaFromPost(post),
    });
  };

  const closeEdit = useCallback(() => {
    setEditingPost(null);
    setEditState(null);
  }, []);

  async function handleToggleHidden(post: ManagedPost) {
    const hidden = !isHidden(post);
    try {
      await setHidden({ variables: { contentId: post.id, hidden } });
      toast.success(hidden ? "Hidden from your store" : "Back in your store");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update visibility");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const deleted = deleteTarget;
      await removePost({ variables: { contentId: deleted.id } });
      toast.success("Post deleted");
      // Take it out of the cached list now, so whichever screen shows the
      // list next never flashes the deleted post.
      client.cache.modify({
        fields: {
          myManagedContent(existing, { readField }) {
            const list = existing as { items?: readonly Reference[] } | undefined;
            if (!list?.items) return existing;
            return {
              ...list,
              items: list.items.filter((ref) => readField("id", ref) !== deleted.id),
            } as typeof existing;
          },
        },
      });
      // The confirm sheet and whatever showed the post close together.
      setDeleteTarget(null);
      onDeleted?.(deleted);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    }
  }

  async function handleSaveEdit() {
    if (!editingPost || !editState) return;
    setEditTried(true);
    const mediaChanged = editMediaChanged(editState.media, editingPost);
    const mediaProblem = mediaChanged ? editMediaProblem(editState.media) : null;
    const textProblems = changedListingTextProblems(editingPost, editState);
    if (
      mediaProblem ||
      textProblems.title ||
      textProblems.description ||
      !editState.categoryId ||
      !editState.subcategory?.trim()
    ) return;
    const parsedAmount = editState.amount.trim() === "" ? 0 : Number(editState.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      toast.error("Enter a valid price");
      return;
    }

    let mediaSaved: ManagedPost | null = null;
    try {
      // Media first: it's the part the API can still refuse (an upload it
      // can't use), and then nothing else is half-saved either.
      if (mediaChanged) {
        const { data } = await updateMedia({
          variables: { contentId: editingPost.id, items: editMediaInput(editState.media) },
        });
        mediaSaved = data?.updateOwnedContentMedia ?? null;
      }
      await updatePost({
        variables: {
          contentId: editingPost.id,
          input: {
            title: editState.title.trim(),
            caption: editState.caption.trim(),
            categoryId: editState.categoryId,
            subcategory: editState.subcategory,
            price: {
              amount: parsedAmount,
              currency: editState.currency.trim() || "KES",
              negotiable: editState.negotiable,
            },
          },
        },
      });
      const backInReview =
        editingPost.status === "ACTIVE" && mediaSaved?.status === "PENDING_REVIEW";
      toast.success(
        "Post updated",
        backInReview
          ? { description: "Shopi checks the new media before it goes live again." }
          : undefined,
      );
      closeEdit();
      // Refreshes the category name, which the edit mutation doesn't return.
      await onRefresh();
    } catch (error) {
      // The media went through before the details failed: edit on from what
      // the post now holds, so trying again doesn't resend it.
      if (mediaSaved) {
        const saved = mediaSaved;
        setEditingPost(saved);
        setEditState((current) =>
          current ? { ...current, media: editMediaFromPost(saved) } : current,
        );
      }
      toast.error(error instanceof Error ? error.message : "Could not update");
    }
  }

  const editTextProblems =
    editingPost && editState
      ? changedListingTextProblems(editingPost, editState)
      : { title: null, description: null };

  // Save stays disabled until something actually differs from what is stored,
  // and the discard prompt only fires when there is something to lose.
  const editDirty = useMemo(() => {
    if (!editingPost || !editState) return false;
    const storedAmount = editingPost.price.amount > 0 ? String(editingPost.price.amount) : "";
    return (
      editState.title !== (editingPost.title ?? "") ||
      editState.caption !== (editingPost.caption ?? "") ||
      editState.amount !== storedAmount ||
      editState.negotiable !== (editingPost.price.negotiable ?? false) ||
      editState.categoryId !== (editingPost.categoryId ?? null) ||
      // The form opens with no subcategory picked; that alone isn't a change.
      (editState.subcategory !== null &&
        editState.subcategory !== (editingPost.aiClassification?.level2 ?? null)) ||
      editMediaChanged(editState.media, editingPost)
    );
  }, [editingPost, editState]);

  const surfaces = (
    <>
      <EditSurface
        desktop={isDesktop}
        open={Boolean(editingPost && editState)}
        busy={mutationBusy}
        dirty={editDirty}
        uploading={Boolean(editState?.media.some((item) => item.status === "uploading"))}
        canSubmit={Boolean(
          editDirty || !editState?.categoryId || !editState?.subcategory,
        )}
        onClose={closeEdit}
        onSubmit={() => void handleSaveEdit()}
      >
        {editState && (
          // Price first: it is the field sellers open this sheet to change,
          // and putting it above the fold means the common edit needs no
          // scrolling at all.
          <div className="flex flex-col gap-4 md:gap-5">
            <FieldBlock label="Price" hint={editState.currency}>
              <Input
                inputMode="decimal"
                value={editState.amount}
                placeholder="Leave empty for “price on request”"
                className="h-11 rounded-xl text-[14px] placeholder:text-[13px] md:h-12 md:text-base"
                onChange={(event) =>
                  setEditState((current) =>
                    current ? { ...current, amount: event.target.value } : current,
                  )
                }
              />
            </FieldBlock>

            {/* The whole row toggles, as a settings row does; the switch is
                the accessible control. A <div>, not a <button>: the switch is
                itself a button, and buttons can't nest. */}
            <div
              onClick={() =>
                setEditState((current) =>
                  current ? { ...current, negotiable: !current.negotiable } : current,
                )
              }
              className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-default px-4 text-left"
            >
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-main">Negotiable</span>
                <span className="block text-[12px] text-muted">Buyers can make an offer</span>
              </span>
              <Switch
                checked={editState.negotiable}
                onCheckedChange={(checked) =>
                  setEditState((current) =>
                    current ? { ...current, negotiable: checked } : current,
                  )
                }
                aria-label="Negotiable"
                // The row toggles too; the switch must not double-fire on it.
                onClick={(event) => event.stopPropagation()}
              />
            </div>

            <EditPostMedia
              items={editState.media}
              onChange={(update) =>
                setEditState((current) =>
                  current ? { ...current, media: update(current.media) } : current,
                )
              }
              locked={editingPost?.status === "PROCESSING"}
              reviewNote={
                editingPost?.status === "ACTIVE" &&
                editState.media.some((item) => item.keepIndex === undefined)
              }
            />
            {editTried && editingPost && editMediaChanged(editState.media, editingPost) &&
            editMediaProblem(editState.media) ? (
              <p className="-mt-3 text-[12px] font-medium text-error">
                {editMediaProblem(editState.media)}
              </p>
            ) : null}

            <FieldBlock label="Title" hint={`${editState.title.length}/140`}>
              <Input
                value={editState.title}
                maxLength={140}
                className="h-11 rounded-xl text-[14px] md:h-12 md:text-base"
                aria-invalid={Boolean(editTried && editTextProblems.title)}
                onChange={(event) =>
                  setEditState((current) =>
                    current ? { ...current, title: event.target.value } : current,
                  )
                }
              />
              {editTried && editTextProblems.title ? (
                <span className="block text-[12px] font-medium text-error">
                  {editTextProblems.title}
                </span>
              ) : null}
            </FieldBlock>

            <FieldBlock label="Description" hint={`${editState.caption.length}/2000`}>
              <Textarea
                value={editState.caption}
                maxLength={2000}
                rows={5}
                className="min-h-28 resize-none rounded-xl text-[14px] leading-5 md:min-h-32 md:text-base md:leading-relaxed"
                aria-invalid={Boolean(editTried && editTextProblems.description)}
                onChange={(event) =>
                  setEditState((current) =>
                    current ? { ...current, caption: event.target.value } : current,
                  )
                }
              />
              {editTried && editTextProblems.description ? (
                <span className="block text-[12px] font-medium text-error">
                  {editTextProblems.description}
                </span>
              ) : null}
            </FieldBlock>

            <FieldBlock label="Category">
              <CategoryPickerDrawer
                value={editState.categoryId}
                fallbackLabel={editState.categoryLabel}
                onChange={(id, name) =>
                  setEditState((current) =>
                    current
                      ? {
                          ...current,
                          categoryId: id,
                          categoryLabel: name,
                          ...(current.categoryId !== id
                            ? { subcategoryId: null, subcategory: null }
                            : {}),
                        }
                      : current,
                  )
                }
              />
            </FieldBlock>
            {editTried && !editState.categoryId ? (
              <p className="-mt-3 text-[12px] font-medium text-error">
                Choose a category before saving.
              </p>
            ) : null}
            <FieldBlock label="Subcategory">
              <CategoryPickerDrawer
                value={editState.subcategoryId}
                fallbackLabel={editState.subcategory}
                parentId={editState.categoryId}
                title="Subcategory"
                placeholderLabel="Choose subcategory"
                emptyLabel="No subcategories for this category."
                onChange={(id, name) =>
                  setEditState((current) =>
                    current
                      ? { ...current, subcategoryId: id, subcategory: name }
                      : current,
                  )
                }
              />
            </FieldBlock>
            {editTried && editState.categoryId && !editState.subcategory ? (
              <p className="-mt-3 text-[12px] font-medium text-error">
                Choose a subcategory from the list before saving.
              </p>
            ) : null}

            <p className="text-[12px] leading-relaxed text-muted">
              Location stays as published, so buyers always see the same pickup point.
            </p>
          </div>
        )}
      </EditSurface>

      <ConfirmSheet
        open={Boolean(deleteTarget)}
        desktop={isDesktop}
        title="Delete this post?"
        description="This can't be undone."
        confirmLabel="Delete post"
        busy={mutationBusy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      >
        {deleteTarget && (
          <div className="flex items-start gap-3 rounded-2xl bg-rose-500/10 px-4 py-3 text-rose-700 dark:text-rose-300">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-[14px] leading-relaxed">
              <strong>{deleteTarget.title || "This post"}</strong> will be removed from your
              store. Buyers will no longer see it.
            </p>
          </div>
        )}
      </ConfirmSheet>
    </>
  );

  return {
    openEdit,
    toggleHidden: (post: ManagedPost) => void handleToggleHidden(post),
    requestDelete: setDeleteTarget,
    busy: mutationBusy,
    surfaces,
  };
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string;
  /** Right-aligned counter or unit, sitting on the label's own line. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold text-main">{label}</span>
        {hint && <span className="shrink-0 text-[12px] tabular-nums text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function EditSurface({
  desktop,
  open,
  busy,
  dirty,
  uploading,
  canSubmit,
  onClose,
  onSubmit,
  children,
}: {
  desktop: boolean | null;
  open: boolean;
  busy: boolean;
  /** Whether anything actually changed — gates Save and the discard prompt. */
  dirty: boolean;
  /** New photos or a video are still on their way up; Save waits for them. */
  uploading: boolean;
  /** Keep Save clickable while required fields are missing so errors can show. */
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  const title = "Edit post";
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Back, the X, swipe-down and Cancel all come here. Unsaved changes get one
  // question first; Back while the question is showing means "keep editing".
  // Returning false keeps the sheet (and its Back step) in place.
  const attemptClose = useCallback((): boolean => {
    if (busy) return false;
    if (confirmDiscard) {
      setConfirmDiscard(false);
      return false;
    }
    if (dirty) {
      setConfirmDiscard(true);
      return false;
    }
    onClose();
    return true;
  }, [busy, confirmDiscard, dirty, onClose]);

  const { requestClose } = useBackDismiss(open, attemptClose);

  const discardPrompt = (
    <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
      <DialogContent className="z-[95] w-[min(88vw,340px)] rounded-3xl border-default bg-app" overlayClassName="z-[90]">
        <DialogHeader>
          <DialogTitle>Discard changes?</DialogTitle>
          <DialogDescription>Your edits to this post will not be saved.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmDiscard(false)}
            className="h-10 rounded-full border border-border px-4 text-[14px] font-semibold text-main"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmDiscard(false);
              onClose();
            }}
            className="h-10 rounded-full bg-rose-600 px-4 text-[14px] font-semibold text-white"
          >
            Discard
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (desktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
          <DialogContent className="z-[85] flex max-h-[86vh] w-[min(92vw,680px)] flex-col rounded-[28px] border border-default bg-app p-0" overlayClassName="z-[82]">
            <DialogHeader className="shrink-0 border-b border-default px-6 py-5 text-left">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                Price, photos, title, description and category. Location stays as
                published.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            <DialogFooter className="shrink-0 border-t border-default px-6 py-4">
              <Button variant="outline" onClick={requestClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                className="text-white"
                onClick={onSubmit}
                disabled={busy || uploading || !canSubmit}
              >
                {busy || uploading ? <InterlockingBalls size={20} /> : null}
                {uploading ? "Uploading…" : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {discardPrompt}
      </>
    );
  }

  return (
    <>
      <Drawer open={open} onOpenChange={(next) => !next && requestClose()}>
        {/* A fixed-height sheet with its own scroller, so the keyboard can't
            push Save out of reach. It opens over the post sheet, a little
            shorter, so the post stays visible behind it. */}
        <DrawerContent className="mx-auto flex h-[84svh] w-full max-w-[480px] flex-col rounded-t-[20px] border-default bg-app">
          <DrawerHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-default px-4 py-2.5 text-left">
            <div className="min-w-0">
              <DrawerTitle className="text-[15px] font-semibold">{title}</DrawerTitle>
              <DrawerDescription className="sr-only">
                Update the price, photos, title, description and category of this post
              </DrawerDescription>
            </div>
            <button
              type="button"
              onClick={requestClose}
              disabled={busy}
              className="-mr-1 h-9 shrink-0 rounded-full px-3 text-[14px] font-semibold text-muted transition-colors active:bg-surface"
            >
              Cancel
            </button>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-3">
            {children}
          </div>

          <div
            className="shrink-0 border-t border-default px-4 pt-2.5"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.625rem)" }}
          >
            <Button
              className="h-11 w-full rounded-full text-[14px] font-semibold text-white"
              onClick={onSubmit}
              disabled={busy || uploading || !canSubmit}
            >
              {busy || uploading ? <InterlockingBalls size={20} /> : null}
              {uploading ? "Uploading…" : busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
      {discardPrompt}
    </>
  );
}
