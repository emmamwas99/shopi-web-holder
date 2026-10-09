"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth";
import { useAuthHydrated } from "@/lib/auth/useAuthHydrated";
import { useSocket } from "@/hooks/useSocket";
import { WS_EVENTS } from "@/lib/socket/socket-events";
import {
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATION_READ,
  MY_NOTIFICATIONS,
} from "../graphql/operations";
import type { NotificationPage, NotificationSocketPayload } from "../types";

const PAGE_SIZE = 30;

export function useNotifications() {
  const authHydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { on } = useSocket();

  const { data, loading, fetchMore, refetch } = useQuery(MY_NOTIFICATIONS, {
    variables: { limit: PAGE_SIZE },
    skip: !authHydrated || !isAuthenticated,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
  });

  const [markReadMutation, { loading: markingRead }] = useMutation(
    MARK_NOTIFICATION_READ,
  );
  const [markAllReadMutation, { loading: markingAllRead }] = useMutation(
    MARK_ALL_NOTIFICATIONS_READ,
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    return on<NotificationSocketPayload>(WS_EVENTS.NOTIFICATION, () => {
      void refetch();
    });
  }, [isAuthenticated, on, refetch]);

  const page = (
    data as { myNotifications?: NotificationPage } | undefined
  )?.myNotifications;

  const notifications = useMemo(() => page?.items ?? [], [page?.items]);
  const unreadCount = page?.unreadCount ?? 0;
  const hasMore = Boolean(page?.hasMore);
  const nextCursor = page?.nextCursor ?? null;

  const markRead = useCallback(
    async (notificationId: string) => {
      await markReadMutation({ variables: { notificationId } });
      await refetch();
    },
    [markReadMutation, refetch],
  );

  const markAllRead = useCallback(async () => {
    await markAllReadMutation();
    await refetch();
  }, [markAllReadMutation, refetch]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor) return;
    await fetchMore({
      variables: {
        limit: PAGE_SIZE,
        after: nextCursor,
      },
      updateQuery(previous, { fetchMoreResult }) {
        const prevPage = (
          previous as { myNotifications?: NotificationPage } | undefined
        )?.myNotifications;
        const nextPage = (
          fetchMoreResult as { myNotifications?: NotificationPage } | undefined
        )?.myNotifications;
        if (!prevPage || !nextPage) return fetchMoreResult;
        return {
          myNotifications: {
            ...nextPage,
            items: [...prevPage.items, ...nextPage.items],
          },
        };
      },
    });
  }, [fetchMore, hasMore, nextCursor]);

  return {
    notifications,
    unreadCount,
    loading: !authHydrated || loading,
    hasMore,
    markingRead,
    markingAllRead,
    markRead,
    markAllRead,
    loadMore,
  };
}
