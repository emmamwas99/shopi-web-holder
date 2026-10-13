"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useApolloClient } from "@apollo/client/react";
import {
  GetCommentsDocument,
  AddCommentDocument,
  ToggleCommentLikeDocument,
  GetRepliesDocument,
  DeleteCommentDocument,
} from "@/types/__generated__/graphql";
import type {
  GetCommentsQuery,
  GetRepliesQuery,
} from "@/types/__generated__/graphql";
import { useVisualViewport } from "@/hooks/useKeyboardInset";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { timeAgo } from "@/lib/time";
import { fmtCompact as formatCount } from "@/lib/format";
import { avatarGradient } from "@/lib/avatar";
import { useAuthGuard, type AuthIntent } from "../hooks/useAuthGuard";

type CommentItem = NonNullable<GetCommentsQuery["comments"]["items"]>[number];
type ReplyItem = NonNullable<GetRepliesQuery["replies"]>[number];

interface Props {
  contentId: string;
  /** The userId of the content's creator — used to label their comments "Creator". */
  contentCreatorId?: string;
  /** Fired whenever a comment/reply is added (or rolled back) so hosts can react. */
  onCommentAdded?: () => void;
  /**
   * When true (mobile sheet), the input bar lifts above the on-screen keyboard.
   * When false (inline / desktop), the input stays put.
   */
  keyboardAvoiding?: boolean;
  /** Locale, for routing signed-out users to the auth-welcome screen. */
  lang: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(c: {
  creatorId: string;
  author?: {
    profile?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
}): string {
  const f = c.author?.profile?.firstName;
  const l = c.author?.profile?.lastName;
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  return c.creatorId.slice(-2).toUpperCase();
}

function getDisplayName(c: {
  creatorId: string;
  author?: {
    profile?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
}): string {
  const f = c.author?.profile?.firstName;
  const l = c.author?.profile?.lastName;
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  return `User ${c.creatorId.slice(-6)}`;
}

/**
 * Who may delete a comment: its own author, or the creator of the post it sits
 * on (so sellers can moderate their own listings). Mirrors the rule the API
 * enforces in CommentService.deleteComment — this only decides whether to show
 * the control; the server is the authority.
 *
 * Optimistic rows (temp ids) aren't on the server yet, so they're excluded.
 */
function canDeleteComment(
  comment: { id: string; creatorId: string },
  viewerId?: string,
  contentCreatorId?: string,
): boolean {
  if (!viewerId || comment.id.startsWith("temp-")) return false;
  return comment.creatorId === viewerId || contentCreatorId === viewerId;
}

// Small "Creator" badge — shown when the commenter is the content's creator
function CreatorBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold leading-none bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
      Creator
    </span>
  );
}

/**
 * Two-step delete control: the trash icon swaps into an inline
 * "Delete / Cancel" confirm rather than opening a modal, which would fight the
 * comment sheet for focus on mobile. Deletion is soft on the server, but it's
 * still irreversible from the UI, so it never fires on a single tap.
 */
function DeleteControl({
  onDelete,
  label,
}: {
  onDelete: () => void;
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);

  // Auto-dismiss the confirm so a stray tap doesn't leave the row armed.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={() => {
            setConfirming(false);
            onDelete();
          }}
          className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
        >
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-muted-foreground hover:text-default transition-colors"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      aria-label={label}
      title={label}
      className="text-muted-foreground hover:text-red-500 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

function Avatar({ comment }: { comment: CommentItem | ReplyItem }) {
  const avatar = comment.author?.profile?.avatar;
  const color = avatarGradient(comment.creatorId);
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={getDisplayName(comment)}
        width={32}
        height={32}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      className={`w-8 h-8 rounded-full bg-linear-to-br ${color} flex items-center justify-center shrink-0`}
    >
      <span className="text-white text-xs font-bold">
        {getInitials(comment)}
      </span>
    </div>
  );
}

// ─── Reply row (compact, no nested replies) ───────────────────────────────────

function ReplyRow({
  reply,
  contentCreatorId,
  canDelete,
  onDelete,
  requireAuth,
}: {
  reply: ReplyItem;
  contentCreatorId?: string;
  canDelete: boolean;
  onDelete: (reply: ReplyItem) => void;
  requireAuth: (intent?: AuthIntent) => boolean;
}) {
  const [liked, setLiked] = useState(reply.isLikedByMe ?? false);
  const [likeCount, setLikeCount] = useState(reply.likeCount ?? 0);
  const [toggleLike] = useMutation(ToggleCommentLikeDocument);

  async function handleLike() {
    if (!requireAuth({ action: "like" })) return;
    const was = liked;
    setLiked(!was);
    setLikeCount((c) => c + (was ? -1 : 1));
    try {
      const { data } = await toggleLike({ variables: { commentId: reply.id } });
      if (data?.toggleCommentLike) {
        setLiked(data.toggleCommentLike.liked);
        setLikeCount(data.toggleCommentLike.likeCount);
      }
    } catch {
      setLiked(was);
      setLikeCount((c) => c + (was ? 1 : -1));
    }
  }

  return (
    <div className="flex gap-2.5 py-2 pl-11 pr-4">
      <Avatar comment={reply} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
          <span className="text-xs font-semibold text-default truncate max-w-[120px]">
            {getDisplayName(reply)}
          </span>
          {contentCreatorId && reply.creatorId === contentCreatorId && (
            <CreatorBadge />
          )}
          <span className="text-xs text-muted-foreground">
            {timeAgo(reply.createdAt)}
          </span>
          {canDelete && (
            <DeleteControl
              label="Delete reply"
              onDelete={() => onDelete(reply)}
            />
          )}
        </div>
        <p className="text-sm text-default leading-snug wrap-break-word">
          {reply.text}
        </p>
      </div>
      {/* Like button */}
      <button
        onClick={handleLike}
        className="flex flex-col items-center gap-0.5 ml-1 flex-shrink-0 pt-0.5"
      >
        <svg
          className={`w-3.5 h-3.5 ${liked ? "fill-red-500 stroke-red-500" : "fill-none stroke-current text-muted-foreground"}`}
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
        {likeCount > 0 && (
          <span
            className={`text-xs leading-none ${liked ? "text-red-500" : "text-muted-foreground"}`}
          >
            {formatCount(likeCount)}
          </span>
        )}
      </button>
    </div>
  );
}

// ─── Comment row (with replies) ───────────────────────────────────────────────

function CommentRow({
  comment,
  onReply,
  onLikeComment,
  contentCreatorId,
  showReplies,
  onToggleReplies,
  viewerId,
  onDeleteComment,
  onDeleteReply,
  requireAuth,
}: {
  comment: CommentItem;
  onReply: (comment: CommentItem) => void;
  onLikeComment: (id: string, liked: boolean, count: number) => void;
  contentCreatorId?: string;
  showReplies: boolean;
  onToggleReplies: (commentId: string, next: boolean) => void;
  viewerId?: string;
  onDeleteComment: (comment: CommentItem) => void;
  onDeleteReply: (reply: ReplyItem) => void;
  requireAuth: (intent?: AuthIntent) => boolean;
}) {
  const [liked, setLiked] = useState(comment.isLikedByMe ?? false);
  const [likeCount, setLikeCount] = useState(comment.likeCount ?? 0);
  const replyCount = comment.replyCount ?? 0;
  const [toggleLike] = useMutation(ToggleCommentLikeDocument);

  const { data: repliesData, loading: repliesLoading } = useQuery(
    GetRepliesDocument,
    {
      variables: { commentId: comment.id },
      skip: !showReplies,
      fetchPolicy: "cache-first",
    },
  );
  // Dedupe by id — an optimistic reply and the server's canonical list can
  // briefly overlap during reconciliation, which would emit duplicate keys.
  const replies = (() => {
    const seen = new Set<string>();
    return (repliesData?.replies ?? []).filter((r) => {
      if (!r?.id || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  })();

  async function handleLike() {
    if (!requireAuth({ action: "like" })) return;
    const was = liked;
    setLiked(!was);
    setLikeCount((c) => c + (was ? -1 : 1));
    try {
      const { data } = await toggleLike({
        variables: { commentId: comment.id },
      });
      if (data?.toggleCommentLike) {
        setLiked(data.toggleCommentLike.liked);
        setLikeCount(data.toggleCommentLike.likeCount);
        onLikeComment(
          comment.id,
          data.toggleCommentLike.liked,
          data.toggleCommentLike.likeCount,
        );
      }
    } catch {
      setLiked(was);
      setLikeCount((c) => c + (was ? 1 : -1));
    }
  }

  return (
    <div className="border-b border-default last:border-b-0">
      {/* Main comment */}
      <div className="flex gap-3 py-3 px-4">
        <Avatar comment={comment} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-default truncate max-w-[140px]">
              {getDisplayName(comment)}
            </span>
            {contentCreatorId && comment.creatorId === contentCreatorId && (
              <CreatorBadge />
            )}
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {timeAgo(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-default leading-snug wrap-break-word">
            {comment.text}
          </p>

          {/* Action row */}
          <div className="flex items-center gap-4 mt-1.5">
            <button
              onClick={() => onReply(comment)}
              className="text-xs text-muted-foreground font-medium hover:text-default transition-colors"
            >
              Reply
            </button>
            {replyCount > 0 && (
              <button
                onClick={() => onToggleReplies(comment.id, !showReplies)}
                className="text-xs text-primary font-medium"
              >
                {showReplies
                  ? "Hide replies"
                  : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
              </button>
            )}
            {canDeleteComment(comment, viewerId, contentCreatorId) && (
              <DeleteControl
                label="Delete comment"
                onDelete={() => onDeleteComment(comment)}
              />
            )}
          </div>
        </div>

        {/* Like button */}
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-0.5 ml-1 flex-shrink-0 pt-0.5"
        >
          <svg
            className={`w-4 h-4 ${liked ? "fill-red-500 stroke-red-500" : "fill-none stroke-current text-muted-foreground"}`}
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          {likeCount > 0 && (
            <span
              className={`text-xs leading-none ${liked ? "text-red-500" : "text-muted-foreground"}`}
            >
              {formatCount(likeCount)}
            </span>
          )}
        </button>
      </div>

      {/* Replies */}
      {showReplies && (
        <div className="bg-surface/40">
          {repliesLoading && (
            <div className="flex justify-center py-3">
              <InterlockingBalls size={16} />
            </div>
          )}
          {replies.map((r) => (
            <ReplyRow
              key={r.id}
              reply={r}
              contentCreatorId={contentCreatorId}
              canDelete={canDeleteComment(r, viewerId, contentCreatorId)}
              onDelete={onDeleteReply}
              requireAuth={requireAuth}
            />
          ))}
          {/* Reply input shortcut */}
          <button
            onClick={() => onReply(comment)}
            className="w-full text-left pl-11 pr-4 py-2 text-xs text-primary font-medium"
          >
            + Add a reply…
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Shared comment thread (list + replies + reply-aware input) ───────────────

// ─── useCommentThread — all comment/reply state + Apollo logic ────────────────

interface ThreadOptions {
  contentId: string;
  onCommentAdded?: () => void;
  /** Locale, for routing signed-out users to the auth-welcome screen. */
  lang: string;
}

/**
 * Owns the comment list, replies, optimistic posting (top-level + reply) and
 * pagination. Returned values can drive either the bundled composer
 * ({@link CommentThread}) or an external one (the PDP's mobile bottom bar).
 */
export function useCommentThread({
  contentId,
  onCommentAdded,
  lang,
}: ThreadOptions) {
  const { isAuthenticated, requireAuth } = useAuthGuard(lang);
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommentItem | null>(null);
  // Which comment's replies are expanded. Lifted here (not local to CommentRow)
  // so posting a reply can auto-open that thread to reveal the new reply.
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);
  // Either a textarea (bundled composer) or an input (host composer, e.g. the
  // mobile PDP bottom bar) — both are focusable, which is all we need.
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fetchingMoreRef = useRef(false);
  const client = useApolloClient();

  const { user } = useAuthSession();
  const viewerId = user?.id;

  const { data, loading, fetchMore, refetch } = useQuery(GetCommentsDocument, {
    variables: { contentId, limit: 20 },
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    skip: !contentId,
  });

  const [addComment] = useMutation(AddCommentDocument);
  const [deleteCommentMutation] = useMutation(DeleteCommentDocument);
  const [optimistic, setOptimistic] = useState<CommentItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const serverItems = data?.comments?.items ?? [];
  const hasMore = data?.comments?.hasMore ?? false;
  const endCursor = data?.comments?.endCursor;

  const serverIds = new Set(serverItems.map((c) => c.id));
  const seenIds = new Set<string>();
  const merged: CommentItem[] = [
    ...optimistic.filter((c) => !serverIds.has(c.id)),
    ...serverItems,
  ].filter((c) => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });

  // Auto-focus input when replying
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const handleReply = useCallback((comment: CommentItem) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  }, []);

  // Optimistically bump (or decrement) the content's cached comment count so the
  // feed/post card updates instantly. The backend counts replies too, so this
  // fires for every comment — top-level AND reply.
  const bumpContentCommentCount = useCallback(
    (delta: number) => {
      const cacheId = client.cache.identify({
        __typename: "Content",
        id: contentId,
      });
      if (!cacheId) return;
      client.cache.modify({
        id: cacheId,
        fields: {
          stats: (existing) => {
            const stats = (existing ?? {}) as { comments?: number };
            return {
              ...stats,
              comments: Math.max(0, (stats.comments ?? 0) + delta),
            };
          },
        },
      });
    },
    [client, contentId],
  );

  const handleLikeComment = useCallback(
    (id: string, liked: boolean, likeCount: number) => {
      const cacheId = client.cache.identify({ __typename: "Comment", id });
      if (cacheId) {
        client.cache.modify({
          id: cacheId,
          fields: { isLikedByMe: () => liked, likeCount: () => likeCount },
        });
      }
    },
    [client],
  );

  // ── Deletion ───────────────────────────────────────────────────────────────
  // Both handlers remove the row optimistically and correct the denormalized
  // counts, then reconcile. On failure we refetch rather than trying to splice
  // the row back at its original position — the list is cursor-paginated, so a
  // re-insert can't reliably restore ordering.

  const handleDeleteComment = useCallback(
    async (comment: CommentItem) => {
      // A top-level delete takes its replies with it (the API cascades), and
      // every reply counts toward the content's comment stat.
      const removed = 1 + (comment.replyCount ?? 0);

      setOptimistic((prev) => prev.filter((c) => c.id !== comment.id));
      client.cache.updateQuery(
        {
          query: GetCommentsDocument,
          variables: { contentId, limit: 20 },
        },
        (existing) =>
          existing?.comments
            ? {
                comments: {
                  ...existing.comments,
                  items: (existing.comments.items ?? []).filter(
                    (c: { id: string }) => c.id !== comment.id,
                  ),
                },
              }
            : existing,
      );
      bumpContentCommentCount(-removed);
      onCommentAdded?.();

      try {
        await deleteCommentMutation({ variables: { commentId: comment.id } });
      } catch {
        bumpContentCommentCount(removed);
        onCommentAdded?.();
        void refetch();
      }
    },
    [
      bumpContentCommentCount,
      client,
      contentId,
      deleteCommentMutation,
      onCommentAdded,
      refetch,
    ],
  );

  const handleDeleteReply = useCallback(
    async (reply: ReplyItem) => {
      const parentId = reply.parentId;
      if (!parentId) return;

      const parentCacheId = client.cache.identify({
        __typename: "Comment",
        id: parentId,
      });

      const removeFromCache = () =>
        client.cache.updateQuery(
          { query: GetRepliesDocument, variables: { commentId: parentId } },
          (existing) => ({
            replies: (existing?.replies ?? []).filter(
              (r: { id: string }) => r.id !== reply.id,
            ),
          }),
        );

      removeFromCache();
      if (parentCacheId) {
        client.cache.modify({
          id: parentCacheId,
          fields: {
            replyCount: (prev: number) => Math.max(0, (prev ?? 0) - 1),
          },
        });
      }
      bumpContentCommentCount(-1);
      onCommentAdded?.();

      try {
        await deleteCommentMutation({ variables: { commentId: reply.id } });
      } catch {
        // Put the reply back — replies are ordered oldest-first and fetched as
        // a whole list, so re-inserting and re-sorting restores the true order.
        client.cache.updateQuery(
          { query: GetRepliesDocument, variables: { commentId: parentId } },
          (existing) => {
            const list = existing?.replies ?? [];
            if (list.some((r: { id: string }) => r.id === reply.id)) {
              return { replies: list };
            }
            return {
              replies: [...list, reply].sort(
                (a, b) =>
                  new Date(a.createdAt as string).getTime() -
                  new Date(b.createdAt as string).getTime(),
              ),
            };
          },
        );
        if (parentCacheId) {
          client.cache.modify({
            id: parentCacheId,
            fields: { replyCount: (prev: number) => (prev ?? 0) + 1 },
          });
        }
        bumpContentCommentCount(1);
        onCommentAdded?.();
      }
    },
    [bumpContentCommentCount, client, deleteCommentMutation, onCommentAdded],
  );

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !contentId) return;
    // Signed-out: stash the intent and route to auth instead of firing a
    // mutation the API would reject anyway (and which would optimistically
    // paint a comment that then vanishes).
    if (!requireAuth({ contentId, action: "comment" })) return;
    setText("");
    const parentId = replyingTo?.id ?? undefined;
    setReplyingTo(null);

    // Only show optimistic for top-level comments (replies appear inline)
    if (!parentId) {
      const tempId = `temp-${Date.now()}`;
      const optimisticComment: CommentItem = {
        id: tempId,
        text: trimmed,
        creatorId: "me",
        createdAt: new Date().toISOString() as unknown,
        parentId: null,
        likeCount: 0,
        replyCount: 0,
        isLikedByMe: false,
        author: null,
      } as CommentItem;
      setOptimistic((prev) => [optimisticComment, ...prev]);
      bumpContentCommentCount(1);
      onCommentAdded?.();
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = 0;
      });

      try {
        const { data: res } = await addComment({
          variables: { input: { contentId, text: trimmed, parentId } },
        });
        if (res?.addComment) {
          setOptimistic((prev) =>
            prev.map((c) =>
              c.id === tempId
                ? ({
                    ...res.addComment,
                    parentId: res.addComment.parentId ?? null,
                    replyCount: 0,
                    isLikedByMe: false,
                  } as CommentItem)
                : c,
            ),
          );
        }
      } catch {
        setOptimistic((prev) => prev.filter((c) => c.id !== tempId));
        bumpContentCommentCount(-1);
        onCommentAdded?.();
      }
    } else {
      // Reply — show it inline immediately (optimistic), bump counts, then
      // reconcile with the server. The reply is written straight into this
      // parent's cached GetReplies list so it appears without a refresh.
      const tempId = `temp-${Date.now()}`;
      const optimisticReply: ReplyItem = {
        id: tempId,
        text: trimmed,
        creatorId: "me",
        createdAt: new Date().toISOString() as unknown,
        parentId,
        likeCount: 0,
        isLikedByMe: false,
        author: null,
      } as ReplyItem;

      const parentCacheId = client.cache.identify({
        __typename: "Comment",
        id: parentId,
      });

      // 1. Insert the optimistic reply into the cached replies list.
      client.cache.updateQuery(
        { query: GetRepliesDocument, variables: { commentId: parentId } },
        (existing) => ({
          replies: [...(existing?.replies ?? []), optimisticReply],
        }),
      );
      // 2. Bump parent replyCount + the content's comment count (backend counts replies).
      if (parentCacheId) {
        client.cache.modify({
          id: parentCacheId,
          fields: { replyCount: (prev: number) => (prev ?? 0) + 1 },
        });
      }
      bumpContentCommentCount(1);
      onCommentAdded?.();

      // 3. Auto-expand this parent's replies so the user sees their reply land.
      setExpandedParentId(parentId);

      try {
        const { data: res } = await addComment({
          variables: { input: { contentId, text: trimmed, parentId } },
        });
        if (res?.addComment) {
          // Swap the optimistic row for the real one (or drop it if the server
          // already wrote the reply into the cache).
          client.cache.updateQuery(
            { query: GetRepliesDocument, variables: { commentId: parentId } },
            (existing) => {
              const list = existing?.replies ?? [];
              const withoutTemp = list.filter(
                (r: { id: string }) => r.id !== tempId,
              );
              if (
                withoutTemp.some(
                  (r: { id: string }) => r.id === res.addComment.id,
                )
              ) {
                return { replies: withoutTemp };
              }
              return { replies: [...withoutTemp, res.addComment] };
            },
          );
        }
      } catch {
        // Roll back the optimistic reply + counts.
        client.cache.updateQuery(
          { query: GetRepliesDocument, variables: { commentId: parentId } },
          (existing) => ({
            replies: (existing?.replies ?? []).filter(
              (r: { id: string }) => r.id !== tempId,
            ),
          }),
        );
        if (parentCacheId) {
          client.cache.modify({
            id: parentCacheId,
            fields: {
              replyCount: (prev: number) => Math.max(0, (prev ?? 0) - 1),
            },
          });
        }
        bumpContentCommentCount(-1);
        onCommentAdded?.();
      }
    }
  }

  const handleLoadMore = useCallback(() => {
    if (!contentId || !hasMore || !endCursor || fetchingMoreRef.current) return;

    fetchingMoreRef.current = true;
    setLoadingMore(true);
    void fetchMore({
      variables: { contentId, limit: 20, after: endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        const seen = new Set<string>();
        const deduped = [
          ...(prev.comments?.items ?? []),
          ...(fetchMoreResult.comments?.items ?? []),
        ].filter((c) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
        return { comments: { ...fetchMoreResult.comments, items: deduped } };
      },
    }).finally(() => {
      fetchingMoreRef.current = false;
      setLoadingMore(false);
    });
  }, [contentId, endCursor, fetchMore, hasMore]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) handleLoadMore();
  }

  return {
    /** Merged (optimistic + server) comment list. */
    comments: merged,
    loading,
    hasResult: Boolean(data?.comments),
    hasMore,
    loadingMore,
    /** Composer text + setter. */
    text,
    setText,
    /** The comment being replied to (null = top-level). */
    replyingTo,
    setReplyingTo,
    /** Expanded-replies state per comment. */
    expandedParentId,
    setExpandedParentId,
    /** Refs to wire to the scroll container and the textarea. */
    listRef,
    inputRef,
    /** Set replyingTo and focus the composer. */
    handleReply,
    handleLikeComment,
    /** Soft-delete a top-level comment (cascades to its replies). */
    handleDeleteComment,
    /** Soft-delete a single reply. */
    handleDeleteReply,
    /** The signed-in user's id, for deciding who may delete a comment. */
    viewerId,
    /** False for guests — composer and like buttons route to auth instead. */
    isAuthenticated,
    /** Returns true if signed in; otherwise redirects to auth and returns false. */
    requireAuth,
    /** Post the current `text` (as a reply when `replyingTo` is set). */
    handleSend,
    /** Infinite-scroll handler for the list container's onScroll. */
    handleScroll,
    /** Explicit pagination action for layouts that scroll with the page. */
    handleLoadMore,
  };
}

type CommentThreadApi = ReturnType<typeof useCommentThread>;

// ─── CommentList — the scrollable comment + replies list ──────────────────────

function CommentList({
  thread,
  contentCreatorId,
  className,
}: {
  thread: CommentThreadApi;
  contentCreatorId?: string;
  className?: string;
}) {
  const {
    comments,
    loading,
    hasResult,
    hasMore,
    loadingMore,
    expandedParentId,
    setExpandedParentId,
    listRef,
    handleReply,
    handleLikeComment,
    handleScroll,
    handleLoadMore,
    handleDeleteComment,
    handleDeleteReply,
    viewerId,
    requireAuth,
  } = thread;

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className={className ?? "flex-1 overflow-y-auto overscroll-contain"}
      style={{ minHeight: 0 }}
    >
      {loading && comments.length === 0 && !hasResult && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
          <InterlockingBalls size={20} className="mb-3" />
          Loading comments…
        </div>
      )}
      {(!loading || hasResult) && comments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
          <span className="text-2xl mb-2">💬</span>
          No comments yet. Be the first!
        </div>
      )}
      {comments.map((comment) => (
        <CommentRow
          key={comment.id}
          comment={comment}
          onReply={handleReply}
          onLikeComment={handleLikeComment}
          contentCreatorId={contentCreatorId}
          showReplies={expandedParentId === comment.id}
          onToggleReplies={(id, next) => setExpandedParentId(next ? id : null)}
          viewerId={viewerId}
          onDeleteComment={handleDeleteComment}
          onDeleteReply={handleDeleteReply}
          requireAuth={requireAuth}
        />
      ))}
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="min-h-10 rounded-md px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60"
          >
            {loadingMore ? "Loading more…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── CommentComposer — the reply-aware input bar ──────────────────────────────

function CommentComposer({
  thread,
  keyboardAvoiding = false,
}: {
  thread: CommentThreadApi;
  keyboardAvoiding?: boolean;
}) {
  const {
    text,
    setText,
    replyingTo,
    setReplyingTo,
    inputRef,
    handleSend,
    isAuthenticated,
    requireAuth,
  } = thread;
  const { keyboardHeight } = useVisualViewport();

  return (
    <div
      className="border-t border-default shrink-0 bg-app"
      style={{
        transform: keyboardAvoiding
          ? `translateY(-${keyboardHeight}px)`
          : undefined,
        transition: "transform 0.18s ease-out",
        paddingBottom: !keyboardAvoiding
          ? "0px"
          : keyboardHeight > 0
            ? "0px"
            : "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Guests read the thread but can't compose — tapping routes to auth and
          the intent is replayed on return. Swapping the whole bar (rather than
          disabling the textarea) keeps the keyboard from ever opening. */}
      {!isAuthenticated && (
        <div className="px-3 pt-2 pb-3">
          <button
            type="button"
            onClick={() => requireAuth({ action: "comment" })}
            className="flex h-10 w-full items-center justify-center rounded-2xl bg-surface px-4 text-sm font-semibold text-muted-foreground border border-default transition-colors hover:text-default"
          >
            Sign in to comment
          </button>
        </div>
      )}
      {/* Replying-to banner */}
      {isAuthenticated && replyingTo && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-surface text-xs text-muted-foreground">
          <span>
            Replying to{" "}
            <span className="text-default font-medium">
              {getDisplayName(replyingTo)}
            </span>
          </span>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-muted-foreground hover:text-default ml-2"
          >
            ✕
          </button>
        </div>
      )}
      <div
        className={`items-end gap-2 px-3 pt-2 pb-3 ${isAuthenticated ? "flex" : "hidden"}`}
      >
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            replyingTo
              ? `Reply to ${getDisplayName(replyingTo)}…`
              : "Add a comment…"
          }
          maxLength={500}
          rows={1}
          className="flex-1 bg-surface text-default text-sm rounded-2xl px-4 py-2.5 outline-none placeholder:text-muted-foreground border border-default focus:border-primary transition-colors resize-none overflow-hidden"
          style={{ minHeight: "40px" }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-9 h-9 bg-primary rounded-full flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── CommentList / CommentComposer exports for hosts using the hook directly ──

export { CommentList, CommentComposer };

// ─── CommentThread — composed list + composer (drawer + desktop PDP) ──────────

/**
 * The reusable comment experience: a scrollable, paginated list of comments
 * with expandable replies and a reply-aware composer. Used by the CommentsDrawer
 * (mobile sheet / desktop dialog) and inline in the desktop PDP. Hosts that
 * supply their own composer (e.g. the mobile PDP bottom bar) should call
 * {@link useCommentThread} with {@link CommentList} instead.
 */
export function CommentThread({
  contentId,
  contentCreatorId,
  onCommentAdded,
  keyboardAvoiding = false,
  lang,
}: Props) {
  const thread = useCommentThread({ contentId, onCommentAdded, lang });
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CommentList thread={thread} contentCreatorId={contentCreatorId} />
      <CommentComposer thread={thread} keyboardAvoiding={keyboardAvoiding} />
    </div>
  );
}
