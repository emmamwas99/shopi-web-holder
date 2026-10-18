"use client";

import { useQuery } from "@apollo/client/react";
import { GetUserProfileDocument } from "@/types/__generated__/graphql";
import type {
  ContentCardFieldsFragment,
  ProfileUserFieldsFragment,
} from "@/types/__generated__/graphql";
import { useAuthStore } from "@/stores/auth";
import { CreatorProfileView } from "./CreatorProfileView";

interface Props {
  username: string;
  lang: string;
  /**
   * Server-fetched profile used for the first render. The route already loads
   * this for the page's metadata and JSON-LD; passing it down means the seller's
   * name, bio and listings are in the crawled HTML rather than behind a client
   * query that non-JS crawlers never run.
   */
  initialProfile?: ProfileUserFieldsFragment | null;
  /** Server-fetched first page of the storefront, for the same reason. */
  initialPosts?: ContentCardFieldsFragment[];
}

export function CreatorProfilePage({
  username,
  lang,
  initialProfile,
  initialPosts,
}: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data, loading } = useQuery(GetUserProfileDocument, {
    variables: { username },
  });

  const profile = data?.userProfile ?? initialProfile;

  // Skeleton only when there is genuinely nothing to show — with a server-
  // supplied profile the first paint is the real page.
  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-app">
        <div className="border-b border-border">
          <div className="w-full px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
            <div
              className="mb-5 h-5 w-16 animate-pulse rounded"
              style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
            />
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className="h-20 w-20 shrink-0 animate-pulse rounded-full sm:h-24 sm:w-24"
                  style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                />
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <div
                    className="h-6 w-40 animate-pulse rounded"
                    style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                  />
                  <div
                    className="h-4 w-24 animate-pulse rounded"
                    style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                  />
                  <div
                    className="mt-3 h-4 w-full max-w-lg animate-pulse rounded"
                    style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                  />
                  <div
                    className="h-4 w-2/3 max-w-sm animate-pulse rounded"
                    style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                  />
                  <div className="mt-4 flex gap-6">
                    <div
                      className="h-9 w-20 animate-pulse rounded"
                      style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                    />
                    <div
                      className="h-9 w-20 animate-pulse rounded"
                      style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                    />
                  </div>
                </div>
              </div>
              <div
                className="h-9 w-24 animate-pulse rounded-full"
                style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
              />
            </div>
          </div>
        </div>

        <div className="w-full px-4 pb-12 pt-5 sm:px-6 lg:px-8 xl:px-10">
          <div className="mb-4 flex items-center justify-between">
            <div
              className="h-5 w-24 animate-pulse rounded"
              style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
            />
            <div
              className="h-4 w-16 animate-pulse rounded"
              style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 md:gap-x-4 md:gap-y-6 xl:grid-cols-4 min-[90rem]:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}>
                <div
                  className="aspect-3/4 w-full animate-pulse rounded-xl"
                  style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                />
                <div className="space-y-2 pt-2">
                  <div
                    className="h-3.5 w-1/2 animate-pulse rounded"
                    style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                  />
                  <div
                    className="h-3 w-4/5 animate-pulse rounded"
                    style={{ backgroundColor: "rgb(var(--color-bg-subtle))" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-app"
      >
        <p
          style={{
            fontSize: "var(--text-base)",
            color: "rgb(var(--color-text-muted))",
          }}
        >
          Creator not found.
        </p>
      </div>
    );
  }

  const isOwnProfile = Boolean(currentUserId && currentUserId === profile.id);

  return (
    <CreatorProfileView
      user={profile}
      lang={lang}
      isOwnProfile={isOwnProfile}
      initialPosts={initialPosts}
    />
  );
}
