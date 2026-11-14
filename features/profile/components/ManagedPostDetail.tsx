"use client";

import { useRef, useState, type ComponentType, type ReactNode } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock,
  Copy,
  Expand,
  Eye,
  EyeOff,
  Hash,
  ImageIcon,
  Images,
  MapPin,
  Play,
  Tag,
  Video,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { MuxVideo } from "@/components/ui/MuxVideo";
import { timeAgoLong } from "@/lib/time";
import { cn } from "@/lib/utils";
import { VideoProgressBar } from "@/features/feed/components/VideoProgressBar";
import { shortDay } from "@/features/billing/lib/money";
import type { ManagedPost } from "../hooks/useManagedPosts";
import {
  isHidden,
  postImages,
  postPriceLabel,
  postProblem,
  postStatus,
  postThumb,
  runningBoost,
} from "../lib/managedPost";
import { StatusBadge } from "./ManagedPostRow";

export { runningBoost };

/** Live, public and approved: the only posts buyers can see (and that can be boosted). */
export function isLivePost(post: ManagedPost): boolean {
  return post.status === "ACTIVE" && post.isLive && !isHidden(post);
}

/**
 * One of the seller's posts, laid out like a listing page they own: the media
 * first, then what buyers see (status, title, price), what they can do about
 * it (actions, boost), and the facts underneath.
 *
 * Shared by the post's own page (phones) and the desktop side panel. The
 * caller supplies `actions`, so each surface places its buttons its own way.
 */
export function ManagedPostDetail({
  post,
  layout,
  actions,
  onEdit,
  onBoost,
}: {
  post: ManagedPost;
  /** "page" runs the media edge to edge; "panel" fits a 480px side panel. */
  layout: "page" | "panel";
  actions?: ReactNode;
  onEdit: () => void;
  onBoost: () => void;
}) {
  const status = postStatus(post);
  const problem = postProblem(post);
  const hidden = isHidden(post);
  const live = isLivePost(post);
  const inReview =
    post.status === "PENDING_REVIEW" || post.status === "UNDER_REVIEW" || post.status === "PROCESSING";
  const hasPrice = post.price.amount > 0;

  return (
    <div className={cn("pb-6", layout === "panel" && "space-y-0")}>
      <PostGallery key={post.id} post={post} layout={layout} />

      <div className={cn("space-y-5", layout === "page" ? "px-4 pt-4 md:px-0 md:pt-5" : "pt-4")}>
        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {hidden && post.status !== "ACTIVE" && (
              <StatusBadge tone="outline">
                <EyeOff /> Hidden
              </StatusBadge>
            )}
            <span className="text-[13px] text-muted">{status.helper}</span>
          </div>

          <h1 className="text-[19px] font-semibold leading-snug text-main md:text-xl">
            {post.title || "Untitled post"}
          </h1>

          {hasPrice ? (
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-[24px] font-bold leading-7 tracking-[-0.02em] tabular-nums text-main">
                {postPriceLabel(post)}
              </span>
              {post.price.negotiable && (
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-medium text-muted">
                  Negotiable
                </span>
              )}
            </p>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 text-[15px] font-semibold text-primary active:opacity-70"
            >
              Add a price
              <ChevronRight className="size-4" />
            </button>
          )}
          {!hasPrice && (
            <p className="text-[12.5px] text-muted">
              Listings with a price get more messages. Buyers see “Price on request” for now.
            </p>
          )}
        </section>

        {actions}

        {problem && (
          <section className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-4" />
              {post.status === "FAILED" ? "Upload failed" : "Not approved"}
              {post.approval?.rejectedAt && (
                <span className="font-normal">· {timeAgoLong(post.approval.rejectedAt)}</span>
              )}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-main">“{problem}”</p>
            {post.status !== "FAILED" && (
              <button
                type="button"
                onClick={onEdit}
                className="mt-2.5 text-[13px] font-semibold text-rose-600 active:opacity-70 dark:text-rose-400"
              >
                Fix and send for review
              </button>
            )}
          </section>
        )}
        {inReview && (
          <p className="rounded-2xl bg-surface px-4 py-3 text-[13.5px] leading-relaxed text-muted">
            Shopi checks new posts before they go live. You can still edit it while you wait.
          </p>
        )}

        {live && <BoostCard post={post} onBoost={onBoost} />}
        {!live && runningBoost(post) && (
          <p className="flex items-start gap-2.5 rounded-2xl bg-primary-soft px-4 py-3 text-[13.5px] leading-snug text-main">
            <Zap className="mt-0.5 size-4 shrink-0 text-primary" fill="currentColor" />
            <span>
              Your {runningBoost(post)!.name} boost is still counting down ({runningBoost(post)!.daysLeft} days left), but
              buyers can&apos;t see this post right now.
              {hidden ? " Show it in your store to get the most from your boost." : ""}
            </span>
          </p>
        )}

        {post.caption?.trim() && <Description text={post.caption.trim()} />}

        <Facts post={post} />
      </div>
    </div>
  );
}

// ── Boost ───────────────────────────────────────────────────────────────────

function BoostCard({ post, onBoost }: { post: ManagedPost; onBoost: () => void }) {
  const boosted = runningBoost(post);
  return (
    <button
      type="button"
      onClick={onBoost}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-opacity active:opacity-80",
        boosted ? "bg-primary-soft" : "border border-default bg-app",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Zap className="size-[18px]" fill="currentColor" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-main">
          {boosted
            ? `${boosted.name} boost · ${boosted.daysLeft} day${boosted.daysLeft === 1 ? "" : "s"} left`
            : "Boost this listing"}
        </span>
        <span className="block text-[12.5px] leading-snug text-muted">
          {boosted
            ? `Shown higher in feeds until ${shortDay(boosted.endsAt)}`
            : "Show it to more buyers in For You, Nearby and Explore"}
        </span>
      </span>
      <span className="shrink-0 text-[13px] font-semibold text-primary">{boosted ? "Add time" : "Boost"}</span>
    </button>
  );
}

// ── Description ─────────────────────────────────────────────────────────────

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 260 || text.split("\n").length > 5;
  return (
    <section>
      <h2 className="mb-1.5 text-[15px] font-semibold text-main">Description</h2>
      <p className={cn("whitespace-pre-wrap text-[14.5px] leading-relaxed text-main", long && !expanded && "line-clamp-5")}>
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-[13.5px] font-semibold text-primary active:opacity-70"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </section>
  );
}

// ── Facts ───────────────────────────────────────────────────────────────────

function Facts({ post }: { post: ManagedPost }) {
  const unique = (parts: (string | null | undefined)[]) =>
    parts.filter((part, index, all): part is string => Boolean(part) && all.indexOf(part) === index);
  const category = unique([post.category?.name, post.aiClassification?.level2]).join(" › ");
  const place = unique([post.location?.placeName, post.location?.subregion, post.location?.county]).join(", ");
  const hidden = isHidden(post);
  const photos = post.media.length;

  async function copyListingNumber() {
    if (!post.listingNumber) return;
    try {
      await navigator.clipboard.writeText(post.listingNumber);
      toast.success("Listing number copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <section>
      <h2 className="mb-1.5 text-[15px] font-semibold text-main">Listing details</h2>
      <ul className="divide-y divide-border rounded-2xl border border-default px-3.5">
        <Fact icon={Tag} label="Category" value={category || "Not set"} muted={!category} />
        <Fact icon={MapPin} label="Pickup location" value={place || "Not set"} muted={!place} />
        {post.listingNumber && (
          <Fact
            icon={Hash}
            label="Listing number"
            value={<span className="font-mono text-[13.5px] tracking-wide">{post.listingNumber}</span>}
            action={
              <button
                type="button"
                onClick={() => void copyListingNumber()}
                aria-label="Copy listing number"
                className="flex size-9 items-center justify-center rounded-full text-muted transition-colors active:bg-surface"
              >
                <Copy className="size-4" />
              </button>
            }
          />
        )}
        <Fact
          icon={post.type === "VIDEO" ? Video : Images}
          label="Media"
          value={post.type === "VIDEO" ? "Video" : `${photos} ${photos === 1 ? "photo" : "photos"}`}
        />
        <Fact
          icon={hidden ? EyeOff : Eye}
          label="Visibility"
          value={hidden ? "Hidden — only you can see it" : "Public — anyone can find it"}
        />
        <Fact
          icon={CalendarDays}
          label="Posted"
          value={`${fullDate(post.createdAt)} · ${timeAgoLong(post.createdAt)}`}
        />
        <Fact icon={Clock} label="Last updated" value={timeAgoLong(post.updatedAt)} />
      </ul>
    </section>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  muted,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  muted?: boolean;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
        <Icon className="size-[17px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] leading-4 text-muted">{label}</span>
        <span className={cn("mt-0.5 block text-[14.5px] leading-snug", muted ? "text-muted" : "text-main")}>
          {value}
        </span>
      </span>
      {action}
    </li>
  );
}

function fullDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

// ── Media ───────────────────────────────────────────────────────────────────

/**
 * Photos as a swipeable strip (scroll-snap, so it moves like a native
 * gallery), or the video with its own controls.
 */
function PostGallery({ post, layout }: { post: ManagedPost; layout: "page" | "panel" }) {
  const playbackId = post.media?.[0]?.muxMeta?.playbackId;
  const frame =
    layout === "page"
      ? "-mx-0 md:overflow-hidden md:rounded-2xl"
      : "overflow-hidden rounded-2xl border border-default";

  if (post.type === "VIDEO" && playbackId) {
    return (
      <div className={cn("flex justify-center bg-black", frame)}>
        <div className="relative aspect-9/16 h-[min(62svh,560px)]">
          <PostVideo playbackId={playbackId} poster={postThumb(post) ?? undefined} />
        </div>
      </div>
    );
  }

  const images = postImages(post);
  if (images.length === 0) {
    return (
      <div className={cn("flex aspect-4/3 flex-col items-center justify-center gap-1.5 bg-surface text-sm text-muted", frame)}>
        {post.type === "VIDEO" ? <Play className="size-5" /> : <ImageIcon className="size-5" />}
        {post.type === "VIDEO" ? "Video still processing" : "No photos"}
      </div>
    );
  }

  return <ImageStrip images={images} title={post.title} frame={frame} layout={layout} />;
}

function ImageStrip({
  images,
  title,
  frame,
  layout,
}: {
  images: string[];
  title: string;
  frame: string;
  layout: "page" | "panel";
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(next);
  }

  function go(to: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: to * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className={cn("relative bg-surface", frame)}>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className={cn(
              "relative w-full shrink-0 snap-center",
              layout === "page" ? "aspect-4/5 max-h-[60svh] md:aspect-4/3" : "aspect-4/3",
            )}
          >
            <Image
              src={url}
              alt={i === 0 ? title : `${title} — photo ${i + 1}`}
              fill
              sizes={layout === "page" ? "(max-width: 768px) 100vw, 640px" : "480px"}
              priority={i === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-white backdrop-blur-md">
            {index + 1} / {images.length}
          </span>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Photo ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full bg-white shadow-[0_0_2px_rgba(0,0,0,0.4)] transition-all",
                  i === index ? "w-5" : "w-1.5 opacity-60",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PostVideo({ playbackId, poster }: { playbackId: string; poster?: string }) {
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

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
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
          <span className="flex size-14 items-center justify-center rounded-full bg-black/55 text-white">
            <Play className="ml-0.5 size-6" fill="currentColor" />
          </span>
        )}
      </button>
      <div className="absolute right-2 top-2 z-30 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = !video.muted;
            setMuted(video.muted);
          }}
          className="grid size-9 place-items-center rounded-full bg-black/55 text-white"
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <button
          type="button"
          onClick={() => videoRef.current?.requestFullscreen?.().catch(() => {})}
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
