"use client";

import { useCallback, useRef, useState, type ComponentType, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Eye,
  EyeOff,
  Expand,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Play,
  Zap,
  Share2,
  Store,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { MuxVideo } from "@/components/ui/MuxVideo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBackDismiss } from "@/hooks/useBackDismiss";
import { contentPath } from "@/lib/content-url";
import { fmtCompact } from "@/lib/format";
import { timeAgoLong } from "@/lib/time";
import { cn } from "@/lib/utils";
import { VideoProgressBar } from "@/features/feed/components/VideoProgressBar";
import type { ManagedPost } from "../hooks/useManagedPosts";
import {
  isHidden,
  postImages,
  postPriceLabel,
  postProblem,
  postStatus,
  postThumb,
  shortDate,
} from "../lib/managedPost";
import { DetailSheet } from "./DetailSheet";
import { StatusBadge } from "./ManagedPostRow";

const SHOW_POST_BOOST_ACTION = process.env.NODE_ENV !== "production";

/**
 * One of the seller's posts and every action on it — the admin's post panel,
 * for a seller: media, status, price, the action bar, then the facts. Back
 * closes it (useBackDismiss); Edit, Delete and the More menu open over it, so
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
  const [menuPortalContainer, setMenuPortalContainer] = useState<HTMLDivElement | null>(null);
  // Keep showing the last post while the sheet animates closed.
  const [shown, setShown] = useState(post);
  if (post && post !== shown) setShown(post);

  const { requestClose, release } = useBackDismiss(open, onClose);

  if (!shown) return null;

  const status = postStatus(shown);
  const problem = postProblem(shown);
  const hidden = isHidden(shown);
  const live = shown.status === "ACTIVE" && shown.isLive && !hidden;
  const inReview =
    shown.status === "PENDING_REVIEW" ||
    shown.status === "UNDER_REVIEW" ||
    shown.status === "PROCESSING";

  // Leaving from inside the sheet: hand its history entry to the new page, so
  // Back from there comes to the list, not to an empty sheet step.
  function go(href: string) {
    const replace = release();
    onClose();
    if (replace) router.replace(href);
    else router.push(href);
  }

  async function share(target: ManagedPost) {
    const url = `${window.location.origin}${contentPath(lang, target)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: target.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Couldn't share the link");
    }
  }

  const unique = (parts: (string | null | undefined)[]) =>
    parts.filter(
      (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index,
    );
  const category = unique([shown.category?.name, shown.aiClassification?.level2]).join(" › ");
  const place = unique([
    shown.location?.placeName,
    shown.location?.subregion,
    shown.location?.county,
  ]).join(", ");

  const menu: MenuAction[] = [
    ...(live
      ? [
          { key: "share", label: "Share link", icon: Share2, onSelect: () => void share(shown) },
          { key: "store", label: "View on store", icon: Store, navigate: true, onSelect: () => go(contentPath(lang, shown)) },
        ]
      : []),
    {
      key: "insights",
      label: "Performance insights",
      icon: BarChart3,
      navigate: true,
      onSelect: () => go(`/${lang}/profile/posts/${shown.id}`),
    },
    { key: "delete", label: "Delete post", icon: Trash2, onSelect: () => onDelete(shown), danger: true },
  ];

  return (
    <DetailSheet
      open={open}
      desktop={desktop}
      title={shown.title || "Untitled post"}
      subtitle={unique([shown.listingNumber, `posted ${timeAgoLong(shown.createdAt)}`]).join(" · ")}
      contentRef={setMenuPortalContainer}
      onRequestClose={requestClose}
    >
      <div className="space-y-5">
        <div className="mx-auto w-full max-w-[13rem]">
          <PostMedia key={shown.id} post={shown} />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {hidden && shown.status !== "ACTIVE" && (
              <StatusBadge tone="outline">
                <EyeOff /> Hidden
              </StatusBadge>
            )}
            <span className="text-xs text-muted">{status.helper}</span>
          </div>

          <div>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                shown.price.amount > 0 ? "text-main" : "text-muted",
              )}
            >
              {shown.price.amount > 0 ? postPriceLabel(shown) : "No price set"}
            </p>
            {shown.price.negotiable && shown.price.amount > 0 && (
              <p className="text-xs text-muted">Negotiable</p>
            )}
          </div>

          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              !desktop &&
                (SHOW_POST_BOOST_ACTION
                  ? "grid grid-cols-4 gap-1.5"
                  : "grid grid-cols-3 gap-1.5"),
            )}
          >
            <ActionButton
              compact={!desktop}
              primary
              icon={Pencil}
              onClick={() => onEdit(shown)}
              disabled={busy}
            >
              {desktop ? "Edit details" : "Edit"}
            </ActionButton>
            <ActionButton
              compact={!desktop}
              icon={hidden ? Eye : EyeOff}
              onClick={() => onToggleHidden(shown)}
              disabled={busy}
            >
              {hidden && desktop ? "Show in store" : hidden ? "Show" : "Hide"}
            </ActionButton>
            {SHOW_POST_BOOST_ACTION && (
              <ActionButton
                compact={!desktop}
                icon={Zap}
                onClick={() => {}}
                disabled
                title="Boosting is not available yet"
              >
                Boost
              </ActionButton>
            )}
            <MoreMenu
              actions={menu}
              disabled={busy}
              container={menuPortalContainer}
              compact={!desktop}
            />
          </div>

          {problem && (
            <section className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                <AlertTriangle className="size-3.5" />
                {shown.status === "FAILED" ? "Upload failed" : "Not approved"}
                {shown.approval?.rejectedAt && (
                  <span className="font-normal">· {timeAgoLong(shown.approval.rejectedAt)}</span>
                )}
              </p>
              <p className="mt-1 text-[13px] text-main">“{problem}”</p>
            </section>
          )}
          {inReview && (
            <p className="rounded-xl bg-subtle px-3 py-2.5 text-[13px] text-muted">
              Shopi checks new posts before they go live. You can still edit it while you
              wait.
            </p>
          )}
        </div>

        <section>
          <p className="mb-1.5 text-xs font-medium text-muted">Performance</p>
          <div className="grid grid-cols-4 divide-x divide-border rounded-xl border border-default py-2.5">
            <Stat label="Views" value={shown.stats.views} />
            <Stat label="Saves" value={shown.stats.saves} />
            <Stat label="Likes" value={shown.stats.likes} />
            <Stat label="Comments" value={shown.stats.comments} />
          </div>
        </section>

        {shown.caption?.trim() && (
          <section>
            <p className="mb-1.5 text-xs font-medium text-muted">Description</p>
            <p className="whitespace-pre-wrap text-sm text-main">{shown.caption.trim()}</p>
          </section>
        )}

        <dl className="divide-y divide-border rounded-xl border border-default px-3">
          {shown.listingNumber && (
            <Detail label="Listing no.">
              <span className="font-mono text-[13px]">{shown.listingNumber}</span>
            </Detail>
          )}
          <Detail label="Category">{category || "—"}</Detail>
          <Detail label="Location">{place || "—"}</Detail>
          <Detail label="Media">
            {shown.type === "VIDEO"
              ? "Video"
              : `${shown.media.length} ${shown.media.length === 1 ? "photo" : "photos"}`}
          </Detail>
          <Detail label="Visibility">{hidden ? "Hidden from your store" : "Public"}</Detail>
          <Detail label="Posted">
            <span title={shortDate(shown.createdAt)}>{timeAgoLong(shown.createdAt)}</span>
          </Detail>
          <Detail label="Last updated">
            <span title={shortDate(shown.updatedAt)}>{timeAgoLong(shown.updatedAt)}</span>
          </Detail>
        </dl>
      </div>
    </DetailSheet>
  );
}

type IconType = ComponentType<{ className?: string; size?: number }>;

type MenuAction = {
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
        "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] px-3.5 text-sm font-medium transition-opacity active:opacity-70 disabled:pointer-events-none disabled:opacity-50",
        compact && "w-full min-w-0 gap-1 px-1.5 text-xs",
        primary ? "bg-primary text-white" : "border border-default bg-app text-main",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </button>
  );
}

/**
 * Everything that isn't one of the two main actions, behind "More" — as the
 * admin does. Back closes the menu first.
 */
export function MoreMenu({
  actions,
  disabled,
  container,
  compact,
}: {
  actions: MenuAction[];
  disabled?: boolean;
  container?: HTMLElement | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { release } = useBackDismiss(open, close);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent
        container={container}
        align="end"
        collisionPadding={16}
        className="z-[90] w-56 rounded-xl border border-default bg-app p-1 shadow-lg"
      >
        {actions.map(({ key, label, icon: Icon, onSelect, navigate, danger }) => (
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
            <Icon className={cn("size-4 shrink-0", danger ? "" : "text-muted")} />
            {label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center px-1">
      <span className="text-[15px] font-semibold tabular-nums text-main">{fmtCompact(value)}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-main">{children}</dd>
    </div>
  );
}

/**
 * The post's media, the admin's gallery: one item at a time in a bordered
 * square, "1 of N" under it, and a strip to switch photos.
 */
function PostMedia({ post }: { post: ManagedPost }) {
  const [index, setIndex] = useState(0);
  const playbackId = post.media?.[0]?.muxMeta?.playbackId;

  if (post.type === "VIDEO" && playbackId) {
    return (
      <div className="space-y-2">
        <PostVideoPreview playbackId={playbackId} poster={postThumb(post) ?? undefined} />
      </div>
    );
  }

  const images = postImages(post);
  if (images.length === 0) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[8px] border border-default bg-surface text-center text-sm text-muted">
        <ImageIcon className="size-5" />
        {post.type === "VIDEO" ? "Video still processing" : "No photos"}
      </div>
    );
  }

  const current = Math.min(index, images.length - 1);
  return (
    <div className="space-y-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-[8px] border border-default bg-surface">
        <Image
          key={images[current]}
          src={images[current]}
          alt={post.title}
          fill
          sizes="208px"
          priority
          className="object-cover"
        />
      </div>
      <p className="text-xs tabular-nums text-muted">
        {current + 1} of {images.length}
      </p>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-1.5">
          {images.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              className={cn(
                "relative aspect-square overflow-hidden rounded-[6px] border-2",
                i === current ? "border-primary" : "border-transparent opacity-70",
              )}
            >
              <Image src={url} alt="" fill sizes="40px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PostVideoPreview({
  playbackId,
  poster,
}: {
  playbackId: string;
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [metadataReady, setMetadataReady] = useState(false);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const toggleMuted = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const fullscreen = videoRef.current?.requestFullscreen?.();
    fullscreen?.catch(() => {});
  };

  return (
    <div className="relative aspect-9/16 w-full overflow-hidden rounded-[8px] border border-default bg-black">
      <MuxVideo
        muxPlaybackId={playbackId}
        poster={poster}
        className="h-full w-full"
        objectFit="contain"
        muted={muted}
        playsInline
        controls={false}
        videoRef={videoRef}
        onLoadedMetadata={() => setMetadataReady(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onVolumeChange={() => setMuted(videoRef.current?.muted ?? false)}
      />

      <button
        type="button"
        onClick={togglePlayback}
        className="absolute inset-0 z-10 flex items-center justify-center"
        aria-label={playing ? "Pause video" : "Play video"}
      >
        {!playing && (
          <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-white">
            <Play className="ml-0.5 size-5" fill="currentColor" />
          </span>
        )}
      </button>

      <div className="absolute right-2 top-2 z-30 flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleMuted}
          className="grid size-9 place-items-center rounded-full bg-black/55 text-white"
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="grid size-9 place-items-center rounded-full bg-black/55 text-white"
          aria-label="View video full screen"
        >
          <Expand size={17} />
        </button>
      </div>

      {metadataReady && (
        <VideoProgressBar
          videoRef={videoRef}
          active={playing}
          showTime
          timeClassName="translate-y-3"
          className="z-40 px-2"
        />
      )}
    </div>
  );
}
