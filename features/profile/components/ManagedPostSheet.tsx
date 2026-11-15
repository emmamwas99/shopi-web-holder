"use client";

import {
  useCallback,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Share2,
  Store,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBackDismiss } from "@/hooks/useBackDismiss";
import { contentPath } from "@/lib/content-url";
import { timeAgoLong } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BoostSheet } from "@/features/billing/components/BoostSheet";
import { BOOSTS_FOR_SALE } from "@/features/billing/flags";
import type { ManagedPost } from "../hooks/useManagedPosts";
import { isHidden, postThumb } from "../lib/managedPost";
import { DetailSheet } from "./DetailSheet";
import {
  ManagedPostDetail,
  isLivePost,
  runningBoost,
} from "./ManagedPostDetail";

/** Share the post's public link, or copy it where the share sheet isn't available. */
export async function sharePostLink(
  lang: string,
  post: ManagedPost,
): Promise<void> {
  const url = `${window.location.origin}${contentPath(lang, post)}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: post.title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    toast.error("Couldn't share the link");
  }
}

/** The More menu's entries for a post: share and view while live, then delete. */
export function postMenuActions({
  lang,
  post,
  onNavigate,
  onDelete,
}: {
  lang: string;
  post: ManagedPost;
  onNavigate: (href: string) => void;
  onDelete: () => void;
}): MenuAction[] {
  return [
    ...(isLivePost(post)
      ? [
          {
            key: "share",
            label: "Share link",
            icon: Share2,
            onSelect: () => void sharePostLink(lang, post),
          },
          {
            key: "store",
            label: "View as a buyer",
            icon: Store,
            navigate: true,
            onSelect: () => onNavigate(contentPath(lang, post)),
          },
        ]
      : []),
    {
      key: "delete",
      label: "Delete post",
      icon: Trash2,
      onSelect: onDelete,
      danger: true,
    },
  ];
}

/**
 * Desktop: one of the seller's posts in a side panel over the grid. (On a
 * phone a post is its own page — ManagedPostPage.) Back closes it
 * (useBackDismiss); Edit, Delete, Boost and the More menu open over it, so
 * Back from those comes back here first.
 */
export function ManagedPostSheet({
  post,
  lang,
  desktop,
  busy,
  onClose,
  onEdit,
  onToggleHidden,
  onDelete,
}: {
  /** The post to show, fresh from the list; null when closed. */
  post: ManagedPost | null;
  lang: string;
  desktop: boolean | null;
  busy: boolean;
  onClose: () => void;
  onEdit: (post: ManagedPost) => void;
  onToggleHidden: (post: ManagedPost) => void;
  onDelete: (post: ManagedPost) => void;
}) {
  const router = useRouter();
  const open = Boolean(post);
  const [menuPortalContainer, setMenuPortalContainer] =
    useState<HTMLDivElement | null>(null);
  // Which post the boost sheet was opened for, so it never reopens on another post.
  const [boostFor, setBoostFor] = useState<string | null>(null);
  const boostOpen = Boolean(post && boostFor === post.id);
  // Keep showing the last post while the sheet animates closed.
  const [shown, setShown] = useState(post);
  if (post && post !== shown) setShown(post);

  const { requestClose, release } = useBackDismiss(open, onClose);

  if (!shown) return null;

  const live = isLivePost(shown);
  const hidden = isHidden(shown);
  const boosted = runningBoost(shown);

  // Leaving from inside the sheet: hand its history entry to the new page, so
  // Back from there comes to the list, not to an empty sheet step.
  function go(href: string) {
    const replace = release();
    onClose();
    if (replace) router.replace(href);
    else router.push(href);
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <ActionButton
        primary
        icon={Pencil}
        onClick={() => onEdit(shown)}
        disabled={busy}
      >
        Edit
      </ActionButton>
      <ActionButton
        icon={hidden ? Eye : EyeOff}
        onClick={() => onToggleHidden(shown)}
        disabled={busy}
      >
        {hidden ? "Show in store" : "Hide"}
      </ActionButton>
      {BOOSTS_FOR_SALE && live && (
        <ActionButton
          icon={Zap}
          onClick={() => setBoostFor(shown.id)}
          disabled={busy}
        >
          {boosted ? "Boosted" : "Boost"}
        </ActionButton>
      )}
      <MoreMenu
        actions={postMenuActions({
          lang,
          post: shown,
          onNavigate: go,
          onDelete: () => onDelete(shown),
        })}
        disabled={busy}
        container={menuPortalContainer}
      />
    </div>
  );

  return (
    <>
      <DetailSheet
        open={open}
        desktop={desktop}
        title={shown.title || "Untitled post"}
        subtitle={[
          shown.listingNumber,
          `posted ${timeAgoLong(shown.createdAt)}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        contentRef={setMenuPortalContainer}
        onRequestClose={requestClose}
      >
        <ManagedPostDetail
          post={shown}
          layout="panel"
          actions={actions}
          onEdit={() => onEdit(shown)}
          onBoost={() => setBoostFor(shown.id)}
        />
      </DetailSheet>
      <BoostSheet
        post={{ id: shown.id, title: shown.title, thumbnail: postThumb(shown) }}
        open={boostOpen}
        desktop={desktop}
        onClose={() => setBoostFor(null)}
      />
    </>
  );
}

type IconType = ComponentType<{ className?: string; size?: number }>;

export type MenuAction = {
  key: string;
  label: string;
  icon: IconType;
  onSelect: () => void;
  navigate?: boolean;
  danger?: boolean;
};

/** The admin's button: rounded-[8px], 36px, filled for the main action, outlined otherwise. */
export function ActionButton({
  icon: Icon,
  primary,
  onClick,
  disabled,
  compact,
  title,
  children,
}: {
  icon: IconType;
  primary?: boolean;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-opacity active:opacity-70 disabled:pointer-events-none disabled:opacity-50",
        compact && "w-full min-w-0 gap-1 px-1.5 text-xs",
        primary
          ? "bg-primary text-white"
          : "border border-default bg-app text-main",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </button>
  );
}

/**
 * Everything that isn't one of the main actions, behind "More" — as the
 * admin does. Back closes the menu first.
 */
export function MoreMenu({
  actions,
  disabled,
  container,
  compact,
  iconOnly,
}: {
  actions: MenuAction[];
  disabled?: boolean;
  container?: HTMLElement | null;
  compact?: boolean;
  /** A round icon button, for a page header. */
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { release } = useBackDismiss(open, close);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {iconOnly ? (
          <button
            type="button"
            disabled={disabled}
            aria-label="More actions"
            className="flex size-10 items-center justify-center rounded-full text-main transition-colors active:bg-surface disabled:opacity-50"
          >
            <MoreHorizontal className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-default bg-app px-3.5 text-sm font-medium text-main transition-opacity active:opacity-70 disabled:opacity-50",
              compact && "w-full min-w-0 gap-1 px-1.5 text-xs",
            )}
          >
            <MoreHorizontal className="size-4" /> More
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        container={container}
        align="end"
        collisionPadding={16}
        className="z-[90] w-56 rounded-xl border border-default bg-app p-1 shadow-lg"
      >
        {actions.map(
          ({ key, label, icon: Icon, onSelect, navigate, danger }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                // Release this menu's Back entry before the parent sheet
                // releases its entry and navigates away.
                if (navigate) release();
                setOpen(false);
                onSelect();
              }}
              className={cn(
                "flex h-10 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-sm transition-colors active:bg-surface",
                danger ? "text-rose-600 dark:text-rose-400" : "text-main",
              )}
            >
              <Icon
                className={cn("size-4 shrink-0", danger ? "" : "text-muted")}
              />
              {label}
            </button>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
}

export function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-main">{children}</dd>
    </div>
  );
}
