"use client";

import Image from "next/image";
import Link from "next/link";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useState, type RefObject } from "react";
import { ChevronLeft, Clock3, Play, RefreshCw, Search, X } from "lucide-react";
import {
  DiscoveryFeedDocument,
  type ContentCardFieldsFragment,
} from "@/types/__generated__/graphql";
import { contentPath, videoPath } from "@/lib/content-url";
import { profileHref } from "@/lib/profile-url";
import { idInitials } from "@/lib/avatar";
import { useFollow } from "@/features/feed/hooks/useFollow";

export type MobileSearchTab = "Top" | "Users" | "Videos" | "Photos";

type SearchUser = {
  id: string;
  username: string | null;
  isVerified: boolean;
  isFollowedByMe: boolean | null;
  followerCount: number | null;
  profile: { firstName: string | null; lastName: string | null; avatar: string | null } | null;
};

type SearchUsersData = { searchUsers: SearchUser[] };
type SearchUsersVariables = { query: string; limit: number };
const SEARCH_USERS: TypedDocumentNode<SearchUsersData, SearchUsersVariables> = gql`
  query HomeSearchUsers($query: String!, $limit: Int!) {
    searchUsers(query: $query, limit: $limit) {
      id
      username
      isVerified
      isFollowedByMe
      followerCount
      profile {
        firstName
        lastName
        avatar
      }
    }
  }
`;

type SearchSuggestionsData = { searchSuggestions: string[] };
type SearchSuggestionsVariables = { limit: number };
const SEARCH_SUGGESTIONS: TypedDocumentNode<
  SearchSuggestionsData,
  SearchSuggestionsVariables
> = gql`
  query HomeSearchSuggestions($limit: Int!) {
    searchSuggestions(limit: $limit)
  }
`;

const TABS: MobileSearchTab[] = ["Top", "Users", "Videos", "Photos"];

function numberLabel(value: number | null | undefined) {
  if (!value) return "0";
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function mediaThumbnail(item: ContentCardFieldsFragment) {
  const media = item.media?.[0];
  const playbackId = media?.muxMeta?.playbackId;
  return (
    media?.muxMeta?.thumbnailUrl ??
    media?.thumbnailUrl ??
    media?.r2Variants?.find((variant) => variant.variant === "medium")?.url ??
    media?.r2Variants?.[0]?.url ??
    media?.imageUrl ??
    (playbackId
      ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0&width=540&fit_mode=smartcrop`
      : media?.url) ??
    null
  );
}

function contentTitle(item: ContentCardFieldsFragment) {
  return item.caption?.trim() || item.title?.trim() || "Shopi post";
}

function SearchContentCard({ item, lang }: { item: ContentCardFieldsFragment; lang: string }) {
  const href = item.type === "VIDEO" ? videoPath(lang, item) : contentPath(lang, item);
  const creatorName = item.creator?.username ||
    [item.creator?.profile?.firstName, item.creator?.profile?.lastName]
      .filter(Boolean)
      .join(" ") ||
    "Shopi seller";
  const thumb = mediaThumbnail(item);

  return (
    <article className="min-w-0 overflow-hidden rounded-md bg-elevated">
      <Link href={href} scroll={false} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-surface">
          {thumb ? (
            <Image src={thumb} alt="" fill sizes="50vw" className="object-cover" />
          ) : (
            <div className="h-full w-full bg-surface" />
          )}
          {item.type === "VIDEO" ? (
            <span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white">
              <Play size={14} fill="currentColor" aria-hidden />
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 min-h-10 px-2 py-1.5 text-[13px] leading-5 text-default">
          {contentTitle(item)}
        </p>
      </Link>
      <div className="flex min-w-0 items-center gap-1.5 px-2 pb-2 text-[11px] text-muted-foreground">
        {item.creator?.profile?.avatar ? (
          <Image
            src={item.creator.profile.avatar}
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface text-[8px] font-bold">
            {idInitials(item.creatorId)}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{creatorName}</span>
        <span className="shrink-0">♡ {numberLabel(item.stats?.likes)}</span>
      </div>
    </article>
  );
}

function SearchUserRow({ user, lang }: { user: SearchUser; lang: string }) {
  const { following, toggle, loading } = useFollow({
    userId: user.id,
    initialFollowing: user.isFollowedByMe ?? false,
    initialFollowerCount: user.followerCount ?? 0,
    lang,
  });
  const label =
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Shopi user";

  return (
    <div className="flex min-h-[76px] items-center gap-3 px-4 py-2">
      <Link href={profileHref(lang, user)} scroll={false} className="flex min-w-0 flex-1 items-center gap-3">
        {user.profile?.avatar ? (
          <Image
            src={user.profile.avatar}
            alt=""
            width={52}
            height={52}
            className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-surface text-sm font-bold text-muted-foreground">
            {idInitials(user.id)}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-default">
            {label}{user.isVerified ? " ✓" : ""}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            @{user.username || "shopi"} · {numberLabel(user.followerCount)} followers
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={loading}
        className={`h-9 min-w-[92px] shrink-0 rounded-full px-4 text-xs font-semibold transition-colors disabled:opacity-50 ${
          following ? "bg-surface text-default" : "bg-primary text-white"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

function ContentResults({
  items,
  users,
  lang,
  top = false,
  onViewAllUsers,
}: {
  items: ContentCardFieldsFragment[];
  users: SearchUser[];
  lang: string;
  top?: boolean;
  onViewAllUsers: () => void;
}) {
  const earlyItems = top ? items.slice(0, 2) : items;
  const laterItems = top ? items.slice(2) : [];
  return (
    <>
      {earlyItems.length ? (
        <div className="grid grid-cols-2 gap-1 px-0.5">
          {earlyItems.map((item) => <SearchContentCard key={item.id} item={item} lang={lang} />)}
        </div>
      ) : null}
      {top && users.length ? (
        <section className="my-4 border-y border-border/70 py-3">
          <div className="mb-1 flex items-center justify-between px-4">
            <h2 className="text-base font-bold text-default">Users</h2>
            <button
              type="button"
              onClick={onViewAllUsers}
              className="text-xs text-muted-foreground"
            >
              View all ›
            </button>
          </div>
          {users.slice(0, 2).map((user) => <SearchUserRow key={user.id} user={user} lang={lang} />)}
        </section>
      ) : null}
      {laterItems.length ? (
        <div className="grid grid-cols-2 gap-1 px-0.5">
          {laterItems.map((item) => <SearchContentCard key={item.id} item={item} lang={lang} />)}
        </div>
      ) : null}
    </>
  );
}

export function MobileSearchScreen({
  lang,
  view,
  query,
  activeTab,
  onTabChange,
  recentSearches,
  searchDraft,
  inputRef,
  onDraftChange,
  onSubmit,
  onClose,
  onBackToEntry,
  onSelectRecent,
  onRemoveRecent,
  onViewAllUsers,
}: {
  lang: string;
  view: "entry" | "results";
  query: string;
  activeTab: MobileSearchTab;
  onTabChange: (tab: MobileSearchTab) => void;
  recentSearches: string[];
  searchDraft: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onDraftChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClose: () => void;
  onBackToEntry: () => void;
  onSelectRecent: (value: string) => void;
  onRemoveRecent: (value: string) => void;
  onViewAllUsers: () => void;
}) {
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const tab = activeTab;
  const resultQuery = view === "results" ? query : "";
  const contentType = tab === "Videos" ? "VIDEO" : tab === "Photos" ? "IMAGE" : undefined;
  const content = useQuery(DiscoveryFeedDocument, {
    variables: { query: resultQuery || undefined, type: contentType, limit: 20 },
    skip: !resultQuery || tab === "Users",
    fetchPolicy: "cache-and-network",
  });
  const users = useQuery(SEARCH_USERS, {
    variables: { query: resultQuery, limit: tab === "Top" ? 4 : 20 },
    skip: !resultQuery || (tab !== "Top" && tab !== "Users"),
    fetchPolicy: "cache-and-network",
  });
  const suggestions = useQuery(SEARCH_SUGGESTIONS, {
    variables: { limit: 10 },
    skip: view !== "entry",
    fetchPolicy: "cache-first",
  });
  const items = content.data?.discoveryFeed.items ?? [];
  const userItems = users.data?.searchUsers ?? [];
  const suggestionTerms = suggestions.data?.searchSuggestions ?? [];
  const visibleSuggestions = suggestionTerms.length
    ? Array.from(
        { length: Math.min(6, suggestionTerms.length) },
        (_, index) => suggestionTerms[(suggestionOffset + index) % suggestionTerms.length],
      )
    : [];
  const loading = content.loading || users.loading;

  function refreshSuggestions() {
    if (suggestionTerms.length) {
      const step = suggestionTerms.length > 6 ? 6 : 1;
      setSuggestionOffset((offset) => (offset + step) % suggestionTerms.length);
    }
    void suggestions.refetch();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={view === "results" ? `Search results for ${query}` : "Search Shopi"}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="fixed inset-0 z-[100] bg-app md:hidden"
    >
      <div className="flex h-full flex-col pt-[env(safe-area-inset-top)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(searchDraft);
          }}
          className="flex items-center gap-2 border-b border-default px-3 py-2"
        >
          <button
            type="button"
            onClick={view === "results" ? onBackToEntry : onClose}
            className="grid h-8 w-7 shrink-0 place-items-center rounded-full text-default active:bg-surface"
            aria-label={view === "results" ? "Back to search" : "Back to For You"}
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </button>
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface px-2.5">
            <Search size={17} className="shrink-0 text-default" aria-hidden />
            <input
              ref={inputRef}
              value={searchDraft}
              onChange={(event) => onDraftChange(event.target.value)}
              onFocus={view === "results" ? onBackToEntry : undefined}
              placeholder="Search Shopi"
              aria-label="Search Shopi"
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-default outline-none placeholder:text-[12px] placeholder:text-muted-foreground"
            />
            {searchDraft ? (
              <button
                type="button"
                onClick={() => {
                  onDraftChange("");
                  if (view === "results") onBackToEntry();
                }}
                aria-label="Clear search text"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
          {view === "entry" && searchDraft.trim() ? (
            <button
              type="submit"
              className="shrink-0 px-1 text-[13px] font-semibold text-primary"
            >
              Search
            </button>
          ) : null}
        </form>

        {view === "entry" ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
            {recentSearches.length ? (
              <>
                <div className="divide-y divide-border/60">
                  {recentSearches.slice(0, showAllRecent ? 10 : 6).map((term) => (
                    <div key={term} className="flex min-h-11 items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectRecent(term)}
                        className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left"
                      >
                        <Clock3 size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate text-[14px] font-medium text-default">{term}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveRecent(term)}
                        aria-label={`Remove ${term} from recent searches`}
                        className="grid h-8 w-8 shrink-0 place-items-center text-muted-foreground"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                {recentSearches.length > 6 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllRecent((current) => !current)}
                    className="w-full py-2.5 text-center text-[13px] text-muted-foreground"
                  >
                    {showAllRecent ? "See less⌃" : "See more⌄"}
                  </button>
                ) : null}
                <div className="border-t border-border/70 pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[15px] font-bold text-default">You may like</h2>
                    <button
                      type="button"
                      onClick={refreshSuggestions}
                      aria-busy={suggestions.loading}
                      className="flex items-center gap-1.5 text-[12px] text-muted-foreground"
                    >
                      <RefreshCw size={13} className={suggestions.loading ? "animate-spin" : undefined} /> Refresh
                    </button>
                  </div>
                  <div className="divide-y divide-border/50">
                    {visibleSuggestions.map((term, index) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => onSelectRecent(term)}
                        className="flex min-h-11 w-full items-center gap-3 py-1.5 text-left"
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${index < 2 ? "bg-primary" : "bg-muted-foreground/50"}`} />
                        <span className={`min-w-0 flex-1 truncate text-[14px] ${index < 2 ? "font-medium text-primary" : "text-default"}`}>
                          {term}
                        </span>
                      </button>
                    ))}
                    {suggestions.loading && !suggestions.data ? (
                      <p className="py-3 text-sm text-muted-foreground">Loading suggestions…</p>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <div className="pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-[15px] font-bold text-default">You may like</h2>
                  <button
                    type="button"
                    onClick={refreshSuggestions}
                    aria-busy={suggestions.loading}
                    className="flex items-center gap-1.5 text-[12px] text-muted-foreground"
                  >
                    <RefreshCw size={13} className={suggestions.loading ? "animate-spin" : undefined} /> Refresh
                  </button>
                </div>
                {visibleSuggestions.map((term, index) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => onSelectRecent(term)}
                    className="flex min-h-11 w-full items-center gap-3 py-1.5 text-left"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${index < 2 ? "bg-primary" : "bg-muted-foreground/50"}`} />
                    <span className="truncate text-[14px] text-default">{term}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="no-scroll-indicator flex shrink-0 overflow-x-auto border-b border-border/70 px-1">
              {TABS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onTabChange(item)}
                  className={`min-w-[72px] border-b-2 px-3 py-2.5 text-[13px] font-semibold ${
                    tab === item ? "border-default text-default" : "border-transparent text-muted-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-8">
              {tab === "Users" ? (
                userItems.length ? (
                  <div className="divide-y divide-border/60">
                    {userItems.map((user) => <SearchUserRow key={user.id} user={user} lang={lang} />)}
                  </div>
                ) : loading ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">Searching users…</p>
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">No users found.</p>
                )
              ) : loading && items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Searching posts…</p>
              ) : items.length || (tab === "Top" && userItems.length) ? (
                <ContentResults
                  items={items}
                  users={userItems}
                  lang={lang}
                  top={tab === "Top"}
                  onViewAllUsers={onViewAllUsers}
                />
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No posts found.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
