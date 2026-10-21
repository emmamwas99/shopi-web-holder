"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Bookmark, Eye, Globe, Heart, MessageCircle, MoreHorizontal, Pencil, Share2, Store, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CategoryPickerDrawer } from "@/features/create/components/CategoryPickerDrawer";
import { useManagedPostMutations, type ManagedPost } from "@/features/profile/hooks/useManagedPosts";
import { contentPath } from "@/lib/content-url";
import { changedListingTextProblems } from "@/lib/listingText";

type EditState = {
  title: string;
  caption: string;
  amount: string;
  currency: string;
  negotiable: boolean;
  categoryId: string | null;
  categoryLabel: string | null;
  subcategoryId: string | null;
  subcategory: string | null;
};

export function DashboardListingActions({
  post,
  lang,
  onRefresh,
}: {
  post: ManagedPost;
  lang: string;
  onRefresh: () => Promise<unknown> | void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [popoverContainer, setPopoverContainer] = useState<HTMLElement | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Title/description problems show once Save has been tried, then follow the
  // typing (see lib/listingText — only text the seller changed is checked).
  const [editTried, setEditTried] = useState(false);
  const { updatePost, setHidden, deletePost, loading } = useManagedPostMutations();
  const editTextProblems = editState ? changedListingTextProblems(post, editState) : null;

  function openEdit() {
    setMenuOpen(false);
    setEditTried(false);
    setEditState({
      title: post.title ?? "",
      caption: post.caption ?? "",
      amount: String(post.price.amount ?? 0),
      currency: post.price.currency ?? "KES",
      negotiable: post.price.negotiable ?? false,
      categoryId: post.categoryId ?? null,
      categoryLabel: post.category?.name ?? null,
      subcategoryId: null,
      subcategory: null,
    });
  }

  async function toggleVisibility() {
    try {
      await setHidden({ variables: { contentId: post.id, hidden: post.visibility === "PUBLIC" } });
      toast.success(post.visibility === "PUBLIC" ? "Post hidden" : "Post shown again");
      setMenuOpen(false);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update visibility");
    }
  }

  async function saveEdit() {
    if (!editState) return;
    setEditTried(true);
    const textProblems = changedListingTextProblems(post, editState);
    if (textProblems.title || textProblems.description) return;
    if (!editState.categoryId || !editState.subcategory?.trim()) return;
    const amount = Number(editState.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid price");
      return;
    }
    try {
      await updatePost({
        variables: {
          contentId: post.id,
          input: {
            title: editState.title.trim(),
            caption: editState.caption.trim(),
            categoryId: editState.categoryId,
            subcategory: editState.subcategory,
            price: { amount, currency: editState.currency.trim() || "KES", negotiable: editState.negotiable },
          },
        },
      });
      toast.success("Post updated");
      setEditState(null);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update post");
    }
  }

  async function removeListing() {
    try {
      await deletePost({ variables: { contentId: post.id } });
      toast.success("Post deleted");
      setDeleteOpen(false);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete post");
    }
  }

  const hidden = post.visibility !== "PUBLIC";

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button type="button" onPointerDown={(event) => setPopoverContainer(event.currentTarget.closest<HTMLElement>('[role="dialog"]'))} aria-label={`Actions for ${post.title || "listing"}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-main">
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent container={popoverContainer} align="end" className="w-52 rounded-xl border-border bg-elevated p-1.5 text-main shadow-lg">
          <ActionButton icon={Pencil} onClick={openEdit}>Edit post</ActionButton>
          <ActionButton icon={Store} disabled={loading} onClick={() => void toggleVisibility()}>{hidden ? "Show in store" : "Hide from store"}</ActionButton>
          <ActionButton icon={BarChart3} onClick={() => { setMenuOpen(false); setInsightsOpen(true); }}>Open insights</ActionButton>
          <LinkAction icon={Globe} href={contentPath(lang, post)} onClick={() => setMenuOpen(false)}>Visit listing</LinkAction>
          <div className="my-1 border-t border-border" />
          <ActionButton icon={Trash2} danger onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}>Remove from store</ActionButton>
        </PopoverContent>
      </Popover>

      <Dialog open={insightsOpen} onOpenChange={setInsightsOpen}>
        <DialogContent className="w-[min(92vw,560px)] rounded-2xl p-0">
          <DialogHeader className="border-b border-border px-5 py-4 text-left">
            <DialogTitle className="text-base">Listing insights</DialogTitle>
            <DialogDescription className="truncate text-xs">{post.title || "Untitled listing"}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            <InsightMetric icon={Eye} label="Views" value={post.stats.views} />
            <InsightMetric icon={Bookmark} label="Saves" value={post.stats.saves} />
            <InsightMetric icon={Heart} label="Likes" value={post.stats.likes} />
            <InsightMetric icon={MessageCircle} label="Comments" value={post.stats.comments} />
            <InsightMetric icon={Share2} label="Shares" value={post.stats.shares} />
          </div>
          <DialogFooter className="border-t border-border px-5 py-3">
            <Button variant="outline" className="h-9 text-xs" onClick={() => setInsightsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editState)} onOpenChange={(open) => !open && !loading && setEditState(null)}>
        <DialogContent className="flex max-h-[86vh] w-[min(92vw,680px)] flex-col rounded-2xl p-0">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4 text-left">
            <DialogTitle className="text-base">Edit post</DialogTitle>
            <DialogDescription className="text-xs">Update the details buyers see on this listing.</DialogDescription>
          </DialogHeader>
          {editState ? (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <Field label="Price">
                <Input inputMode="decimal" value={editState.amount} onChange={(event) => setEditState((current) => current ? { ...current, amount: event.target.value } : current)} />
              </Field>
              <button type="button" onClick={() => setEditState((current) => current ? { ...current, negotiable: !current.negotiable } : current)} className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left">
                <span><span className="block text-xs font-semibold text-main">Negotiable</span><span className="text-[11px] text-muted">Buyers can make an offer</span></span>
                <Switch checked={editState.negotiable} onCheckedChange={(checked) => setEditState((current) => current ? { ...current, negotiable: checked } : current)} onClick={(event) => event.stopPropagation()} />
              </button>
              <Field label={`Title (${editState.title.length}/140)`}>
                <Input maxLength={140} value={editState.title} aria-invalid={Boolean(editTried && editTextProblems?.title)} onChange={(event) => setEditState((current) => current ? { ...current, title: event.target.value } : current)} />
                {editTried && editTextProblems?.title ? <span className="block text-[11px] font-medium text-error">{editTextProblems.title}</span> : null}
              </Field>
              <Field label={`Description (${editState.caption.length}/2000)`}>
                <Textarea maxLength={2000} rows={4} value={editState.caption} aria-invalid={Boolean(editTried && editTextProblems?.description)} onChange={(event) => setEditState((current) => current ? { ...current, caption: event.target.value } : current)} />
                {editTried && editTextProblems?.description ? <span className="block text-[11px] font-medium text-error">{editTextProblems.description}</span> : null}
              </Field>
              <Field label="Category">
                <CategoryPickerDrawer value={editState.categoryId} fallbackLabel={editState.categoryLabel} onChange={(id, name) => setEditState((current) => current ? { ...current, categoryId: id, categoryLabel: name, ...(current.categoryId !== id ? { subcategoryId: null, subcategory: null } : {}) } : current)} />
              </Field>
              {editTried && !editState.categoryId ? <p className="-mt-3 text-[11px] font-medium text-error">Choose a category before saving.</p> : null}
              <Field label="Subcategory">
                <CategoryPickerDrawer
                  value={editState.subcategoryId}
                  fallbackLabel={editState.subcategory}
                  parentId={editState.categoryId}
                  title="Subcategory"
                  placeholderLabel="Choose subcategory"
                  emptyLabel="No subcategories for this category."
                  onChange={(id, name) => setEditState((current) => current ? { ...current, subcategoryId: id, subcategory: name } : current)}
                />
              </Field>
              {editTried && editState.categoryId && !editState.subcategory ? <p className="-mt-3 text-[11px] font-medium text-error">Choose a subcategory from the list before saving.</p> : null}
              <p className="text-[11px] leading-5 text-muted">Photos and location stay as published.</p>
            </div>
          ) : null}
          <DialogFooter className="shrink-0 border-t border-border px-5 py-3">
            <Button variant="outline" className="h-9 text-xs" onClick={() => setEditState(null)} disabled={loading}>Cancel</Button>
            <Button className="h-9 text-xs text-white" onClick={() => void saveEdit()} disabled={loading || !editState}>{loading ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(open) => !open && !loading && setDeleteOpen(false)}>
        <DialogContent className="w-[min(92vw,440px)] rounded-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base">Remove listing?</DialogTitle>
            <DialogDescription className="text-xs leading-5">This removes <strong>{post.title || "this post"}</strong> from your inventory. Buyers will no longer see it.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-9 text-xs" onClick={() => setDeleteOpen(false)} disabled={loading}>Cancel</Button>
            <Button variant="destructive" className="h-9 text-xs" onClick={() => void removeListing()} disabled={loading}>{loading ? "Removing…" : "Remove listing"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold text-main">{label}</span>{children}</label>;
}

function InsightMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-elevated p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted"><Icon className="h-3.5 w-3.5 text-primary" aria-hidden />{label}</div>
      <p className="mt-2 text-xl font-bold tabular-nums text-main">{value.toLocaleString("en-KE")}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, danger = false, onClick, disabled = false, children }: { icon: LucideIcon; danger?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-xs font-medium transition-colors hover:bg-surface disabled:opacity-50 ${danger ? "text-rose-600" : "text-main"}`}><Icon className="h-3.5 w-3.5" aria-hidden />{children}</button>;
}

function LinkAction({ icon: Icon, href, onClick, children }: { icon: LucideIcon; href: string; onClick: () => void; children: React.ReactNode }) {
  return <Link href={href} onClick={onClick} className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium text-main transition-colors hover:bg-surface"><Icon className="h-3.5 w-3.5" aria-hidden />{children}</Link>;
}
