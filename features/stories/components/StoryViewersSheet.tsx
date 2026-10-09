"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useQuery } from "@apollo/client/react";
import { Eye, X } from "lucide-react";
import { timeAgo } from "@/lib/time";
import {
  StoryViewersDocument,
  type StoryCreatorFieldsFragment,
} from "@/types/__generated__/graphql";
import { storyUserName } from "../lib/storyUser";
import { StoryAvatar } from "./StoryAvatar";

/** "Seen by" for one of your own stories — newest viewers first. */
export function StoryViewersSheet({
  storyId,
  onClose,
  onOpenProfile,
}: {
  storyId: string;
  onClose: () => void;
  /** Leaves the story viewer for this person's profile. */
  onOpenProfile: (user: StoryCreatorFieldsFragment) => void;
}) {
  const { data, loading, fetchMore } = useQuery(StoryViewersDocument, {
    variables: { storyId },
    fetchPolicy: "network-only",
  });
  const result = data?.storyViewers;

  const loadMore = () => {
    if (!result?.nextCursor) return;
    void fetchMore({
      variables: { storyId, after: result.nextCursor },
      updateQuery: (prev, { fetchMoreResult }) => ({
        storyViewers: {
          ...fetchMoreResult.storyViewers,
          viewers: [...prev.storyViewers.viewers, ...fetchMoreResult.storyViewers.viewers],
        },
      }),
    });
  };

  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[65%] w-full flex-col rounded-t-2xl bg-elevated pb-[max(env(safe-area-inset-bottom),12px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-default px-4 py-3">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-default">
            <Eye size={18} />
            {result ? `Seen by ${result.totalCount}` : "Seen by"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-32 overflow-y-auto px-2 py-1">
          {loading && !result ? (
            <div className="flex justify-center py-8">
              <InterlockingBalls size={24} />
            </div>
          ) : !result || result.viewers.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted">
              No one has seen this story yet.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {result.viewers.map(({ user, viewedAt }) => {
                const name = storyUserName(user);
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => onOpenProfile(user)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface"
                    >
                      <StoryAvatar
                        id={user.id}
                        src={user.profile?.avatar}
                        name={name}
                        size={44}
                        state="none"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-default">
                          {name}
                        </span>
                        {user.username && (
                          <span className="block truncate text-xs text-muted">@{user.username}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(viewedAt)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {result?.hasMore && (
            <button
              type="button"
              onClick={loadMore}
              className="mx-auto my-2 block rounded-full px-4 py-2 text-sm font-semibold text-primary hover:bg-surface"
            >
              Show more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
