import { siteConfig } from "@/config/site";
import {
  durationOf,
  hlsUrlOf,
  isPlayableVideo,
  posterOf,
  type VideoSourcePost,
} from "@/features/feed/lib/videoSource";
import { videoPath } from "@/lib/content-url";
import { profileHref } from "@/lib/profile-url";
import { cleanPublicText, truncateAtWord } from "@/lib/seo/public-text";

/**
 * A video sitemap for the watch pages, /video/{slug}.
 *
 * The main sitemap lists the same pages as plain <url> entries: Next's
 * sitemap writer doesn't escape video titles, and one "&" would get the whole
 * file rejected. This one is written by hand and escapes everything, so it
 * can carry what Google uses to find and index a video without rendering the
 * page — the thumbnail, title, description, stream and duration. The values
 * come from the same helpers as the watch page's VideoObject, so the two
 * always agree.
 *
 * Referenced from robots.txt; submit it in Search Console as well.
 */

export const revalidate = 86400;

const PAGE_SIZE = 50;
const MAX_VIDEOS = 5000;
const FETCH_BUDGET_MS = 20_000;
/** Google's limits for <video:description> and <video:duration>. */
const DESCRIPTION_MAX = 2048;
const DURATION_MAX_SECONDS = 28_800;

type VideoListing = VideoSourcePost & {
  id: string;
  slug?: string | null;
  title?: string | null;
  caption?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  creator?: {
    id?: string | null;
    username?: string | null;
    profile?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

/** Every public video listing, newest first, within the time budget. */
async function fetchVideoListings(): Promise<VideoListing[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];

  const deadline = Date.now() + FETCH_BUDGET_MS;
  const listings: VideoListing[] = [];
  const seen = new Set<string>();
  let after: string | null = null;

  try {
    while (listings.length < MAX_VIDEOS && Date.now() < deadline) {
      const res: Response = await fetch(`${api}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query VideoSitemap($limit: Int, $after: String) {
              discoveryFeed(sort: NEWEST, type: VIDEO, limit: $limit, after: $after) {
                items {
                  id
                  slug
                  title
                  caption
                  type
                  createdAt
                  updatedAt
                  creator { id username profile { firstName lastName } }
                  tiktokEmbed { coverImageUrl }
                  media {
                    thumbnailUrl
                    imageUrl
                    muxMeta { playbackId thumbnailUrl duration }
                  }
                }
                pageInfo { hasNextPage endCursor }
              }
            }
          `,
          variables: { limit: PAGE_SIZE, after },
        }),
        next: { revalidate: 86400 },
      });
      if (!res.ok) break;

      const json = (await res.json()) as {
        data?: {
          discoveryFeed?: {
            items?: VideoListing[];
            pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
          };
        };
      };
      const page = json.data?.discoveryFeed;
      if (!page?.items?.length) break;
      for (const item of page.items) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        listings.push(item);
      }

      if (!page.pageInfo?.hasNextPage || !page.pageInfo.endCursor) break;
      after = page.pageInfo.endCursor;
    }
  } catch {
    // Best-effort, like the main sitemap: ship whatever pages made it.
  }

  return listings;
}

/** Text safe inside an XML element or attribute. */
function xml(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function videoEntry(item: VideoListing): string | null {
  if (!isPlayableVideo(item)) return null;
  const thumbnail = posterOf(item);
  const stream = hlsUrlOf(item);
  // Thumbnail, title and description are required; without a thumbnail the
  // entry would be invalid, so the page is left to the main sitemap.
  if (!thumbnail || !stream) return null;

  const title = item.title?.trim() || "Video";
  const description = truncateAtWord(
    cleanPublicText(item.caption) || `Watch ${title} on ${siteConfig.name}.`,
    DESCRIPTION_MAX,
  );
  const seconds = durationOf(item);
  const duration =
    seconds && seconds > 0
      ? Math.min(Math.max(Math.round(seconds), 1), DURATION_MAX_SECONDS)
      : null;
  const lastModified = item.updatedAt ?? item.createdAt;
  const uploader =
    [item.creator?.profile?.firstName, item.creator?.profile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || item.creator?.username;

  return [
    "  <url>",
    `    <loc>${xml(`${siteConfig.url}${videoPath("en", item)}`)}</loc>`,
    lastModified ? `    <lastmod>${xml(new Date(lastModified).toISOString())}</lastmod>` : null,
    "    <video:video>",
    `      <video:thumbnail_loc>${xml(thumbnail)}</video:thumbnail_loc>`,
    `      <video:title>${xml(title)}</video:title>`,
    `      <video:description>${xml(description)}</video:description>`,
    `      <video:content_loc>${xml(stream)}</video:content_loc>`,
    duration ? `      <video:duration>${duration}</video:duration>` : null,
    item.createdAt
      ? `      <video:publication_date>${xml(new Date(item.createdAt).toISOString())}</video:publication_date>`
      : null,
    uploader && item.creator?.username
      ? `      <video:uploader info="${xml(`${siteConfig.url}${profileHref("en", item.creator)}`)}">${xml(uploader)}</video:uploader>`
      : null,
    "    </video:video>",
    "  </url>",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export async function GET(): Promise<Response> {
  const listings = await fetchVideoListings();
  const entries = listings
    .map(videoEntry)
    .filter((entry): entry is string => entry !== null);

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
