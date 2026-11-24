"use client";

import { useCallback } from "react";
import { ChartColumn } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsPanel } from "@/features/profile/components/AnalyticsPanel";
import { EditProfileScreen } from "@/features/profile/components/EditProfileScreen";
import { DraftsGrid } from "@/features/profile/components/DraftsGrid";
import { PostsGrid } from "@/features/profile/components/PostsGrid";
import { ProfileFollowersView } from "@/features/profile/components/ProfileFollowersView";
import { ProfileVisitorsView } from "@/features/profile/components/ProfileVisitorsView";
import { useMyAnalytics, useMySavedContent } from "@/features/profile/hooks/useMyProfile";
import { appendUnique } from "@/features/profile/lib/appendUnique";
import { DashboardEmpty, DashboardHeader } from "./DashboardSection";

export type DashboardProfileSection =
  | "drafts"
  | "saved"
  | "analytics"
  | "followers"
  | "visitors"
  | "settings";

const sectionCopy: Record<DashboardProfileSection, { title: string; description: string }> = {
  drafts: { title: "Drafts", description: "Continue editing, publish, or discard your saved drafts." },
  saved: { title: "Saved items", description: "Listings you have bookmarked for later." },
  analytics: { title: "Analytics", description: "See how people discover and engage with your posts." },
  followers: { title: "Followers", description: "People who follow your shop." },
  visitors: { title: "Profile visitors", description: "People who have recently viewed your profile." },
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

  const copy = sectionCopy[section];

  if (section === "followers" || section === "visitors") {
    return (
      <section className="flex h-full min-h-0 flex-col">
        <DashboardHeader title={copy.title} description={copy.description} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {section === "followers" ? (
            <ProfileFollowersView lang={lang} embedded />
          ) : (
            <ProfileVisitorsView lang={lang} embedded />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <DashboardHeader title={copy.title} description={copy.description} />
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        data-dashboard-tour={section === "drafts" ? "dashboard-tour-drafts-page" : section === "analytics" ? "dashboard-tour-audience-page" : undefined}
      >
        {section === "drafts" ? (
          <DraftsGrid lang={lang} hideHeading />
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
          <div className="grid grid-cols-2 gap-4 px-8 py-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
            <Skeleton className="col-span-2 h-64 rounded-xl lg:col-span-3" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : analytics.data?.myAnalytics ? (
          <AnalyticsPanel data={analytics.data.myAnalytics} lang={lang} hideHeading />
        ) : (
          <div className="px-8 py-6">
            <DashboardEmpty
              icon={ChartColumn}
              title="No analytics yet"
              body="Your post views, saves and follower growth show up here as people engage with your listings."
            />
          </div>
        )}
      </div>
    </section>
  );
}
