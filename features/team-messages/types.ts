/** Label members see for every message sent by an admin. */
export const TEAM_DISPLAY_NAME = "Shopi team";
export const TEAM_THREAD_PATH = "/notifications/shopi-team";

export interface MyTeamThread {
  displayName: string;
  unreadCount: number;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
}

export interface TeamMessage {
  id: string;
  sender: "TEAM" | "MEMBER";
  subject?: string | null;
  body: string;
  mediaAssetId?: string | null;
  mediaAsset?: {
    type: 'IMAGE' | 'GENERATED_IMAGE' | 'VIDEO';
    thumbnailUrl?: string | null;
    r2Variants?: { url: string; variant: string; width: number; height: number }[];
    muxMeta?: { playbackId?: string | null; thumbnailUrl?: string | null } | null;
  } | null;
  readAt?: string | null;
  createdAt: string;
  /** Client-only send state for messages rendered before the server responds. */
  pendingStatus?: "sending" | "failed" | null;
}

export interface TeamMessagePage {
  items: TeamMessage[];
  hasMore: boolean;
  nextCursor?: string | null;
}
