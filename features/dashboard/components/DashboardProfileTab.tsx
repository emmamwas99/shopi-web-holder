"use client";

import { useCallback } from "react";
import { ChartColumn } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsPanel } from "@/features/profile/components/AnalyticsPanel";
import { EditProfileScreen } from "@/features/profile/components/EditProfileScreen";
import { ReferralPausedPanel } from "@/features/referrals/components/ReferralPausedPanel";
import { DraftsGrid } from "@/features/profile/components/DraftsGrid";
import { PostsGrid } from "@/features/profile/components/PostsGrid";
import { ProfileFollowersView } from "@/features/profile/components/ProfileFollowersView";
import { ProfileVisitorsView } from "@/features/profile/components/ProfileVisitorsView";
import { useMyAnalytics, useMySavedContent } from "@/features/profile/hooks/useMyProfile";
import { appendUnique } from "@/features/profile/lib/appendUnique";

export type DashboardProfileSection =
  | "drafts"
  | "saved"
  | "analytics"
  | "followers"
  | "visitors"
  | "invite"
  | "settings";

const sectionCopy: Record<DashboardProfileSection, { title: string; description: string }> = {
  drafts: { title: "Drafts", description: "Continue editing, publish, or discard your saved drafts." },
  saved: { title: "Saved items", description: "Listings you have bookmarked for later." },
  analytics: { title: "Analytics", description: "See how people discover and engage with your posts." },
  followers: { title: "Followers", description: "People who follow your Shopi profile." },
  visitors: { title: "Profile visitors", description: "People who have recently viewed your profile." },
  invite: { title: "Referrals", description: "Your referral rewards and invitation activity." },
  settings: { title: "Account settings", description: "Update your profile details and photo." },
};

export function DashboardProfileTab({
  section,
  lang,
}: {
  section: DashboardProfileSection;
  lang: string;
}) {
  const saved = useMySavedContent(18, section === "saved");
  const analytics = useMyAnalytics(section === "analytics");
  const savedPosts = saved.data?.mySavedContent.items ?? [];
  const savedResult = saved.data?.mySavedContent;

  const loadMoreSaved = useCallback(() => {
    if (!savedResult?.nextCursor) return;
    void saved.fetchMore({
      variables: { afterId: savedResult.nextCursor, limit: 18 },
      updateQuery(previous, { fetchMoreResult }) {
        if (!fetchMoreResult) return previous;
        return {
          mySavedContent: {
            ...fetchMoreResult.mySavedContent,
            items: appendUnique(
              previous.mySavedContent.items,
              fetchMoreResult.mySavedContent.items,
            ),
          },
        };
      },
    });
  }, [saved, savedResult]);

  if (section === "followers") {
    return <div className="h-full min-h-0 overflow-y-auto"><ProfileFollowersView lang={lang} embedded /></div>;
  }
  if (section === "visitors") {
    return <div className="h-full min-h-0 overflow-y-auto"><ProfileVisitorsView lang={lang} embedded /></div>;
  }

  const copy = sectionCopy[section];

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="z-10 shrink-0 border-b border-border bg-app px-5 pb-4 pt-5 md:px-8 md:pb-5 md:pt-6">
        <h1 className="text-lg font-extrabold tracking-tight text-main">{copy.title}</h1>
        <p className="mt-1 text-xs text-muted">{copy.description}</p>
      </header>
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        data-dashboard-tour={section === "drafts" ? "dashboard-tour-drafts-page" : section === "analytics" ? "dashboard-tour-audience-page" : undefined}
      >
        {section === "drafts" ? (
          <DraftsGrid lang={lang} hideHeading />
        ) : section === "invite" ? (
          <ReferralPausedPanel dashboard />
        ) : section === "settings" ? (
          <EditProfileScreen lang={lang} embedded />
        ) : section === "saved" ? (
          <PostsGrid
            posts={savedPosts}
            hasMore={savedResult?.hasMore ?? false}
            onLoadMore={loadMoreSaved}
            loading={saved.loading}
            lang={lang}
            hideHeading
          />
        ) : analytics.loading && !analytics.data ? (
          <div className="grid grid-cols-2 gap-3 p-5 lg:grid-cols-4 md:p-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
            <Skeleton className="col-span-2 h-64 rounded-xl lg:col-span-3" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : analytics.data?.myAnalytics ? (
          <AnalyticsPanel data={analytics.data.myAnalytics} lang={lang} hideHeading />
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <ChartColumn className="h-7 w-7 text-primary" aria-hidden />
            <h2 className="mt-3 text-sm font-bold text-main">No analytics yet</h2>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
              Your post views, saves, and follower growth will appear here as people engage with your content.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
