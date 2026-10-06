import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { ImmersiveVideoViewer } from "@/features/feed/components/immersive/ImmersiveVideoViewer";
import { query } from "@/lib/apollo/ApolloClient";
import {
  GetContentDocument,
  type ContentCardFieldsFragment,
} from "@/types/__generated__/graphql";
import { isPlayableVideo, posterOf } from "@/features/feed/lib/videoSource";
import { contentPath, videoPath } from "@/lib/content-url";
import { localeAlternates } from "@/lib/metadata";
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

  // Always the slug form, whichever form was requested, so an id link that
  // gets shared never competes with the canonical URL in the index.
  const canonicalPath = videoPath(lang, post);
  const canonical = `${siteConfig.url}${canonicalPath}`;
  const title = post.title || "Video";
  const description =
    post.caption?.trim() || `Watch ${title} on ${siteConfig.name}.`;
  const poster = posterOf(post);

  return {
    title,
    description,
    keywords: [post.title, ...(post.hashtags ?? [])].filter(
      Boolean,
    ) as string[],
    alternates: {
      canonical,
      // localeAlternates is locale-agnostic, so strip the /{lang} prefix back
      // off and let it declare the segment under every locale.
      ...localeAlternates(canonicalPath.replace(`/${lang}`, "")),
    },
    // Unlisted or still-processing videos stay out of the index.
    robots: post.isLive === false ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "video.other",
      title,
      description,
      url: canonical,
      images: poster ? [poster] : [siteConfig.ogImage],
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title,
      description,
      images: poster ? [poster] : [siteConfig.ogImage],
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
  return <ImmersiveVideoViewer seed={slug} lang={lang} />;
}
