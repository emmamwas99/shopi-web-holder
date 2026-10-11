"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Eye, Package, Plus, Upload } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useMyManagedPosts, type ManagedPost } from "@/features/profile/hooks/useManagedPosts";
import { DashboardListingActions } from "./DashboardListingActions";

function formatPrice(post: ManagedPost) {
  if (post.price.amount <= 0) return "Price on request";
  return `${post.price.currency} ${Math.round(post.price.amount).toLocaleString("en-KE")}`;
}

function formatStatus(post: ManagedPost) {
  if (post.visibility !== "PUBLIC") return { label: "Hidden", style: "bg-surface text-muted" };
  if (post.status === "ACTIVE" && post.isLive) return { label: "Live", style: "bg-emerald-50 text-emerald-700" };
  if (post.status === "PENDING_REVIEW" || post.status === "UNDER_REVIEW") return { label: "In review", style: "bg-amber-50 text-amber-700" };
  if (post.status === "REJECTED" || post.status === "FAILED") return { label: post.status === "FAILED" ? "Failed" : "Needs attention", style: "bg-rose-50 text-rose-700" };
  if (post.status === "PROCESSING") return { label: "Processing", style: "bg-sky-50 text-sky-700" };
  if (post.status === "ACTIVE") return { label: "Approved", style: "bg-emerald-50 text-emerald-700" };
  return { label: "Draft", style: "bg-surface text-muted" };
}

function getThumbnail(post: ManagedPost) {
  const media = post.media?.[0];
  return media?.thumbnailUrl ?? media?.muxMeta?.thumbnailUrl ?? media?.r2Variants?.[0]?.url ?? media?.url ?? null;
}

function PostItemMenu({
  onSingleUpload,
  className,
}: {
  onSingleUpload: () => void;
  className: string;
}) {
  const [popoverContainer, setPopoverContainer] = useState<HTMLElement | null>(null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerDown={(event) =>
            setPopoverContainer(
              event.currentTarget.closest<HTMLElement>('[role="dialog"]'),
            )
          }
          className={className}
        >
          <Plus className="h-4 w-4" aria-hidden /> Post an item
        </button>
      </PopoverTrigger>
      <PopoverContent container={popoverContainer} align="end" className="w-52 rounded-xl border-border bg-elevated p-1.5 shadow-lg">
        <button
          type="button"
          onClick={onSingleUpload}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-main transition-colors hover:bg-surface"
        >
          <Plus className="h-4 w-4 text-primary" aria-hidden />
          Single upload
        </button>
        <button
          type="button"
          disabled
          title="Bulk upload is coming soon"
          className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-muted opacity-60"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Bulk upload
        </button>
      </PopoverContent>
    </Popover>
  );
}

export function DashboardListings({
  lang,
  onSingleUpload,
}: {
  lang: string;
  onSingleUpload: () => void;
}) {
  const { isAuthenticated } = useAuthSession();
  const { data, loading, error, fetchMore, refetch } = useMyManagedPosts(25, !isAuthenticated);
  const result = data?.myManagedContent;
  const posts = result?.items ?? [];

  if (!isAuthenticated) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
        <h1 className="text-xl font-extrabold text-main">Sign in to see your listings</h1>
        <p className="mt-2 text-xs text-muted">Your posts and their performance will appear here.</p>
        <Link href={`/${lang}/auth/login`} className="mt-5 inline-flex h-9 items-center rounded-xl bg-primary px-4 text-xs font-bold text-white">Sign in</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col px-5 md:px-8">
      <header className="z-10 flex shrink-0 flex-wrap items-end justify-between gap-3 bg-app pb-4 pt-5 md:pb-5 md:pt-6">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-main">My listings</h1>
          <p className="mt-1 text-xs text-muted">Manage your posts and see how they are performing.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-elevated px-3.5 text-xs font-bold text-main"
          >
            <Download className="h-4 w-4" aria-hidden /> Download Excel
          </button>
          <PostItemMenu
            onSingleUpload={onSingleUpload}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-bold text-white hover:opacity-90"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-elevated shadow-sm">
          <table className="w-full min-w-[790px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-surface text-[10px] font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-right">Saves</th>
                <th className="px-4 py-3">Posted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && posts.length === 0 ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg" /><Skeleton className="h-4 w-40" /></div></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="ml-auto h-4 w-8" /></td>
                    <td className="px-4 py-3"><Skeleton className="ml-auto h-4 w-8" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="ml-auto h-7 w-7 rounded-lg" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted">Your listings could not be loaded. Please try again.</td></tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <Package className="mx-auto h-6 w-6 text-primary" aria-hidden />
                    <p className="mt-3 text-sm font-semibold text-main">No listings yet</p>
                    <p className="mt-1 text-xs text-muted">Your posts will appear here once you publish one.</p>
                    <PostItemMenu
                      onSingleUpload={onSingleUpload}
                      className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-white hover:opacity-90"
                    />
                  </td>
                </tr>
              ) : posts.map((post) => {
                const status = formatStatus(post);
                const thumbnail = getThumbnail(post);
                return (
                  <tr key={post.id} className="transition-colors hover:bg-surface/50">
                    <td className="max-w-[340px] px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
                          {thumbnail ? <Image src={thumbnail} alt="" fill sizes="40px" className="object-cover" /> : <Package className="h-4 w-4 text-muted" aria-hidden />}
                        </div>
                        <span className="truncate font-semibold text-main">{post.title || "Untitled listing"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${status.style}`}>{status.label}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-main">{formatPrice(post)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted"><span className="inline-flex items-center justify-end gap-1.5"><Eye className="h-3.5 w-3.5" aria-hidden />{post.stats.views.toLocaleString("en-KE")}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{post.stats.saves.toLocaleString("en-KE")}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{new Date(post.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-2 text-right"><DashboardListingActions post={post} lang={lang} onRefresh={() => refetch()} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        {result?.hasMore && result.nextCursor ? (
          <div className="border-t border-border px-4 py-3 text-center">
            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchMore({
                variables: { afterId: result.nextCursor ?? undefined, limit: 25 },
                updateQuery(previous, { fetchMoreResult }) {
                  if (!fetchMoreResult) return previous;
                  const existingIds = new Set(previous.myManagedContent.items.map((post) => post.id));
                  return {
                    myManagedContent: {
                      ...fetchMoreResult.myManagedContent,
                      items: [
                        ...previous.myManagedContent.items,
                        ...fetchMoreResult.myManagedContent.items.filter((post) => !existingIds.has(post.id)),
                      ],
                    },
                  };
                },
              })}
              className="rounded-lg px-4 py-2 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load more listings"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
