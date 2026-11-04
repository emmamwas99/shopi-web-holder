/**
 * A listing thumbnail that is safe to put in cached HTML.
 *
 * Pages cached for a day (the homepage, landing pages) can't use the signed
 * TikTok covers on imported posts: they carry `x-expires`/`x-signature` and
 * answer 403 once they lapse, often within the day (see the video watch page
 * notes in lib/seo). This prefers Shopi's own R2 variants — `medium` is the
 * 480px WebP, right for a phone card about 170px wide — then a Mux thumbnail
 * built from the playback ID, which never expires.
 */

type ListingMedia = {
  mediaType?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  sortOrder?: number | null;
  muxMeta?: { playbackId?: string | null; thumbnailUrl?: string | null } | null;
  r2Variants?: { url?: string | null; variant?: string | null }[] | null;
};

const EXPIRING = /x-expires=|x-signature=|tiktokcdn/i;

function stable(url: string | null | undefined): string | null {
  return url && url.startsWith("https://") && !EXPIRING.test(url) ? url : null;
}

export function stableListingThumb(listing: {
  media?: ListingMedia[] | null;
}): string | null {
  const media = [...(listing.media ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  for (const item of media) {
    const variants = item.r2Variants ?? [];
    const r2 =
      variants.find((v) => v.variant === "medium") ??
      variants.find((v) => v.variant === "large") ??
      variants[0];
    const fromR2 = stable(r2?.url);
    if (fromR2) return fromR2;

    const playbackId = item.muxMeta?.playbackId;
    if (playbackId) {
      return `https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=480&height=640&fit_mode=smartcrop`;
    }

    const direct =
      stable(item.muxMeta?.thumbnailUrl) ??
      stable(item.imageUrl) ??
      stable(item.thumbnailUrl) ??
      (item.mediaType === "IMAGE" ? stable(item.url) : null);
    if (direct) return direct;
  }
  return null;
}
