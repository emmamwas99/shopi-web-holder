import { gql } from "@apollo/client";

export const MY_NOTIFICATIONS = gql`
  query MyNotificationsInbox($limit: Int!, $after: String) {
    myNotifications(limit: $limit, after: $after) {
      unreadCount
      hasMore
      nextCursor
      items {
        id
        type
        title
        body
        actorCount
        isRead
        readAt
        actionPath
        contentIds
        imageUrl
        createdAt
        updatedAt
        actors {
          id
          username
          displayName
          avatar
        }
      }
    }
  }
`;

export const MY_UNREAD_NOTIFICATION_COUNT = gql`
  query MyUnreadNotificationCountInbox {
    myUnreadNotificationCount
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationReadInbox($notificationId: String!) {
    markNotificationRead(notificationId: $notificationId) {
      id
      isRead
      readAt
      updatedAt
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsReadInbox {
    markAllNotificationsRead
  }
`;
