import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { ImmersiveVideoViewer } from "@/features/feed/components/immersive/ImmersiveVideoViewer";
import { SINGLE_LISTING_CACHE, query } from "@/lib/apollo/ApolloClient";
import {
  GetContentDocument,
  type ContentCardFieldsFragment,
} from "@/types/__generated__/graphql";
import {
  durationOf,
  hlsUrlOf,
  isPlayableVideo,
  posterOf,
} from "@/features/feed/lib/videoSource";
import { contentPath, contentSlugSegment, videoPath } from "@/lib/content-url";
import { canonicalUrl, localeAlternates } from "@/lib/metadata";
import { profileHref } from "@/lib/profile-url";
import { jsonLd, videoObjectSchema } from "@/lib/structured-data";
import { siteConfig } from "@/config/site";

type Props = { params: Promise<{ lang: string; slug: string }> };

/**
 * The real, shareable page behind the immersive viewer.
 *
 * Opening a video from the feed never reaches this file — the sibling
 * interceptor at @modal/(.)video/[slug] renders over the feed instead, so the
 * feed stays mounted and its scroll position survives. This route serves cold
 * arrivals: a pasted link, a refresh mid-viewer, a crawler.
 *
 * The segment is a slug, but the API resolves an id or a `title-id` form too,
 * so older links keep working — they are redirected to the canonical slug
 * below rather than serving the same video at two indexable URLs.
 *
 * This is the listing's watch page: its own canonical, with the VideoObject
 * and the video itself in the server HTML. Google indexes a video only on a
 * page whose main content is the video, so pointing this URL at the product
 * page (as it did from 6 Oct 2026) left all ~250 videos "not on a watch page"
 * and none indexed. The product page stays the canonical for the listing.
 */

// Videos change less than listings do, and the viewer refetches its own list
// on the client, so an hour of metadata staleness is a fair trade.
export const revalidate = 3600;

async function getPost(
  idOrSlug: string,
): Promise<ContentCardFieldsFragment | null> {
  try {
    const { data } = await query({
      query: GetContentDocument,
      variables: { id: idOrSlug },
      context: SINGLE_LISTING_CACHE,
    });
    return (data?.content as ContentCardFieldsFragment | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "Video",
      description: siteConfig.description,
      alternates: { canonical: `${siteConfig.url}/${lang}/video/${slug}` },
      robots: { index: false, follow: true },
    };
  }

  const path = `/video/${contentSlugSegment(post)}`;
  // English-only like every listing URL, so /sw canonicalises to /en.
  const canonical = canonicalUrl(lang, path);
  const title = post.title || "Video";
  const description =
    post.caption?.trim() || `Watch ${title} on ${siteConfig.name}.`;
  const poster = posterOf(post);
  const fallbackImage = `${siteConfig.url}/og/listing/${encodeURIComponent(post.id)}`;
  const shareImages = [poster, fallbackImage].filter(
    (image): image is string => Boolean(image),
  );

  // Unlisted, still-processing or image posts stay out of the index (image
  // posts are redirected to their listing below anyway).
  const indexable = post.isLive !== false && isPlayableVideo(post);

  return {
    // "Watch …" keeps the title distinct from the listing page's
    // "title · price · place", so the two don't read as duplicates.
    title: `Watch ${title}`,
    description,
    keywords: [post.title, ...(post.hashtags ?? [])].filter(
      Boolean,
    ) as string[],
    alternates: { canonical, ...localeAlternates(path) },
    robots: {
      index: indexable,
      follow: true,
      googleBot: {
        index: indexable,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "video.other",
      title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: "en_KE",
      images: shareImages,
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title,
      description,
      images: shareImages,
    },
  };
}

export default async function VideoPageRoute({ params }: Props) {
  const { lang, slug } = await params;

  const post = await getPost(slug);
  if (!post) notFound();

  // A hand-typed or stale segment can point at an image post or a video still
  // transcoding. Send those to the normal detail page rather than opening the
  // viewer on a stranger's top-ranked video with no explanation.
  if (!isPlayableVideo(post)) {
    redirect(contentPath(lang, post));
  }

  // Reached by id or by a stale slug: 301 to the canonical slug so link equity
  // consolidates on one URL. Same pattern the listing route uses.
  const canonicalPath = videoPath(lang, post);
  if (canonicalPath !== `/${lang}/video/${slug}`) {
    permanentRedirect(canonicalPath);
  }

  // The viewer's own list is fetched on the client, deliberately.
  //
  // A server-side PreloadQuery here would carry no auth token, and
  // `isLikedByMe` / `isMyContent` are merge:false in the Content type policy —
  // so the preloaded response would overwrite a signed-in viewer's like state
  // with false and visibly un-like the cards behind. The feed route gates its
  // own preload on the auth-hint cookie for exactly this reason; the viewer
  // sidesteps it entirely, since the seed usually paints from the feed's
  // existing cache anyway.
  const title = post.title || "Video";
  const watchUrl = canonicalUrl(lang, `/video/${contentSlugSegment(post)}`);
  const poster = posterOf(post);
  const sellerName =
    [post.creator?.profile?.firstName, post.creator?.profile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    post.creator?.username ||
    null;

  return (
    <>
      {/* Google requires a thumbnail and an upload date; without them the
          markup would be invalid, so it is left out rather than faked. */}
      {poster && post.createdAt && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              videoObjectSchema({
                url: watchUrl,
                productUrl: canonicalUrl(lang, `/content/${contentSlugSegment(post)}`),
                name: title,
                description:
                  post.caption?.trim() || `Watch ${title} on ${siteConfig.name}.`,
                thumbnailUrl: poster,
                uploadDate: new Date(post.createdAt as string).toISOString(),
                contentUrl: hlsUrlOf(post),
                durationSeconds: durationOf(post),
                creatorName: sellerName,
                creatorUrl: post.creator?.username
                  ? `${siteConfig.url}${profileHref(lang, post.creator)}`
                  : null,
                viewCount: post.stats?.views,
              }),
            ),
          }}
        />
      )}
      <ImmersiveVideoViewer
        seed={slug}
        lang={lang}
        placeholder={{ title, poster, src: hlsUrlOf(post), post }}
      />
    </>
  );
}
