export interface NotificationActor {
  id: string;
  username?: string | null;
  displayName: string;
  avatar?: string | null;
}

export interface NotificationItem {
  id: string;
  type:
    | "FOLLOW"
    | "SAVE"
    | "POST_LIVE"
    | "POST_REJECTED"
    | "POST_BOOSTED"
    | "NEW_POST"
    | "TEAM_MESSAGE"
    | "REFERRAL"
    | "SHOP_VERIFICATION";
  title: string;
  body: string;
  actorCount: number;
  actors: NotificationActor[];
  isRead: boolean;
  readAt?: string | null;
  actionPath?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  nextCursor?: string | null;
  hasMore: boolean;
  unreadCount: number;
}

export interface NotificationSocketPayload {
  action: "upserted" | "read" | "read_all";
  notification?: NotificationItem;
  unreadCount: number;
}
