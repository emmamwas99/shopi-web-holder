"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import Image from "next/image";
import {
  Bot,
  Clock3,
  ImagePlus,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { DiscoverGridCard } from "@/features/discover/components/DiscoverGridCard";
import {
  ASK_SHOPI_CONVERSATIONS,
  ASK_SHOPI_CONVERSATION_RESULTS,
  DELETE_ASK_SHOPI_CONVERSATION,
  SHOPI_BUYER_TURN,
  toCriteriaInput,
  type BuyerAsk,
  type BuyerCriteria,
  type SavedAskShopiConversation,
  type ShopiBuyerTurnResult,
} from "@/features/feed/graphql/askShopi";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";

type ChatMessage = {
  id: string;
  role: "agent" | "user";
  text: string;
  imagePreviewUrl?: string;
  imageAlt?: string;
};

type StagedImage = {
  dataUrl: string;
  name: string;
};

type AskShopiConversation = {
  id: string;
  serverId?: string | null;
  title: string;
  messages: ChatMessage[];
  criteria?: BuyerCriteria;
  results: ContentCardFieldsFragment[];
  hasSearched: boolean;
  lastTurnReadyToSearch: boolean;
  ask: BuyerAsk | null;
  createdAt: number;
  updatedAt: number;
};

let msgSeq = 0;
const nextId = () => `am${Date.now().toString(36)}-${(msgSeq += 1)}`;
const STORAGE_KEY = "shopi-ask-shopi-conversations";
const MAX_CONVERSATIONS = 16;
const MAX_CHAT_IMAGE_BYTES = 6 * 1024 * 1024;
const NEW_CONVERSATION_TITLE = "New product search";
const LEGACY_NEW_CONVERSATION_TITLE = "New search";

const GREETING =
  "Hi, I'm your Shopi buyer agent. Describe what you want, add a photo if you have one, and share the location or budget. I'll ask only what's needed, then bring back matching products.";
const AGENT_TECHNICAL_ISSUE_MESSAGE =
  "Our agent is experiencing technical issues right now. Please try again in a moment.";
const MAX_TEXTAREA_HEIGHT = 120;

interface Props {
  lang: string;
  active?: boolean;
  /** Shown as a close button when Ask Shopi opens over another screen (Browse). */
  onClose?: () => void;
}

function createConversation(): AskShopiConversation {
  const now = Date.now();
  return {
    id: `asc-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    serverId: null,
    title: NEW_CONVERSATION_TITLE,
    messages: [{ id: nextId(), role: "agent", text: GREETING }],
    criteria: undefined,
    results: [],
    hasSearched: false,
    lastTurnReadyToSearch: false,
    ask: null,
    createdAt: now,
    updatedAt: now,
  };
}

function conversationTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return NEW_CONVERSATION_TITLE;
  return clean.length > 48 ? `${clean.slice(0, 45)}...` : clean;
}

function isNewConversationTitle(title: string): boolean {
  return title === NEW_CONVERSATION_TITLE || title === LEGACY_NEW_CONVERSATION_TITLE;
}

function savedConversationTitle(title: string | null | undefined): string {
  if (!title || isNewConversationTitle(title)) return NEW_CONVERSATION_TITLE;
  return title;
}

function parseStoredConversations(raw: string | null): AskShopiConversation[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<AskShopiConversation>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => typeof item.id === "string")
      .map((item) => {
        const messages: ChatMessage[] =
          Array.isArray(item.messages) && item.messages.length > 0
          ? item.messages.filter(
              (message): message is ChatMessage =>
                typeof message?.id === "string" &&
                (message.role === "agent" || message.role === "user") &&
                typeof message.text === "string",
            )
          : [{ id: nextId(), role: "agent", text: GREETING }];

        return {
          id: item.id!,
          serverId: item.serverId ?? null,
          title: savedConversationTitle(item.title),
          messages,
          criteria: item.criteria,
          results: Array.isArray(item.results) ? item.results : [],
          hasSearched: Boolean(item.hasSearched),
          lastTurnReadyToSearch: Boolean(item.lastTurnReadyToSearch),
          ask: item.ask ?? null,
          createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
          updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CONVERSATIONS);
  } catch {
    return [];
  }
}

function fromServerConversation(
  conversation: SavedAskShopiConversation,
): AskShopiConversation {
  const updatedAt =
    typeof conversation.updatedAt === "number"
      ? conversation.updatedAt
      : Date.parse(String(conversation.updatedAt)) || Date.now();
  const createdAt =
    typeof conversation.createdAt === "number"
      ? conversation.createdAt
      : Date.parse(String(conversation.createdAt)) || updatedAt;

  return {
    id: conversation.id,
    serverId: conversation.id,
    title: savedConversationTitle(conversation.title),
    messages:
      conversation.messages.length > 0
        ? conversation.messages.map((message, index) => ({
            id: `${conversation.id}-${index}`,
            role: message.role === "AGENT" ? "agent" : "user",
            text: message.text,
          }))
        : [{ id: nextId(), role: "agent", text: GREETING }],
    criteria: conversation.criteria,
    results: [],
    hasSearched: conversation.hasSearched,
    lastTurnReadyToSearch: false,
    ask: conversation.ask,
    createdAt,
    updatedAt,
  };
}

function stripMediaForStorage(conversation: AskShopiConversation): AskShopiConversation {
  return {
    ...conversation,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      text: message.text,
    })),
  };
}

export function AskShopiGrid({ lang, active = true, onClose }: Props) {
  const { hydrated: authHydrated, isAuthenticated } = useAuthSession();
  const [conversations, setConversations] = useState<AskShopiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [stagedImage, setStagedImage] = useState<StagedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [runBuyerTurn, { loading }] = useMutation(SHOPI_BUYER_TURN);
  const [deleteServerConversation] = useMutation(DELETE_ASK_SHOPI_CONVERSATION);
  const [loadSavedResults] = useLazyQuery(ASK_SHOPI_CONVERSATION_RESULTS, {
    fetchPolicy: "network-only",
  });
  const { data: serverConversationData } = useQuery(ASK_SHOPI_CONVERSATIONS, {
    fetchPolicy: "cache-and-network",
    skip: !authHydrated || !isAuthenticated,
  });
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const latestMessageRef = useRef<HTMLDivElement | null>(null);
  const resultReloadsRef = useRef<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = parseStoredConversations(
        typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY),
      );
      const initial = stored.length > 0 ? stored : [createConversation()];
      setConversations(initial);
      setActiveId(initial[0]?.id ?? null);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!authHydrated || !isAuthenticated || !serverConversationData) return;
    queueMicrotask(() => {
      const serverConversations =
        serverConversationData.askShopiConversations.map(fromServerConversation);
      const initial =
        serverConversations.length > 0 ? serverConversations : [createConversation()];
      setConversations(initial);
      setActiveId((current) =>
        current && initial.some((conversation) => conversation.id === current)
          ? current
          : (initial[0]?.id ?? null),
      );
      setHydrated(true);
    });
  }, [authHydrated, isAuthenticated, serverConversationData]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS).map(stripMediaForStorage)),
    );
  }, [conversations, hydrated]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations],
  );

  useEffect(() => {
    const conversation = activeConversation;
    const serverId = conversation?.serverId;
    if (!serverId || !conversation.hasSearched || conversation.results.length > 0) return;
    if (resultReloadsRef.current.has(serverId)) return;

    resultReloadsRef.current.add(serverId);
    void loadSavedResults({ variables: { conversationId: serverId } })
      .then(({ data }) => {
        const items = data?.askShopiConversationResults.items ?? [];
        updateConversation(conversation.id, (current) => ({
          ...current,
          results: items,
          hasSearched: true,
          lastTurnReadyToSearch: true,
          updatedAt: Date.now(),
        }));
      })
      .catch(() => {
        resultReloadsRef.current.delete(serverId);
      });
  }, [activeConversation, loadSavedResults]);

  useEffect(() => {
    if (active) {
      const target =
        activeConversation?.lastTurnReadyToSearch === false
          ? latestMessageRef.current
          : scrollAnchorRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [
    activeConversation?.lastTurnReadyToSearch,
    activeConversation?.messages,
    activeConversation?.results,
    loading,
    active,
  ]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [input]);

  function updateConversation(
    id: string,
    updater: (conversation: AskShopiConversation) => AskShopiConversation,
  ) {
    setConversations((prev) =>
      prev
        .map((conversation) => (conversation.id === id ? updater(conversation) : conversation))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_CONVERSATIONS),
    );
  }

  function startNewConversation() {
    const next = createConversation();
    setConversations((prev) => [next, ...prev].slice(0, MAX_CONVERSATIONS));
    setActiveId(next.id);
    setInput("");
    setStagedImage(null);
    resetComposerHeight();
    setError(null);
    setHistoryOpen(false);
  }

  function deleteConversation(id: string) {
    const conversation = conversations.find((item) => item.id === id);
    if (conversation?.serverId) {
      void deleteServerConversation({
        variables: { conversationId: conversation.serverId },
        refetchQueries: [ASK_SHOPI_CONVERSATIONS],
      });
    }

    setConversations((prev) => {
      const remaining = prev.filter((conversation) => conversation.id !== id);
      if (remaining.length > 0) {
        if (id === activeId) setActiveId(remaining[0].id);
        return remaining;
      }
      const fresh = createConversation();
      setActiveId(fresh.id);
      return [fresh];
    });
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setInput("");
    setStagedImage(null);
    resetComposerHeight();
    setError(null);
    setHistoryOpen(false);
  }

  function resetComposerHeight() {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
    });
  }

  async function send() {
    const text = input.trim();
    const current = activeConversation;
    if ((!text && !stagedImage) || loading || !current) return;

    const now = Date.now();
    const messageText = text || "I want one like this.";
    const imageForTurn = stagedImage;
    const userMessage: ChatMessage = {
      id: nextId(),
      role: "user",
      text: messageText,
      imagePreviewUrl: imageForTurn?.dataUrl,
      imageAlt: imageForTurn?.name,
    };
    const history = [...current.messages, userMessage];
    const title =
      isNewConversationTitle(current.title)
        ? conversationTitle(text || imageForTurn?.name || "Photo search")
        : current.title;

    updateConversation(current.id, (conversation) => ({
      ...conversation,
      title,
      messages: history,
      updatedAt: now,
    }));
    setInput("");
    setStagedImage(null);
    resetComposerHeight();
    setError(null);

    try {
      const { data } = await runBuyerTurn({
        variables: {
          input: {
            transcript: history.map((message) => ({
              role: message.role === "agent" ? ("AGENT" as const) : ("USER" as const),
              text: message.text,
            })),
            conversationId: current.serverId ?? undefined,
            criteria: toCriteriaInput(current.criteria),
            activeResultCount: current.results.length,
            imageDataUrl: imageForTurn?.dataUrl,
          },
        },
      });

      const turn: ShopiBuyerTurnResult | undefined = data?.shopiBuyerTurn;
      if (!turn) throw new Error("Shopi is unavailable right now");

      const agentText = turn.message.trim();
      const agentMessage: ChatMessage | null = agentText
        ? { id: nextId(), role: "agent", text: agentText }
        : null;
      const items = turn.readyToSearch ? (turn.results.items ?? []) : current.results;
      const serverId = turn.conversationId ?? current.serverId ?? null;

      updateConversation(current.id, (conversation) => ({
        ...conversation,
        id: serverId ?? conversation.id,
        serverId,
        messages: agentMessage ? [...conversation.messages, agentMessage] : conversation.messages,
        criteria: turn.criteria,
        ask: turn.ask,
        results: items,
        hasSearched: turn.readyToSearch ? true : conversation.hasSearched,
        lastTurnReadyToSearch: turn.readyToSearch,
        updatedAt: Date.now(),
      }));
      if (serverId && serverId !== current.id) setActiveId(serverId);
    } catch {
      setError(null);
      updateConversation(current.id, (conversation) => ({
        ...conversation,
        messages: [
          ...conversation.messages,
          {
            id: nextId(),
            role: "agent",
            text: AGENT_TECHNICAL_ISSUE_MESSAGE,
          },
        ],
        lastTurnReadyToSearch: false,
        updatedAt: Date.now(),
      }));
    }
  }

  function handleImageSelect(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image.");
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      setError("That image is too large. Please choose one under 6 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl.startsWith("data:image/")) {
        setError("Could not read that image. Try another one.");
        return;
      }
      setStagedImage({ dataUrl, name: file.name || "Attached image" });
      setError(null);
    };
    reader.onerror = () => setError("Could not read that image. Try another one.");
    reader.readAsDataURL(file);
  }

  const placeholder =
    activeConversation?.ask?.placeholder ||
    activeConversation?.ask?.label ||
    "Describe the item or attach a photo...";
  const messages = activeConversation?.messages ?? [];
  const results = activeConversation?.results ?? [];
  const hasSearched = Boolean(activeConversation?.hasSearched);
  const lastTurnReadyToSearch = Boolean(activeConversation?.lastTurnReadyToSearch);

  return (
    <div className="flex min-h-svh flex-col bg-surface">
      <div className="border-b border-default bg-app">
        <div className="mx-auto flex w-full max-w-[920px] items-center gap-2 px-3 py-2.5 sm:px-5">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full text-default active:bg-surface"
              aria-label="Close Ask Shopi"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-full border border-default bg-surface text-default"
            aria-label="Conversation history"
          >
            <Clock3 className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-default">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="truncate">{activeConversation?.title ?? "Ask Shopi"}</span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Chat or send a photo. Shopi will find matching products.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewConversation}
            className="grid h-9 w-9 place-items-center rounded-full bg-primary text-white"
            aria-label="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[920px] flex-col gap-3 px-3 py-4 sm:px-5">
          {messages.map((message, index) => {
            const isLatest = index === messages.length - 1;
            return (
              <div key={message.id} ref={isLatest ? latestMessageRef : undefined}>
                {message.role === "agent" ? (
                  <AgentBubble>{message.text}</AgentBubble>
                ) : (
                  <UserBubble
                    imagePreviewUrl={message.imagePreviewUrl}
                    imageAlt={message.imageAlt}
                  >
                    {message.text}
                  </UserBubble>
                )}
              </div>
            );
          })}

          {loading ? (
            <AgentBubble thinking>
              <ThinkingState />
            </AgentBubble>
          ) : null}

          {lastTurnReadyToSearch && hasSearched && results.length === 0 && !loading ? (
            <div className="ml-9 rounded-2xl border border-default bg-app px-4 py-3 text-sm text-muted-foreground">
              No matching listings yet. Try a wider location, a different budget, or send a clearer photo.
            </div>
          ) : null}

          {results.length > 0 ? (
            <section className="mt-1">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-default">
                <Search className="h-4 w-4" />
                <span>{results.length} matches</span>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-4">
                {results.map((post, index) => (
                  <DiscoverGridCard key={post.id} post={post} lang={lang} priority={index < 4} />
                ))}
              </div>
            </section>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div ref={scrollAnchorRef} />
        </div>
      </div>

      <div className="sticky bottom-[calc(var(--nav-height,60px)+var(--safe-bottom,0px))] border-t border-default bg-app  md:bottom-0">
        <div className="mx-auto flex w-full max-w-[920px] items-end gap-2 px-3 py-3 sm:px-5">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              handleImageSelect(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={loading}
            aria-label="Attach image"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-default bg-surface text-default disabled:opacity-40"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-2 py-2 focus-within:border-primary">
            {stagedImage ? (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-muted/60 p-1.5">
                <Image
                  src={stagedImage.dataUrl}
                  alt={stagedImage.name}
                  width={56}
                  height={56}
                  unoptimized
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-default">
                  {stagedImage.name}
                </span>
                <button
                  type="button"
                  onClick={() => setStagedImage(null)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-background"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={stagedImage ? "Add a message..." : placeholder}
              className="max-h-[120px] min-h-7 w-full resize-none overflow-y-auto no-scroll-indicator bg-transparent px-2 py-0.5 text-base leading-6 text-foreground outline-none"
              style={{
                maxHeight: MAX_TEXTAREA_HEIGHT,
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitAppearance: "none",
                resize: "none",
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => void send()}
            disabled={loading || (!input.trim() && !stagedImage)}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-white disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      <ConversationHistorySheet
        open={historyOpen}
        conversations={conversations}
        activeId={activeId}
        onOpenChange={setHistoryOpen}
        onNew={startNewConversation}
        onSelect={selectConversation}
        onDelete={deleteConversation}
      />
    </div>
  );
}

function ConversationHistorySheet({
  open,
  conversations,
  activeId,
  onOpenChange,
  onNew,
  onSelect,
  onDelete,
}: {
  open: boolean;
  conversations: AskShopiConversation[];
  activeId: string | null;
  onOpenChange: (open: boolean) => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Above the full-screen Ask Shopi overlay on Browse (z-90). At the
          default z-50 the panel opened behind it, invisible, while its modal
          lock still swallowed every tap and focus — the screen froze. */}
      <SheetContent
        side="left"
        className="z-100 flex w-[86vw] max-w-sm flex-col bg-app p-0"
        overlayClassName="z-100"
      >
        <SheetHeader className="border-b border-default px-4 py-4 text-left">
          <SheetTitle>Ask Shopi</SheetTitle>
          <SheetDescription>Previous buying conversations</SheetDescription>
        </SheetHeader>
        <div className="border-b border-default px-4 py-3">
          <button
            type="button"
            onClick={onNew}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {conversations.map((conversation) => {
            const active = conversation.id === activeId;
            return (
              <div
                key={conversation.id}
                className={[
                  "group flex items-center gap-2 rounded-xl px-2 py-1.5",
                  active ? "bg-primary/10" : "hover:bg-muted/60",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-default">
                      {conversation.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {conversation.messages.at(-1)?.text ?? "No messages yet"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(conversation.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AgentBubble({
  children,
  thinking = false,
}: {
  children: React.ReactNode;
  thinking?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={[
          "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary",
          thinking ? "animate-pulse" : "",
        ].join(" ")}
      >
        <Bot className="h-4 w-4" />
      </span>
      <div
        className={[
          "max-w-[85%] rounded-2xl rounded-tl-sm bg-app px-3.5 py-2.5 text-sm text-default shadow-sm",
          thinking ? "animate-pulse border border-primary/15" : "",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap">{children}</p>
      </div>
    </div>
  );
}

function UserBubble({
  children,
  imagePreviewUrl,
  imageAlt,
}: {
  children: React.ReactNode;
  imagePreviewUrl?: string;
  imageAlt?: string;
}) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-2 py-2 text-sm text-white shadow-sm">
        {imagePreviewUrl ? (
          <Image
            src={imagePreviewUrl}
            alt={imageAlt || "Attached image"}
            width={320}
            height={320}
            unoptimized
            className="mb-2 max-h-72 w-full rounded-xl object-cover"
          />
        ) : null}
        <p className="whitespace-pre-wrap px-1.5 pb-0.5">{children}</p>
      </div>
    </div>
  );
}

function ThinkingState() {
  return (
    <span className="inline-flex items-center gap-2 py-0.5 text-muted-foreground">
      <span className="font-medium text-default">Thinking</span>
      <span className="inline-flex h-5 items-center gap-1 rounded-full bg-primary/10 px-2">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
      </span>
    </span>
  );
}
