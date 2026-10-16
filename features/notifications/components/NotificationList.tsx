"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, BadgeCheck, Bell, Bookmark, CheckCheck, Gift, Megaphone, MessageSquareText, PlayCircle, Store, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listTimestamp } from "@/features/messaging/lib/helpers";
import { useInfiniteScroll } from "@/features/feed/hooks/useInfiniteScroll";
import { TeamAvatar } from "@/features/team-messages/components/TeamAvatar";
import { VerifiedTick } from "@/components/verification/VerifiedTick";
import type { NotificationItem } from "../types";

interface Props {
  notifications: NotificationItem[];
  loading: boolean;
  unreadCount: number;
  hasMore: boolean;
  markingAllRead: boolean;
  onSelect: (notification: NotificationItem) => void;
  onMarkAllRead: () => void;
  onLoadMore: () => void;
  embedded?: boolean;
}

function actorInitials(notification: NotificationItem): string {
  const name = notification.actors[0]?.displayName ?? "S";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S"
  );
}

export function NotificationList({
  notifications,
  loading,
  unreadCount,
  hasMore,
  markingAllRead,
  onSelect,
  onMarkAllRead,
  onLoadMore,
  embedded = false,
}: Props) {
  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore,
  });

  // Marking everything read clears the unread state on updates you may not have
  // opened yet, and there is no undo — so it asks first.
  const [confirmOpen, setConfirmOpen] = useState(false);

  function confirmMarkAllRead() {
    // Close on confirm rather than holding the dialog open for the mutation:
    // the header button already shows its own spinner while it runs, so
    // keeping the dialog up would be a second, redundant progress indicator.
    setConfirmOpen(false);
    onMarkAllRead();
  }

  return (
    <section className={`flex flex-col md:mx-auto md:w-full md:max-w-[1600px] md:bg-app ${embedded ? "h-full min-h-0" : "min-h-[calc(100svh-48px)] md:h-full"}`}>
      <div className={`flex items-center justify-between border-b border-border px-4 py-4 md:py-5 ${embedded ? "md:px-8" : "md:px-0"}`}>
        <div>
          <h1 className="text-base font-black text-main md:text-lg">
            Notifications
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {unreadCount > 0
              ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
              : "You're all caught up"}
          </p>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={markingAllRead}
            className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
            aria-label="Mark all notifications as read"
            title="Mark all as read"
          >
            {markingAllRead ? (
              <InterlockingBalls size={16} />
            ) : (
              <CheckCheck size={16} />
            )}
            <span className="hidden sm:inline">Mark all read</span>
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto pb-14 md:pb-6">
        {loading && notifications.length === 0 ? (
          <div className={`space-y-4 px-4 py-5 ${embedded ? "md:px-8" : "md:px-0"}`}>
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-[52svh] flex-col items-center justify-center gap-4 px-6 text-center md:min-h-[42svh] md:px-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted">
              <Bell size={22} />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-black text-main">
                No notifications yet
              </h2>
              <p className="mx-auto max-w-[18rem] text-sm leading-6 text-muted">
                New followers and account updates will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {notifications.map((notification) => {
              const actor = notification.actors[0];
              return (
                <button
                  key={notification.id}
                  data-scroll-anchor={notification.id}
                  type="button"
                  onClick={() => onSelect(notification)}
                  className={`flex w-full items-start gap-3 border-b border-border/70 px-4 py-3.5 text-left transition-colors md:py-4 ${embedded ? "md:px-8" : "md:px-0"} ${
                    notification.isRead
                      ? "hover:bg-surface/60"
                      : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <div className="relative h-10 w-10 shrink-0">
                    {notification.type === "TEAM_MESSAGE" ? (
                      <TeamAvatar size={40} />
                    ) : notification.type === "SHOP_VERIFICATION" ? (
                      // A decision from the team, not a person: the tick is the news.
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1D9BF0]/10">
                        <VerifiedTick size={22} label={null} />
                      </div>
                    ) : notification.type === "REFERRAL" && !actor ? (
                      // Rewards have no person behind them — the gift is the news.
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgb(var(--brand-primary)),rgb(var(--brand-highlight)))] text-white">
                        <Gift size={18} strokeWidth={2} />
                      </div>
                    ) : actor?.avatar ? (
                      <Image
                        src={actor.avatar}
                        alt={actor.displayName}
                        fill
                        className="rounded-full object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-main text-xs font-black text-elevated">
                        {actorInitials(notification)}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-elevated text-muted">
                      {notification.type === "SAVE" ? (
                        <Bookmark size={11} />
                      ) : notification.type === "POST_REJECTED" ? (
                        <AlertCircle size={11} />
                      ) : notification.type === "POST_LIVE" ? (
                        <PlayCircle size={11} />
                      ) : notification.type === "POST_BOOSTED" ? (
                        <Megaphone size={11} />
                      ) : notification.type === "NEW_POST" ? (
                        <Store size={11} />
                      ) : notification.type === "TEAM_MESSAGE" ? (
                        <MessageSquareText size={11} />
                      ) : notification.type === "REFERRAL" ? (
                        <Gift size={11} />
                      ) : notification.type === "SHOP_VERIFICATION" ? (
                        <BadgeCheck size={11} />
                      ) : (
                        <UserPlus size={11} />
                      )}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`min-w-0 text-sm leading-5 text-main ${notification.isRead ? "font-medium" : "font-black"}`}>
                        {notification.body}
                      </p>
                      <span className="shrink-0 text-xs text-muted">
                        {listTimestamp(notification.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-muted">
                      {notification.title}
                    </p>
                  </div>

                  {!notification.isRead ? (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </button>
              );
            })}

            <div ref={sentinelRef} className="h-1" />

            {hasMore && loading ? (
              <div className="flex justify-center py-4" aria-hidden>
                <div className="rounded-full border border-border px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:240ms]" />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-border bg-elevated p-0 shadow-2xl">
          <DialogHeader className="px-6 pb-2 pt-6 text-left">
            <span
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary"
              aria-hidden
            >
              <CheckCheck size={20} />
            </span>
            <DialogTitle className="text-lg font-black text-main">
              Mark all as read?
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-muted">
              {/* Says what actually happens: people expect "mark all read" to
                  delete the list, and the real worry is losing an update they
                  hadn't opened. Naming the count makes the scale concrete. */}
              {unreadCount === 1
                ? "Your 1 unread update will be marked as read."
                : `All ${unreadCount} unread updates will be marked as read.`}{" "}
              They stay in your list — only the unread badge clears. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 border-t border-border px-6 py-4 sm:space-x-0">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="h-10 rounded-full border border-border px-5 text-sm font-bold text-main transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmMarkAllRead}
              disabled={markingAllRead}
              className="h-10 rounded-full bg-primary px-5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              Mark all read
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
