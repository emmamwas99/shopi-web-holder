"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useApolloClient } from "@apollo/client/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { useStoriesFeed, type TrayRing } from "../hooks/useStoriesFeed";
import { useStoryUploadWatcher } from "../hooks/useStoryUploadWatcher";
import { useStoriesRealtime } from "../hooks/useStoriesRealtime";
import { postStory, useStoryUploadStore } from "../store/storyUpload";
import { storyUserName } from "../lib/storyUser";
import { storyThumbnail } from "../lib/storyMedia";
import { StoryAvatar, type StoryRingState } from "./StoryAvatar";
import { MAX_STORY_IMAGE_BYTES, MAX_STORY_VIDEO_BYTES } from "../constants";

// Only needed once someone taps — keep them out of the feed's first load.
const StoryViewer = dynamic(() => import("./StoryViewer").then((m) => m.StoryViewer), {
  ssr: false,
});
const StoryComposer = dynamic(() => import("./StoryComposer").then((m) => m.StoryComposer), {
  ssr: false,
});

const AVATAR_SIZE = 66;

/** "3 updates, 2 new" — what the segmented ring shows, for screen readers. */
function storyCountLabel(ring: TrayRing): string {
  const total = ring.stories.length;
  const unseen = ring.stories.filter((s) => !s.seen).length;
  const updates = `${total} ${total === 1 ? "update" : "updates"}`;
  return unseen > 0 ? `${updates}, ${unseen} new` : updates;
}

/** A ring's circle shows its newest story, as WhatsApp Status does. */
function latestThumbnail(ring: TrayRing): string | null {
  const latest = ring.stories[ring.stories.length - 1];
  return latest ? storyThumbnail(latest) : null;
}

interface Props {
  lang: string;
  /**
   * mobile:  full-bleed strip at the top of the phone feed
   * desktop: a card at the top of the feed column, with scroll arrows
   */
  variant?: "mobile" | "desktop";
}

// ── Tray item ────────────────────────────────────────────────────────────────

function TrayItem({
  label,
  labelMuted,
  onClick,
  ariaLabel,
  children,
  badge,
}: {
  label: string;
  labelMuted?: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <li className="relative w-18 shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="flex w-full flex-col items-center gap-1.5 rounded-xl outline-none transition-transform duration-150 [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95"
      >
        {children}
        <span
          className={`block w-full truncate text-center text-xs leading-tight ${
            labelMuted ? "text-muted" : "text-default"
          }`}
        >
          {label}
        </span>
      </button>
      {badge}
    </li>
  );
}

function TraySkeleton() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <li key={i} className="flex w-18 shrink-0 flex-col items-center gap-1.5" aria-hidden>
          <span
            className="block animate-pulse rounded-full bg-black/10 dark:bg-white/10"
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
          />
          <span className="block h-3 w-12 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
        </li>
      ))}
    </>
  );
}

// ── StoriesBar ───────────────────────────────────────────────────────────────

export function StoriesBar({ lang, variant = "mobile" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const client = useApolloClient();
  const user = useAuthStore((s) => s.user);
  const { rings, loading, isAuthed, userId, refetch, markSeen, deleteStory } = useStoriesFeed();
  useStoriesRealtime(refetch);
  useStoryUploadWatcher(refetch);

  const uploadPhase = useStoryUploadStore((s) => s.phase);
  const uploadProgress = useStoryUploadStore((s) => s.progress);
  const uploadPreview = useStoryUploadStore((s) => s.previewUrl);

  const fileRef = useRef<HTMLInputElement>(null);
  const [composerFile, setComposerFile] = useState<File | null>(null);
  // The viewer gets a snapshot: the tray re-sorts as rings turn seen, and the
  // sequence being watched must not reshuffle underneath it.
  const [viewer, setViewer] = useState<{ rings: TrayRing[]; index: number } | null>(null);

  const ownRing = rings.find((r) => r.isOwn) ?? null;
  const otherRings = rings.filter((r) => !r.isOwn);

  const pickFile = useCallback(() => {
    if (!isAuthed) {
      router.push(`/${lang}/auth/login?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (useStoryUploadStore.getState().phase !== "idle") {
      toast("Your story is still posting");
      return;
    }
    fileRef.current?.click();
  }, [isAuthed, lang, pathname, router]);

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    if (!isVideo && !file.type.startsWith("image/")) {
      toast.error("Pick a photo or a video");
      return;
    }
    if (file.size > (isVideo ? MAX_STORY_VIDEO_BYTES : MAX_STORY_IMAGE_BYTES)) {
      toast.error(isVideo ? "That video is too large (max 500 MB)" : "That photo is too large (max 25 MB)");
      return;
    }
    setComposerFile(file);
  };

  const openRing = (ring: TrayRing) => {
    if (ring.isOwn) setViewer({ rings: [ring], index: 0 });
    else setViewer({ rings: otherRings, index: otherRings.indexOf(ring) });
  };

  // ── Own item ────────────────────────────────────────────────────────────
  const ownState: StoryRingState =
    uploadPhase === "uploading"
      ? "uploading"
      : uploadPhase === "processing"
        ? "processing"
        : ownRing
          ? "stories"
          : "none";
  const posting = uploadPhase !== "idle";

  const ownItem = (
    <TrayItem
      label={posting ? "Posting…" : isAuthed ? "Your story" : "Add story"}
      labelMuted={!ownRing || posting}
      ariaLabel={ownRing ? `View your story, ${storyCountLabel(ownRing)}` : "Add to your story"}
      onClick={ownRing && !posting ? () => openRing(ownRing) : pickFile}
      badge={
        // With a live story the avatar opens it, so this is the way to add
        // another (Instagram's "+"). Hidden while a post is in flight.
        !posting && (
          <button
            type="button"
            onClick={pickFile}
            aria-label="Add to your story"
            className="absolute left-1/2 top-11.5 ml-3 flex size-5.5 items-center justify-center rounded-full border-2 border-elevated bg-primary text-white"
          >
            <Plus size={13} strokeWidth={3} />
          </button>
        )
      }
    >
      <StoryAvatar
        id={userId ?? "guest"}
        // While posting, the photo or a frame of the video being posted; then
        // your latest story; with none, your own photo.
        src={uploadPreview ?? (ownRing ? latestThumbnail(ownRing) : null)}
        fallbackSrc={user?.profile?.avatar}
        name={user?.profile?.firstName ?? "You"}
        size={AVATAR_SIZE}
        state={ownState}
        seen={ownRing?.stories.map((s) => s.seen)}
        progress={uploadProgress}
        fallback="person"
      />
    </TrayItem>
  );

  // ── Desktop scroll arrows ───────────────────────────────────────────────
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);
  useEffect(() => {
    if (variant !== "desktop") return;
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [variant, updateArrows, rings.length, loading]);
  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const list = (
    <ul
      ref={scrollerRef}
      onScroll={variant === "desktop" ? updateArrows : undefined}
      className="flex list-none gap-2.5 overflow-x-auto scrollbar-none m-0 p-0"
    >
      {loading ? (
        <TraySkeleton />
      ) : (
        <>
          {ownItem}
          {otherRings.map((ring) => {
            const name = storyUserName(ring.user);
            return (
              <TrayItem
                key={ring.user.id}
                label={name}
                ariaLabel={`${name}'s story, ${storyCountLabel(ring)}`}
                onClick={() => openRing(ring)}
              >
                <StoryAvatar
                  id={ring.user.id}
                  src={latestThumbnail(ring)}
                  fallbackSrc={ring.user.profile?.avatar}
                  name={name}
                  size={AVATAR_SIZE}
                  state="stories"
                  seen={ring.stories.map((s) => s.seen)}
                />
              </TrayItem>
            );
          })}
        </>
      )}
    </ul>
  );

  return (
    <>
      {variant === "mobile" ? (
        <section aria-label="Stories" className="border-b border-default bg-elevated px-3 pb-2.5 pt-3 md:rounded-2xl md:border md:px-4">
          {list}
        </section>
      ) : (
        <section
          aria-label="Stories"
          className="group/stories relative mb-4 rounded-2xl border border-border bg-elevated px-4 py-4 shadow-sm shadow-black/3"
        >
          {list}
          {canScroll.left && (
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Scroll stories left"
              className="absolute left-2 top-11.25 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-elevated text-default shadow-md ring-1 ring-black/5 transition-opacity hover:bg-surface"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {canScroll.right && (
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Scroll stories right"
              className="absolute right-2 top-11.25 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-elevated text-default shadow-md ring-1 ring-black/5 transition-opacity hover:bg-surface"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </section>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onFilePicked}
      />

      {viewer && (
        <StoryViewer
          lang={lang}
          rings={viewer.rings}
          initialRingIndex={viewer.index}
          viewerUserId={userId}
          onClose={() => setViewer(null)}
          onSeen={markSeen}
          onDelete={deleteStory}
        />
      )}

      {composerFile && (
        <StoryComposer
          file={composerFile}
          onClose={() => setComposerFile(null)}
          onShare={(caption) => {
            const file = composerFile;
            setComposerFile(null);
            void postStory(client, file, caption);
          }}
        />
      )}
    </>
  );
}
