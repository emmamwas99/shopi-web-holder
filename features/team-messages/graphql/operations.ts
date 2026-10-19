import { gql } from "@apollo/client";

export const MY_TEAM_THREAD = gql`
  query MyTeamThread {
    myTeamThread {
      displayName
      unreadCount
      lastMessageAt
      lastMessagePreview
    }
  }
`;

export const MY_TEAM_MESSAGES = gql`
  query MyTeamMessages($limit: Int!, $before: String) {
    myTeamMessages(limit: $limit, before: $before) {
      hasMore
      nextCursor
      items {
        id
        sender
        subject
        body
        mediaAssetId
        mediaAsset {
          type
          thumbnailUrl
          r2Variants { url variant width height }
          muxMeta { playbackId thumbnailUrl }
        }
        readAt
        createdAt
      }
    }
  }
`;

export const SEND_TEAM_REPLY = gql`
  mutation SendTeamReply($body: String!, $mediaAssetId: String) {
    sendTeamReply(body: $body, mediaAssetId: $mediaAssetId) {
      id
      sender
      subject
      body
      mediaAssetId
      mediaAsset {
        type
        thumbnailUrl
        r2Variants { url variant width height }
        muxMeta { playbackId thumbnailUrl }
      }
      readAt
      createdAt
    }
  }
`;

export const MARK_TEAM_THREAD_READ = gql`
  mutation MarkTeamThreadRead {
    markTeamThreadRead
  }
`;
