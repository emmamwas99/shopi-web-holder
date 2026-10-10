"use client";

import { useEffect } from "react";
import { useInbox } from "../hooks/useInbox";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { ChatDetail } from "./ChatDetail";

interface Props {
  lang: string;
  /** Route param. A conversation id, or a content id when `mode === "content"`. */
  conversationId: string;
  /**
   * "content" → the route param is a post/content id; ensure (create-or-reuse)
   * the conversation directly on this screen (no inbox-list redirect/flicker).
   */
  mode?: "conversation" | "content";
}

/**
 * Full-screen chat detail page rendered at /notifications/[id].
 * Boots useInbox with the conversation pre-selected from the route param, or
 * ensures it from a content id when opened straight from a post's Message button.
 */
export function ChatDetailScreen({
  lang,
  conversationId,
  mode = "conversation",
}: Props) {
  const inbox = useInbox(lang);
  usePushNotifications(lang);

  // Resolve the route param into the open conversation. For a content id we
  // ensure the thread in place (URL is swapped to the real id without a remount).
  useEffect(() => {
    if (mode === "content") {
      void inbox.ensureConversationByContent(conversationId);
    } else {
      inbox.navigateToConversation(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, mode]);

  // Keep the chat shell pending until the full conversation snapshot arrives;
  // resolving the id alone must not flash a half-populated header.
  const resolvingFromContent =
    mode === "content" &&
    (inbox.ensuringConversation ||
      !inbox.selectedConversationId ||
      !inbox.selectedConversation);

  return (
    <div className="fixed inset-0 flex flex-col bg-app">
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
  );
}
