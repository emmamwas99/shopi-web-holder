import { gql } from "@apollo/client";

// GraphQL operations for the direct-message inbox.
// Extracted verbatim from the original InboxScreen — operation names unchanged
// so any Apollo cache behavior stays identical.

// `Content` is normalised by id in the Apollo cache and shared with the feed /
// content-detail queries. Every conversation `content` selection MUST request
// the same nested fields those queries read (price.negotiable, location.country,
// media.mediaType, …) — otherwise writing a conversation result clobbers the
// shared Content entry and Apollo throws "Missing field X while writing result".
// Keep this fragment as the single source of truth for conversation content.
const CONVERSATION_CONTENT_FIELDS = gql`
  fragment ConversationContentFields on Content {
    id
    slug
    title
    price {
      amount
      currency
      negotiable
    }
    location {
      country
      county
      subregion
      placeName
      formattedAddress
    }
    media {
      mediaType
      url
      imageUrl
      thumbnailUrl
      sortOrder
      displayWidth
      displayHeight
      muxMeta {
        playbackId
        duration
        aspectRatio
        thumbnailUrl
        animatedThumbnailUrl
      }
      r2Variants {
        url
        variant
        width
        height
      }
    }
  }
`;

const CONVERSATION_STORY_FIELDS = gql`
  fragment ConversationStoryFields on Story {
    id
    caption
    expiresAt
    viewCount
    isViewed
    createdAt
    media {
      mediaType
      imageUrl
      thumbnailUrl
      muxPlaybackId
      muxThumbnailUrl
      duration
      processingStatus
    }
  }
`;

export const MY_DIRECT_CONVERSATIONS = gql`
  query MyDirectConversationsInbox($limit: Int!) {
    myDirectConversations(limit: $limit) {
      id
      contentId
      sellerId
      buyerId
      lastMessageId
      lastMessageText
      lastMessageType
      lastMessageSenderId
      lastMessageAt
      messageCount
      isPinned
      myUnreadCount
      otherParticipantOnline
      otherParticipantLastSeenAt
      blockedByMe
      blockedByOther
      canSendMessages
      lifecycleStatus
      sellerFirstResponseMinutes
      buyerFirstResponseMinutes
      dealClosedAt
      dealClosedByUserId
      contactPhone
    otherParticipant {
        id
        username
        profile {
          firstName
          lastName
          avatar
        }
      }
      content {
        ...ConversationContentFields
      }
      story {
        ...ConversationStoryFields
      }
    }
  }
  ${CONVERSATION_CONTENT_FIELDS}
  ${CONVERSATION_STORY_FIELDS}
`;

export const DIRECT_CONVERSATION = gql`
  query DirectConversationInbox($conversationId: String!) {
    directConversation(conversationId: $conversationId) {
      id
      contentId
      sellerId
      buyerId
      lastMessageId
      lastMessageText
      lastMessageType
      lastMessageSenderId
      lastMessageAt
      messageCount
      isPinned
      myUnreadCount
      otherParticipantOnline
      otherParticipantLastSeenAt
      blockedByMe
      blockedByOther
      canSendMessages
      lifecycleStatus
      sellerFirstResponseMinutes
      buyerFirstResponseMinutes
      dealClosedAt
      dealClosedByUserId
      contactPhone
      otherParticipant {
        id
        username
        profile {
          firstName
          lastName
          avatar
        }
      }
      content {
        ...ConversationContentFields
      }
      story {
        ...ConversationStoryFields
      }
    }
  }
  ${CONVERSATION_CONTENT_FIELDS}
  ${CONVERSATION_STORY_FIELDS}
`;

export const DIRECT_MESSAGES = gql`
  query DirectConversationMessagesInbox($input: DirectConversationMessagesInput!) {
    directConversationMessages(input: $input) {
      id
      conversationId
      contentId
      senderId
      recipientId
      type
      text
      latitude
      longitude
      locationLabel
      mediaAssetId
      clientMessageId
      deliveredAt
      readAt
      createdAt
      isMine
      isDeleted
      deliveryStatus
      mediaAsset {
        id
        type
        status
        thumbnailUrl
        displayWidth
        displayHeight
        errorMessage
        r2Variants {
          url
          variant
          width
          height
        }
        muxMeta {
          playbackId
          duration
          thumbnailUrl
          animatedThumbnailUrl
          aspectRatio
        }
      }
    }
  }
`;

export const MY_UNREAD_CONVERSATION_COUNT = gql`
  query MyUnreadDirectConversationCountInbox {
    myUnreadDirectConversationCount
  }
`;

export const ENSURE_DIRECT_CONVERSATION = gql`
  mutation EnsureDirectConversationInbox($input: EnsureDirectConversationInput!) {
    ensureDirectConversationId(input: $input)
  }
`;

export const SEND_DIRECT_MESSAGE = gql`
  mutation SendDirectMessageInbox($input: SendDirectMessageInput!) {
    sendDirectMessage(input: $input) {
      id
      conversationId
      contentId
      senderId
      recipientId
      type
      text
      latitude
      longitude
      locationLabel
      mediaAssetId
      clientMessageId
      deliveredAt
      readAt
      createdAt
      isMine
      deliveryStatus
      mediaAsset {
        id
        type
        status
        thumbnailUrl
        displayWidth
        displayHeight
        errorMessage
        r2Variants {
          url
          variant
          width
          height
        }
        muxMeta {
          playbackId
          duration
          thumbnailUrl
          animatedThumbnailUrl
          aspectRatio
        }
      }
    }
  }
`;

export const MARK_DIRECT_CONVERSATION_READ = gql`
  mutation MarkDirectConversationReadInbox($input: MarkDirectConversationReadInput!) {
    markDirectConversationRead(input: $input)
  }
`;

export const DELETE_DIRECT_CONVERSATION = gql`
  mutation DeleteDirectConversationInbox($conversationId: String!) {
    deleteDirectConversation(conversationId: $conversationId)
  }
`;

export const DELETE_DIRECT_MESSAGE = gql`
  mutation DeleteDirectMessageInbox($messageId: String!) {
    deleteDirectMessage(messageId: $messageId)
  }
`;

export const SET_DIRECT_CONVERSATION_PINNED = gql`
  mutation SetDirectConversationPinnedInbox(
    $conversationId: String!
    $pinned: Boolean!
  ) {
    setDirectConversationPinned(conversationId: $conversationId, pinned: $pinned)
  }
`;

export const BLOCK_DIRECT_CONVERSATION = gql`
  mutation BlockDirectConversationInbox($conversationId: String!) {
    blockDirectConversation(conversationId: $conversationId) {
      id
      contentId
      sellerId
      buyerId
      lastMessageId
      lastMessageText
      lastMessageType
      lastMessageSenderId
      lastMessageAt
      messageCount
      myUnreadCount
      blockedByMe
      blockedByOther
      canSendMessages
      lifecycleStatus
      sellerFirstResponseMinutes
      buyerFirstResponseMinutes
      dealClosedAt
      dealClosedByUserId
      contactPhone
      otherParticipantOnline
      otherParticipantLastSeenAt
      otherParticipant {
        id
        username
        profile {
          firstName
          lastName
          avatar
        }
      }
      content {
        ...ConversationContentFields
      }
    }
  }
  ${CONVERSATION_CONTENT_FIELDS}
`;

export const UNBLOCK_DIRECT_CONVERSATION = gql`
  mutation UnblockDirectConversationInbox($conversationId: String!) {
    unblockDirectConversation(conversationId: $conversationId) {
      id
      contentId
      sellerId
      buyerId
      lastMessageId
      lastMessageText
      lastMessageType
      lastMessageSenderId
      lastMessageAt
      messageCount
      myUnreadCount
      blockedByMe
      blockedByOther
      canSendMessages
      lifecycleStatus
      sellerFirstResponseMinutes
      buyerFirstResponseMinutes
      dealClosedAt
      dealClosedByUserId
      contactPhone
      otherParticipantOnline
      otherParticipantLastSeenAt
      otherParticipant {
        id
        username
        profile {
          firstName
          lastName
          avatar
        }
      }
      content {
        ...ConversationContentFields
      }
    }
  }
  ${CONVERSATION_CONTENT_FIELDS}
`;

export const MARK_DIRECT_CONVERSATION_DEAL = gql`
  mutation MarkDirectConversationDealInbox($input: MarkDirectConversationDealInput!) {
    markDirectConversationDeal(input: $input) {
      id
      contentId
      sellerId
      buyerId
      lastMessageId
      lastMessageText
      lastMessageType
      lastMessageSenderId
      lastMessageAt
      messageCount
      myUnreadCount
      blockedByMe
      blockedByOther
      canSendMessages
      lifecycleStatus
      sellerFirstResponseMinutes
      buyerFirstResponseMinutes
      dealClosedAt
      dealClosedByUserId
      contactPhone
      otherParticipantOnline
      otherParticipantLastSeenAt
      otherParticipant {
        id
        username
        profile {
          firstName
          lastName
          avatar
        }
      }
      content {
        ...ConversationContentFields
      }
    }
  }
  ${CONVERSATION_CONTENT_FIELDS}
`;

export const REPORT_DIRECT_CONVERSATION = gql`
  mutation ReportDirectConversationInbox($input: ReportDirectConversationInput!) {
    reportDirectConversation(input: $input)
  }
`;

export const REQUEST_IMAGE_UPLOAD = gql`
  mutation RequestImageUploadInbox($mimeType: String) {
    requestImageUpload(mimeType: $mimeType) {
      uploadUrl
      mediaAssetId
    }
  }
`;

export const NOTIFY_IMAGE_UPLOADED = gql`
  mutation NotifyImageUploadedInbox($mediaAssetId: String!) {
    notifyImageUploaded(mediaAssetId: $mediaAssetId) {
      id
      status
    }
  }
`;

export const REQUEST_VIDEO_UPLOAD = gql`
  mutation RequestVideoUploadInbox($corsOrigin: String) {
    requestVideoUpload(corsOrigin: $corsOrigin) {
      uploadUrl
      mediaAssetId
    }
  }
`;

export const NOTIFY_VIDEO_UPLOADED = gql`
  mutation NotifyVideoUploadedInbox($mediaAssetId: String!) {
    notifyVideoUploaded(mediaAssetId: $mediaAssetId) {
      id
      status
    }
  }
`;

export const MY_WEB_PUSH_STATUS = gql`
  query MyWebPushStatusInbox {
    myWebPushStatus {
      isAvailable
      isEnabled
      isOptedOut
      activeSubscriptionCount
      publicKey
    }
  }
`;

export const SAVE_WEB_PUSH_SUBSCRIPTION = gql`
  mutation SaveWebPushSubscriptionInbox($input: SaveWebPushSubscriptionInput!) {
    saveWebPushSubscription(input: $input) {
      isAvailable
      isEnabled
      isOptedOut
      activeSubscriptionCount
      publicKey
    }
  }
`;

export const REMOVE_WEB_PUSH_SUBSCRIPTION = gql`
  mutation RemoveWebPushSubscriptionInbox($endpoint: String!) {
    removeWebPushSubscription(endpoint: $endpoint)
  }
`;

/**
 * Turning the toggle off has to clear every subscription, not just this
 * browser's. `isEnabled` is account-wide, so removing one endpoint left the
 * count above zero and the switch snapped back on.
 */
export const REMOVE_ALL_WEB_PUSH_SUBSCRIPTIONS = gql`
  mutation RemoveAllWebPushSubscriptionsInbox {
    removeAllWebPushSubscriptions {
      isAvailable
      isEnabled
      isOptedOut
      activeSubscriptionCount
      publicKey
    }
  }
`;

export const LINK_PREVIEW = gql`
  query LinkPreviewInbox($url: String!) {
    linkPreview(url: $url) {
      url
      title
      description
      image
      siteName
    }
  }
`;
