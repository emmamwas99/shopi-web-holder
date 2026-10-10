/**
 * Mirror of the backend event constants — keep in sync with
 * src/services/websocket/socket-events.ts on the API.
 *
 * Only copy what the client needs; don't import server-only code.
 */

export const WS_EVENTS = {
  MEDIA_READY:    'media:ready',
  MEDIA_FAILED:   'media:failed',
  MEDIA_PROGRESS: 'media:progress',
  NOTIFICATION:   'notification',
  TIKTOK_IMPORT_UPDATED: 'tiktok:import:updated',
  CONTENT_PUBLISH_UPDATED: 'content:publish:updated',
  STORY_READY:  'story:ready',
  STORY_FAILED: 'story:failed',
  /** Someone opened one of your stories for the first time (creator only). */
  STORY_VIEWED: 'story:viewed',
  /** Broadcast to every client's story tray. */
  STORY_PUBLISHED: 'story:published',
  STORY_DELETED: 'story:deleted',
  DM_MESSAGE_CREATED: 'dm:message:created',
  DM_MESSAGE_UPDATED: 'dm:message:updated',
  DM_CONVERSATION_UPDATED: 'dm:conversation:updated',
  DM_CONVERSATION_REMOVED: 'dm:conversation:removed',
  DM_PRESENCE_UPDATED: 'dm:presence:updated',
  DM_TYPING_UPDATED: 'dm:typing:updated',
  AGENT_STREAM_DELTA: 'agent:stream:delta',
  AGENT_STREAM_DONE: 'agent:stream:done',
  TEAM_MESSAGE_CREATED: 'team:message:created',
} as const;

export const WS_CLIENT_EVENTS = {
  WATCH_DRAFT:   'watch:draft',
  UNWATCH_DRAFT: 'unwatch:draft',
  JOIN_CONVERSATION: 'join:conversation',
  LEAVE_CONVERSATION: 'leave:conversation',
  SET_CONVERSATION_VIEWPORT: 'conversation:viewport',
  START_TYPING: 'typing:start',
  STOP_TYPING: 'typing:stop',
} as const;

export interface DirectConversationViewportPayload {
  conversationId: string;
  tabId: string;
  isActive: boolean;
}

export interface MediaReadyPayload {
  mediaAssetId: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  url?: string;
  muxPlaybackId?: string;
  displayWidth?: number;
  displayHeight?: number;
  aspectRatio?: string;
  duration?: number;
}

export interface MediaFailedPayload {
  mediaAssetId: string;
  errorMessage: string;
}

export interface MediaProgressPayload {
  mediaAssetId: string;
  percent: number;
}

export interface StoryReadyPayload {
  storyId: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  muxPlaybackId?: string;
}

export interface StoryFailedPayload {
  storyId: string;
  reason: string;
}

/** Public creator fields — the StoryCreatorFields fragment's shape. */
export interface StoryCreatorPayload {
  id: string;
  username: string | null;
  profile: { firstName: string | null; lastName: string | null; avatar: string | null } | null;
}

/** A published story — the StoryFields fragment's shape, minus per-viewer state. */
export interface StoryPayload {
  id: string;
  caption: string | null;
  expiresAt: string;
  createdAt: string;
  viewCount: number;
  media: {
    mediaType: 'IMAGE' | 'VIDEO';
    imageUrl: string | null;
    thumbnailUrl: string | null;
    muxPlaybackId: string | null;
    muxThumbnailUrl: string | null;
    duration: number | null;
    processingStatus: string;
  };
}

export interface StoryPublishedPayload {
  story: StoryPayload;
  creator: StoryCreatorPayload;
}

export interface StoryDeletedPayload {
  storyId: string;
  creatorId: string;
}

export interface StoryViewedPayload {
  storyId: string;
  viewCount: number;
  viewedAt: string;
  viewer: StoryCreatorPayload;
}

export interface TiktokImportUpdatedPayload {
  downloadId: string;
  status: 'COMPLETED' | 'FAILED' | 'UPLOADING' | 'PROCESSING';
  muxPlaybackId?: string;
  hlsUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  errorMessage?: string;
}

export interface ContentPublishUpdatedPayload {
  contentId: string;
  status: 'LIVE' | 'FAILED';
  muxPlaybackId?: string;
  errorMessage?: string;
}

export interface DirectMessageMediaSnapshot {
  mediaAssetId: string;
  type: 'image' | 'video';
  status: 'pending' | 'uploading' | 'processing' | 'ready' | 'failed' | 'orphaned';
  thumbnailUrl?: string;
  url?: string;
  muxPlaybackId?: string;
  displayWidth?: number;
  displayHeight?: number;
  aspectRatio?: string;
  duration?: number;
  errorMessage?: string;
}

export interface DirectMessageCreatedPayload {
  conversationId: string;
  messageId: string;
  contentId: string;
  senderId: string;
  recipientId: string;
  type: 'text' | 'image' | 'video' | 'location';
  text?: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  media?: DirectMessageMediaSnapshot;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface DirectMessageUpdatedPayload {
  kind: 'delivery' | 'read' | 'media' | 'deleted';
  conversationId: string;
  messageIds: string[];
  deliveredAt?: string;
  readAt?: string;
  media?: DirectMessageMediaSnapshot;
}

export interface DirectConversationUpdatedPayload {
  conversationId: string;
  contentId: string;
  sellerId: string;
  buyerId: string;
  lastMessageId?: string;
  lastMessageText?: string;
  lastMessageType?: 'text' | 'image' | 'video' | 'location';
  lastMessageSenderId?: string;
  lastMessageAt?: string;
  myUnreadCount: number;
  isPinned?: boolean;
  blockedByMe?: boolean;
  blockedByOther?: boolean;
  canSendMessages?: boolean;
  lifecycleStatus?: string;
  sellerFirstResponseMinutes?: number;
  buyerFirstResponseMinutes?: number;
  dealClosedAt?: string;
  dealClosedByUserId?: string;
}

export interface DirectConversationRemovedPayload {
  conversationId: string;
}

export interface DirectPresenceUpdatedPayload {
  userId: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export interface DirectTypingUpdatedPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface NotificationActorPayload {
  id: string;
  username?: string;
  displayName: string;
  avatar?: string;
}

export interface NotificationPayload {
  id: string;
  type: 'FOLLOW' | 'SAVE' | 'POST_LIVE' | 'POST_REJECTED' | 'POST_BOOSTED' | 'NEW_POST';
  title: string;
  body: string;
  actorCount: number;
  actors: NotificationActorPayload[];
  isRead: boolean;
  readAt?: string;
  actionPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationUpdatedPayload {
  action: 'upserted' | 'read' | 'read_all';
  notification?: NotificationPayload;
  unreadCount: number;
}

export interface AgentStreamDeltaPayload {
  draftId: string;
  channel: 'seller';
  delta: string;
}

export interface AgentStreamDonePayload {
  draftId: string;
  channel: 'seller';
  empty: boolean;
}
