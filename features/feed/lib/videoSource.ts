/**
 * The fields these helpers read. A full ContentCardFieldsFragment fits, and
 * so does the narrower listing shape the video sitemap fetches.
 */
type VideoMedia = {
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  muxMeta?: {
    playbackId?: string | null;
    thumbnailUrl?: string | null;
    duration?: number | null;
    aspectRatio?: string | null;
    maxStoredResolution?: string | null;
  } | null;
};

export type VideoSourcePost = {
  type?: string | null;
  tiktokEmbed?: { coverImageUrl?: string | null } | null;
  media?: (VideoMedia | null)[] | null;
};

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
function playableMedia(post: VideoSourcePost) {
  return (post.media ?? []).find(
    (item) => (item?.muxMeta?.playbackId ?? "").length > 0,
  );
}

export function isPlayableVideo(post: VideoSourcePost): boolean {
  return post.type === "VIDEO" && playableMedia(post) !== undefined;
}

/**
 * Whether the stream has a picture. Mux stores an audio-only upload as a video
 * asset too: it plays, but there is no frame — Mux won't render a thumbnail
 * for it ("Assets without video do not support thumbnails") and Google can't
 * index it as a video. Such assets have no aspect ratio and a
 * maxStoredResolution of "Audio only" (4 of 506 in production, 2026-10-22).
 *
 * For search surfaces only — the viewer still plays these, as before.
 */
export function hasVideoPicture(post: VideoSourcePost): boolean {
  const meta = playableMedia(post)?.muxMeta;
  if (!meta || meta.maxStoredResolution === "Audio only") return false;
  return Boolean(meta.aspectRatio || meta.maxStoredResolution);
}

export function hlsUrlOf(post: VideoSourcePost): string | null {
  const playbackId = playableMedia(post)?.muxMeta?.playbackId;
  return playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null;
}

/**
 * TikTok's CDN links are signed and stop working within days (403), so a
 * TikTok import's cover is only good while the import is fresh.
 */
function isExpiringUrl(url: string): boolean {
  return /tiktokcdn|[?&]x-expires=|[?&]x-signature=/i.test(url);
}

/**
 * Cover frame. Prefers a stored thumbnail, falling back to Mux's own renderer.
 * `fit_mode=smartcrop` keeps the subject centred rather than the geometry.
 *
 * An expiring TikTok link is used only when nothing else exists — a fresh
 * import still transcoding. Once Mux has the video, its frame is used
 * instead: a dead cover is a broken image in the feed and, as the watch
 * page's VideoObject thumbnail, "Thumbnail could not be reached" in Search
 * Console, which keeps the video out of Google's index.
 */
export function posterOf(post: VideoSourcePost): string | null {
  const media = playableMedia(post) ?? post.media?.[0];
  const candidates = [
    post.tiktokEmbed?.coverImageUrl,
    media?.thumbnailUrl,
    media?.muxMeta?.thumbnailUrl,
    media?.imageUrl,
  ].filter((url): url is string => Boolean(url?.trim()));
  const stable = candidates.find((url) => !isExpiringUrl(url));
  if (stable) return stable;

  const playbackId = media?.muxMeta?.playbackId;
  if (playbackId) {
    return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0&width=900&fit_mode=smartcrop`;
  }
  return candidates[0] ?? null;
}

/** Runtime in seconds, when Mux has reported it. */
export function durationOf(post: VideoSourcePost): number | null {
  return playableMedia(post)?.muxMeta?.duration ?? null;
}
