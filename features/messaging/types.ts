// Shared types for the messaging (direct-message inbox) feature.
// Extracted verbatim from the original InboxScreen monolith — no shape changes.

export type UserProfile = {
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
};

export type UserLite = {
  id: string;
  username?: string | null;
  profile?: UserProfile | null;
};

export type ContentMedia = {
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  muxMeta?: {
    thumbnailUrl?: string | null;
    playbackId?: string | null;
  } | null;
  r2Variants?: Array<{
    url: string;
    variant?: string | null;
  }> | null;
};

export type ContentLite = {
  id: string;
  slug?: string | null;
  title: string;
  price?: {
    amount?: number | null;
    currency?: string | null;
  } | null;
  location?: {
    placeName?: string | null;
    county?: string | null;
    subregion?: string | null;
  } | null;
  media?: ContentMedia[] | null;
};

export type StoryLite = {
  id: string;
  caption?: string | null;
  media?: {
    mediaType: string;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    muxThumbnailUrl?: string | null;
  } | null;
};

export type Conversation = {
  updatedAt: string | null | undefined;
  id: string;
  isPinned?: boolean | null;
  contentId: string;
  sellerId: string;
  buyerId: string;
  lastMessageId?: string | null;
  lastMessageText?: string | null;
  lastMessageType?: string | null;
  lastMessageSenderId?: string | null;
  lastMessageAt?: string | null;
  messageCount: number;
  myUnreadCount?: number | null;
  otherParticipant?: UserLite | null;
  otherParticipantOnline?: boolean | null;
  otherParticipantLastSeenAt?: string | null;
  contactPhone?: string | null;
  blockedByMe?: boolean | null;
  blockedByOther?: boolean | null;
  canSendMessages?: boolean | null;
  lifecycleStatus?: string | null;
  sellerFirstResponseMinutes?: number | null;
  buyerFirstResponseMinutes?: number | null;
  /** Set when either party marks the deal closed (completed/profitable chat). */
  dealClosedAt?: string | null;
  /** Which participant closed the deal. */
  dealClosedByUserId?: string | null;
  content?: ContentLite | null;
  story?: StoryLite | null;
};

export type MessageMedia = {
  id: string;
  type?: string | null;
  status?: string | null;
  thumbnailUrl?: string | null;
  displayWidth?: number | null;
  displayHeight?: number | null;
  errorMessage?: string | null;
  r2Variants?: Array<{
    url: string;
    variant?: string | null;
    width?: number | null;
    height?: number | null;
  }> | null;
  muxMeta?: {
    playbackId?: string | null;
    duration?: number | null;
    thumbnailUrl?: string | null;
    animatedThumbnailUrl?: string | null;
    aspectRatio?: string | null;
  } | null;
};

export type Message = {
  id: string;
  conversationId: string;
  contentId: string;
  senderId: string;
  recipientId: string;
  type: string;
  text?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  mediaAssetId?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  isMine?: boolean | null;
  isDeleted?: boolean | null;
  deliveryStatus?: string | null;
  mediaAsset?: MessageMedia | null;
  // ── Client-only fields (optimistic UI; never sent to the server) ──
  /** Local object URL for instant media preview before the upload resolves. */
  localPreviewUrl?: string | null;
  /** Optimistic lifecycle for messages we created locally. */
  pendingStatus?: "uploading" | "sending" | "failed" | null;
  /** Correlates an optimistic row with the server's confirmed message. */
  clientMessageId?: string | null;
};

/** Media the user has picked but not yet sent (previewed above the composer). */
export type StagedMedia = {
  file: File;
  kind: "image" | "video";
  previewUrl: string;
};
