"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppBack } from "@/lib/useAppBack";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@apollo/client/react";
import {
  MyFollowersDocument,
  type VisitorFieldsFragment,
} from "@/types/__generated__/graphql";
import { useFollow } from "@/features/feed/hooks/useFollow";
import { SHIMMER_AVATAR } from "@/lib/shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { profileHref } from "@/lib/profile-url";
import { appendUnique } from "../lib/appendUnique";

const PAGE_SIZE = 20;

function displayNameOf(v: VisitorFieldsFragment): string {
  const name = [v.profile?.firstName, v.profile?.lastName]
    .filter(Boolean)
    .join(" ");
  return name || v.username || "User";
}

function initialsOf(v: VisitorFieldsFragment): string {
  const fromName = [v.profile?.firstName?.[0], v.profile?.lastName?.[0]]
    .filter(Boolean)
    .join("");
  return (fromName || v.username?.[0] || "?").toUpperCase();
}

/** A single follower row: avatar + name + Follow / Follow back / Following. */
function FollowerRow({
  user,
  lang,
  resolvingFollowState,
  isNew,
}: {
  user: VisitorFieldsFragment;
  lang: string;
  resolvingFollowState: boolean;
  isNew: boolean;
}) {
  const { following, toggle, loading } = useFollow({
    userId: user.id,
    initialFollowing: user.isFollowedByMe ?? false,
    lang,
  });

  const avatar = user.profile?.avatar;
  const name = displayNameOf(user);
  // "Follow back" when they follow us and we don't follow them yet.
  const label = following
    ? "Following"
    : user.isFollowingMe
      ? "Follow back"
      : "Follow";

  const href = profileHref(lang, user);

  return (
    <li
      className="flex items-center gap-3 px-4 py-2.5 md:rounded-2xl md:border md:border-default md:bg-elevated md:px-3 md:py-3 md:transition-colors md:hover:bg-surface"
      style={{ borderColor: "rgb(var(--color-border))" }}
    >
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border"
          style={{
            background: avatar
              ? "rgb(var(--color-bg-subtle))"
              : "linear-gradient(135deg, rgb(var(--brand-primary)), rgb(var(--brand-highlight)) 62%, rgb(var(--brand-accent)))",
            borderColor: "rgb(var(--color-bg-elevated))",
          }}
        >
          {avatar ? (
            <Image
              src={avatar}
              alt={name}
              fill
              sizes="44px"
              className="object-cover"
              placeholder="blur"
              blurDataURL={SHIMMER_AVATAR}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span
                className="select-none font-bold text-white"
                style={{ fontSize: "var(--text-sm)" }}
              >
                {initialsOf(user)}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="flex items-center gap-1.5 truncate font-semibold leading-tight"
            style={{
              fontSize: "var(--text-sm)",
              color: "rgb(var(--color-text))",
            }}
          >
            <span className="truncate">{name}</span>
            {isNew && (
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 font-bold leading-none text-white"
                style={{
                  fontSize: "10px",
                  backgroundColor: "rgb(59 130 246)",
                }}
              >
                New
              </span>
            )}
          </p>
          {user.username && (
            <p
              className="truncate leading-tight"
              style={{
                fontSize: "var(--text-xs)",
                color: "rgb(var(--color-text-muted))",
              }}
            >
              @{user.username}
            </p>
          )}
        </div>
      </Link>

      {resolvingFollowState ? (
        <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
      ) : (
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          className="h-8 shrink-0 rounded-full px-4 font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
          style={{
            fontSize: "var(--text-xs)",
            backgroundColor: following
              ? "rgb(var(--color-bg-elevated))"
              : "rgb(var(--brand-primary))",
            color: following ? "rgb(var(--color-text))" : "#fff",
            border: following
              ? "1px solid rgb(var(--color-border-strong))"
              : "none",
          }}
        >
          {label}
        </button>
      )}
    </li>
  );
}

function RowSkeleton() {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 md:rounded-2xl md:border md:border-default md:px-3 md:py-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="mb-1.5 h-3.5 w-32 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full" />
    </li>
  );
}

interface Props {
  lang: string;
}

/** "Followers" — users who follow me. Paginated, infinite-scroll. Owner-only. */
export function ProfileFollowersView({ lang }: Props) {
  // Owner-only, but still a linkable URL — an arrival with no app history
  // behind it would otherwise get a back button that does nothing.
  const goBack = useAppBack(`/${lang}/for-you`);
  const { data, loading, networkStatus, fetchMore } = useQuery(
    MyFollowersDocument,
    {
      variables: { limit: PAGE_SIZE },
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "cache-and-network",
    },
  );

  // Actor ids passed from a follow notification (?new=id1,id2) — flagged "New".
  const searchParams = useSearchParams();
  const newIds = useMemo(() => {
    const raw = searchParams.get("new");
    return new Set(raw ? raw.split(",").filter(Boolean) : []);
  }, [searchParams]);

  const result = data?.myFollowers;
  const users = result?.users ?? [];
  const hasMore = result?.hasMore ?? false;
  const nextCursor = result?.nextCursor ?? undefined;
  const total = result?.totalCount ?? 0;

  // Follow-state isn't authoritative until the first network response lands.
  const resolvingFollowState = !data || networkStatus === 1;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingMore = useRef(false);

  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor || fetchingMore.current) return;
    fetchingMore.current = true;
    fetchMore({
      variables: { limit: PAGE_SIZE, after: nextCursor },
      updateQuery(prev, { fetchMoreResult }) {
        fetchingMore.current = false;
        if (!fetchMoreResult) return prev;
        return {
          myFollowers: {
            ...fetchMoreResult.myFollowers,
            users: appendUnique(
              prev.myFollowers.users,
              fetchMoreResult.myFollowers.users,
            ),
          },
        };
      },
    }).catch(() => {
      fetchingMore.current = false;
    });
  }, [hasMore, nextCursor, fetchMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const initialLoading = loading && !data;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "rgb(var(--color-bg))" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 border-b"
        style={{
          backgroundColor: "rgb(var(--color-bg) / 0.94)",
          borderColor: "rgb(var(--color-border))",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Inner content matches the list's responsive width so the title lines
            up with the grid on tablet/desktop instead of hugging the far left. */}
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3 md:max-w-3xl lg:max-w-full xl:max-w-full">
          <button
            type="button"
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity active:opacity-60"
            style={{ color: "rgb(var(--color-text))" }}
            aria-label="Back"
          >
            <ArrowLeft size={20} strokeWidth={2.2} />
          </button>
          <div className="min-w-0">
            <h1
              className="font-bold leading-tight"
              style={{
                fontSize: "var(--text-base)",
                color: "rgb(var(--color-text))",
              }}
            >
              Followers
            </h1>
            {!initialLoading && (
              <p
                className="leading-tight"
                style={{
                  fontSize: "var(--text-xs)",
                  color: "rgb(var(--color-text-muted))",
                }}
              >
                {total} {total === 1 ? "follower" : "followers"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* List — single divided column on mobile; a responsive card grid from
          md up so the wider tablet/desktop canvas isn't a lone narrow column.
          The `md:divide-y-0` removes the mobile dividers once we switch to the
          gapped grid; `md:max-w-*` widens the container per breakpoint. */}
      <ul
        className="mx-auto w-full max-w-2xl divide-y md:max-w-3xl md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:px-4 md:py-4 lg:max-w-full lg:grid-cols-3 xl:max-w-full"
        style={{ borderColor: "rgb(var(--color-border))" }}
      >
        {initialLoading
          ? Array.from({ length: 14 }).map((_, i) => <RowSkeleton key={i} />)
          : users.map((u) => (
              <FollowerRow
                key={u.id}
                user={u}
                lang={lang}
                resolvingFollowState={resolvingFollowState}
                isNew={newIds.has(u.id)}
              />
            ))}
      </ul>

      {/* Empty state */}
      {!initialLoading && users.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <p
            className="font-semibold"
            style={{
              fontSize: "var(--text-base)",
              color: "rgb(var(--color-text))",
            }}
          >
            No followers yet
          </p>
          <p
            className="mt-1"
            style={{
              fontSize: "var(--text-sm)",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            When people follow you, they&apos;ll show up here.
          </p>
        </div>
      )}

      {/* Infinite scroll sentinel + loader */}
      <div ref={sentinelRef} className="h-px" />
      {hasMore && !initialLoading && (
        <ul className="mx-auto w-full max-w-2xl md:grid md:max-w-3xl md:grid-cols-2 md:gap-3 md:px-4 md:pb-4 lg:max-w-5xl lg:grid-cols-3 xl:max-w-6xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={`more-${i}`} />
          ))}
        </ul>
      )}
    </div>
  );
}
