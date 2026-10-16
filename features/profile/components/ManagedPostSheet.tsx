"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bookmark,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  ImageIcon,
  MessageCircle,
  Pencil,
  Share2,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { MuxVideo } from "@/components/ui/MuxVideo";
import { useBackDismiss } from "@/hooks/useBackDismiss";
import { contentPath } from "@/lib/content-url";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
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
import { StatusPill } from "./ManagedPostRow";

/**
 * Everything about one of the seller's posts, and every action on it, in one
 * sheet — the admin's post panel, for a seller. Opened from the list; Back
 * closes it (useBackDismiss), and Edit and Delete open over it, so Back from
 * those returns here rather than to the list.
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
  // Keep showing the last post while the sheet animates closed.
  const [shown, setShown] = useState(post);
  if (post && post !== shown) setShown(post);

  const { requestClose, release } = useBackDismiss(open, onClose);

  if (!shown) return null;

  const status = postStatus(shown);
  const problem = postProblem(shown);
  const hidden = isHidden(shown);
  const live = shown.status === "ACTIVE" && shown.isLive && !hidden;
  const listingHref = contentPath(lang, shown);

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

  const category = [shown.category?.name, shown.aiClassification?.level2]
    .filter((part, index, parts): part is string => Boolean(part) && parts.indexOf(part) === index)
    .join(" › ");
  const place = [shown.location?.placeName, shown.location?.subregion, shown.location?.county]
    .filter((part, index, parts): part is string => Boolean(part) && parts.indexOf(part) === index)
    .join(", ");

  return (
    <DetailSheet
      open={open}
      desktop={desktop}
      title={shown.title || "Untitled post"}
      subtitle={[shown.listingNumber, `Posted ${shortDate(shown.createdAt)}`]
        .filter(Boolean)
        .join(" · ")}
      onRequestClose={requestClose}
    >
      <div className="flex flex-col gap-5">
        <PostGallery post={shown} />

        <div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p
              className={cn(
                "text-[24px] font-bold leading-tight tracking-tight",
                shown.price.amount > 0 ? "text-main" : "text-muted",
              )}
            >
              {postPriceLabel(shown)}
            </p>
            {shown.price.negotiable && shown.price.amount > 0 && (
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-muted">
                Negotiable
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill label={status.label} tone={status.tone} />
            <span className="min-w-0 truncate text-[13px] text-muted">{status.helper}</span>
          </div>
          {problem && (
            <p className="mt-3 rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-[13px] leading-snug text-rose-700 dark:text-rose-300">
              {problem}
            </p>
          )}
        </div>

        {/* The three things sellers come here to do, one tap each. */}
        <div className="grid grid-cols-3 gap-2">
          <ActionTile icon={Pencil} label="Edit" onClick={() => onEdit(shown)} disabled={busy} />
          <ActionTile
            icon={hidden ? Eye : EyeOff}
            label={hidden ? "Show" : "Hide"}
            onClick={() => onToggleHidden(shown)}
            disabled={busy}
          />
          {live ? (
            <ActionTile icon={Share2} label="Share" onClick={() => void share(shown)} />
          ) : (
            <ActionTile
              icon={BarChart3}
              label="Insights"
              onClick={() => go(`/${lang}/profile/posts/${shown.id}`)}
            />
          )}
        </div>

        <div className="grid grid-cols-4 divide-x divide-border rounded-2xl border border-default py-3">
          <Stat icon={Eye} label="Views" value={shown.stats.views} />
          <Stat icon={Bookmark} label="Saves" value={shown.stats.saves} />
          <Stat icon={Heart} label="Likes" value={shown.stats.likes} />
          <Stat icon={MessageCircle} label="Comments" value={shown.stats.comments} />
        </div>

        <section>
          <h3 className="mb-1 text-[13px] font-semibold text-muted">Details</h3>
          <dl className="divide-y divide-border">
            {shown.listingNumber && (
              <Detail label="Listing no.">
                <span className="font-mono text-[13px]">{shown.listingNumber}</span>
              </Detail>
            )}
            <Detail label="Category">{category || "Not set"}</Detail>
            <Detail label="Location">{place || "Not set"}</Detail>
            <Detail label="Posted">{shortDate(shown.createdAt)}</Detail>
            <Detail label="Last updated">{shortDate(shown.updatedAt)}</Detail>
            <Detail label="Visibility">{hidden ? "Hidden from the store" : "Public"}</Detail>
          </dl>
        </section>

        <div className="overflow-hidden rounded-2xl border border-default">
          {live && (
            <LinkRow icon={Store} label="View on store" onClick={() => go(listingHref)} />
          )}
          <LinkRow
            icon={BarChart3}
            label="Performance insights"
            onClick={() => go(`/${lang}/profile/posts/${shown.id}`)}
            last
          />
        </div>

        {/* Apart from everything else, so a thumb running down the sheet
            can't land on it. */}
        <button
          type="button"
          onClick={() => onDelete(shown)}
          disabled={busy}
          className="mb-1 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/10 text-[15px] font-semibold text-rose-600 transition-opacity active:opacity-70 disabled:opacity-50 dark:text-rose-400"
        >
          <Trash2 size={17} aria-hidden />
          Delete post
        </button>
      </div>
    </DetailSheet>
  );
}

type IconType = ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;

function ActionTile({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface text-[13px] font-semibold text-main transition-opacity active:opacity-70 disabled:opacity-50"
    >
      <Icon size={20} aria-hidden />
      {label}
    </button>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: IconType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1">
      <span className="text-[17px] font-bold tabular-nums text-main">{fmtCompact(value)}</span>
      <span className="flex items-center gap-1 text-[11px] text-muted">
        <Icon size={11} aria-hidden />
        {label}
      </span>
    </div>
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

function LinkRow({
  icon: Icon,
  label,
  onClick,
  last,
}: {
  icon: IconType;
  label: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-13 w-full items-center gap-3 px-4 text-left text-[15px] font-medium text-main transition-colors active:bg-surface",
        !last && "border-b border-default",
      )}
    >
      <Icon size={18} className="shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
    </button>
  );
}

/**
 * The post's media: the video itself, or the photos as a swipeable strip with
 * a counter. Marked data-vaul-no-drag so a sideways swipe through the photos
 * never turns into dragging the sheet.
 */
function PostGallery({ post }: { post: ManagedPost }) {
  const [index, setIndex] = useState(0);
  const playbackId = post.media?.[0]?.muxMeta?.playbackId;

  if (post.type === "VIDEO" && playbackId) {
    return (
      <div className="h-[min(46svh,440px)] overflow-hidden rounded-2xl bg-black">
        <MuxVideo
          muxPlaybackId={playbackId}
          poster={postThumb(post) ?? undefined}
          className="h-full w-full"
          objectFit="contain"
          muted={false}
          playsInline
          controls
        />
      </div>
    );
  }

  const images = postImages(post);
  if (images.length === 0) {
    return (
      <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-2xl bg-surface text-[13px] text-muted">
        <ImageIcon size={24} aria-hidden />
        {post.type === "VIDEO" ? "Video still processing" : "No photos"}
      </div>
    );
  }

  return (
    <div className="relative" data-vaul-no-drag>
      <div
        className="no-scroll-indicator flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
        onScroll={(event) => {
          const el = event.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
        }}
      >
        {images.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="relative h-[min(46svh,440px)] w-full shrink-0 snap-center bg-surface"
          >
            <Image
              src={url}
              alt={i === 0 ? post.title : ""}
              fill
              sizes="(max-width: 768px) 100vw, 460px"
              priority={i === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-white">
          {Math.min(index + 1, images.length)}/{images.length}
        </span>
      )}
    </div>
  );
}
