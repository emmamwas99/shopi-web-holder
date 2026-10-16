/**
 * Sellers an admin has featured as homepage social proof (API:
 * `socialProofSellers`, toggled in the admin users page → Social proof). The
 * API returns a public-safe shape — no email, no bio, no phone — with live
 * listing counts.
 *
 * Plain fetch rather than the Apollo RSC client, so the same helper works in
 * the homepage, app/sitemap.ts and the catalog.md route handler.
 */
const SOCIAL_PROOF_SELLERS = `
  query HomeSocialProofSellers($limit: Int, $listingsPerSeller: Int) {
    socialProofSellers(limit: $limit, listingsPerSeller: $listingsPerSeller) {
      id
      username
      displayName
      avatar
      headline
      isVerified
      county
      placeName
      memberSince
      listingCount
      totalViews
      followerCount
      listings {
        id
        slug
        title
        price { amount currency negotiable }
        location { placeName county }
        media {
          sortOrder
          imageUrl
          thumbnailUrl
          muxMeta { thumbnailUrl }
          r2Variants { url variant }
        }
      }
    }
  }
`;

export type SocialProofListing = {
  id: string;
  slug?: string | null;
  title?: string | null;
  /** Present when the query selected it: drives the Verified ID badge. */
  creator?: { id?: string | null; isVerified?: boolean | null } | null;
  price?: { amount: number; currency: string; negotiable?: boolean } | null;
  location?: { placeName?: string | null; county?: string | null } | null;
  media?:
    | {
        sortOrder?: number | null;
        imageUrl?: string | null;
        thumbnailUrl?: string | null;
        muxMeta?: { thumbnailUrl?: string | null } | null;
        r2Variants?: { url?: string | null; variant?: string | null }[] | null;
      }[]
    | null;
};

export type SocialProofSeller = {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  headline?: string | null;
  isVerified: boolean;
  county?: string | null;
  placeName?: string | null;
  memberSince: string;
  listingCount: number;
  totalViews: number;
  followerCount: number;
  listings: SocialProofListing[];
};

/**
 * False for empty values and for signed CDN links past their `x-expires`
 * (unix seconds). Covers on posts imported from TikTok are signed URLs that
 * start returning 403 days later, which renders as a broken image.
 */
export function isUsableImageUrl(url?: string | null): url is string {
  if (!url?.trim()) return false;
  try {
    const expires = Number(new URL(url).searchParams.get("x-expires"));
    return !expires || expires * 1000 > Date.now();
  } catch {
    return false;
  }
}

/** Cover image for a listing card: the first media item's best working still. */
export function listingCover(listing: SocialProofListing): string | null {
  const first = [...(listing.media ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  )[0];
  if (!first) return null;
  return (
    [
      first.r2Variants?.find((v) => v.variant === "medium")?.url,
      first.r2Variants?.find((v) => v.variant === "large")?.url,
      first.r2Variants?.[0]?.url,
      first.imageUrl,
      first.muxMeta?.thumbnailUrl,
      first.thumbnailUrl,
    ].find(isUsableImageUrl) ?? null
  );
}

/**
 * Listings with a working cover first (order otherwise kept), so proof leads
 * with real photos; image-less listings still show, with a placeholder.
 */
export function withCoversFirst(listings: SocialProofListing[]): SocialProofListing[] {
  return [
    ...listings.filter((listing) => listingCover(listing)),
    ...listings.filter((listing) => !listingCover(listing)),
  ];
}

/**
 * How long a fetched list is reused: daily. At current traffic a fresher
 * homepage isn't worth a regeneration every minute, so featuring or
 * unfeaturing a seller in the admin reaches the homepage within 24 hours (or
 * on the next deploy). This fetch is the homepage's only one, so it sets how
 * often the homepage regenerates — keep the homepage's `revalidate` equal.
 */
export const SOCIAL_PROOF_REVALIDATE_SECONDS = 86400;

/**
 * Best-effort: the homepage must render when the API is unreachable, so any
 * failure yields an empty list, and an empty list hides the section.
 */
export async function fetchSocialProofSellers(
  limit = 6,
  listingsPerSeller = 8,
): Promise<SocialProofSeller[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];

  try {
    const response = await fetch(`${apiUrl}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: SOCIAL_PROOF_SELLERS,
        variables: { limit, listingsPerSeller },
      }),
      next: { revalidate: SOCIAL_PROOF_REVALIDATE_SECONDS, tags: ["social-proof"] },
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      data?: { socialProofSellers?: SocialProofSeller[] | null };
    };
    return (payload.data?.socialProofSellers ?? []).filter(
      (seller) => seller?.id && seller.username && seller.listingCount > 0,
    );
  } catch {
    return [];
  }
}
