"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { ChartColumn, ChevronLeft, Plus, UserRound } from "lucide-react";
import {
  useMyProfile,
  useMySavedContent,
  useMyAnalytics,
} from "../hooks/useMyProfile";
import { useMyManagedPosts } from "../hooks/useManagedPosts";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileHeader } from "./ProfileHeader";
import { PostsGrid } from "./PostsGrid";
import { ManagedPostsGrid } from "./ManagedPostsGrid";
import { DraftsGrid } from "./DraftsGrid";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { TiktokImportPanel } from "./TiktokImportPanel";
import { ReferralPausedPanel } from "@/features/referrals/components/ReferralPausedPanel";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import {
  PROFILE_SECTION_LABELS,
  ProfileMenu,
  type ProfileSection,
} from "./ProfileMenu";
import { appendUnique } from "../lib/appendUnique";

// "tiktok" is not in the menu, so it is hidden from the UI, but
// TiktokImportPanel and its render branch below are kept intact.
type Tab = ProfileSection | "tiktok";

interface Props {
  lang: string;
}

function ProfileSkeleton() {
  return (
    <div
      className="min-h-screen animate-pulse"
      style={{ backgroundColor: "rgb(var(--color-bg))" }}
    >
      <div
        className="border-b"
        style={{ borderColor: "rgb(var(--color-border))" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <div className="flex gap-4">
            <div
              className="h-20 w-20 rounded-full sm:h-24 sm:w-24"
              style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
            />
            <div className="min-w-0 flex-1 pt-1">
              <div
                className="mb-2 h-6 w-32 rounded-md"
                style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
              />
              <div
                className="mb-3 h-4 w-28 rounded-md"
                style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
              />
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-12 rounded-md"
                    style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div
              className="h-4 w-full max-w-sm rounded-md"
              style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
            />
            <div
              className="h-4 w-40 rounded-md"
              style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
            />
          </div>
        </div>
      </div>
      {/* The menu's shape: a titled group of rows, beside the posts grid on
          desktop. */}
      <div className="flex gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <div className="w-full md:w-72 md:shrink-0 lg:w-80">
          <div
            className="mb-2 h-4 w-24 rounded-md"
            style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
          />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex h-12 items-center gap-3.5 md:h-13 md:gap-4">
              <div
                className="h-5 w-5 rounded-full"
                style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
              />
              <div
                className="h-4 w-40 rounded-md"
                style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
              />
            </div>
          ))}
        </div>
        <div className="hidden min-w-0 flex-1 grid-cols-3 gap-3 md:grid xl:grid-cols-4 xl:gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-9/10 rounded-lg"
              style={{
                backgroundColor: "rgb(var(--color-bg-subtle))",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileUnavailable({
  onRetry,
  error,
}: {
  onRetry: () => void;
  error: boolean;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{ backgroundColor: "rgb(var(--color-bg))" }}
    >
      <div className="flex max-w-sm flex-col items-center text-center">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg border"
          style={{
            backgroundColor: "rgb(var(--color-bg-elevated))",
            borderColor: "rgb(var(--color-border))",
            color: "rgb(var(--color-text-muted))",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <UserRound size={26} strokeWidth={2} />
        </div>
        <h2
          className="font-bold"
          style={{
            fontSize: "var(--text-lg)",
            color: "rgb(var(--color-text))",
          }}
        >
          Couldn&apos;t load your profile
        </h2>
        <p
          className="mt-2 leading-snug"
          style={{
            fontSize: "var(--text-base)",
            color: "rgb(var(--color-text-muted))",
          }}
        >
          {error
            ? "Something went wrong on our end."
            : "Your session may have expired."}{" "}
          Try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg px-5 font-semibold text-white active:opacity-80"
          style={{
            fontSize: "var(--text-sm)",
            background:
              "linear-gradient(135deg, rgb(var(--brand-primary)), rgb(var(--brand-highlight)))",
            boxShadow: "0 10px 24px rgb(var(--brand-primary) / 0.24)",
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function isTab(value: string | null): value is Tab {
  return (
    value === "tiktok" ||
    (!!value && Object.hasOwn(PROFILE_SECTION_LABELS, value))
  );
}

export function ProfileView({ lang }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();

  // The open section lives in `?tab=`, read live so the browser's back button
  // moves between the menu and a section. No tab means the menu on a phone and
  // Posts on desktop, where the menu is always there as a sidebar.
  //
  // `?tab=settings` is what the old Settings tab and its sub-pages' back links
  // still produce. Its rows are in the menu now, so it resolves to no tab.
  const requested = searchParams.get("tab");
  const tab: Tab | null = isTab(requested) ? requested : null;
  const shownTab: Tab = tab ?? "posts";

  // Whether back from a section can pop history to the menu, or whether the
  // section was opened straight from a link and history leads elsewhere.
  const openedFromMenu = useRef(false);

  const tabHref = useCallback(
    (next: Tab | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("tab", next);
      else params.delete("tab");
      const query = params.toString();
      return `/${lang}/profile${query ? `?${query}` : ""}`;
    },
    [lang, searchParams],
  );

  // On a phone, opening a section is a step deeper, so it is pushed and the
  // back gesture returns to the menu. On desktop it swaps the pane beside the
  // sidebar, a view of the same page, so it replaces — otherwise back would
  // step through every section tried before leaving the profile at all.
  const selectTab = useCallback(
    (next: ProfileSection) => {
      if (isDesktop) {
        router.replace(tabHref(next === "posts" ? null : next), {
          scroll: false,
        });
        return;
      }
      openedFromMenu.current = true;
      router.push(tabHref(next));
    },
    [isDesktop, router, tabHref],
  );

  const backToMenu = useCallback(() => {
    if (openedFromMenu.current) {
      openedFromMenu.current = false;
      router.back();
    } else {
      router.replace(tabHref(null));
    }
  }, [router, tabHref]);

  const [postsLimit] = useState(18);

  const {
    data: profileData,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useMyProfile();
  const {
    data: managedPostsData,
    loading: managedPostsLoading,
    fetchMore,
    refetch: refetchManagedPosts,
  } = useMyManagedPosts(postsLimit);
  const {
    data: savedData,
    loading: savedLoading,
    fetchMore: fetchMoreSaved,
  } = useMySavedContent(postsLimit, shownTab === "saved");
  const { data: analyticsData, loading: analyticsLoading } = useMyAnalytics(
    shownTab === "analytics",
  );

  if (profileLoading && !profileData) return <ProfileSkeleton />;

  const user = profileData?.me;
  // Never render nothing: a viewer-scoped query that errored or resolved
  // `me: null` (expired token, refresh mid-flight) used to bail to `null` here,
  // leaving a blank screen with no way out except a hard reload.
  if (!user) return <ProfileUnavailable onRetry={() => refetchProfile()} error={!!profileError} />;

  const managedPosts = managedPostsData?.myManagedContent.items ?? [];
  const managedHasMore = managedPostsData?.myManagedContent.hasMore ?? false;
  const managedNextCursor = managedPostsData?.myManagedContent.nextCursor;

  function handleLoadMore() {
    if (!managedNextCursor) return;
    fetchMore({
      variables: { afterId: managedNextCursor, limit: postsLimit },
      updateQuery(prev, { fetchMoreResult }) {
        if (!fetchMoreResult) return prev;
        return {
          myManagedContent: {
            ...fetchMoreResult.myManagedContent,
            items: appendUnique(
              prev.myManagedContent.items,
              fetchMoreResult.myManagedContent.items,
            ),
          },
        };
      },
    });
  }

  const savedPosts = savedData?.mySavedContent.items ?? [];
  const savedHasMore = savedData?.mySavedContent.hasMore ?? false;
  const savedNextCursor = savedData?.mySavedContent.nextCursor;

  function handleLoadMoreSaved() {
    if (!savedNextCursor) return;
    fetchMoreSaved({
      variables: { afterId: savedNextCursor, limit: postsLimit },
      updateQuery(prev, { fetchMoreResult }) {
        if (!fetchMoreResult) return prev;
        return {
          mySavedContent: {
            ...fetchMoreResult.mySavedContent,
            items: appendUnique(
              prev.mySavedContent.items,
              fetchMoreResult.mySavedContent.items,
            ),
          },
        };
      },
    });
  }

  const sectionTitle =
    tab && tab !== "tiktok" ? PROFILE_SECTION_LABELS[tab] : "TikTok import";

  return (
    <div
      className="min-h-screen pb-8"
      style={{ backgroundColor: "rgb(var(--color-bg))" }}
    >
      {/* On a phone an open section takes the whole screen under its own back
          bar; the header and menu are one tap back. */}
      <div className={cn(tab && "hidden md:block")}>
        <ProfileHeader
          user={user}
          editHref={`/${lang}/profile/edit`}
          lang={lang}
        />
      </div>

      {tab && (
        <div className="sticky top-0 z-20 grid h-12 grid-cols-[48px_1fr_48px] items-center border-b border-border bg-app/94 px-1 backdrop-blur-md md:hidden">
          <button
            type="button"
            onClick={backToMenu}
            aria-label="Back to profile"
            className="flex h-11 w-11 items-center justify-center rounded-full text-main active:bg-surface"
          >
            <ChevronLeft size={24} strokeWidth={2.2} />
          </button>
          <h2 className="truncate text-center text-[15px] font-semibold text-main">
            {sectionTitle}
          </h2>
        </div>
      )}

      <div className="md:flex md:items-start md:gap-6 md:px-6 lg:gap-8 lg:px-8">
        <aside
          className={cn(
            "px-4 py-5 md:sticky md:top-(--desktop-top-nav-height,68px) md:max-h-[calc(100dvh-var(--desktop-top-nav-height,68px))] md:w-72 md:shrink-0 md:overflow-y-auto md:px-0 md:py-6 lg:w-80",
            tab && "hidden md:block",
          )}
        >
          <ProfileMenu
            lang={lang}
            user={user}
            active={shownTab === "tiktok" ? null : shownTab}
            onSelect={selectTab}
          />
        </aside>

        <main
          className={cn(
            "min-w-0 md:flex-1 md:border-l md:border-border",
            !tab && "hidden md:block",
          )}
        >
          {shownTab === "posts" && (
            <ManagedPostsGrid
              posts={managedPosts}
              hasMore={managedHasMore}
              onLoadMore={handleLoadMore}
              loading={managedPostsLoading}
              lang={lang}
              onRefresh={() => refetchManagedPosts({ limit: postsLimit })}
            />
          )}

          {shownTab === "saved" && (
            <PostsGrid
              posts={savedPosts}
              hasMore={savedHasMore}
              onLoadMore={handleLoadMoreSaved}
              loading={savedLoading}
              lang={lang}
            />
          )}

          {shownTab === "drafts" && <DraftsGrid lang={lang} />}

          {shownTab === "invite" && <ReferralPausedPanel />}

          {shownTab === "analytics" && (
            <>
              {analyticsLoading && !analyticsData ? (
                <section className="px-4 py-5 sm:px-6 lg:px-8">
                  <div className="mx-auto w-full max-w-6xl flex flex-col gap-4">
                    {/* header row */}
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-5 w-24 rounded-md" />
                        <Skeleton className="h-3.5 w-16 rounded-md" />
                      </div>
                      <Skeleton className="h-9 w-40 rounded-lg" />
                    </div>
                    {/* metric cards */}
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-lg" />
                      ))}
                    </div>
                    {/* chart + sidebar */}
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <Skeleton className="h-64 rounded-lg" />
                      <div className="flex flex-col gap-4">
                        <Skeleton className="h-48 rounded-lg" />
                        <Skeleton className="h-32 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </section>
              ) : analyticsData?.myAnalytics ? (
                <AnalyticsPanel data={analyticsData.myAnalytics} lang={lang} />
              ) : (
                <section className="px-4 py-12 sm:px-6 lg:px-8">
                  <div className="mx-auto flex min-h-80 max-w-xl flex-col items-center justify-center text-center">
                    <div
                      className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg border"
                      style={{
                        backgroundColor: "rgb(var(--color-bg-elevated))",
                        borderColor: "rgb(var(--color-border))",
                        color: "rgb(var(--brand-primary))",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <ChartColumn size={26} strokeWidth={2} />
                    </div>
                    <h2
                      className="font-bold"
                      style={{
                        fontSize: "var(--text-lg)",
                        color: "rgb(var(--color-text))",
                      }}
                    >
                      No analytics yet
                    </h2>
                    <p
                      className="mt-2 max-w-sm leading-snug"
                      style={{
                        fontSize: "var(--text-base)",
                        color: "rgb(var(--color-text-muted))",
                      }}
                    >
                      Post your first video and analytics will appear here once it
                      gets views.
                    </p>
                    <Link
                      href={`/${lang}/upload`}
                      className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 font-semibold text-white active:opacity-80"
                      style={{
                        fontSize: "var(--text-sm)",
                        background:
                          "linear-gradient(135deg, rgb(var(--brand-primary)), rgb(var(--brand-highlight)))",
                        boxShadow: "0 10px 24px rgb(var(--brand-primary) / 0.24)",
                      }}
                    >
                      <Plus size={16} strokeWidth={2.4} />
                      New post
                    </Link>
                  </div>
                </section>
              )}
            </>
          )}

          {shownTab === "tiktok" && <TiktokImportPanel lang={lang} />}
        </main>
      </div>
    </div>
  );
}
