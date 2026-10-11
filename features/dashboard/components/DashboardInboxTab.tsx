"use client";

import { useRouter } from "next/navigation";
import { MessagingShell } from "@/features/messaging/components/MessagingShell";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { NotificationList } from "@/features/notifications/components/NotificationList";
import type { NotificationItem } from "@/features/notifications/types";

export function DashboardInboxTab({
  section,
  lang,
  onSelectSection,
}: {
  section: "messages" | "notifications";
  lang: string;
  onSelectSection: (section: string) => void;
}) {
  const router = useRouter();
  const notifications = useNotifications();

  async function handleNotificationSelect(notification: NotificationItem) {
    if (!notification.isRead) await notifications.markRead(notification.id);
    if (notification.type === "FOLLOW") {
      onSelectSection("followers");
      return;
    }
    if (notification.actionPath) router.push(`/${lang}${notification.actionPath}`);
  }

  if (section === "messages") {
    return (
      <section className="flex h-full min-h-0 flex-col">
        <header className="z-10 shrink-0 border-b border-border bg-app px-5 pb-4 pt-5 md:px-8 md:pb-5 md:pt-6">
          <h1 className="text-lg font-extrabold tracking-tight text-main">Messages</h1>
          <p className="mt-1 text-xs text-muted">Your conversations with buyers and sellers.</p>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <MessagingShell lang={lang} embedded />
        </div>
      </section>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <NotificationList
        embedded
        notifications={notifications.notifications}
        loading={notifications.loading}
        unreadCount={notifications.unreadCount}
        hasMore={notifications.hasMore}
        markingAllRead={notifications.markingAllRead}
        onSelect={(notification) => void handleNotificationSelect(notification)}
        onMarkAllRead={() => void notifications.markAllRead()}
        onLoadMore={() => void notifications.loadMore()}
      />
    </div>
  );
}
