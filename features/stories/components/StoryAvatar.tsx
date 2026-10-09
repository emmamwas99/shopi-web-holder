"use client";

import { useState } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";
import { avatarGradient } from "@/lib/avatar";
import { ringSegments, SEEN_RING_COLOR, UNSEEN_RING_COLOR } from "../lib/storyRing";

/**
 * - stories:    WhatsApp-style ring, one arc per story (see `seen`) — pink
 *               for a story not yet watched, grey once it has been
 * - none:       no ring — no story (e.g. "Your story" before posting)
 * - uploading:  ring fills as the file uploads
 * - processing: spinning arc while the server finishes it
 */
export type StoryRingState = "stories" | "none" | "uploading" | "processing";

const STROKE = 2.5;
const GAP = 3;
/** Space between two story arcs, along the ring (px). */
const SEGMENT_GAP = 4;

interface Props {
  /** Used for the fallback gradient when there's no photo. */
  id: string;
  /** What fills the circle — in the tray, a still of the story itself. */
  src?: string | null;
  /** Tried when `src` is missing or fails to load — the person's own photo. */
  fallbackSrc?: string | null;
  name: string;
  /** Outer diameter in px, ring included. Seen and unseen are the same size. */
  size: number;
  state: StoryRingState;
  /** With `stories`: one flag per story, oldest first — has it been watched? */
  seen?: readonly boolean[];
  /** 0–1, while uploading. */
  progress?: number;
  /**
   * With no photo: the first letter on the person's colour, or — for the
   * viewer's own "Your story" slot, which may be a guest with no id — a plain
   * person icon.
   */
  fallback?: "initial" | "person";
}

export function StoryAvatar({
  id,
  src,
  fallbackSrc,
  name,
  size,
  state,
  seen = [],
  progress = 0,
  fallback = "initial",
}: Props) {
  const center = size / 2;
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const inner = size - 2 * (STROKE + GAP);
  const brand = UNSEEN_RING_COLOR;
  // A dead URL (an expired social-login avatar, a story whose media was just
  // removed) falls through to the next candidate instead of showing a broken
  // image in the tray.
  const [failed, setFailed] = useState<readonly string[]>([]);
  const photo = [src, fallbackSrc].find(
    (candidate): candidate is string => !!candidate && !failed.includes(candidate),
  );

  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }}>
      {(state === "stories" || state === "uploading") && (
        <svg
          className="absolute inset-0"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
        >
          {state === "stories" &&
            ringSegments(seen.length, circumference, SEGMENT_GAP).map(({ arc, rotation }, i) => (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seen[i] ? SEEN_RING_COLOR : brand}
                strokeWidth={STROKE}
                strokeDasharray={`${arc} ${circumference}`}
                transform={`rotate(${rotation} ${center} ${center})`}
              />
            ))}
          {state === "uploading" && (
            <>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="rgb(var(--brand-primary) / 0.18)"
                strokeWidth={STROKE}
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={brand}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - Math.min(Math.max(progress, 0.02), 1))}
                transform={`rotate(-90 ${center} ${center})`}
                style={{ transition: "stroke-dashoffset 200ms linear" }}
              />
            </>
          )}
        </svg>
      )}

      {state === "processing" && (
        <InterlockingBalls
          size={Math.max(14, Math.round(size * 0.4))}
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        />
      )}

      <span
        className="absolute overflow-hidden rounded-full bg-surface"
        style={{ inset: STROKE + GAP }}
      >
        {photo ? (
          <Image
            key={photo}
            src={photo}
            alt=""
            fill
            sizes={`${Math.ceil(inner)}px`}
            className="object-cover"
            onError={() => setFailed((list) => [...list, photo])}
            // Local previews of a story being posted can't go through the optimizer.
            unoptimized={photo.startsWith("blob:")}
          />
        ) : fallback === "person" ? (
          <span className="flex h-full w-full items-center justify-center text-muted" aria-hidden>
            <UserRound size={inner * 0.5} strokeWidth={1.75} />
          </span>
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center bg-linear-to-br ${avatarGradient(id)} font-bold text-white`}
            style={{ fontSize: inner * 0.36 }}
            aria-hidden
          >
            {name.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
      </span>
    </span>
  );
}
