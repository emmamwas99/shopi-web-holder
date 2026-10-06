import { ChatShellSkeleton } from "@/features/messaging/components/ChatShellSkeleton";

/**
 * Route-transition skeleton for /notifications/[id] (cold navigations). The
 * instant-open path from a post also renders this same shell as an overlay, so
 * either way opening a chat paints the shell immediately — never a blank page.
 */
export default function ConversationLoading() {
  return (
    <div className="fixed inset-0 z-40 md:static">
      <ChatShellSkeleton />
    </div>
  );
}
