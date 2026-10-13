"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessagingShell } from "@/features/messaging/components/MessagingShell";
import { useUnreadMessageCount } from "@/features/messaging/hooks/useUnreadCount";
import { useNotifications } from "../hooks/useNotifications";
import type { NotificationItem } from "../types";
import { NotificationList } from "./NotificationList";

type SubTab = "messages" | "notifications";

interface Props {
  lang: string;
}

/**
 * Inbox screen with two subtabs — Messages and Notifications — sharing one
 * sticky header at the top. Messages renders the existing MessagingShell;
 * Notifications is an empty placeholder until the notifications API lands.
 *
 * The active subtab is mirrored to the URL (?tab=notifications) so a reload or
 * back-navigation lands on the same tab. Defaults to Messages.
 */
export function NotificationsScreen({ lang }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab: SubTab =
    searchParams.get("tab") === "notifications" ? "notifications" : "messages";
  const [tab, setTab] = useState<SubTab>(initialTab);
  // Messages, not threads — the Notifications badge beside it counts individual
  // notifications, so counting threads here made the two tabs measure
  // different things.
  const unreadMessages = useUnreadMessageCount();
  const notifications = useNotifications();

  // No scroll handling of its own. This used to force the top on every mount,
  // which also threw away the list position when coming back from a chat or
  // switching tabs; RouteScrollRestoration now opens a fresh visit at the top
  // and returns a back/tab visit to where the inbox was left.

  function handleTabChange(next: SubTab) {
    if (next === tab) return;
    setTab(next);
    // Shallow URL sync — don't add history noise, replace the current entry.
    const params = new URLSearchParams(searchParams.toString());
    if (next === "messages") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(`/${lang}/notifications${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  }

  async function handleNotificationSelect(notification: NotificationItem) {
    if (!notification.isRead) {
      await notifications.markRead(notification.id);
    }
    // Follow notifications open the Followers list with the actors from THIS
    // notification flagged as "New" (via ?new=), so you can see exactly who
    // just followed — not just one profile or the whole list unmarked.
    if (notification.type === "FOLLOW") {
      const newIds = notification.actors.map((a) => a.id).join(",");
      const query = newIds ? `?new=${encodeURIComponent(newIds)}` : "";
      router.push(`/${lang}/profile/followers${query}`);
      return;
    }
    if (notification.actionPath) {
      router.push(`/${lang}${notification.actionPath}`);
    }
  }

  const subtabs: { id: SubTab; label: string; badge?: number }[] = [
    { id: "messages", label: "Messages", badge: unreadMessages },
    {
      id: "notifications",
      label: "Notifications",
      badge: notifications.unreadCount,
    },
  ];

  return (
    <div className="min-h-svh bg-app md:px-6">
      <div className="mx-auto flex min-h-svh w-full max-w-400 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-app ">
          <div className="px-4 md:px-0 md:py-4">
            <div className="grid w-full grid-cols-2 md:inline-grid md:w-auto md:min-w-80">
              {subtabs.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleTabChange(sub.id)}
                  className={`relative border-b-2 px-4 py-3 text-sm font-bold transition-colors md:px-5 md:py-2.5 ${
                    tab === sub.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-main"
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1.5 md:gap-2">
                    {sub.label}
                    {sub.badge && sub.badge > 0 ? (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white">
                        {sub.badge > 99 ? "99+" : sub.badge}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1">
          {tab === "messages" ? (
            <MessagingShell lang={lang} />
          ) : (
            <NotificationList
              notifications={notifications.notifications}
              loading={notifications.loading}
              unreadCount={notifications.unreadCount}
              hasMore={notifications.hasMore}
              markingAllRead={notifications.markingAllRead}
              onSelect={(notification) => {
                void handleNotificationSelect(notification);
              }}
              onMarkAllRead={() => {
                void notifications.markAllRead();
              }}
              onLoadMore={() => {
                void notifications.loadMore();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
