"use client";

import { useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff, Pencil, Share2, Zap } from "lucide-react";
import { BackLink } from "@/components/layout/BackLink";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { goBackOr } from "@/lib/useAppBack";
import { cn } from "@/lib/utils";
import { BoostSheet } from "@/features/billing/components/BoostSheet";
import { BOOSTS_FOR_SALE } from "@/features/billing/flags";
import { useMyManagedPost, type ManagedPost } from "../hooks/useManagedPosts";
import { isHidden, postThumb } from "../lib/managedPost";
import { useManagedPostActions } from "./ManagedPostActions";
import { ManagedPostDetail, isLivePost, runningBoost } from "./ManagedPostDetail";
import { ActionButton, MoreMenu, postMenuActions, sharePostLink } from "./ManagedPostSheet";

/** The page colour, nearly opaque. (`bg-app/95` can't work: bg-app is a plain class, not a Tailwind colour.) */
const BAR_BACKGROUND = "rgb(var(--color-bg) / 0.94)";

/**
 * One of the seller's posts as its own page — what a phone opens from
 * Profile → My posts. A real page rather than a sheet: Back works like
 * everywhere else, the address can be shared or reopened, and the actions
 * sit in a bar under the thumb.
 */
export function ManagedPostPage({ lang, contentId }: { lang: string; contentId: string }) {
  const router = useRouter();
  const desktop = useIsDesktop({ ssrDefault: false });
  const listHref = `/${lang}/profile?tab=posts`;
  const { data, loading, refetch } = useMyManagedPost(contentId);
  const post = data?.myManagedContentDetail ?? null;
  const [boostOpen, setBoostOpen] = useState(false);
  // Once deleted, the page is on its way out: don't refetch a post that's gone
  // or flash "not found" while Back runs.
  const leaving = useRef(false);
  const [left, setLeft] = useState(false);

  const actions = useManagedPostActions({
    desktop,
    onRefresh: () => (leaving.current ? undefined : refetch()),
    onDeleted: () => {
      leaving.current = true;
      setLeft(true);
      goBackOr(router, listHref);
    },
  });

  if (left || (loading && !post)) {
    return (
      <Shell lang={lang} listHref={listHref}>
        <PageSkeleton />
      </Shell>
    );
  }

  if (!post) {
    return (
      <Shell lang={lang} listHref={listHref}>
        <div className="flex flex-col items-center px-6 py-20 text-center">
          <p className="text-[16px] font-semibold text-main">This post isn&apos;t here any more</p>
          <p className="mt-1.5 max-w-xs text-[14px] text-muted">
            It may have been deleted, or it belongs to another account.
          </p>
          <Link
            href={listHref}
            className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-white"
          >
            Back to my posts
          </Link>
        </div>
      </Shell>
    );
  }

  const live = isLivePost(post);
  const hidden = isHidden(post);
  const boosted = runningBoost(post);
  // Boosting hidden until launch — see features/billing/flags.ts.
  const canBoost = BOOSTS_FOR_SALE && live;
  const busy = actions.busy;

  return (
    <Shell
      lang={lang}
      listHref={listHref}
      post={post}
      headerActions={
        <>
          {live && (
            <button
              type="button"
              onClick={() => void sharePostLink(lang, post)}
              aria-label="Share link"
              className="flex size-10 items-center justify-center rounded-full text-main transition-colors active:bg-surface"
            >
              <Share2 className="size-[19px]" />
            </button>
          )}
          <MoreMenu
            iconOnly
            disabled={busy}
            actions={postMenuActions({
              lang,
              post,
              onNavigate: (href) => router.push(href),
              onDelete: () => actions.requestDelete(post),
            })}
          />
        </>
      }
    >
      <div className="mx-auto w-full max-w-2xl pb-[calc(env(safe-area-inset-bottom)+5rem)] md:px-6 md:pb-12 md:pt-6">
        <ManagedPostDetail
          post={post}
          layout="page"
          onEdit={() => actions.openEdit(post)}
          onBoost={() => setBoostOpen(true)}
          // Desktop keeps its buttons inline; a phone gets the bar below.
          actions={
            <div className="hidden flex-wrap items-center gap-2 md:flex">
              <ActionButton primary icon={Pencil} onClick={() => actions.openEdit(post)} disabled={busy}>
                Edit details
              </ActionButton>
              <ActionButton icon={hidden ? Eye : EyeOff} onClick={() => actions.toggleHidden(post)} disabled={busy}>
                {hidden ? "Show in store" : "Hide"}
              </ActionButton>
              {canBoost && (
                <ActionButton icon={Zap} onClick={() => setBoostOpen(true)} disabled={busy}>
                  {boosted ? "Boosted" : "Boost"}
                </ActionButton>
              )}
            </div>
          }
        />
      </div>

      {/* The phone's action bar: the main action wide, the others beside it. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-default px-4 pt-2 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)", backgroundColor: BAR_BACKGROUND }}
      >
        <div className={cn("grid gap-2", canBoost ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]")}>
          <BarButton primary icon={Pencil} onClick={() => actions.openEdit(post)} disabled={busy}>
            Edit
          </BarButton>
          <BarButton icon={hidden ? Eye : EyeOff} onClick={() => actions.toggleHidden(post)} disabled={busy}>
            {hidden ? "Show" : "Hide"}
          </BarButton>
          {canBoost && (
            <BarButton icon={Zap} onClick={() => setBoostOpen(true)} disabled={busy} accent={Boolean(boosted)}>
              {boosted ? "Boosted" : "Boost"}
            </BarButton>
          )}
        </div>
      </div>

      {actions.surfaces}
      <BoostSheet
        post={{ id: post.id, title: post.title, thumbnail: postThumb(post) }}
        open={boostOpen}
        desktop={desktop}
        onClose={() => setBoostOpen(false)}
      />
    </Shell>
  );
}

function Shell({
  listHref,
  post,
  headerActions,
  children,
}: {
  lang: string;
  listHref: string;
  post?: ManagedPost;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-app">
      <header
        className="sticky top-0 z-30 border-b border-default backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)", backgroundColor: BAR_BACKGROUND }}
      >
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-1 px-2 md:px-4">
          <BackLink
            href={listHref}
            aria-label="Back to my posts"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-main transition-colors active:bg-surface"
          >
            <ChevronLeft size={26} strokeWidth={2.2} aria-hidden />
          </BackLink>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight text-main">Your listing</p>
            {post?.listingNumber && (
              <p className="truncate font-mono text-[11.5px] leading-tight text-muted">{post.listingNumber}</p>
            )}
          </div>
          {headerActions}
        </div>
      </header>
      {children}
    </div>
  );
}

function BarButton({
  icon: Icon,
  primary,
  accent,
  onClick,
  disabled,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  primary?: boolean;
  /** A boost is running: tint it so it reads as "on". */
  accent?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-10 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold transition-opacity active:opacity-75 disabled:opacity-50",
        primary
          ? "bg-primary px-4 text-white"
          : accent
            ? "bg-primary-soft px-3.5 text-primary"
            : "border border-default bg-app px-3.5 text-main",
      )}
    >
      <Icon className={cn("size-4 shrink-0", accent && "fill-current")} />
      {children}
    </button>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl md:px-6 md:pt-6" aria-busy="true" aria-label="Loading post">
      <Skeleton className="aspect-4/5 max-h-[60svh] w-full rounded-none md:aspect-4/3 md:rounded-2xl" />
      <div className="space-y-3 px-4 pt-4 md:px-0">
        <Skeleton className="h-5 w-24 rounded-md" />
        <Skeleton className="h-6 w-3/4 rounded-md" />
        <Skeleton className="h-7 w-32 rounded-md" />
        <Skeleton className="mt-4 h-16 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}
