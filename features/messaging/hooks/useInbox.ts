/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import {
  DirectConversationUpdatedPayload,
  DirectConversationRemovedPayload,
  DirectConversationViewportPayload,
  DirectMessageCreatedPayload,
  DirectMessageUpdatedPayload,
  DirectPresenceUpdatedPayload,
  DirectTypingUpdatedPayload,
  WS_CLIENT_EVENTS,
  WS_EVENTS,
} from "@/lib/socket/socket-events";
import { useSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/stores/auth";
import { useAuthHydrated } from "@/lib/auth/useAuthHydrated";
import { useAuthGuard } from "@/features/feed/hooks/useAuthGuard";
import type { Conversation, Message } from "../types";
import {
  applyMessageUpdate,
  fromSocketMessage,
  removeConversation,
  upsertConversation,
  upsertMessage,
  videoPosterFromFile,
} from "../lib/helpers";
import {
  BLOCK_DIRECT_CONVERSATION,
  DELETE_DIRECT_CONVERSATION,
  DELETE_DIRECT_MESSAGE,
  SET_DIRECT_CONVERSATION_PINNED,
  DIRECT_CONVERSATION,
  DIRECT_MESSAGES,
  ENSURE_DIRECT_CONVERSATION,
  MARK_DIRECT_CONVERSATION_DEAL,
  MARK_DIRECT_CONVERSATION_READ,
  MY_DIRECT_CONVERSATIONS,
  MY_UNREAD_CONVERSATION_COUNT,
  NOTIFY_IMAGE_UPLOADED,
  NOTIFY_VIDEO_UPLOADED,
  REPORT_DIRECT_CONVERSATION,
  REQUEST_IMAGE_UPLOAD,
  REQUEST_VIDEO_UPLOAD,
  SEND_DIRECT_MESSAGE,
  UNBLOCK_DIRECT_CONVERSATION,
} from "../graphql/operations";
import { MY_UNREAD_MESSAGE_COUNT } from "../graphql/unread";

const PAGE_SIZE = 40;

const sortMessagesChronologically = (items: Message[]) =>
  [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

const isOptimisticMessage = (message: Message) =>
  message.id.startsWith("optimistic:");

function createConversationViewportTabId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tab-${Math.random().toString(36).slice(2, 10)}`;
}

export function useInbox(
  lang: string,
  { embedded = false }: { embedded?: boolean } = {},
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authHydrated = useAuthHydrated();
  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const { requireAuth } = useAuthGuard(lang);
  const { on } = useSocket();
  const apolloClient = useApolloClient();

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composer, setComposer] = useState("");
  // Media the user picked but hasn't sent yet — shown as a preview above the
  // composer. Upload only happens on Send (with any typed caption attached).
  const [stagedMedia, setStagedMedia] = useState<{
    file: File;
    kind: "image" | "video";
    previewUrl: string;
  } | null>(null);
  // Text sends are optimistic (the bubble renders instantly and the composer
  // clears + stays active), so there's no "sending" lock on text. Kept as a
  // constant for the Composer's prop contract; media uses `isUploading`.
  const isSending = false;
  const [isUploading, setIsUploading] = useState(false);
  const [isConversationActionPending, setIsConversationActionPending] =
    useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  const ensureKeyRef = useRef<string | null>(null);
  const readKeyRef = useRef<string | null>(null);
  const conversationViewportTabIdRef = useRef<string>(
    createConversationViewportTabId(),
  );
  const selectedConversationIdRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingPulseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFilesRef = useRef<
    Map<string, { file: File; kind: "image" | "video"; text?: string }>
  >(new Map());
  // Optimistic text messages awaiting/retrying server confirmation, keyed by
  // clientMessageId so a failed send can be retried with the original text.
  const pendingTextRef = useRef<
    Map<string, { conversationId: string; text: string }>
  >(new Map());

  const contentIdParam = searchParams.get("contentId");

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversation?.id ?? null;
  }, [activeConversation?.id]);

  const {
    data: conversationsData,
    loading: conversationsLoading,
    refetch: refetchConversations,
  } = useQuery(MY_DIRECT_CONVERSATIONS, {
    variables: { limit: 40 },
    // Don't render an empty inbox while persisted auth is still being read.
    skip: !authHydrated || !isAuthenticated,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
  });

  const { data: unreadData, refetch: refetchUnreadCount } = useQuery(
    MY_UNREAD_CONVERSATION_COUNT,
    {
      skip: !isAuthenticated,
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
      notifyOnNetworkStatusChange: true,
    },
  );

  const { data: conversationData, loading: conversationLoading } = useQuery(
    DIRECT_CONVERSATION,
    {
      variables: { conversationId: selectedConversationId ?? "" },
      skip: !isAuthenticated || !selectedConversationId,
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
      notifyOnNetworkStatusChange: true,
    },
  );

  const {
    data: messagesData,
    loading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery(DIRECT_MESSAGES, {
    variables: {
      input: {
        conversationId: selectedConversationId ?? "",
        limit: PAGE_SIZE,
      },
    },
    skip: !isAuthenticated || !selectedConversationId,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
  });

  const [ensureConversation, { loading: ensuringConversation }] = useMutation(
    ENSURE_DIRECT_CONVERSATION,
  );
  const [sendDirectMessage] = useMutation(SEND_DIRECT_MESSAGE);
  const [markDirectConversationRead] = useMutation(
    MARK_DIRECT_CONVERSATION_READ,
    { refetchQueries: [MY_UNREAD_MESSAGE_COUNT] },
  );
  const [requestImageUpload] = useMutation(REQUEST_IMAGE_UPLOAD);
  const [notifyImageUploaded] = useMutation(NOTIFY_IMAGE_UPLOADED);
  const [requestVideoUpload] = useMutation(REQUEST_VIDEO_UPLOAD);
  const [notifyVideoUploaded] = useMutation(NOTIFY_VIDEO_UPLOADED);
  const [deleteDirectConversation] = useMutation(DELETE_DIRECT_CONVERSATION);
  const [deleteDirectMessage] = useMutation(DELETE_DIRECT_MESSAGE);
  const [setDirectConversationPinnedMutation] = useMutation(
    SET_DIRECT_CONVERSATION_PINNED,
  );
  const [blockDirectConversation] = useMutation(BLOCK_DIRECT_CONVERSATION);
  const [unblockDirectConversation] = useMutation(UNBLOCK_DIRECT_CONVERSATION);
  const [reportDirectConversation] = useMutation(REPORT_DIRECT_CONVERSATION);
  const [markDirectConversationDeal] = useMutation(
    MARK_DIRECT_CONVERSATION_DEAL,
  );

  // Apollo returns fresh `refetch` references as query state changes. Keeping
  // them in refs lets the socket-subscription effects below depend only on the
  // stable `on` — otherwise those effects tear down and re-subscribe on every
  // refetch-identity change, and because subscribing is async that churn opens
  // windows where no listener is attached and typing/presence events are lost.
  const refetchConversationsRef = useRef(refetchConversations);
  const refetchUnreadCountRef = useRef(refetchUnreadCount);
  const refetchMessagesRef = useRef(refetchMessages);
  useEffect(() => {
    refetchConversationsRef.current = refetchConversations;
    refetchUnreadCountRef.current = refetchUnreadCount;
    refetchMessagesRef.current = refetchMessages;
  }, [refetchConversations, refetchUnreadCount, refetchMessages]);

  useEffect(() => {
    if (!isAuthenticated) {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setSelectedConversationId(null);
      setTypingUserId(null);
      readKeyRef.current = null;
      ensureKeyRef.current = null;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const latest = ((
      conversationsData as
        | { myDirectConversations?: Conversation[] }
        | undefined
    )?.myDirectConversations ?? []) as Conversation[];

    setConversations((prev) => {
      if (latest.length === 0) return prev.length === 0 ? prev : [];

      const byId = new Map<string, Conversation>();
      for (const conversation of prev) byId.set(conversation.id, conversation);

      return latest.map((conversation) => ({
        ...byId.get(conversation.id),
        ...conversation,
      }));
    });
  }, [conversationsData]);

  useEffect(() => {
    const directConversation = (
      conversationData as
        | { directConversation?: Conversation | null }
        | undefined
    )?.directConversation;

    if (!directConversation) return;
    if (directConversation.id !== selectedConversationIdRef.current) return;

    setActiveConversation(directConversation as Conversation);
  }, [conversationData]);

  useEffect(() => {
    setMessages([]);
    setHasMoreOlder(true);
    setLoadingOlder(false);
    setTypingUserId(null);
    readKeyRef.current = null;
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setHasMoreOlder(true);
      return;
    }

    const rawBase = ((
      messagesData as { directConversationMessages?: Message[] } | undefined
    )?.directConversationMessages ?? []) as Message[];

    // Apollo can briefly expose cached data for the previous variables.
    // Ignore any response that is not for the active conversation.
    const base = rawBase.filter(
      (message) => message.conversationId === selectedConversationId,
    );
    if (rawBase.length > 0 && base.length === 0) return;
    if (selectedConversationIdRef.current !== selectedConversationId) return;

    setHasMoreOlder(base.length >= PAGE_SIZE);

    setMessages((prev) => {
      if (selectedConversationIdRef.current !== selectedConversationId)
        return prev;

      const sameThreadPrev = prev.filter(
        (message) =>
          message.conversationId === selectedConversationId ||
          (isOptimisticMessage(message) &&
            message.conversationId === selectedConversationId),
      );

      const byId = new Map<string, Message>();

      for (const message of sameThreadPrev) {
        byId.set(message.id, message);
      }

      for (const message of base) {
        const optimisticMatch = message.clientMessageId
          ? sameThreadPrev.find(
              (existing) =>
                existing.clientMessageId === message.clientMessageId,
            )
          : undefined;

        if (optimisticMatch && optimisticMatch.id !== message.id) {
          byId.delete(optimisticMatch.id);
        }

        const prevForId = byId.get(message.id) ?? optimisticMatch;
        const prevAsset = prevForId?.mediaAsset;
        byId.set(message.id, {
          ...optimisticMatch,
          ...byId.get(message.id),
          ...message,
          // Keep a renderable thumbnail (e.g. a video poster data URL we already
          // have) when the refetched message's asset doesn't carry one yet, so
          // the media doesn't blank out on a list refetch before processing ends.
          mediaAsset: message.mediaAsset
            ? {
                ...prevAsset,
                ...message.mediaAsset,
                thumbnailUrl:
                  message.mediaAsset.thumbnailUrl ??
                  prevAsset?.thumbnailUrl ??
                  null,
              }
            : (message.mediaAsset ?? prevAsset),
          localPreviewUrl:
            optimisticMatch?.localPreviewUrl ??
            byId.get(message.id)?.localPreviewUrl,
        });
      }

      return sortMessagesChronologically(Array.from(byId.values()));
    });
  }, [messagesData, selectedConversationId]);

  useEffect(() => {
    if (!contentIdParam) return;
    if (ensureKeyRef.current === contentIdParam) return;

    ensureKeyRef.current = contentIdParam;
    ensureConversation({ variables: { input: { contentId: contentIdParam } } })
      .then((result) => {
        const conversationId = (
          result.data as
            | { ensureDirectConversationId?: string }
            | undefined
        )?.ensureDirectConversationId;
        if (!conversationId) return;

        setSelectedConversationId(conversationId);
        // The ensure mutation deliberately returns only the stable identity.
        // DIRECT_CONVERSATION hydrates the header, listing and safety state as
        // soon as this id is selected; don't publish a half-shaped chat into
        // local/Apollo state while that query is in flight.
        if (!embedded) router.replace(`/${lang}/notifications/${conversationId}`);
        void refetchConversations();
      })
      .catch((error) => {
        ensureKeyRef.current = null;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not open the conversation",
        );
      });
  }, [contentIdParam, embedded, ensureConversation, lang, refetchConversations, router]);

  useEffect(() => {
    if (!selectedConversationId || !isAuthenticated) return;

    const socket = getSocket();
    const join = () =>
      socket.emit(WS_CLIENT_EVENTS.JOIN_CONVERSATION, selectedConversationId);
    join();

    // Server room membership is dropped when the socket disconnects (network
    // blip or ping timeout), and Socket.IO does NOT replay JOIN on reconnect —
    // so re-join on every `connect`, otherwise typing/message events sent to the
    // conversation room stop arriving until the thread is re-opened.
    const offConnect = on("connect", join);

    // Important: even when the network tab shows messages returned, Apollo/local
    // state can miss the first paint because of cache-and-network + route changes.
    // This explicit refetch makes the selected thread authoritative after join.
    // Read refetch through a ref so this effect keys ONLY on the conversation id
    // and auth — a changing refetch identity must not tear this down, or the
    // cleanup would LEAVE the conversation room and re-JOIN, and typing/message
    // events emitted to the room during that gap would be missed.
    void refetchMessagesRef.current?.({
      input: {
        conversationId: selectedConversationId,
        limit: PAGE_SIZE,
      },
    });

    return () => {
      offConnect();
      socket.emit(WS_CLIENT_EVENTS.LEAVE_CONVERSATION, selectedConversationId);
    };
  }, [isAuthenticated, on, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId || !isAuthenticated) return;

    const socket = getSocket();
    const tabId = conversationViewportTabIdRef.current;

    const syncViewport = () => {
      const payload: DirectConversationViewportPayload = {
        conversationId: selectedConversationId,
        tabId,
        isActive:
          document.visibilityState === "visible" &&
          (typeof document.hasFocus !== "function" || document.hasFocus()),
      };
      socket.emit(WS_CLIENT_EVENTS.SET_CONVERSATION_VIEWPORT, payload);
    };

    const refreshActiveViewport = () => {
      if (
        document.visibilityState !== "visible" ||
        (typeof document.hasFocus === "function" && !document.hasFocus())
      ) {
        return;
      }
      syncViewport();
    };

    syncViewport();
    const offConnect = on("connect", syncViewport);
    document.addEventListener("visibilitychange", syncViewport);
    window.addEventListener("focus", syncViewport);
    window.addEventListener("blur", syncViewport);
    const heartbeatId = window.setInterval(refreshActiveViewport, 20_000);

    return () => {
      offConnect();
      window.clearInterval(heartbeatId);
      document.removeEventListener("visibilitychange", syncViewport);
      window.removeEventListener("focus", syncViewport);
      window.removeEventListener("blur", syncViewport);
      socket.emit(WS_CLIENT_EVENTS.SET_CONVERSATION_VIEWPORT, {
        conversationId: selectedConversationId,
        tabId,
        isActive: false,
      } satisfies DirectConversationViewportPayload);
    };
  }, [isAuthenticated, on, selectedConversationId]);

  useEffect(
    () =>
      on<DirectMessageCreatedPayload>(
        WS_EVENTS.DM_MESSAGE_CREATED,
        (payload) => {
          if (payload.conversationId !== selectedConversationIdRef.current)
            return;

          setMessages((prev) =>
            upsertMessage(prev, fromSocketMessage(payload, currentUser?.id)),
          );
          void refetchConversationsRef.current();
          void refetchUnreadCountRef.current();
        },
      ),
    [currentUser?.id, on],
  );

  useEffect(
    () =>
      on<DirectMessageUpdatedPayload>(
        WS_EVENTS.DM_MESSAGE_UPDATED,
        (payload) => {
          if (payload.conversationId !== selectedConversationIdRef.current)
            return;
          setMessages((prev) => applyMessageUpdate(prev, payload));
          if (payload.kind === "deleted") {
            void refetchConversationsRef.current();
          }
        },
      ),
    [on],
  );

  useEffect(
    () =>
      on<DirectConversationUpdatedPayload>(
        WS_EVENTS.DM_CONVERSATION_UPDATED,
        (payload) => {
          setConversations((prev) => upsertConversation(prev, payload));

          if (activeConversationIdRef.current === payload.conversationId) {
            setActiveConversation((prev) =>
              prev
                ? {
                    ...prev,
                    lastMessageId: payload.lastMessageId,
                    lastMessageText: payload.lastMessageText,
                    lastMessageType: payload.lastMessageType,
                    lastMessageSenderId: payload.lastMessageSenderId,
                    lastMessageAt: payload.lastMessageAt,
                    myUnreadCount: payload.myUnreadCount,
                    isPinned: payload.isPinned ?? prev.isPinned,
                    dealClosedAt: payload.dealClosedAt ?? null,
                    dealClosedByUserId: payload.dealClosedByUserId ?? null,
                  }
                : prev,
            );
          }

          void refetchConversationsRef.current();
          void refetchUnreadCountRef.current();
        },
      ),
    [on],
  );

  useEffect(
    () =>
      on<DirectConversationRemovedPayload>(
        WS_EVENTS.DM_CONVERSATION_REMOVED,
        (payload) => {
          setConversations((prev) =>
            removeConversation(prev, payload.conversationId),
          );
          if (activeConversationIdRef.current === payload.conversationId) {
            setActiveConversation(null);
            setSelectedConversationId(null);
            setMessages([]);
            setTypingUserId(null);
            if (!embedded) router.push(`/${lang}/notifications`);
          }
          void refetchUnreadCountRef.current();
        },
      ),
    [embedded, lang, on, router],
  );

  useEffect(
    () =>
      on<DirectPresenceUpdatedPayload>(
        WS_EVENTS.DM_PRESENCE_UPDATED,
        (payload) => {
          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.otherParticipant?.id === payload.userId
                ? {
                    ...conversation,
                    otherParticipantOnline: payload.isOnline,
                    otherParticipantLastSeenAt:
                      payload.lastSeenAt ??
                      conversation.otherParticipantLastSeenAt,
                  }
                : conversation,
            ),
          );
          setActiveConversation((prev) =>
            prev?.otherParticipant?.id === payload.userId
              ? {
                  ...prev,
                  otherParticipantOnline: payload.isOnline,
                  otherParticipantLastSeenAt:
                    payload.lastSeenAt ?? prev.otherParticipantLastSeenAt,
                }
              : prev,
          );
        },
      ),
    [on],
  );

  useEffect(
    () =>
      on<DirectTypingUpdatedPayload>(WS_EVENTS.DM_TYPING_UPDATED, (payload) => {
        if (payload.conversationId !== selectedConversationIdRef.current)
          return;
        if (payload.userId === currentUser?.id) return;

        if (!payload.isTyping) {
          setTypingUserId(null);
          if (typingPulseRef.current) clearTimeout(typingPulseRef.current);
          return;
        }

        setTypingUserId(payload.userId);
        if (typingPulseRef.current) clearTimeout(typingPulseRef.current);
        typingPulseRef.current = setTimeout(() => setTypingUserId(null), 1800);
      }),
    [currentUser?.id, on],
  );

  // Revoke object URLs only on unmount — NOT on every message change. Revoking
  // on each change used to kill a blob preview that was still on screen (e.g.
  // right after an upload reconciled, or when an unrelated message arrived),
  // leaving a broken image until refresh.
  const blobUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const message of messages) {
      if (message.localPreviewUrl?.startsWith("blob:")) {
        blobUrlsRef.current.add(message.localPreviewUrl);
      }
    }
  }, [messages]);
  useEffect(() => {
    const blobUrls = blobUrlsRef.current;
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingPulseRef.current) clearTimeout(typingPulseRef.current);
      for (const url of blobUrls) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (
      !lastMessage ||
      lastMessage.senderId === currentUser?.id ||
      isOptimisticMessage(lastMessage)
    )
      return;

    const readKey = `${selectedConversationId}:${lastMessage.id}`;
    if (readKeyRef.current === readKey) return;
    readKeyRef.current = readKey;

    markDirectConversationRead({
      variables: {
        input: {
          conversationId: selectedConversationId,
          upToMessageId: lastMessage.id,
        },
      },
    })
      .then(() => {
        void refetchUnreadCount();
      })
      .catch(() => {
        readKeyRef.current = null;
      });
  }, [
    currentUser?.id,
    markDirectConversationRead,
    messages,
    refetchUnreadCount,
    selectedConversationId,
  ]);

  const selectedConversation = useMemo(
    () =>
      activeConversation ??
      conversations.find(
        (conversation) => conversation.id === selectedConversationId,
      ) ??
      null,
    [activeConversation, conversations, selectedConversationId],
  );
  const isConversationReadyForSending = Boolean(
    selectedConversationId &&
      selectedConversation &&
      !ensuringConversation &&
      !conversationLoading &&
      !(messagesLoading && messages.length === 0),
  );

  const unreadThreads =
    (unreadData as { myUnreadDirectConversationCount?: number } | undefined)
      ?.myUnreadDirectConversationCount ?? 0;

  const navigateToConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);
      if (!embedded) router.push(`/${lang}/notifications/${conversationId}`);
    },
    [embedded, lang, router],
  );

  /**
   * Ensure (create-or-reuse) the conversation for a content/post, select it, and
   * swap the URL to the real conversation id IN PLACE (history.replaceState — no
   * Next navigation, so the chat screen doesn't remount or flicker). Used when
   * opening a chat directly from a post's "Message" button.
   */
  const ensureConversationByContent = useCallback(
    async (
      contentId: string,
      options?: {
        /**
         * When embedded (e.g. the content sheet's chat column) the browser URL
         * must stay on the post route, so skip the history rewrite below.
         */
        skipUrlSync?: boolean;
      },
    ) => {
      // Dedupe only the in-flight request (the resolving effect can fire twice
      // for the same mount). The ref is released in `finally` so re-opening the
      // SAME post later — e.g. tapping "Message" again after returning to the
      // feed — runs the ensure again and swaps `?source=content` out of the URL.
      if (ensureKeyRef.current === contentId) return;
      ensureKeyRef.current = contentId;
      try {
        const result = await ensureConversation({
          variables: { input: { contentId } },
        });
        const conversationId = (
          result.data as
            | { ensureDirectConversationId?: string }
            | undefined
        )?.ensureDirectConversationId;
        if (!conversationId) return;

        setSelectedConversationId(conversationId);
        // Selecting the id immediately starts the authoritative conversation
        // and message queries. Keep the pending shell visible until that full
        // snapshot arrives instead of rendering a partial conversation.
        // Replace the URL without a navigation so we stay on the same chat
        // screen. Skipped when embedded so the post route stays in the URL.
        if (!embedded && !options?.skipUrlSync && typeof window !== "undefined") {
          window.history.replaceState(
            window.history.state,
            "",
            `/${lang}/notifications/${conversationId}`,
          );
        }
        void refetchConversations();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not open the conversation",
        );
      } finally {
        ensureKeyRef.current = null;
      }
    },
    [embedded, ensureConversation, lang, refetchConversations],
  );

  /** Ensure the seller conversation that a story's Enquire action opens. */
  const ensureConversationByStory = useCallback(
    async (storyId: string) => {
      const key = `story:${storyId}`;
      if (ensureKeyRef.current === key) return;
      ensureKeyRef.current = key;
      try {
        const result = await ensureConversation({
          variables: { input: { storyId } },
        });
        const conversationId = (
          result.data as
            | { ensureDirectConversationId?: string }
            | undefined
        )?.ensureDirectConversationId;
        if (!conversationId) return;

        setSelectedConversationId(conversationId);
        if (!embedded && typeof window !== "undefined") {
          window.history.replaceState(
            window.history.state,
            "",
            `/${lang}/notifications/${conversationId}`,
          );
        }
        void refetchConversations();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not open the conversation",
        );
      } finally {
        ensureKeyRef.current = null;
      }
    },
    [embedded, ensureConversation, lang, refetchConversations],
  );

  const handleBack = useCallback(() => {
    setSelectedConversationId(null);
    setActiveConversation(null);
    setMessages([]);
    setTypingUserId(null);
    if (!embedded) router.back();
  }, [embedded, router]);

  const sendTypingPulse = useCallback(() => {
    if (!selectedConversationId) return;

    const socket = getSocket();
    socket.emit(WS_CLIENT_EVENTS.START_TYPING, selectedConversationId);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit(WS_CLIENT_EVENTS.STOP_TYPING, selectedConversationId);
    }, 1200);
  }, [selectedConversationId]);

  const handleComposerChange = useCallback(
    (value: string) => {
      setComposer(value);
      if (value.trim()) sendTypingPulse();
    },
    [sendTypingPulse],
  );

  /**
   * Fire the send mutation for an already-optimistically-rendered text message
   * and reconcile the result. On failure the optimistic row is flipped to
   * "failed" so it can be retried — the message is never dropped (sends are
   * also queued server-side in a worker, so a confirmed send won't be lost).
   */
  const sendTextMessage = useCallback(
    async (clientMessageId: string, conversationId: string, text: string) => {
      pendingTextRef.current.set(clientMessageId, { conversationId, text });
      try {
        const { data } = await sendDirectMessage({
          variables: { input: { conversationId, text, clientMessageId } },
        });

        const message = (data as { sendDirectMessage?: Message } | undefined)
          ?.sendDirectMessage;
        if (message) {
          setMessages((prev) =>
            upsertMessage(prev, { ...message, clientMessageId }),
          );
          pendingTextRef.current.delete(clientMessageId);
          void refetchConversations();
        }
      } catch {
        // Keep the message in the thread and let the user retry — don't toast on
        // every transient failure (WhatsApp-style: a tap-to-retry indicator).
        setMessages((prev) =>
          prev.map((item) =>
            item.clientMessageId === clientMessageId
              ? { ...item, pendingStatus: "failed" }
              : item,
          ),
        );
      }
    },
    [refetchConversations, sendDirectMessage],
  );

  /**
   * Optimistically send a text message. With no argument it sends (and clears)
   * the composer; with explicit text it sends that instead — used by the
   * quick-reply chips, which send a canned message without touching the input.
   */
  const handleSendText = useCallback(
    (explicitText?: string) => {
      const conversationId = selectedConversationIdRef.current;
      const myId = currentUser?.id;
      const fromComposer = explicitText === undefined;
      const text = (explicitText ?? composer).trim();
      if (!conversationId || !text || !myId || !isConversationReadyForSending) return;
      if (selectedConversation?.canSendMessages === false) {
        toast.error(
          selectedConversation.blockedByMe
            ? "You have blocked this user"
            : "You can no longer send messages in this conversation",
        );
        return;
      }

      const clientMessageId = crypto.randomUUID();

      // Optimistic: render the bubble and clear the input immediately so the
      // composer stays active (send another right away — like WhatsApp).
      const optimistic: Message = {
        id: `optimistic:${clientMessageId}`,
        conversationId,
        contentId: selectedConversation?.contentId ?? "",
        senderId: myId,
        recipientId: selectedConversation?.otherParticipant?.id ?? "",
        type: "TEXT",
        text,
        createdAt: new Date().toISOString(),
        isMine: true,
        deliveryStatus: "sent",
        clientMessageId,
        pendingStatus: "sending",
      };

      setMessages((prev) => sortMessagesChronologically([...prev, optimistic]));
      if (fromComposer) setComposer("");

      void sendTextMessage(clientMessageId, conversationId, text);
    },
    [
      composer,
      currentUser?.id,
      isConversationReadyForSending,
      selectedConversation,
      sendTextMessage,
    ],
  );

  /** Send a canned quick-reply ("peel") directly, bypassing the composer. */
  const sendQuickReply = useCallback(
    (text: string) => {
      handleSendText(text);
    },
    [handleSendText],
  );

  /**
   * Optimistically share a pinned location (the sender's current GPS position).
   * Renders a LOCATION bubble immediately, then fires the send mutation and
   * reconciles — mirroring the text-send lifecycle (tap-to-retry on failure).
   */
  const sendLocation = useCallback(
    (latitude: number, longitude: number, locationLabel?: string) => {
      const conversationId = selectedConversationIdRef.current;
      const myId = currentUser?.id;
      if (!conversationId || !myId || !isConversationReadyForSending) return;
      if (selectedConversation?.canSendMessages === false) {
        toast.error(
          selectedConversation.blockedByMe
            ? "You have blocked this user"
            : "You can no longer send messages in this conversation",
        );
        return;
      }

      const clientMessageId = crypto.randomUUID();
      const optimistic: Message = {
        id: `optimistic:${clientMessageId}`,
        conversationId,
        contentId: selectedConversation?.contentId ?? "",
        senderId: myId,
        recipientId: selectedConversation?.otherParticipant?.id ?? "",
        type: "LOCATION",
        latitude,
        longitude,
        locationLabel: locationLabel ?? null,
        createdAt: new Date().toISOString(),
        isMine: true,
        deliveryStatus: "sent",
        clientMessageId,
        pendingStatus: "sending",
      };
      setMessages((prev) => sortMessagesChronologically([...prev, optimistic]));

      void (async () => {
        try {
          const { data } = await sendDirectMessage({
            variables: {
              input: {
                conversationId,
                latitude,
                longitude,
                locationLabel,
                clientMessageId,
              },
            },
          });
          const message = (data as { sendDirectMessage?: Message } | undefined)
            ?.sendDirectMessage;
          if (message) {
            setMessages((prev) =>
              upsertMessage(prev, { ...message, clientMessageId }),
            );
            void refetchConversations();
          }
        } catch {
          setMessages((prev) =>
            prev.map((item) =>
              item.clientMessageId === clientMessageId
                ? { ...item, pendingStatus: "failed" }
                : item,
            ),
          );
        }
      })();
    },
    [
      currentUser?.id,
      isConversationReadyForSending,
      selectedConversation,
      sendDirectMessage,
      refetchConversations,
    ],
  );

  const runMediaUpload = useCallback(
    async (
      clientMessageId: string,
      conversationId: string,
      file: File,
      kind: "image" | "video",
      text?: string,
    ) => {
      const markFailed = () =>
        setMessages((prev) =>
          prev.map((message) =>
            message.clientMessageId === clientMessageId
              ? { ...message, pendingStatus: "failed" }
              : message,
          ),
        );

      setIsUploading(true);

      try {
        let mediaAssetId: string | undefined;
        let uploadUrl: string | undefined;

        if (kind === "image") {
          const { data } = await requestImageUpload({
            variables: { mimeType: file.type || "image/jpeg" },
          });
          const result = (
            data as
              | {
                  requestImageUpload?: {
                    mediaAssetId?: string;
                    uploadUrl?: string;
                  };
                }
              | undefined
          )?.requestImageUpload;
          mediaAssetId = result?.mediaAssetId;
          uploadUrl = result?.uploadUrl;
        } else {
          const { data } = await requestVideoUpload({
            variables: { corsOrigin: window.location.origin },
          });
          const result = (
            data as
              | {
                  requestVideoUpload?: {
                    mediaAssetId?: string;
                    uploadUrl?: string;
                  };
                }
              | undefined
          )?.requestVideoUpload;
          mediaAssetId = result?.mediaAssetId;
          uploadUrl = result?.uploadUrl;
        }

        if (!mediaAssetId || !uploadUrl)
          throw new Error("Could not start upload");

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type":
              file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
          },
        });

        if (!uploadResponse.ok)
          throw new Error(`Upload failed: ${uploadResponse.status}`);

        setMessages((prev) =>
          prev.map((message) =>
            message.clientMessageId === clientMessageId
              ? { ...message, pendingStatus: "sending" }
              : message,
          ),
        );

        if (kind === "image")
          await notifyImageUploaded({ variables: { mediaAssetId } });
        else await notifyVideoUploaded({ variables: { mediaAssetId } });

        const result = await sendDirectMessage({
          variables: {
            input: { conversationId, text, mediaAssetId, clientMessageId },
          },
        });

        const message = (
          result.data as { sendDirectMessage?: Message } | undefined
        )?.sendDirectMessage;
        if (message) {
          setMessages((prev) => {
            const optimisticMessage = prev.find(
              (item) => item.clientMessageId === clientMessageId,
            );
            const posterThumb = optimisticMessage?.mediaAsset?.thumbnailUrl;
            return upsertMessage(prev, {
              ...message,
              clientMessageId,
              localPreviewUrl: optimisticMessage?.localPreviewUrl ?? null,
              // Keep showing the optimistic still (image object URL / video poster)
              // until the server has produced its own thumbnail, so the buffer
              // doesn't blink out while processing finishes.
              mediaAsset: message.mediaAsset
                ? {
                    ...message.mediaAsset,
                    thumbnailUrl:
                      message.mediaAsset.thumbnailUrl ?? posterThumb ?? null,
                  }
                : message.mediaAsset,
              pendingStatus: undefined,
            });
          });

          pendingFilesRef.current.delete(clientMessageId);
          void refetchConversations();
        }
      } catch (error) {
        markFailed();
        toast.error(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [
      notifyImageUploaded,
      notifyVideoUploaded,
      refetchConversations,
      requestImageUpload,
      requestVideoUpload,
      sendDirectMessage,
    ],
  );

  /**
   * Stage a picked file as a preview above the composer. Nothing is uploaded
   * yet — the user can type a caption and send (or remove) it. Replaces any
   * previously staged media (revoking its object URL).
   */
  const stageMedia = useCallback(
    async (file: File, kind: "image" | "video") => {
      if (!isConversationReadyForSending) return;
      if (selectedConversation?.canSendMessages === false) {
        toast.error(
          selectedConversation.blockedByMe
            ? "You have blocked this user"
            : "You can no longer send messages in this conversation",
        );
        return;
      }

      // For video, capture a poster frame (data URL) so the preview/buffer shows
      // an actual still — a raw video blob can't render as an image. Images use
      // a plain object URL (renders directly).
      const previewUrl =
        kind === "video"
          ? ((await videoPosterFromFile(file)) ?? "")
          : URL.createObjectURL(file);

      setStagedMedia((prev) => {
        if (prev?.previewUrl?.startsWith("blob:"))
          URL.revokeObjectURL(prev.previewUrl);
        return { file, kind, previewUrl };
      });
    },
    [isConversationReadyForSending, selectedConversation],
  );

  const clearStagedMedia = useCallback(() => {
    setStagedMedia((prev) => {
      if (prev?.previewUrl?.startsWith("blob:"))
        URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  /** Optimistically render a media message and upload it (with optional caption). */
  const sendMedia = useCallback(
    async (
      file: File,
      kind: "image" | "video",
      previewUrl: string,
      text?: string,
    ) => {
      const myId = currentUser?.id;
      const conversationId = selectedConversationIdRef.current;
      if (!conversationId || !myId || !isConversationReadyForSending) return;

      const textToSend = text?.trim() || undefined;
      const clientMessageId = crypto.randomUUID();

      pendingFilesRef.current.set(clientMessageId, {
        file,
        kind,
        text: textToSend,
      });

      const optimistic: Message = {
        id: `optimistic:${clientMessageId}`,
        conversationId,
        contentId: selectedConversation?.contentId ?? "",
        senderId: myId,
        recipientId: selectedConversation?.otherParticipant?.id ?? "",
        type: kind === "video" ? "VIDEO" : "IMAGE",
        text: textToSend ?? null,
        createdAt: new Date().toISOString(),
        isMine: true,
        deliveryStatus: "sent",
        clientMessageId,
        localPreviewUrl: previewUrl,
        pendingStatus: "uploading",
        mediaAsset: {
          id: `optimistic-media:${clientMessageId}`,
          type: kind === "video" ? "VIDEO" : "IMAGE",
          status: "PENDING",
          // previewUrl is a renderable still in both cases — an object URL for an
          // image, and a captured poster frame (data URL) for a video — so the
          // bubble shows a real buffer during upload. The processed Mux/server
          // thumbnail replaces it once it arrives.
          thumbnailUrl: previewUrl || null,
        },
      };

      setMessages((prev) => sortMessagesChronologically([...prev, optimistic]));

      await runMediaUpload(
        clientMessageId,
        conversationId,
        file,
        kind,
        textToSend,
      );
    },
    [
      currentUser?.id,
      isConversationReadyForSending,
      runMediaUpload,
      selectedConversation,
    ],
  );

  /**
   * Unified send: if media is staged, upload it (with the typed caption); then
   * send any remaining text as its own message. Mirrors WhatsApp — the caption
   * rides with the media, and a separate text-only line also works.
   */
  const handleSend = useCallback(() => {
    const conversationId = selectedConversationIdRef.current;
    if (!conversationId || !currentUser?.id || !isConversationReadyForSending) return;
    if (selectedConversation?.canSendMessages === false) {
      toast.error(
        selectedConversation.blockedByMe
          ? "You have blocked this user"
          : "You can no longer send messages in this conversation",
      );
      return;
    }

    const caption = composer.trim();

    if (stagedMedia) {
      // Caption travels with the media; clear the composer + staging up front so
      // the input stays active for the next message.
      void sendMedia(
        stagedMedia.file,
        stagedMedia.kind,
        stagedMedia.previewUrl,
        caption || undefined,
      );
      setStagedMedia(null);
      setComposer("");
      return;
    }

    if (caption) handleSendText();
  }, [
    composer,
    currentUser?.id,
    handleSendText,
    isConversationReadyForSending,
    selectedConversation,
    sendMedia,
    stagedMedia,
  ]);

  const retryMessage = useCallback(
    async (message: Message) => {
      const clientMessageId = message.clientMessageId;
      if (!clientMessageId) return;

      // Text message retry.
      const pendingText = pendingTextRef.current.get(clientMessageId);
      if (pendingText) {
        setMessages((prev) =>
          prev.map((item) =>
            item.clientMessageId === clientMessageId
              ? { ...item, pendingStatus: "sending" }
              : item,
          ),
        );
        await sendTextMessage(
          clientMessageId,
          pendingText.conversationId,
          pendingText.text,
        );
        return;
      }

      // Media message retry.
      const pending = pendingFilesRef.current.get(clientMessageId);
      if (!pending) return;

      setMessages((prev) =>
        prev.map((item) =>
          item.clientMessageId === clientMessageId
            ? { ...item, pendingStatus: "uploading" }
            : item,
        ),
      );

      await runMediaUpload(
        clientMessageId,
        message.conversationId,
        pending.file,
        pending.kind,
        pending.text,
      );
    },
    [runMediaUpload, sendTextMessage],
  );

  const discardMessage = useCallback((message: Message) => {
    const clientMessageId = message.clientMessageId;

    setMessages((prev) => prev.filter((item) => item.id !== message.id));

    if (clientMessageId) {
      const optimistic = pendingFilesRef.current.get(clientMessageId);
      const previewUrl = message.localPreviewUrl;
      if (optimistic && previewUrl?.startsWith("blob:"))
        URL.revokeObjectURL(previewUrl);
      pendingFilesRef.current.delete(clientMessageId);
      pendingTextRef.current.delete(clientMessageId);
    }
  }, []);

  const loadOlderMessages = useCallback(async (): Promise<number> => {
    const conversationId = selectedConversationIdRef.current;
    if (!conversationId || loadingOlder || !hasMoreOlder) return 0;

    const oldest = messages.find((message) => !isOptimisticMessage(message));
    if (!oldest) return 0;

    setLoadingOlder(true);

    try {
      const { data } = await apolloClient.query({
        query: DIRECT_MESSAGES,
        variables: {
          input: { conversationId, limit: PAGE_SIZE, beforeId: oldest.id },
        },
        fetchPolicy: "network-only",
      });

      const olderRaw =
        (data as { directConversationMessages?: Message[] } | undefined)
          ?.directConversationMessages ?? [];
      const older = olderRaw.filter(
        (message) => message.conversationId === conversationId,
      );

      if (selectedConversationIdRef.current !== conversationId) return 0;

      setHasMoreOlder(older.length >= PAGE_SIZE);
      if (older.length === 0) return 0;

      let added = 0;
      setMessages((prev) => {
        if (selectedConversationIdRef.current !== conversationId) return prev;

        const ids = new Set(prev.map((message) => message.id));
        const fresh = older.filter((message) => !ids.has(message.id));
        added = fresh.length;

        if (fresh.length === 0) return prev;
        return sortMessagesChronologically([...fresh, ...prev]);
      });

      return added;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load older messages",
      );
      return 0;
    } finally {
      setLoadingOlder(false);
    }
  }, [apolloClient, hasMoreOlder, loadingOlder, messages]);

  const handleContinue = useCallback(() => {
    if (!requireAuth()) return;
    if (conversations[0]) navigateToConversation(conversations[0].id);
  }, [conversations, navigateToConversation, requireAuth]);

  const mergeConversationSnapshot = useCallback(
    (conversation: Conversation) => {
      setActiveConversation((prev) =>
        prev?.id === conversation.id ? { ...prev, ...conversation } : prev,
      );
      setConversations((prev) => {
        const existing = prev.find((item) => item.id === conversation.id);
        if (!existing) return [conversation, ...prev];
        return upsertConversation(prev, {
          conversationId: conversation.id,
          contentId: conversation.contentId,
          sellerId: conversation.sellerId,
          buyerId: conversation.buyerId,
          lastMessageId: conversation.lastMessageId ?? undefined,
          lastMessageText: conversation.lastMessageText ?? undefined,
          lastMessageType:
            (conversation.lastMessageType?.toLowerCase() as
              | "text"
              | "image"
              | "video"
              | undefined) ?? undefined,
          lastMessageSenderId: conversation.lastMessageSenderId ?? undefined,
          lastMessageAt: conversation.lastMessageAt ?? undefined,
          myUnreadCount: conversation.myUnreadCount ?? 0,
          blockedByMe: conversation.blockedByMe ?? undefined,
          blockedByOther: conversation.blockedByOther ?? undefined,
          canSendMessages: conversation.canSendMessages ?? undefined,
          lifecycleStatus: conversation.lifecycleStatus ?? undefined,
          sellerFirstResponseMinutes:
            conversation.sellerFirstResponseMinutes ?? undefined,
          buyerFirstResponseMinutes:
            conversation.buyerFirstResponseMinutes ?? undefined,
          dealClosedAt: conversation.dealClosedAt ?? undefined,
          dealClosedByUserId: conversation.dealClosedByUserId ?? undefined,
        });
      });
    },
    [],
  );

  const deleteSelectedConversation = useCallback(
    async (targetId?: string) => {
      const conversationId = targetId ?? selectedConversationIdRef.current;
      if (!conversationId) return false;

      setIsConversationActionPending(true);
      try {
        const { data } = await deleteDirectConversation({
          variables: { conversationId },
        });
        const ok = (data as { deleteDirectConversation?: boolean } | undefined)
          ?.deleteDirectConversation;
        if (!ok) {
          toast.error("Could not delete this conversation");
          return false;
        }

        setConversations((prev) => removeConversation(prev, conversationId));
        // Only reset the open thread if we deleted the one currently open.
        if (selectedConversationIdRef.current === conversationId) {
          setActiveConversation(null);
          setSelectedConversationId(null);
          setMessages([]);
          setTypingUserId(null);
          if (!embedded) router.push(`/${lang}/notifications`);
        }
        void refetchUnreadCount();
        toast.success("Conversation deleted");
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not delete this conversation",
        );
        return false;
      } finally {
        setIsConversationActionPending(false);
      }
    },
    [deleteDirectConversation, embedded, lang, refetchUnreadCount, router],
  );

  const setConversationPinned = useCallback(
    async (conversationId: string, pinned: boolean) => {
      if (!conversationId) return false;
      setIsConversationActionPending(true);
      try {
        const { data } = await setDirectConversationPinnedMutation({
          variables: { conversationId, pinned },
        });
        const ok = (
          data as { setDirectConversationPinned?: boolean } | undefined
        )?.setDirectConversationPinned;
        if (!ok) {
          toast.error("Could not update this conversation");
          return false;
        }

        setConversations((prev) =>
          prev
            .map((conversation) =>
              conversation.id === conversationId
                ? { ...conversation, isPinned: pinned }
                : conversation,
            )
            .sort((left, right) => {
              if (left.isPinned && !right.isPinned) return -1;
              if (!left.isPinned && right.isPinned) return 1;
              return (
                new Date(right.lastMessageAt ?? 0).getTime() -
                new Date(left.lastMessageAt ?? 0).getTime()
              );
            }),
        );
        setActiveConversation((prev) =>
          prev?.id === conversationId ? { ...prev, isPinned: pinned } : prev,
        );
        toast.success(pinned ? "Conversation pinned" : "Conversation unpinned");
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not update this conversation",
        );
        return false;
      } finally {
        setIsConversationActionPending(false);
      }
    },
    [setDirectConversationPinnedMutation],
  );

  const deleteMessage = useCallback(
    async (message: Message) => {
      if (
        !currentUser?.id ||
        message.senderId !== currentUser.id ||
        message.isDeleted ||
        message.pendingStatus
      ) {
        return false;
      }

      try {
        const { data } = await deleteDirectMessage({
          variables: { messageId: message.id },
        });
        const ok = (data as { deleteDirectMessage?: boolean } | undefined)
          ?.deleteDirectMessage;
        if (!ok) {
          toast.error("Could not delete this message");
          return false;
        }

        setMessages((prev) =>
          applyMessageUpdate(prev, {
            kind: "deleted",
            conversationId: message.conversationId,
            messageIds: [message.id],
          }),
        );
        void refetchConversations();
        toast.success("Message deleted for everyone");
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not delete this message",
        );
        return false;
      }
    },
    [currentUser, deleteDirectMessage, refetchConversations],
  );

  const blockSelectedConversation = useCallback(
    async (targetId?: string) => {
      const conversationId = targetId ?? selectedConversationIdRef.current;
      if (!conversationId) return false;

      setIsConversationActionPending(true);
      try {
        const { data } = await blockDirectConversation({
          variables: { conversationId },
        });
        const conversation = (
          data as { blockDirectConversation?: Conversation } | undefined
        )?.blockDirectConversation;
        if (!conversation) {
          toast.error("Could not block this user");
          return false;
        }

        mergeConversationSnapshot(conversation);
        void refetchConversations();
        toast.success("User blocked");
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not block this user",
        );
        return false;
      } finally {
        setIsConversationActionPending(false);
      }
    },
    [blockDirectConversation, mergeConversationSnapshot, refetchConversations],
  );

  const unblockSelectedConversation = useCallback(
    async (targetId?: string) => {
      const conversationId = targetId ?? selectedConversationIdRef.current;
      if (!conversationId) return false;

      setIsConversationActionPending(true);
      try {
        const { data } = await unblockDirectConversation({
          variables: { conversationId },
        });
        const conversation = (
          data as { unblockDirectConversation?: Conversation } | undefined
        )?.unblockDirectConversation;
        if (!conversation) {
          toast.error("Could not unblock this user");
          return false;
        }

        mergeConversationSnapshot(conversation);
        void refetchConversations();
        toast.success("User unblocked");
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not unblock this user",
        );
        return false;
      } finally {
        setIsConversationActionPending(false);
      }
    },
    [
      mergeConversationSnapshot,
      refetchConversations,
      unblockDirectConversation,
    ],
  );

  const reportSelectedConversation = useCallback(
    async (reason: string, details?: string, targetId?: string) => {
      const conversationId = targetId ?? selectedConversationIdRef.current;
      if (!conversationId) return false;

      setIsConversationActionPending(true);
      try {
        const { data } = await reportDirectConversation({
          variables: {
            input: {
              conversationId,
              reason,
              details: details?.trim() || undefined,
            },
          },
        });
        const ok = (data as { reportDirectConversation?: boolean } | undefined)
          ?.reportDirectConversation;
        if (!ok) {
          toast.error("Could not submit this report");
          return false;
        }
        toast.success("Report submitted");
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not submit this report",
        );
        return false;
      } finally {
        setIsConversationActionPending(false);
      }
    },
    [reportDirectConversation],
  );

  const markDealForConversation = useCallback(
    async (closed: boolean, targetId?: string) => {
      const conversationId = targetId ?? selectedConversationIdRef.current;
      if (!conversationId) return false;

      setIsConversationActionPending(true);
      try {
        const { data } = await markDirectConversationDeal({
          variables: { input: { conversationId, closed } },
        });
        const conversation = (
          data as { markDirectConversationDeal?: Conversation } | undefined
        )?.markDirectConversationDeal;
        if (!conversation) {
          toast.error("Could not update the deal status");
          return false;
        }

        mergeConversationSnapshot(conversation);
        void refetchConversations();
        toast.success(closed ? "Deal marked as closed" : "Deal reopened");
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not update the deal status",
        );
        return false;
      } finally {
        setIsConversationActionPending(false);
      }
    },
    [
      markDirectConversationDeal,
      mergeConversationSnapshot,
      refetchConversations,
    ],
  );

  return {
    // identity / auth
    currentUser,
    isAuthenticated,
    requireAuth,
    // data
    conversations,
    selectedConversation,
    selectedConversationId,
    messages,
    composer,
    stagedMedia,
    typingUserId,
    unreadThreads,
    // loading flags
    conversationsLoading: !authHydrated || conversationsLoading,
    conversationLoading,
    messagesLoading,
    ensuringConversation,
    isSending,
    isUploading,
    isConversationActionPending,
    loadingOlder,
    hasMoreOlder,
    // actions
    navigateToConversation,
    ensureConversationByContent,
    ensureConversationByStory,
    handleBack,
    handleComposerChange,
    handleSendText,
    handleSend,
    sendQuickReply,
    sendLocation,
    stageMedia,
    clearStagedMedia,
    retryMessage,
    discardMessage,
    loadOlderMessages,
    handleContinue,
    deleteSelectedConversation,
    setConversationPinned,
    deleteMessage,
    blockSelectedConversation,
    unblockSelectedConversation,
    reportSelectedConversation,
    markDealForConversation,
  };
}

export type UseInbox = ReturnType<typeof useInbox>;
