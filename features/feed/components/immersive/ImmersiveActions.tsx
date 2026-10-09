"use client";

import {
  Bookmark,
  Heart,
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  liked: boolean;
  likeCount: number;
  onLike: () => void;
  saved: boolean;
  onSave: () => void;
  commentCount: number;
  onComment: () => void;
  onShare: () => void;
  muted?: boolean;
  onToggleMuted?: () => void;
  /** Vertical column over the video (mobile) or a horizontal row (desktop). */
  orientation: "column" | "row";
  /**
   * Where these sit. `overlay` is on top of the video, so it is always light
   * on dark regardless of theme; `surface` is the desktop rail, which is a
   * normal themed panel and must follow the user's light/dark choice.
   */
  tone: "overlay" | "surface";
}

/**
 * Like / comment / save / share for the immersive viewer.
 *
 * One component for both layouts because the counts and the pressed states
 * have to stay identical between them — the desktop rail and the mobile
 * overlay are the same actions in a different direction, not two features.
 */
export function ImmersiveActions({
  liked,
  likeCount,
  onLike,
  saved,
  onSave,
  commentCount,
  onComment,
  onShare,
  muted,
  onToggleMuted,
  orientation,
  tone,
}: Props) {
  const column = orientation === "column";
  // The mobile column sits over the video on a ~400px-wide screen, where 28px
  // glyphs crowded the frame and pushed the meta block down. The desktop rail
  // has room, so it keeps its size.
  const icon = column ? "h-6 w-6" : "h-7 w-7";

  return (
    <div
      className={cn(
        "pointer-events-auto flex mb-4 items-center",
        column ? "flex-col gap-4" : "flex-row gap-6",
      )}
    >
      {/* <ActionButton
        label={liked ? "Unlike" : "Like"}
        count={likeCount}
        onClick={onLike}
        column={column}
        tone={tone}
      >
        <Heart
          className={cn(icon, liked && "fill-red-500 text-red-500")}
          strokeWidth={liked ? 0 : 2}
        />
      </ActionButton> */}

      <ActionButton
        label="Comments"
        count={commentCount}
        onClick={onComment}
        column={column}
        tone={tone}
      >
        <MessageCircle className={icon} />
      </ActionButton>

      <ActionButton
        label={saved ? "Remove from saved" : "Save"}
        onClick={onSave}
        column={column}
        tone={tone}
      >
        <Bookmark
          className={cn(icon, saved && "fill-current")}
          strokeWidth={saved ? 0 : 2}
        />
      </ActionButton>

      <ActionButton label="Share" onClick={onShare} column={column} tone={tone}>
        <Send className={icon} />
      </ActionButton>

      {onToggleMuted && (
        <ActionButton
          label={muted ? "Unmute video" : "Mute video"}
          onClick={onToggleMuted}
          column={column}
          tone={tone}
        >
          {muted ? <VolumeX className={icon} /> : <Volume2 className={icon} />}
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({
  label,
  count,
  onClick,
  column,
  tone,
  children,
}: {
  label: string;
  count?: number;
  onClick: () => void;
  column: boolean;
  tone: "overlay" | "surface";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={cn(
        "flex items-center gap-1 transition-transform active:scale-90",
        column ? "flex-col" : "flex-row",
        // Over video: white with a shadow so it survives a bright frame.
        // On the rail: ordinary body text, so it reads in either theme.
        tone === "overlay" ? "text-white drop-shadow-lg" : "text-default",
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={cn("font-semibold", column ? "text-[0.7rem]" : "text-xs")}
        >
          {fmtCompact(count)}
        </span>
      )}
    </button>
  );
}
