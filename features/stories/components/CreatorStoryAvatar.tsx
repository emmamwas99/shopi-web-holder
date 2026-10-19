"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/stores/auth";
import { useCreatorStoryRing } from "../hooks/useCreatorStoryRing";
import { useStoryActions } from "../hooks/useStoryActions";
import type { TrayRing } from "../hooks/useStoriesFeed";
import { ringSegments, SEEN_RING_COLOR, UNSEEN_RING_COLOR } from "../lib/storyRing";

// Loaded on the first tap, not with every card.
const StoryViewer = dynamic(() => import("./StoryViewer").then((m) => m.StoryViewer), {
  ssr: false,
});

interface Props {
  /** The creator whose stories this avatar opens. */
  userId: string | null | undefined;
  lang: string;
  /** For screen readers: "View {name}'s story". */
  name: string;
  /**
   * - unseen: Facebook/TikTok style, for post cards. A pink ring and the story
   *   only while something is unwatched; after that the avatar goes back to
   *   `onNoStory` (their profile).
   * - any: for the creator's own profile, where "go to profile" would go
   *   nowhere. Any live story shows its ring (pink new, grey watched — one arc
   *   per story, like the tray) and opens.
   */
  mode: "unseen" | "any";
  /** What a tap does when there's no story to open. Omit for no action. */
  onNoStory?: () => void;
  /** How far the ring extends beyond the avatar, in pixels. */
  ringInsetPx: number;
  /** Ring thickness, in hundredths of the ring's width. */
  ringThickness: number;
  className?: string;
  /** The avatar itself, unchanged. */
  children: ReactNode;
}

/**
 * Puts a story ring on an existing avatar and makes a tap on it open that
 * creator's stories — the tap falls through to `onNoStory` otherwise.
 */
export function CreatorStoryAvatar({
  userId,
  lang,
  name,
  mode,
  onNoStory,
  ringInsetPx,
  ringThickness,
  className = "",
  children,
}: Props) {
  const ring = useCreatorStoryRing(userId);
  const viewerId = useAuthStore((s) => s.user?.id ?? null);
  const { markSeen, deleteStory } = useStoryActions();
  // The ring as it was when tapped — it greys out while being watched, and
  // the viewer's sequence must not shift underneath it.
  const [opened, setOpened] = useState<TrayRing | null>(null);

  const active = mode === "unseen" ? (ring?.hasUnseen ? ring : null) : ring;
  const onClick = active ? () => setOpened(active) : onNoStory;

  const content = (
    <>
      {/* Before the avatar in the DOM, so badges on it sit above the ring. */}
      {active && (
        <StoryRingOverlay
          seen={mode === "unseen" ? [false] : active.stories.map((s) => s.seen)}
          thickness={ringThickness}
          insetPx={ringInsetPx}
        />
      )}
      {children}
    </>
  );

  return (
    <>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={active ? `View ${name}'s story` : `${name}'s profile`}
          className={`relative ${className}`}
        >
          {content}
        </button>
      ) : (
        <div className={`relative ${className}`}>{content}</div>
      )}

      {opened && (
        <StoryViewer
          lang={lang}
          rings={[opened]}
          initialRingIndex={0}
          viewerUserId={viewerId}
          onClose={() => setOpened(null)}
          onSeen={markSeen}
          onDelete={deleteStory}
        />
      )}
    </>
  );
}

/** A story ring that scales with its box — one arc per entry in `seen`. */
function StoryRingOverlay({
  seen,
  thickness,
  insetPx,
}: {
  seen: readonly boolean[];
  thickness: number;
  insetPx: number;
}) {
  const radius = 50 - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute"
      style={{
        top: -insetPx,
        left: -insetPx,
        width: `calc(100% + ${insetPx * 2}px)`,
        height: `calc(100% + ${insetPx * 2}px)`,
      }}
      aria-hidden
    >
      {ringSegments(seen.length, circumference, thickness * 1.6).map(({ arc, rotation }, i) => (
        <circle
          key={i}
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke={seen[i] ? SEEN_RING_COLOR : UNSEEN_RING_COLOR}
          strokeWidth={thickness}
          strokeDasharray={`${arc} ${circumference}`}
          transform={`rotate(${rotation} 50 50)`}
        />
      ))}
    </svg>
  );
}
