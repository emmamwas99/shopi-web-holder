"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { CircleAlert, ImageIcon, Play, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sellerMessage } from "@/features/create/hooks/useMediaUpload";
import { shouldUnoptimizeMedia } from "@/features/create/utils/mediaPreview";
import type { ManagedPost, ManagedPostType } from "../hooks/useManagedPosts";
import { usePostMediaUpload } from "../hooks/usePostMediaUpload";

/** The API's cap, and the create flow's (MediaPicker MAX_IMAGES). */
const MAX_PHOTOS = 10;

const VIDEO_EXTENSION = /\.(mp4|mov|m4v|webm|3gp|mkv|avi)$/i;
const PHOTO_EXTENSION = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;

/** One tile in the editor: media the post already has, or a new upload. */
export type EditMediaItem = {
  key: string;
  type: ManagedPostType;
  /** What the tile shows: the stored still, or the picked file's blob URL. */
  preview: string | null;
  /** Kept media: its index in the post's current `media` array. */
  keepIndex?: number;
  /** New media: the picked file, kept so a failed upload can be retried. */
  file?: File;
  status?: "uploading" | "uploaded" | "error";
  progress?: number;
  mediaAssetId?: string;
  error?: string;
};

type Media = ManagedPost["media"][number];

function storedPreview(media: Media): string | null {
  if (media.mediaType === "VIDEO") {
    const playbackId = media.muxMeta?.playbackId;
    return (
      media.muxMeta?.thumbnailUrl ??
      media.thumbnailUrl ??
      (playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0&width=240` : null)
    );
  }
  return (
    media.r2Variants?.find((v) => v.variant === "medium")?.url ??
    media.r2Variants?.find((v) => v.variant === "large")?.url ??
    media.url ??
    media.thumbnailUrl ??
    null
  );
}

/** The post's media as the editor opens with it, in display order. */
export function editMediaFromPost(post: ManagedPost): EditMediaItem[] {
  return post.media
    .map((media, index) => ({ media, index }))
    .sort((a, b) => a.media.sortOrder - b.media.sortOrder)
    .map(({ media, index }) => ({
      key: `kept-${index}`,
      type: media.mediaType,
      preview: storedPreview(media),
      keepIndex: index,
    }));
}

/** Whether the seller added, removed or reordered anything. */
export function editMediaChanged(items: EditMediaItem[], post: ManagedPost): boolean {
  const initial = editMediaFromPost(post);
  return (
    items.length !== initial.length ||
    items.some(
      (item, index) => item.keepIndex === undefined || item.keepIndex !== initial[index].keepIndex,
    )
  );
}

/** Why the media can't be saved yet, or null. */
export function editMediaProblem(items: EditMediaItem[]): string | null {
  if (items.length === 0) return "Add at least one photo or a video.";
  if (items.some((item) => item.status === "error")) {
    return "Something didn't upload. Retry it or remove it.";
  }
  if (items.some((item) => item.status === "uploading")) {
    return "Wait for your uploads to finish, then save.";
  }
  return null;
}

/** What updateOwnedContentMedia takes. */
export function editMediaInput(
  items: EditMediaItem[],
): Array<{ keepIndex: number } | { mediaAssetId: string }> {
  return items.map((item) =>
    item.mediaAssetId ? { mediaAssetId: item.mediaAssetId } : { keepIndex: item.keepIndex! },
  );
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || (!file.type && VIDEO_EXTENSION.test(file.name));
}

function isPhotoFile(file: File) {
  return file.type.startsWith("image/") || (!file.type && PHOTO_EXTENSION.test(file.name));
}

type PendingReplace = { fresh: EditMediaItem[]; title: string; description: string };

/**
 * The photos or video on a post being edited. One picker takes either: photos
 * add to the gallery (up to ten), a video replaces everything, since a post
 * holds photos or one video. Each new file uploads as soon as it's picked, and
 * nothing changes on the post until the edit is saved.
 */
export function EditPostMedia({
  items,
  onChange,
  locked,
  reviewNote,
}: {
  items: EditMediaItem[];
  onChange: (update: (items: EditMediaItem[]) => EditMediaItem[]) => void;
  /** The post's media is still processing; the API refuses changes until then. */
  locked: boolean;
  /** New media on a live post sends it back to review — say so. */
  reviewNote: boolean;
}) {
  const upload = usePostMediaUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const blobUrls = useRef<string[]>([]);
  const [pending, setPending] = useState<PendingReplace | null>(null);

  useEffect(() => {
    const urls = blobUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const holdsVideo = items.some((item) => item.type === "VIDEO");
  const holdsPhotos = items.some((item) => item.type === "IMAGE");

  const patch = (key: string, next: Partial<EditMediaItem>) =>
    onChange((current) => current.map((item) => (item.key === key ? { ...item, ...next } : item)));

  const start = (item: EditMediaItem) => {
    const kind = item.type === "VIDEO" ? "video" : "image";
    upload(item.file!, kind, (progress) => patch(item.key, { progress }))
      .then((mediaAssetId) => patch(item.key, { status: "uploaded", progress: 1, mediaAssetId }))
      .catch((error) => {
        const message = sellerMessage(error, kind);
        patch(item.key, { status: "error", error: message });
        // One toast however many files fail together (offline, say).
        toast.error(message, { id: "edit-post-media-upload" });
      });
  };

  const newItem = (file: File, type: ManagedPostType): EditMediaItem => {
    const preview = URL.createObjectURL(file);
    blobUrls.current.push(preview);
    return {
      key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      preview,
      file,
      status: "uploading",
      progress: 0,
    };
  };

  const add = (fresh: EditMediaItem[], replace: boolean) => {
    onChange((current) => (replace ? fresh : [...current, ...fresh]));
    fresh.forEach(start);
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    // Picking the same file again after removing it must still fire.
    event.target.value = "";
    if (files.length === 0) return;

    const photos = files.filter(isPhotoFile);
    const videos = files.filter(isVideoFile);

    if (photos.length > 0) {
      if (videos.length > 0) toast("A post holds photos or one video, so we added the photos.");
      const room = holdsVideo ? MAX_PHOTOS : MAX_PHOTOS - items.length;
      if (room <= 0) {
        toast.error(`A post holds up to ${MAX_PHOTOS} photos. Remove one to add another.`);
        return;
      }
      if (photos.length > room) {
        toast(`A post holds up to ${MAX_PHOTOS} photos, so we added the first ${room}.`);
      }
      const fresh = photos.slice(0, room).map((file) => newItem(file, "IMAGE"));
      if (holdsVideo) {
        setPending({
          fresh,
          title: fresh.length === 1 ? "Replace the video with this photo?" : "Replace the video with these photos?",
          description: "A post holds photos or one video. The video is removed when you save.",
        });
      } else {
        add(fresh, false);
      }
      return;
    }

    if (videos.length > 0) {
      if (videos.length > 1) toast("A post holds one video, so we added the first one.");
      const fresh = [newItem(videos[0], "VIDEO")];
      if (holdsPhotos) {
        setPending({
          fresh,
          title: "Replace your photos with this video?",
          description: "A post holds photos or one video. The photos are removed when you save.",
        });
      } else {
        add(fresh, true);
      }
      return;
    }

    toast.error("Choose a photo or a video.");
  };

  const canAdd = !locked && (holdsVideo || items.length < MAX_PHOTOS);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold text-main">
          {holdsVideo ? "Video" : holdsPhotos ? "Photos" : "Photos or video"}
        </span>
        {!holdsVideo && (
          <span className="shrink-0 text-[12px] tabular-nums text-muted">
            {items.length}/{MAX_PHOTOS}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {items.map((item, index) => (
          <MediaTile
            key={item.key}
            item={item}
            cover={index === 0 && holdsPhotos && items.length > 1}
            locked={locked}
            onRemove={() => onChange((current) => current.filter((m) => m.key !== item.key))}
            onRetry={() => {
              const retry = { ...item, status: "uploading" as const, progress: 0, error: undefined };
              patch(item.key, retry);
              start(retry);
            }}
          />
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[8px] border-2 border-dashed border-default bg-subtle text-muted transition-opacity active:opacity-70"
          >
            {holdsVideo ? <RefreshCw className="size-5" /> : <Plus className="size-5" />}
            <span className="text-[12px] font-medium">{holdsVideo ? "Replace" : "Add"}</span>
          </button>
        )}
      </div>

      <p className="text-[12px] leading-relaxed text-muted">
        {locked
          ? "This post's media is still being prepared. You can change it once it's ready."
          : holdsVideo
            ? "One video, or up to 10 photos in its place."
            : "Up to 10 photos, or one video. The first photo is the cover."}
      </p>
      {reviewNote && (
        <p className="rounded-xl bg-subtle px-3 py-2.5 text-[13px] text-muted">
          Shopi checks new photos and videos before buyers see them, so this post is hidden
          until then.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={onPick}
      />

      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent
          className="z-[95] w-[min(88vw,340px)] rounded-3xl border-default bg-app"
          overlayClassName="z-[90]"
        >
          <DialogHeader>
            <DialogTitle>{pending?.title}</DialogTitle>
            <DialogDescription>{pending?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="h-10 rounded-full border border-border px-4 text-[14px] font-semibold text-main"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (pending) add(pending.fresh, true);
                setPending(null);
              }}
              className="h-10 rounded-full bg-primary px-4 text-[14px] font-semibold text-white"
            >
              Replace
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaTile({
  item,
  cover,
  locked,
  onRemove,
  onRetry,
}: {
  item: EditMediaItem;
  cover: boolean;
  locked: boolean;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const percent = Math.round((item.progress ?? 0) * 100);
  const noun = item.type === "VIDEO" ? "video" : "photo";

  return (
    <div className="relative aspect-square overflow-hidden rounded-[8px] border border-default bg-surface">
      {!item.preview ? (
        <span className="absolute inset-0 flex items-center justify-center text-muted">
          <ImageIcon className="size-5" aria-hidden />
        </span>
      ) : item.type === "VIDEO" && item.file ? (
        // A picked video has no still yet; its first frame stands in. The
        // fragment makes iOS Safari paint that frame.
        <video
          src={`${item.preview}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <Image
          src={item.preview}
          alt=""
          fill
          sizes="(min-width: 640px) 120px, 25vw"
          unoptimized={shouldUnoptimizeMedia(item.preview)}
          className="object-cover"
        />
      )}

      {item.type === "VIDEO" && item.status !== "error" && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex size-8 items-center justify-center rounded-full bg-black/55 text-white">
            <Play className="ml-0.5 size-3.5" fill="currentColor" strokeWidth={0} />
          </span>
        </span>
      )}

      {cover && item.status !== "uploading" && (
        <span className="absolute bottom-1 left-1 rounded-[4px] bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          Cover
        </span>
      )}

      {item.status === "uploading" && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-5"
          role="progressbar"
          aria-label={`Uploading ${noun}`}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-300"
              style={{ width: `${Math.max(4, percent)}%` }}
            />
          </div>
        </div>
      )}

      {item.status === "error" && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 px-1 text-center"
        >
          <CircleAlert className="size-4 text-white" aria-hidden />
          <span className="sr-only">{item.error ?? `Your ${noun} didn't upload.`}</span>
          {item.file && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-black active:opacity-80"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {!locked && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${noun}`}
          className="absolute right-1 top-1 flex size-[22px] items-center justify-center rounded-full bg-black/60 text-white active:opacity-70"
        >
          <X className="size-3" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
