"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { Suspense, useEffect } from "react";

import { useInbox } from "../hooks/useInbox";
import { ChatDetail } from "./ChatDetail";

interface Props {
  lang: string;
  /** A content/post id — the conversation is ensured (create-or-reuse) from it. */
  contentId: string;
  /** Collapse the chat column (does not navigate). */
  onClose: () => void;
  /**
   * Hide the participant's name + avatar in the chat header. Set by the desktop
   * feed right rail, where the originating post card already shows the seller.
   */
  hideParticipantHeader?: boolean;
}

/**
 * Chat detail embedded inside the desktop content sheet's right column.
 *
 * Mirrors {@link ChatDetailScreen} but renders in a relative, full-height
 * container (not `fixed inset-0`) so it can live as a third column, and routes
 * the back affordance to `onClose` instead of the inbox's history-based back.
 *
 * `useInbox` reads `useSearchParams()`, which—without a Suspense boundary—forces
 * the entire enclosing route (the feed behind the sheet) to fall back to a
 * client render, blanking the page for a frame. The inner body is wrapped in
 * Suspense so that de-opt is contained to this column.
 */
export function EmbeddedChatPanel(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-app">
          <InterlockingBalls size={26} className="opacity-70" />
        </div>
      }
    >
      <EmbeddedChatPanelBody {...props} />
    </Suspense>
  );
}

function EmbeddedChatPanelBody({
  lang,
  contentId,
  onClose,
  hideParticipantHeader,
}: Props) {
  const inbox = useInbox(lang);

  // Ensure the conversation for this post in place. `skipUrlSync` keeps the
  // browser URL on the post route (the sheet stays addressable / closeable).
  useEffect(() => {
    void inbox.ensureConversationByContent(contentId, { skipUrlSync: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const resolving =
    inbox.ensuringConversation ||
    !inbox.selectedConversationId || !inbox.selectedConversation;

  // Keep ChatDetail mounted across resolution so the panel doesn't flip between
  // a spinner and the thread (which caused a flicker). `pending` renders the
  // chat shell — header + composer — while the conversation is being ensured.
  return (
    <div className="flex h-full min-h-0 flex-col bg-app">
      <ChatDetail
        lang={lang}
        pending={resolving}
        selectedConversationId={inbox.selectedConversationId}
        selectedConversation={inbox.selectedConversation}
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
        embedded
        hideParticipantHeader={hideParticipantHeader}
        onBack={onClose}
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
