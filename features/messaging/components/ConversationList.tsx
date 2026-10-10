"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useRef } from "react";
import Image from "next/image";
import { Bell, BellOff, MessageCircle, Pin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TeamThreadRow } from "@/features/team-messages/components/TeamThreadRow";
import type { Conversation } from "../types";
import {
  conversationThumb,
  initialsForUser,
  participantName,
  previewLabel,
  listTimestamp,
} from "../lib/helpers";

interface Props {
  /** Enables the pinned Shopi team row, which links to a locale-prefixed route. */
  lang?: string;
  conversations: Conversation[];
  selectedConversationId: string | null;
  conversationsLoading: boolean;
  unreadThreads: number;
  pushSupported: boolean;
  pushAvailable: boolean;
  pushEnabled: boolean;
  pushUpdating: boolean;
  onTogglePush: () => void;
  onSelect: (conversationId: string) => void;
  /** Long-press (mobile) / right-click (desktop) on a row → open its actions. */
  onLongPress: (conversation: Conversation) => void;
}

const LONG_PRESS_MS = 450;

/** Left-hand inbox: header + scrollable conversation rows. */
export function ConversationList({
  lang,
  conversations,
  selectedConversationId,
  conversationsLoading,
  unreadThreads,
  pushSupported,
  pushAvailable,
  pushEnabled,
  pushUpdating,
  onTogglePush,
  onSelect,
  onLongPress,
}: Props) {
  // Long-press detection: a timer armed on press, cleared on release/move. When
  // it fires we open the row's actions and flag the press so the following
  // click (tap-to-open) is suppressed.
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (conversation: Conversation) => {
    longPressFired.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress(conversation);
    }, LONG_PRESS_MS);
  };

  return (
    <section className="flex flex-col">
      <div className="border-b border-border px-4 py-4 md:px-6 md:py-5">
        <div className="sticky left-0 right-0 top-0 flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-main md:text-lg">
              Inbox
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {unreadThreads > 0
                ? `${unreadThreads} unread thread${unreadThreads === 1 ? "" : "s"}`
                : "Your conversations"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pushSupported ? (
              <button
                type="button"
                onClick={onTogglePush}
                className="flex h-9 w-9 items-center justify-center rounded-full text-main transition-colors hover:bg-surface"
                aria-label={
                  pushEnabled
                    ? "Disable message alerts"
                    : "Enable message alerts"
                }
                title={
                  pushAvailable
                    ? pushEnabled
                      ? "Disable message alerts"
                      : "Enable message alerts"
                    : "Push alerts are not configured yet"
                }
              >
                {pushUpdating ? (
                  <InterlockingBalls size={16} />
                ) : pushEnabled ? (
                  <Bell size={16} />
                ) : (
                  <BellOff size={16} className="text-muted" />
                )}
              </button>
            ) : null}

            {/* {(conversationsLoading) && (
              <InterlockingBalls size={18} />
            )} */}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-14 md:pb-6">
        {lang ? <TeamThreadRow lang={lang} /> : null}
        {conversationsLoading && conversations.length === 0 ? (
          <div className="space-y-3 px-4 py-4 md:px-6 md:py-5">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="h-14 w-14 rounded-2xl" />
                <div className="flex-1 w-full space-y-2 py-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex h-full mt-12 flex-col items-center justify-center gap-3 px-6 text-center md:min-h-[36svh] md:px-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted">
              <MessageCircle size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-black text-main">
                No chats yet
              </h2>
              <p className="text-sm leading-6 text-muted">
                Tap Message on any post and the thread will appear here
                instantly.
              </p>
            </div>
          </div>
        ) : (
          conversations.map((conversation) => {
            const selected = conversation.id === selectedConversationId;
            const thumb = conversationThumb(conversation);
            return (
              <div
                key={conversation.id}
                data-scroll-anchor={conversation.id}
                role="button"
                tabIndex={0}
                aria-label={`Open conversation with ${participantName(conversation.otherParticipant)}`}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(conversation.id);
                  }
                }}
                onClick={() => {
                  // Suppress the click that follows a long-press release.
                  if (longPressFired.current) {
                    longPressFired.current = false;
                    return;
                  }
                  onSelect(conversation.id);
                }}
                onContextMenu={(event) => {
                  // Desktop: right-click opens the actions instead of the menu.
                  event.preventDefault();
                  onLongPress(conversation);
                }}
                onTouchStart={() => startLongPress(conversation)}
                onTouchEnd={clearLongPress}
                onTouchMove={clearLongPress}
                onPointerDown={(event) => {
                  // Mouse/pen long-press (touch is handled above). Skip touch
                  // pointers to avoid double-arming the timer.
                  if (event.pointerType !== "touch")
                    startLongPress(conversation);
                }}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
                className={cn(
                  "flex w-full select-none items-start gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors hover:bg-surface/60 md:px-6 md:py-4 lg:cursor-pointer",
                  selected &&
                    "shadow-[inset_3px_0_0_0_rgb(var(--brand-primary)/0.85)]",
                )}
              >
                <div className="relative h-12 w-12 shrink-0">
                  {/* Square post image */}
                  <div className="h-full w-full overflow-hidden rounded-2xl bg-surface">
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt={conversation.content?.title || "Conversation"}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted">
                        <MessageCircle size={18} />
                      </div>
                    )}
                  </div>

                  {/* Sender avatar overlaid bottom-left (WhatsApp-style) */}
                  {conversation.otherParticipant?.profile?.avatar ? (
                    <div
                      className="absolute -bottom-2 -right-1 h-7 w-7 overflow-hidden rounded-full border-2"
                      style={{ borderColor: "rgb(var(--color-bg))" }}
                    >
                      <Image
                        src={conversation.otherParticipant.profile.avatar}
                        alt={participantName(conversation.otherParticipant)}
                        fill
                        className="h-full w-full object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div
                      className="absolute -bottom-2 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-main text-elevated"
                      style={{
                        borderColor: "rgb(var(--color-bg))",
                        fontSize: "9px",
                        fontWeight: 700,
                      }}
                    >
                      {initialsForUser(conversation.otherParticipant)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-muted text-sm">
                      {participantName(conversation.otherParticipant)}
                    </p>
                    <span className="shrink-0 text-muted text-xs">
                      {listTimestamp(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">
                      {conversation.content?.title ??
                        (conversation.story ? "Story enquiry" : "Enquiry")}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p
                      className={`min-w-0 truncate ${
                        (conversation.myUnreadCount ?? 0) > 0
                          ? "font-semibold text-default"
                          : "text-muted"
                      }`}
                      style={{ fontSize: "var(--text-sm)" }}
                    >
                      {previewLabel(
                        conversation.lastMessageType,
                        conversation.lastMessageText,
                      )}
                    </p>
                    {conversation.otherParticipantOnline ? (
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    ) : null}
                  </div>
                </div>

                {(conversation.myUnreadCount ?? 0) > 0 ? (
                  <span className="mt-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    {conversation.myUnreadCount}
                  </span>
                ) : null}
                {conversation.isPinned ? (
                  <button
                    type="button"
                    aria-label="Pinned conversation options"
                    title="Pinned conversation options"
                    className="ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-main"
                    onPointerDown={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onLongPress(conversation);
                    }}
                  >
                    <Pin size={16} />
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
