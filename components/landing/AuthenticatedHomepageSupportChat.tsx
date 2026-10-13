"use client";

import dynamic from "next/dynamic";
import { useTeamThread } from "@/features/team-messages/hooks/useTeamThread";
import { SupportChatButton } from "./SupportChatButton";

const TeamThreadScreen = dynamic(
  () =>
    import("@/features/team-messages/components/TeamThreadScreen").then(
      (module) => module.TeamThreadScreen,
    ),
  { ssr: false },
);

export function AuthenticatedHomepageSupportChat({
  lang,
  open,
  setOpen,
}: {
  lang: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { thread } = useTeamThread();

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open ? (
        <div
          role="dialog"
          aria-label="Shopi support chat"
          className="h-[min(38rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-elevated shadow-2xl"
        >
          <TeamThreadScreen lang={lang} compact onClose={() => setOpen(false)} />
        </div>
      ) : null}
      <SupportChatButton
        open={open}
        unreadCount={thread?.unreadCount ?? 0}
        onClick={() => setOpen(!open)}
      />
    </div>
  );
}
