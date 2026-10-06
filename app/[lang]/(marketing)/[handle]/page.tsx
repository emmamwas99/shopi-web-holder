import type { Metadata } from "next";
import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

/**
 * Public seller profiles live at the root of a locale as `/en/@emmac`.
 *
 * This is a bare dynamic segment, so it sits below every static route under
 * `[lang]` in Next's matching order — `/en/explore` and friends still win. The
 * "@" is required and part of the URL, which is what keeps this from
 * swallowing arbitrary paths: anything without it is a 404, as it should be.
 *
 * Note the folder cannot be named `@handle`; a leading "@" marks a parallel
 * route slot in the App Router, not a URL segment.
 */
function usernameFromHandle(handle: string): string | null {
  const decoded = decodeURIComponent(handle);
  if (!decoded.startsWith("@")) return null;
  const username = decoded.slice(1).trim().toLowerCase();
  return /^[a-z0-9._-]{1,40}$/.test(username) ? username : null;
}
import { cache } from "react";
import { CreatorProfilePage } from "@/features/profile/components/CreatorProfilePage";
import { query } from "@/lib/apollo/ApolloClient";
import {
  GetUserPostsDocument,
  GetUserProfileDocument,
} from "@/types/__generated__/graphql";
import type {
  ContentCardFieldsFragment,
  ProfileUserFieldsFragment,
} from "@/types/__generated__/graphql";
import { siteConfig } from "@/config/site";
import { contentPath } from "@/lib/content-url";
import {
  jsonLd,
  listingItemListSchema,
  profilePageSchema,
} from "@/lib/structured-data";
import { localeAlternates } from "@/lib/metadata";
import {
  cleanPublicText,
  META_DESCRIPTION_MAX,
  truncateAtWord,
} from "@/lib/seo/public-text";

/** Matches the page size CreatorProfileView asks for, so the client's first
 *  query hits the same shape the server already rendered. */
const INITIAL_POSTS = 18;

interface Props {
  params: Promise<{ lang: string; handle: string }>;
}

// Profiles change (new posts, follower counts) — revalidate hourly so shared
// links and crawled metadata stay reasonably fresh.
export const revalidate = 3600;

type Profile = ProfileUserFieldsFragment;

// cache(): generateMetadata and the page both need these, once per request.
const getProfile = cache(async (username: string): Promise<Profile | null> => {
  try {
    const { data } = await query({
      query: GetUserProfileDocument,
      variables: { username },
    });
    return (data?.userProfile as Profile | undefined) ?? null;
  } catch {
    return null;
  }
});

/**
 * The storefront's first page, fetched on the server. Without it the grid only
 * existed after client JavaScript ran, so crawlers and answer engines saw a
 * seller page with a name and no products — nothing to rank for, and no links
 * through to the listings themselves.
 */
const getInitialPosts = cache(
  async (userId: string): Promise<ContentCardFieldsFragment[]> => {
    try {
      const { data } = await query({
        query: GetUserPostsDocument,
        variables: { userId, limit: INITIAL_POSTS },
      });
      return (data?.userPosts?.posts ?? []) as ContentCardFieldsFragment[];
    } catch {
      return [];
    }
  },
);

/** Where the seller sells from, read off their newest listing. */
function sellerPlace(posts: ContentCardFieldsFragment[]): {
  label: string | null;
  county: string | null;
} {
  const location = posts.find((post) => post.location?.county)?.location;
  const county = location?.county?.trim() || null;
  const place = location?.placeName?.trim() || null;
  const label =
    [place, county].filter((part, i, parts) => part && parts.indexOf(part) === i).join(", ") ||
    null;
  return { label, county };
}

function displayName(p: Profile): string {
  const full = [p.profile?.firstName, p.profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || p.username || "Shopi seller";
}

/**
 * Written for the results page: what you can buy, from whom, where — then the
 * seller's own words with contact details stripped (bios routinely carry phone
 * numbers, which stay out of every public payload).
 */
function buildDescription(p: Profile, place: string | null): string {
  const name = displayName(p);
  const count = p.postCount ?? 0;
  const lead =
    count > 0
      ? `Shop ${count.toLocaleString("en-KE")} listing${count === 1 ? "" : "s"} from ${name} on ${siteConfig.name}${place ? ` in ${place}` : ""}.`
      : `${name} on ${siteConfig.name}, Kenya's social marketplace${place ? `, in ${place}` : ""}.`;
  const bio = cleanPublicText(p.profile?.bio);
  const tail = bio || "Browse the listings and message the seller directly.";
  return truncateAtWord(`${lead} ${tail}`, META_DESCRIPTION_MAX);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, handle } = await params;
  const username = usernameFromHandle(handle);
  if (!username) return { title: siteConfig.name, robots: { index: false, follow: false } };

  const profile = await getProfile(username);
  const canonical = `${siteConfig.url}/${lang}/@${username}`;

  if (!profile) {
    return {
      title: `@${username}`,
      description: siteConfig.description,
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }

  const posts = await getInitialPosts(profile.id);
  const place = sellerPlace(posts);
  const name = displayName(profile);
  const handleLabel = profile.username ? `@${profile.username}` : "";
  // "Name (@handle) · Nairobi" — the county is the local-intent term buyers
  // add to a search ("phone accessories nairobi").
  const title = `${name}${handleLabel ? ` (${handleLabel})` : ""}${place.county ? ` · ${place.county}` : ""}`;
  const shareTitle = `${title} | ${siteConfig.name}`;
  const description = buildDescription(profile, place.label);

  return {
    title,
    description,
    keywords: [
      name,
      profile.username,
      `${name} Shopi`,
      place.county ? `${name} ${place.county}` : null,
      "Shopi seller",
      "Kenya marketplace seller",
    ].filter(Boolean) as string[],
    alternates: {
      canonical,
      ...localeAlternates(`/@${username}`),
    },
    openGraph: {
      type: "profile",
      url: canonical,
      siteName: siteConfig.name,
      title: shareTitle,
      description,
      locale: "en_KE",
      // og:image comes from the sibling opengraph-image route. Next
      // fingerprints image routes under dynamic segments, so a hand-built
      // "/opengraph-image" URL 404s and would override the real one.
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title: shareTitle,
      description,
    },
  };
}

export default async function Page({ params }: Props) {
  const { lang, handle } = await params;
  if (!isValidLocale(lang)) notFound();

  const username = usernameFromHandle(handle);
  if (!username) notFound();

  const profile = await getProfile(username);
  const posts = profile ? await getInitialPosts(profile.id) : [];
  const canonical = `${siteConfig.url}/${lang}/@${username}`;

  return (
    <>
      {profile && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              profilePageSchema({
                url: canonical,
                displayName: displayName(profile),
                username: profile.username,
                // Cleaned: bios carry phone numbers, which stay out of JSON-LD.
                bio: cleanPublicText(profile.profile?.bio) || null,
                avatar: profile.profile?.avatar,
                website: profile.profile?.website,
                followerCount: profile.followerCount,
                postCount: profile.postCount,
              }),
              // The seller's products as an explicit list, so engines connect
              // this profile to its listing pages without inferring it.
              ...(posts.length
                ? [
                    listingItemListSchema({
                      id: `${canonical}#listings`,
                      name: `Listings by ${displayName(profile)} on ${siteConfig.name}`,
                      items: posts.map((post) => ({
                        name: post.title,
                        url: `${siteConfig.url}${contentPath(lang, post)}`,
                      })),
                    }),
                  ]
                : []),
            ),
          }}
        />
      )}
      <CreatorProfilePage
        username={username}
        lang={lang}
        initialProfile={profile}
        initialPosts={posts}
      />
    </>
  );
}
