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
