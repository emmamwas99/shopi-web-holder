"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { ChevronLeft, BadgeCheck, CircleAlert, Clock3, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth";
import { useSocket } from "@/hooks/useSocket";
import { WS_EVENTS } from "@/lib/socket/socket-events";
import { linkifyParts, shortTime } from "@/features/messaging/lib/helpers";
import { profileReturnHref } from "@/features/profile/lib/settingsReturn";
import { goBackOr } from "@/lib/useAppBack";
import {
  MARK_TEAM_THREAD_READ,
  MY_TEAM_MESSAGES,
  SEND_TEAM_REPLY,
} from "../graphql/operations";
import { TEAM_DISPLAY_NAME, type TeamMessage, type TeamMessagePage } from "../types";
import { NOTIFY_IMAGE_UPLOADED, NOTIFY_VIDEO_UPLOADED, REQUEST_IMAGE_UPLOAD, REQUEST_VIDEO_UPLOAD } from "@/features/messaging/graphql/operations";
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

function TeamBubble({
  message,
  onRetry,
}: {
  message: TeamMessage;
  onRetry?: (message: TeamMessage) => void;
}) {
  const mine = message.sender === "MEMBER";
  return (
    <div className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 md:max-w-[65%] ${
          mine ? "rounded-br-sm bg-primary text-white" : "rounded-bl-sm bg-subtle text-main"
        }`}
      >
        {message.subject ? <p className="mb-1 text-sm font-semibold">{message.subject}</p> : null}
        {message.body ? <MessageText text={message.body} mine={mine} /> : null}
        {message.mediaAsset ? (
          <div className="mt-2 overflow-hidden rounded-xl">
            {message.mediaAsset.type === "VIDEO" && message.mediaAsset.muxMeta?.playbackId ? (
              <video controls preload="metadata" className="max-h-64 max-w-full" poster={message.mediaAsset.muxMeta.thumbnailUrl ?? undefined} src={`https://stream.mux.com/${message.mediaAsset.muxMeta.playbackId}/high.mp4`} />
            ) : (
              <a href={message.mediaAsset.r2Variants?.[0]?.url ?? message.mediaAsset.thumbnailUrl ?? message.mediaAsset.muxMeta?.thumbnailUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={message.mediaAsset.thumbnailUrl ?? message.mediaAsset.r2Variants?.[0]?.url ?? message.mediaAsset.muxMeta?.thumbnailUrl ?? ""} alt="Message attachment" className="max-h-64 max-w-full rounded-lg object-cover" />
              </a>
            )}
          </div>
        ) : null}
        <p className={`mt-1 text-right text-[11px] ${mine ? "text-white/75" : "text-muted"}`}>
          {message.pendingStatus === "failed" ? (
            <button
              type="button"
              onClick={() => onRetry?.(message)}
              className="inline-flex items-center gap-1 text-red-600 underline underline-offset-2"
            >
              <CircleAlert size={12} /> Tap to retry
            </button>
          ) : (
            <span className="inline-flex items-center justify-end gap-1">
              {shortTime(message.createdAt)}
              {message.pendingStatus === "sending" ? <Clock3 size={11} /> : null}
            </span>
          )}
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
export function TeamThreadScreen({
  lang,
  compact = false,
  onClose,
}: {
  lang: string;
  compact?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { on } = useSocket();
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<TeamMessage[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const stickToBottom = useRef(true);

  // Back returns to wherever the thread was opened from. Opened with nothing
  // of ours behind it, it lands on the profile menu's "Contact support" row
  // (`?from=settings`), or else the inbox this thread is pinned in.
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
  const [requestImageUpload] = useMutation(REQUEST_IMAGE_UPLOAD);
  const [requestVideoUpload] = useMutation(REQUEST_VIDEO_UPLOAD);
  const [notifyImageUploaded] = useMutation(NOTIFY_IMAGE_UPLOADED);
  const [notifyVideoUploaded] = useMutation(NOTIFY_VIDEO_UPLOADED);
  const [sendReply] = useMutation(SEND_TEAM_REPLY, {
    refetchQueries: ["MyTeamThread"],
  });

  const page = (data as { myTeamMessages?: TeamMessagePage } | undefined)?.myTeamMessages;
  const messages = useMemo(() => {
    const confirmed = page?.items ?? [];
    const confirmedIds = new Set(confirmed.map((message) => message.id));
    return [
      ...confirmed,
      ...optimisticMessages.filter((message) => !confirmedIds.has(message.id)),
    ];
  }, [optimisticMessages, page?.items]);
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

  const sendOptimisticReply = useCallback(async (message: TeamMessage) => {
    setOptimisticMessages((current) => [
      ...current.filter((item) => item.id !== message.id),
      { ...message, pendingStatus: "sending" },
    ]);
    try {
      const { data: result } = await sendReply({
        variables: { body: message.body, mediaAssetId: message.mediaAssetId ?? undefined },
      });
      const sentMessage = (result as { sendTeamReply?: TeamMessage } | undefined)
        ?.sendTeamReply;
      if (sentMessage) {
        setOptimisticMessages((current) =>
          current.map((item) =>
            item.id === message.id
              ? { ...sentMessage, pendingStatus: null }
              : item,
          ),
        );
      }
      stickToBottom.current = true;
      void refetch();
    } catch (err) {
      setOptimisticMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, pendingStatus: "failed" } : item,
        ),
      );
      toast.error(err instanceof Error ? err.message : "Couldn't send your message");
    }
  }, [refetch, sendReply]);

  async function handleSend() {
    const body = draft.trim();
    if (!body && !file) return;
    if (file) {
      setUploading(true);
      try {
        const isVideo = file.type.startsWith("video/");
        const uploadResult = isVideo
          ? await requestVideoUpload({ variables: { corsOrigin: window.location.origin } })
          : await requestImageUpload({ variables: { mimeType: file.type || "image/jpeg" } });
        const uploadData = uploadResult.data as {
          requestVideoUpload?: { uploadUrl: string; mediaAssetId: string };
          requestImageUpload?: { uploadUrl: string; mediaAssetId: string };
        } | undefined;
        const session = isVideo ? uploadData?.requestVideoUpload : uploadData?.requestImageUpload;
        if (!session?.uploadUrl || !session.mediaAssetId) throw new Error("Could not start the upload");
        const response = await fetch(session.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || (isVideo ? "video/mp4" : "image/jpeg") },
        });
        if (!response.ok) throw new Error(`Upload failed (${response.status})`);
        if (isVideo) await notifyVideoUploaded({ variables: { mediaAssetId: session.mediaAssetId } });
        else await notifyImageUploaded({ variables: { mediaAssetId: session.mediaAssetId } });
        await sendReply({ variables: { body, mediaAssetId: session.mediaAssetId } });
        setFile(null);
        setDraft("");
        stickToBottom.current = true;
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't send your attachment");
      } finally {
        setUploading(false);
      }
      return;
    }
    const optimistic: TeamMessage = {
      id: `optimistic:${crypto.randomUUID()}`,
      sender: "MEMBER",
      body,
      createdAt: new Date().toISOString(),
      pendingStatus: "sending",
      readAt: null,
    };
    setOptimisticMessages((current) => [...current, optimistic]);
    setDraft("");
    stickToBottom.current = true;
    void sendOptimisticReply(optimistic);
  }

  return (
    <div
      className={
        compact
          ? "flex h-full min-h-0 flex-col bg-app"
          : "flex h-dvh flex-col bg-app md:mx-auto md:h-[calc(100svh-1rem)] md:max-w-3xl md:border-x md:border-default"
      }
    >
      <header
        className="flex items-center gap-3 border-b px-3 py-3 md:px-5"
        style={{ borderColor: "rgb(var(--color-border))" }}
      >
        <button
          type="button"
          onClick={() =>
            compact && onClose ? onClose() : goBackOr(router, backHref)
          }
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-subtle"
          aria-label={compact ? "Close support chat" : "Back"}
        >
          {compact ? <X size={20} /> : <ChevronLeft size={20} />}
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
          messages.map((message) => (
            <TeamBubble
              key={message.id}
              message={message}
              onRetry={message.pendingStatus === "failed" ? sendOptimisticReply : undefined}
            />
          ))
        )}
      </div>

      {isAuthenticated && !(loading && messages.length === 0) ? (
        <div
          className="flex items-end gap-2 border-t px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5"
          style={{ borderColor: "rgb(var(--color-border))" }}
        >
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(event) => { setFile(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full" aria-label="Attach photo or video" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={18} />
          </Button>
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
          {file ? (
            <button type="button" className="max-w-20 shrink-0 truncate text-xs text-muted" title={`Remove ${file.name}`} onClick={() => setFile(null)}>
              {file.name} ×
            </button>
          ) : null}
          <Button
            type="button"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={() => void handleSend()}
            disabled={(!draft.trim() && !file) || uploading}
            aria-label="Send message"
          >
            {!uploading ? <Send className="text-white" size={18} /> : <InterlockingBalls size={16} />}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
