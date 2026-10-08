import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";

/**
 * Mux URL derivation, in one place.
 *
 * The feed card, the immersive slide and the /video route all need to agree on
 * exactly which posts can play and where the stream lives. When that logic was
 * inlined per component it was free to drift, and a disagreement shows up as a
 * black slide rather than an error.
 *
 * This mirrors the server's VIDEO_FEED_FILTER: a post is playable when it is a
 * VIDEO carrying a real playbackId. A TikTok import that has been re-hosted
 * qualifies; one still transcoding does not.
 */

/** The first media item that actually has a Mux stream behind it. */
function playableMedia(post: ContentCardFieldsFragment) {
  return (post.media ?? []).find(
    (item) => (item?.muxMeta?.playbackId ?? "").length > 0,
  );
}

export function isPlayableVideo(post: ContentCardFieldsFragment): boolean {
  return post.type === "VIDEO" && playableMedia(post) !== undefined;
}

export function hlsUrlOf(post: ContentCardFieldsFragment): string | null {
  const playbackId = playableMedia(post)?.muxMeta?.playbackId;
  return playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null;
}

/**
 * Cover frame. Prefers a stored thumbnail, falling back to Mux's own renderer.
 * `fit_mode=smartcrop` keeps the subject centred rather than the geometry.
 */
export function posterOf(post: ContentCardFieldsFragment): string | null {
  const media = playableMedia(post) ?? post.media?.[0];
  const contentPoster =
    post.tiktokEmbed?.coverImageUrl ??
    media?.thumbnailUrl ??
    media?.muxMeta?.thumbnailUrl ??
    media?.imageUrl;
  if (contentPoster) return contentPoster;

  const playbackId = media?.muxMeta?.playbackId;
  if (!playbackId) return null;
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0&width=900&fit_mode=smartcrop`;
}

/** Runtime in seconds, when Mux has reported it. */
export function durationOf(post: ContentCardFieldsFragment): number | null {
  return playableMedia(post)?.muxMeta?.duration ?? null;
}
