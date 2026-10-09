"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowLeft, BadgeCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth";
import { useSocket } from "@/hooks/useSocket";
import { WS_EVENTS } from "@/lib/socket/socket-events";
import { linkifyParts, shortTime } from "@/features/messaging/lib/helpers";
import { profileReturnHref } from "@/features/profile/lib/settingsReturn";
import {
  MARK_TEAM_THREAD_READ,
  MY_TEAM_MESSAGES,
  SEND_TEAM_REPLY,
} from "../graphql/operations";
import { TEAM_DISPLAY_NAME, type TeamMessage, type TeamMessagePage } from "../types";
import { TeamAvatar } from "./TeamAvatar";

const PAGE_SIZE = 50;
const MAX_BODY = 4000;
const MAX_TEXTAREA_HEIGHT = 160;

function MessageText({ text, mine }: { text: string; mine: boolean }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {linkifyParts(text).map((part, index) =>
        part.type === "link" ? (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline underline-offset-2 ${mine ? "text-white" : "text-primary"}`}
          >
            {part.value}
          </a>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </p>
  );
}

function TeamBubble({ message }: { message: TeamMessage }) {
  const mine = message.sender === "MEMBER";
  return (
    <div className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 md:max-w-[65%] ${
          mine ? "rounded-br-sm bg-primary text-white" : "rounded-bl-sm bg-subtle text-main"
        }`}
      >
        {message.subject ? <p className="mb-1 text-sm font-semibold">{message.subject}</p> : null}
        <MessageText text={message.body} mine={mine} />
        <p className={`mt-1 text-right text-[11px] ${mine ? "text-white/75" : "text-muted"}`}>
          {shortTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

/**
 * The member's conversation with the Shopi team (/notifications/shopi-team):
 * surveys, check-ins and announcements from admins, and support questions the
 * member asks themselves. The reply box is always there, so a member can write
 * first; the team answers in this same thread.
 */
export function TeamThreadScreen({ lang }: { lang: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { on } = useSocket();
  const [draft, setDraft] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const stickToBottom = useRef(true);

  // Opened from the profile menu's "Contact support" row (`?from=settings`),
  // back returns there; otherwise to the inbox this thread is pinned in.
  const from = searchParams.get("from");
  const backHref = from ? profileReturnHref(lang, from) : `/${lang}/notifications`;

  const { data, loading, refetch, fetchMore } = useQuery(MY_TEAM_MESSAGES, {
    variables: { limit: PAGE_SIZE },
    skip: !isAuthenticated,
    fetchPolicy: "cache-and-network",
  });
  const [markRead] = useMutation(MARK_TEAM_THREAD_READ, {
    refetchQueries: ["MyTeamThread", "MyNotificationsInbox", "MyUnreadNotificationCountInbox"],
  });
  // A first message opens the thread, which is what makes its inbox row appear.
  const [sendReply, { loading: sending }] = useMutation(SEND_TEAM_REPLY, {
    refetchQueries: ["MyTeamThread"],
  });

  const page = (data as { myTeamMessages?: TeamMessagePage } | undefined)?.myTeamMessages;
  const messages = useMemo(() => page?.items ?? [], [page?.items]);
  const unreadFromTeam = messages.some((m) => m.sender === "TEAM" && !m.readAt);

  // Opening the thread (or a team message arriving while it's open) marks it read.
  useEffect(() => {
    if (unreadFromTeam) void markRead();
  }, [unreadFromTeam, markRead]);

  useEffect(() => {
    if (!isAuthenticated) return;
    return on(WS_EVENTS.TEAM_MESSAGE_CREATED, () => {
      stickToBottom.current = true;
      void refetch();
    });
  }, [isAuthenticated, on, refetch]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // One line by default, growing with the message (capped) — the same as the
  // marketplace chat Composer.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [draft]);

  const loadOlder = useCallback(async () => {
    if (!page?.hasMore || !page.nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    stickToBottom.current = false;
    try {
      await fetchMore({
        variables: { limit: PAGE_SIZE, before: page.nextCursor },
        updateQuery(previous, { fetchMoreResult }) {
          const prev = (previous as { myTeamMessages?: TeamMessagePage }).myTeamMessages;
          const next = (fetchMoreResult as { myTeamMessages?: TeamMessagePage }).myTeamMessages;
          if (!prev || !next) return previous;
          return { myTeamMessages: { ...next, items: [...next.items, ...prev.items] } };
        },
      });
    } finally {
      setLoadingOlder(false);
    }
  }, [fetchMore, loadingOlder, page?.hasMore, page?.nextCursor]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    try {
      await sendReply({ variables: { body } });
      setDraft("");
      stickToBottom.current = true;
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your message");
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-app md:mx-auto md:h-[calc(100svh-1rem)] md:max-w-3xl md:border-x md:border-default">
      <header
        className="flex items-center gap-3 border-b px-3 py-3 md:px-5"
        style={{ borderColor: "rgb(var(--color-border))" }}
      >
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-subtle"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <TeamAvatar size={40} />
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[15px] font-semibold">
            {TEAM_DISPLAY_NAME}
            <BadgeCheck size={16} className="text-primary" aria-label="Official" />
          </p>
          <p className="truncate text-xs text-muted">Support and updates from Shopi</p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-4 md:px-5"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {page?.hasMore ? (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => void loadOlder()} disabled={loadingOlder}>
              {loadingOlder ? <InterlockingBalls size={14} /> : null}
              Load earlier messages
            </Button>
          </div>
        ) : null}

        {loading && messages.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={`h-16 w-2/3 rounded-2xl ${i % 2 ? "ml-auto" : ""}`} />
          ))
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <TeamAvatar size={56} />
            <h2 className="mt-4 text-base font-semibold text-main">How can we help?</h2>
            <p className="mt-1 max-w-xs text-sm leading-snug text-muted">
              Ask about your account, a listing or a payment, or tell us anything you
              want Shopi to know. We reply right here.
            </p>
          </div>
        ) : (
          messages.map((message) => <TeamBubble key={message.id} message={message} />)
        )}
      </div>

      {isAuthenticated && !(loading && messages.length === 0) ? (
        <div
          className="flex items-end gap-2 border-t px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5"
          style={{ borderColor: "rgb(var(--color-border))" }}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              messages.length > 0 ? "Message the Shopi team…" : "Write your message to Shopi support…"
            }
            aria-label="Message to the Shopi team"
            rows={1}
            maxLength={MAX_BODY}
            className="max-h-40 flex-1 resize-none rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-gray-700"
            style={{ borderColor: "rgb(var(--color-border))" }}
          />
          <Button
            type="button"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || sending}
            aria-label="Send message"
          >
            {sending ? (
              <InterlockingBalls size={18} />
            ) : (
              <Send className="text-white" size={18} />
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
