"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useInbox } from "../hooks/useInbox";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { participantName } from "../lib/helpers";
import type { Conversation } from "../types";
import { ConversationList } from "./ConversationList";
import { ConversationActionsSheet } from "./ConversationActionsSheet";
import { ChatDetail } from "./ChatDetail";

interface Props {
  lang: string;
  /** Keep thread selection local when rendered inside the dashboard modal. */
  embedded?: boolean;
  /**
   * Route param when mounted at /notifications/[id]. A conversation id, or a
   * content/story id when opening a contextual conversation. Omitted at the inbox root.
   */
  conversationId?: string;
  /**
   * "content" or "story" → the route param is a post/story id; ensure
   * the conversation directly here (no inbox-list redirect/flicker).
   */
  mode?: "conversation" | "content" | "story";
}

/**
 * Unified messaging screen for both /notifications and /notifications/[id].
 *
 * Desktop (md+): a two-pane split — conversation list on the left, the open
 * chat on the right (WhatsApp Web / Messenger style). A single useInbox drives
 * both panes, so selecting a thread updates the right pane in place.
 *
 * Mobile: single pane. At the inbox root the list fills the screen; on a
 * conversation route the chat fills the screen (the list is hidden, the chat's
 * own back button returns to the list). This preserves the existing mobile UX.
 */
export function MessagingShell({
  lang,
  embedded = false,
  conversationId,
  mode = "conversation",
}: Props) {
  const inbox = useInbox(lang, { embedded });
  const pushNotifications = usePushNotifications(lang);

  // The conversation whose actions sheet is open from a list long-press. Kept
  // separate from the open thread so the actions target that row, not whichever
  // chat happens to be selected.
  const [actionsTarget, setActionsTarget] = useState<Conversation | null>(null);
  const actionsTargetId = actionsTarget?.id ?? null;

  // Resolve the route param into the open conversation. For a content id we
  // ensure the thread in place (URL is swapped to the real id without remount).
  useEffect(() => {
    if (!conversationId) return;
    if (mode === "content") {
      void inbox.ensureConversationByContent(conversationId);
    } else if (mode === "story") {
      void inbox.ensureConversationByStory(conversationId);
    } else {
      inbox.navigateToConversation(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, mode]);

  // While ensuring a conversation from a content id, the thread isn't selected
  // yet. Rather than block on a full-screen loader (bad UX — the chat felt slow
  // to open), we render the chat shell immediately and let the conversation
  // resolve in the background. This `pending` flag tells ChatDetail to show the
  // chat shell (header skeleton + composer) right away.
  const resolvingFromContent =
    (mode === "content" || mode === "story") &&
    (inbox.ensuringConversation ||
      !inbox.selectedConversationId ||
      !inbox.selectedConversation);

  // On a conversation route the mobile view should show only the chat; at the
  // inbox root it should show only the list. On desktop both are always visible.
  // Content mode counts as having an open chat even before the id resolves.
  const hasRouteConversation = Boolean(conversationId);

  // The desktop split must fill the viewport below whatever chrome sits ABOVE
  // this shell — the sticky Messages/Notifications tab header at the inbox
  // root, nothing on a conversation route. Measure the shell's actual top
  // offset instead of hardcoding header/nav heights: the old viewport math
  // ignored the tab header, so the grid ran past the viewport and cut off the
  // bottom of the list/chat panes on desktop.
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [topOffset, setTopOffset] = useState(0);
  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const measure = () => {
      const next = Math.max(0, Math.round(el.getBoundingClientRect().top));
      setTopOffset((prev) => (prev === next ? prev : next));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const desktopHeight = embedded ? "100%" : `calc(100svh - ${topOffset}px)`;

  return (
    <div
      ref={shellRef}
      className={`bg-app md:mx-auto md:w-full md:max-w-400 md:overflow-hidden md:bg-app ${embedded ? "h-full min-h-0" : ""}`}
      style={{ ["--ms-h" as string]: desktopHeight }}
    >
      {/* grid-rows-[minmax(0,1fr)]: the single implicit row would otherwise
          auto-size to the CONTENT (a long thread makes it taller than the
          grid), so both panes overflow the viewport — the composer/list bottom
          gets cut off and the message list never scrolls internally. Pinning
          the row to the free space keeps the panes exactly viewport-high. */}
      <div className={`${embedded ? "h-full min-h-0" : ""} md:grid md:h-(--ms-h) md:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]`}>
        {/* ── Conversation list (left pane) ──────────────────────────── */}
        <div
          className={[
            "min-h-svh md:min-h-0 md:h-full md:overflow-y-auto md:border-r",
            // Mobile: hide the list when a conversation route is active
            hasRouteConversation ? "hidden md:block" : "block",
          ].join(" ")}
          style={{ borderColor: "rgb(var(--color-border))" }}
        >
          <ConversationList
            lang={lang}
            conversations={inbox.conversations}
            selectedConversationId={inbox.selectedConversationId}
            conversationsLoading={inbox.conversationsLoading}
            unreadThreads={inbox.unreadThreads}
            pushSupported={pushNotifications.isSupported}
            pushAvailable={pushNotifications.isAvailable}
            pushEnabled={pushNotifications.isEnabled}
            pushUpdating={pushNotifications.isUpdating}
            onTogglePush={() => {
              void pushNotifications.toggle();
            }}
            onSelect={inbox.navigateToConversation}
            onLongPress={setActionsTarget}
          />
        </div>

        {/* ── Chat detail (right pane) ───────────────────────────────── */}
        {/* Mobile: lock to the dynamic viewport and contain overflow so the
            header stays pinned at the top and the composer at the bottom (the
            message list is the only thing that scrolls). Desktop: fill the
            split pane. */}
        <div
          className={[
            "min-w-0",
            hasRouteConversation
              ? "h-dvh overflow-hidden md:h-full md:overflow-visible"
              : "",
          ].join(" ")}
        >
          <ChatDetail
            lang={lang}
            selectedConversationId={inbox.selectedConversationId}
            selectedConversation={inbox.selectedConversation}
            pending={resolvingFromContent}
            messages={inbox.messages}
            currentUserId={inbox.currentUser?.id}
            typingUserId={inbox.typingUserId}
            conversationLoading={inbox.conversationLoading}
            messagesLoading={inbox.messagesLoading}
            loadingOlder={inbox.loadingOlder}
            hasMoreOlder={inbox.hasMoreOlder}
            composer={inbox.composer}
            stagedMedia={inbox.stagedMedia}
            isUploading={inbox.isUploading}
            isConversationActionPending={inbox.isConversationActionPending}
            requireAuth={inbox.requireAuth}
            onBack={inbox.handleBack}
            onComposerChange={inbox.handleComposerChange}
            onSend={inbox.handleSend}
            onQuickReply={inbox.sendQuickReply}
            onShareLocation={inbox.sendLocation}
            onStageMedia={inbox.stageMedia}
            onClearStagedMedia={inbox.clearStagedMedia}
            onRetryMessage={inbox.retryMessage}
            onDiscardMessage={inbox.discardMessage}
            onDeleteMessage={inbox.deleteMessage}
            onLoadOlder={inbox.loadOlderMessages}
            onDeleteConversation={inbox.deleteSelectedConversation}
            onBlockConversation={inbox.blockSelectedConversation}
            onUnblockConversation={inbox.unblockSelectedConversation}
            onReportConversation={inbox.reportSelectedConversation}
            onMarkDeal={(closed) => inbox.markDealForConversation(closed)}
          />
        </div>
      </div>

      {/* Actions sheet opened by a long-press on a conversation row. The
          callbacks target that row's id, independent of the open thread. */}
      <ConversationActionsSheet
        open={actionsTarget !== null}
        onOpenChange={(open) => {
          if (!open) setActionsTarget(null);
        }}
        participantName={participantName(actionsTarget?.otherParticipant)}
        blockedByMe={actionsTarget?.blockedByMe}
        blockedByOther={actionsTarget?.blockedByOther}
        dealClosed={Boolean(actionsTarget?.dealClosedAt)}
        isPinned={actionsTarget?.isPinned}
        threadActionsOnly
        isPending={inbox.isConversationActionPending}
        onTogglePin={() =>
          inbox.setConversationPinned(
            actionsTargetId ?? "",
            !actionsTarget?.isPinned,
          )
        }
        onDeleteConversation={() =>
          inbox.deleteSelectedConversation(actionsTargetId ?? undefined)
        }
        onBlockConversation={() =>
          inbox.blockSelectedConversation(actionsTargetId ?? undefined)
        }
        onUnblockConversation={() =>
          inbox.unblockSelectedConversation(actionsTargetId ?? undefined)
        }
        onReportConversation={(reason, details) =>
          inbox.reportSelectedConversation(
            reason,
            details,
            actionsTargetId ?? undefined,
          )
        }
        onMarkDeal={(closed) =>
          inbox.markDealForConversation(closed, actionsTargetId ?? undefined)
        }
      />
    </div>
  );
}
