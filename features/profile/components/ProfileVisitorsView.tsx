"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAppBack } from "@/lib/useAppBack";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@apollo/client/react";
import {
  MyProfileVisitorsDocument,
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

/** A single visitor row: avatar + name + Follow / Follow back / Following. */
function VisitorRow({
  visitor,
  lang,
  resolvingFollowState,
}: {
  visitor: VisitorFieldsFragment;
  lang: string;
  /** True while the authoritative follow-state is still loading — show a skeleton
   * instead of defaulting every button to "Follow". */
  resolvingFollowState: boolean;
}) {
  const { following, toggle, loading } = useFollow({
    userId: visitor.id,
    initialFollowing: visitor.isFollowedByMe ?? false,
    lang,
  });

  const avatar = visitor.profile?.avatar;
  const name = displayNameOf(visitor);
  // "Follow back" when they already follow us and we don't follow them yet.
  const label = following
    ? "Following"
    : visitor.isFollowingMe
      ? "Follow back"
      : "Follow";

  const href = profileHref(lang, visitor);

  return (
    <li
      className="flex items-center gap-3 px-4 py-2.5"
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
                {initialsOf(visitor)}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate font-semibold leading-tight"
            style={{
              fontSize: "var(--text-sm)",
              color: "rgb(var(--color-text))",
            }}
          >
            {name}
          </p>
          {visitor.username && (
            <p
              className="truncate leading-tight"
              style={{
                fontSize: "var(--text-xs)",
                color: "rgb(var(--color-text-muted))",
              }}
            >
              @{visitor.username}
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
    <li className="flex items-center gap-3 px-4 py-2.5">
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

/** "Who viewed your profile" — paginated, infinite-scroll list. Owner-only. */
export function ProfileVisitorsView({ lang }: Props) {
  // Owner-only, but still a linkable URL — an arrival with no app history
  // behind it would otherwise get a back button that does nothing.
  const goBack = useAppBack(`/${lang}/for-you`);
  const { data, loading, networkStatus, fetchMore } = useQuery(
    MyProfileVisitorsDocument,
    {
      variables: { limit: PAGE_SIZE },
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "cache-and-network",
    },
  );

  const result = data?.myProfileVisitors;
  const visitors = result?.visitors ?? [];
  const hasMore = result?.hasMore ?? false;
  const nextCursor = result?.nextCursor ?? undefined;
  const total = result?.totalCount ?? 0;

  // Until the first network response lands, follow-state isn't authoritative
  // (cache-and-network can render cached rows first). networkStatus === 1 is the
  // initial in-flight fetch — show a skeleton on the follow button until it
  // resolves so we don't flash "Follow" for users we already follow.
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
          myProfileVisitors: {
            ...fetchMoreResult.myProfileVisitors,
            visitors: appendUnique(
              prev.myProfileVisitors.visitors,
              fetchMoreResult.myProfileVisitors.visitors,
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
        className="sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3"
        style={{
          backgroundColor: "rgb(var(--color-bg) / 0.94)",
          borderColor: "rgb(var(--color-border))",
          backdropFilter: "blur(8px)",
        }}
      >
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
            Profile views
          </h1>
          {!initialLoading && (
            <p
              className="leading-tight"
              style={{
                fontSize: "var(--text-xs)",
                color: "rgb(var(--color-text-muted))",
              }}
            >
              {total} {total === 1 ? "viewer" : "viewers"}
            </p>
          )}
        </div>
      </div>

      {/* List */}
      <ul
        className="mx-auto w-full max-w-2xl divide-y"
        style={{ borderColor: "rgb(var(--color-border))" }}
      >
        {initialLoading
          ? Array.from({ length: 14 }).map((_, i) => <RowSkeleton key={i} />)
          : visitors.map((v) => (
              <VisitorRow
                key={v.id}
                visitor={v}
                lang={lang}
                resolvingFollowState={resolvingFollowState}
              />
            ))}
      </ul>

      {/* Empty state */}
      {!initialLoading && visitors.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <p
            className="font-semibold"
            style={{
              fontSize: "var(--text-base)",
              color: "rgb(var(--color-text))",
            }}
          >
            No profile views yet
          </p>
          <p
            className="mt-1"
            style={{
              fontSize: "var(--text-sm)",
              color: "rgb(var(--color-text-muted))",
            }}
          >
            When logged-in users view your profile, they&apos;ll show up here.
          </p>
        </div>
      )}

      {/* Infinite scroll sentinel + loader */}
      <div ref={sentinelRef} className="h-px" />
      {hasMore && !initialLoading && (
        <ul className="mx-auto w-full max-w-2xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={`more-${i}`} />
          ))}
        </ul>
      )}
    </div>
  );
}
