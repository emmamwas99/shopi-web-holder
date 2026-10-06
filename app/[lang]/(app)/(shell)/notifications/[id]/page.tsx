import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Notification");

import { MessagingShell } from "@/features/messaging/components/MessagingShell";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { lang, id } = await params;
  const { source } = await searchParams;
  // `?source=content` → the [id] segment is a post/content id; the screen ensures
  // the conversation in place. Otherwise it's an existing conversation id.
  return (
    <MessagingShell
      lang={lang}
      conversationId={id}
      mode={source === "content" ? "content" : "conversation"}
    />
  );
}
