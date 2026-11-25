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

/** A stable listing image, with a srcset when the source can be resized. */
export type ListingImage = { src: string; srcSet?: string };

const EXPIRING = /x-expires=|x-signature=|tiktokcdn/i;

function stable(url: string | null | undefined): string | null {
  return url && url.startsWith("https://") && !EXPIRING.test(url) ? url : null;
}

/**
 * Mux renders a still at any size, so video listings get a real srcset: a
 * 240px card on a desktop screen no longer downloads the 480px phone copy.
 * 480 stays the largest, so phones fetch exactly what they did before. 3:4
 * smartcrop matches the listing cards, and it is portrait, so width is what
 * decides whether a still covers a tile (square, 3:2 or 4:5 alike).
 *
 * R2 photos get no srcset. Their only variant under `medium` is the 160px
 * `thumb`, which can't cover even a 150px tile once object-cover crops it
 * (portrait thumbs are 120px wide, landscape ones 90px tall), so browsers
 * would pick `medium` anyway.
 */
const MUX_WIDTHS = [240, 360, 480] as const;

function muxThumb(playbackId: string, width: number): string {
  return `https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=${width}&height=${(width * 4) / 3}&fit_mode=smartcrop`;
}

export function stableListingImage(listing: {
  media?: ListingMedia[] | null;
}): ListingImage | null {
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
    if (fromR2) return { src: fromR2 };

    const playbackId = item.muxMeta?.playbackId;
    if (playbackId) {
      return {
        src: muxThumb(playbackId, 480),
        srcSet: MUX_WIDTHS.map((w) => `${muxThumb(playbackId, w)} ${w}w`).join(", "),
      };
    }

    const direct =
      stable(item.muxMeta?.thumbnailUrl) ??
      stable(item.imageUrl) ??
      stable(item.thumbnailUrl) ??
      (item.mediaType === "IMAGE" ? stable(item.url) : null);
    if (direct) return { src: direct };
  }
  return null;
}

export function stableListingThumb(listing: {
  media?: ListingMedia[] | null;
}): string | null {
  return stableListingImage(listing)?.src ?? null;
}
