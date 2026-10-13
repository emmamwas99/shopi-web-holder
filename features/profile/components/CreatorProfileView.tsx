"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAppBack } from "@/lib/useAppBack";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import {
  DISCOVER_GRID,
  DiscoverGridCard,
  DiscoverGridSkeleton,
} from "@/features/discover/components/DiscoverGridCard";
import {
  Check,
  ChevronLeft,
  Copy,
  ExternalLink,
  Video,
} from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import { SHIMMER_AVATAR } from "@/lib/shimmer";
import {
  GetUserPostsDocument,
  RecordProfileVisitDocument,
  type ContentCardFieldsFragment,
  type ProfileUserFieldsFragment,
} from "@/types/__generated__/graphql";
import { useFollow } from "@/features/feed/hooks/useFollow";
import { useAuthStore } from "@/stores/auth";
import { trackSellerEvent } from "@/lib/seller-analytics";
import { appendUnique } from "../lib/appendUnique";
import { CreatorStoryAvatar } from "@/features/stories/components/CreatorStoryAvatar";
import { profileHref } from "@/lib/profile-url";
import { toast } from "sonner";
import { BackToTopButton } from "@/components/layout/BackToTopButton";

function formatCompact(value: number | null | undefined) {
  if (value == null) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/** "KSh 12,500" — grouped thousands, no decimals. */
/**
 * Readable location for a card: county first, then the more specific area, e.g.
 * "Nairobi, Westlands". Falls back gracefully and de-dupes when the area and
 * county are the same (so we never show "Nairobi, Nairobi").
 */
function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-black text-main md:text-base">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted">{label}</p>
    </div>
  );
}

/** Bio text, clamped to 3 lines with a "more"/"less" toggle. The toggle only
 * renders when the text actually overflows 3 lines — measured against the
 * DOM rather than guessed from character count, since a bio can wrap short
 * on a narrow phone and long on desktop at the same length. */
function ExpandableBio({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <div>
      <p
        ref={ref}
        className={`text-sm leading-6 text-main ${expanded ? "" : "line-clamp-3"}`}
      >
        {text}
      </p>
      {truncated ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-sm font-bold text-primary"
        >
          {expanded ? "less" : "more"}
        </button>
      ) : null}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  user: ProfileUserFieldsFragment;
  lang: string;
  isOwnProfile: boolean;
  /**
   * First storefront page rendered on the server (public profile route). Shown
   * until the client query answers, so the grid — and its links to every
   * listing — is in the HTML crawlers read instead of arriving after JS.
   */
  initialPosts?: ContentCardFieldsFragment[];
}

export function CreatorProfileView({
  user,
  lang,
  isOwnProfile,
  initialPosts,
}: Props) {
  // A profile link opened from outside has no app history to return to, so
  // back would be a dead button. Send those to the feed.
  const isDesktop = useIsDesktop({ ssrDefault: false });
  const goBack = useAppBack(
    isDesktop ? `/${lang}/explore` : `/${lang}/for-you`,
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  async function copyProfileUrl() {
    const url = `${window.location.origin}${profileHref(lang, user)}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API is unavailable in some browsers or insecure contexts.
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (!copied) {
        toast.error("Could not copy profile link");
        return;
      }
    }
    setLinkCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setLinkCopied(false), 1800);
  }

  const firstName = user.profile?.firstName ?? "";
  const lastName = user.profile?.lastName ?? "";
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Creator";
  const initials =
    [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() || "?";
  const avatar = user.profile?.avatar;
  const hasTikTok = Boolean(user.tiktokOpenId);

  const {
    following,
    followerCount,
    toggle: toggleFollow,
    loading: followLoading,
  } = useFollow({
    userId: user.id,
    initialFollowing: user.isFollowedByMe ?? false,
    initialFollowerCount: user.followerCount ?? 0,
    lang,
  });

  // Record a profile visit once per mount. Requires login (so we can attribute
  // the visit to a real user) and skips the user's own profile. Fire-and-forget.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [recordProfileVisit] = useMutation(RecordProfileVisitDocument);
  const visitTrackedRef = useRef(false);
  useEffect(() => {
    if (isOwnProfile || !isAuthenticated || visitTrackedRef.current || !user.id)
      return;
    visitTrackedRef.current = true;
    recordProfileVisit({ variables: { userId: user.id } }).catch(() => {});
  }, [user.id, isOwnProfile, isAuthenticated, recordProfileVisit]);

  // Funnel analytics: every visitor, signed in or not (the visit above only
  // sees signed-in users). The API ignores sellers it isn't tracking.
  const funnelViewTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (isOwnProfile || !user.id || funnelViewTrackedRef.current === user.id) return;
    funnelViewTrackedRef.current = user.id;
    trackSellerEvent({ type: "PROFILE_VIEW", sellerId: user.id });
  }, [user.id, isOwnProfile]);

  const {
    data,
    loading: postsLoading,
    fetchMore,
  } = useQuery(GetUserPostsDocument, {
    variables: { userId: user.id, limit: 18 },
    notifyOnNetworkStatusChange: true,
  });

  const posts = data?.userPosts.posts ?? initialPosts ?? [];
  const hasMore = data?.userPosts.hasMore ?? false;
  const nextCursor = data?.userPosts.nextCursor ?? undefined;

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingMore = useRef(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !postsLoading &&
          !fetchingMore.current
        ) {
          fetchingMore.current = true;
          fetchMore({
            variables: { userId: user.id, limit: 18, afterId: nextCursor },
            updateQuery(prev, { fetchMoreResult }) {
              fetchingMore.current = false;
              if (!fetchMoreResult) return prev;
              return {
                userPosts: {
                  ...fetchMoreResult.userPosts,
                  posts: appendUnique(
              prev.userPosts.posts,
              fetchMoreResult.userPosts.posts,
            ),
                },
              };
            },
          });
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, postsLoading, nextCursor, fetchMore, user.id]);



  return (
    <div className="min-h-screen bg-white dark:bg-app">
      <div className="sticky top-0 z-30 border-b border-border bg-white dark:bg-app">
        <div className="desktop-app-frame flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
          <button
            onClick={goBack}
            className="inline-flex h-10 items-center gap-1.5 text-sm font-bold text-main transition-opacity active:opacity-60"
            aria-label="Go back"
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
            Back
          </button>

          <button
            type="button"
            onClick={() => void copyProfileUrl()}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-elevated px-3.5 text-sm font-semibold text-main transition-colors hover:bg-surface active:scale-95"
            aria-label={linkCopied ? "Profile link copied" : "Copy profile link"}
          >
            {linkCopied ? (
              <Check className="animate-in zoom-in-50 duration-200" size={15} strokeWidth={2.4} />
            ) : (
              <Copy size={15} strokeWidth={2} />
            )}
            {linkCopied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="desktop-app-frame w-full px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              {/* Any live story rings the avatar (pink new, grey watched) and
                  a tap opens it — there's no profile to send the tap to here. */}
              <CreatorStoryAvatar
                userId={user.id}
                lang={lang}
                name={displayName}
                mode="any"
                ringClassName="-inset-[6px]"
                ringThickness={3.4}
                className="shrink-0 rounded-full"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-main sm:h-24 sm:w-24">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={displayName}
                      fill
                      sizes="96px"
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL={SHIMMER_AVATAR}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="select-none text-xl font-black text-elevated">
                        {initials}
                      </span>
                    </div>
                  )}
                </div>
              </CreatorStoryAvatar>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-black leading-tight text-main md:text-2xl">
                    {displayName}
                  </h1>
                  {user.isVerified ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="shrink-0"
                      aria-label="Verified"
                    >
                      <circle cx="10" cy="10" r="10" fill="#1D9BF0" />
                      <path
                        d="M6 10.5l2.5 2.5 5.5-5.5"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </div>
                {user.username ? (
                  <p className="mt-1 text-sm font-medium text-muted">
                    @{user.username}
                  </p>
                ) : null}

                <div className="mt-4 flex items-center gap-6">
                  <ProfileStat
                    label="Followers"
                    value={formatCompact(followerCount)}
                  />
                  <ProfileStat
                    label="Listings"
                    value={formatCompact(user.postCount)}
                  />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
              {!isOwnProfile ? (
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={[
                    "inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-bold transition-all active:scale-95 disabled:opacity-60",
                    following
                      ? "border border-border text-main hover:bg-surface"
                      : "bg-primary text-white",
                  ].join(" ")}
                >
                  {following ? "Following" : "Follow"}
                </button>
              ) : null}

              {hasTikTok ? (
                <a
                  href={`https://www.tiktok.com/@${user.username ?? ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-bold text-main transition-colors hover:bg-surface"
                >
                  <Video size={15} strokeWidth={2.2} />
                  TikTok
                </a>
              ) : null}
            </div>
          </div>

          {/* Its own full-width block below the avatar row, not squeezed
              into the narrow column beside the avatar — on a phone that
              column wrapped a multi-line bio into a thin ribbon next to
              empty space under the avatar. */}
          {(user.profile?.bio || user.profile?.website) && (
            <div className="mt-4 flex max-w-2xl flex-col gap-2">
              {user.profile?.bio ? <ExpandableBio text={user.profile.bio} /> : null}

              {user.profile?.website ? (
                <a
                  href={
                    user.profile.website.startsWith("http")
                      ? user.profile.website
                      : `https://${user.profile.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit max-w-full items-center gap-1.5 text-sm font-bold text-primary"
                >
                  <ExternalLink size={14} strokeWidth={2.2} />
                  <span className="truncate">
                    {user.profile.website.replace(/^https?:\/\//, "")}
                  </span>
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="desktop-app-frame w-full px-4 pb-12 pt-5 sm:px-6 lg:px-8 xl:px-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-black text-main">
            Storefront
          </h2>
          <span className="text-sm font-medium text-muted">
            {posts.length} shown
          </span>
        </div>

        {postsLoading && posts.length === 0 ? (
          <DiscoverGridSkeleton showSeller={false} />
        ) : posts.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center py-12 text-center">
            <p className="text-base font-black text-main">
              No listings yet
            </p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted">
              This storefront will show items once they are published.
            </p>
          </div>
        ) : (
          <>
            {/* The same tile as /explore and the Saved tab, so a listing looks
                identical wherever it is browsed. */}
            <div className={DISCOVER_GRID}>
              {posts.map((post, index) => (
                <DiscoverGridCard
                  key={post.id}
                  post={post}
                  lang={lang}
                  priority={index < 4}
                  // Every tile on this page belongs to the seller whose profile
                  // it is, so the seller row would repeat the same name down
                  // the whole grid.
                  showSeller={false}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel — triggers next page fetch */}
            <div ref={sentinelRef} className="h-1" />

            {/* Skeleton tiles while fetching the next page */}
            {/* Only for a real next-page fetch — not while the client's first
                query refreshes the server-rendered page. */}
            {postsLoading && Boolean(data) && posts.length > 0 && (
              <DiscoverGridSkeleton rows={1} showSeller={false} className="mt-5" />
            )}
          </>
        )}
      </div>
      <BackToTopButton />
    </div>
  );
}
