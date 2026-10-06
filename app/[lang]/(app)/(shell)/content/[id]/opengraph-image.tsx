import { ImageResponse } from "next/og";
import { query } from "@/lib/apollo/ApolloClient";
import { GetContentDocument } from "@/types/__generated__/graphql";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { siteConfig } from "@/config/site";
import {
  OG_PHOTO_HEADERS,
  ogJpegResponse,
  ogPhotoJpeg,
} from "@/lib/og-image";

// Node runtime so we can reuse the Apollo `query` helper to fetch the listing.
export const runtime = "nodejs";
export const revalidate = 3600;
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

type Post = ContentCardFieldsFragment;

async function fetchPost(id: string): Promise<Post | null> {
  try {
    const { data } = await query({
      query: GetContentDocument,
      variables: { id },
    });
    return (data?.content as Post | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * Image URLs to try for the share preview, best first: the listing's lead
 * photo (largest variant first, since wide photos fill a 1200px frame), then a
 * video's poster, then a TikTok-embed cover.
 */
function photoCandidates(post: Post): (string | null | undefined)[] {
  const m = [...(post.media ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  )[0];
  const variant = (name: string) =>
    m?.r2Variants?.find((v) => v.variant === name)?.url;
  const playbackId = m?.muxMeta?.playbackId;

  return [
    variant("original"),
    variant("large"),
    ...(m?.r2Variants ?? []).map((v) => v.url),
    m?.imageUrl,
    // Videos: a stored still, else Mux renders one for the playback ID.
    m?.muxMeta?.thumbnailUrl,
    m?.thumbnailUrl,
    playbackId
      ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0&width=1200`
      : null,
    post.tiktokEmbed?.coverImageUrl,
  ];
}

function priceLabel(post: Post): string | null {
  const p = post.price;
  if (!p) return null;
  if (p.amount === 0) return "Free";
  return `${p.currency} ${p.amount.toLocaleString()}`;
}

function locationName(post: Post): string | null {
  const loc = post.location;
  return [loc?.placeName, loc?.county].filter(Boolean).join(", ").trim() || null;
}

type ImageParams = {
  // Next 16 hands metadata image routes an async params object. Reading it
  // synchronously yielded `undefined`, which silently rendered the empty
  // fallback card (no photo, no title, no price) on every shared listing.
  params: Promise<{ lang: string; id: string }>;
};

/**
 * Gives the card a per-listing `og:image:alt` — the listing's own title, price
 * and location — instead of one generic "Shopi listing" string on every share.
 * The listing fetch is deduped with the one below inside a single render.
 */
export async function generateImageMetadata({ params }: ImageParams) {
  const { id } = await params;
  const post = await fetchPost(id);
  const alt = post
    ? [post.title, priceLabel(post), locationName(post)]
        .filter(Boolean)
        .join(" · ")
    : `${siteConfig.name} listing`;

  return [{ id: "card", size, contentType, alt }];
}

export default async function ContentOgImage({ params }: ImageParams) {
  const { id } = await params;
  const post = await fetchPost(id);

  // The real photo, framed as a link preview - not a designed card. Marketplaces
  // share the product photo itself, and it is what a buyer recognises in a chat.
  const photo = post ? await ogPhotoJpeg(photoCandidates(post), size) : null;
  if (photo) {
    return new Response(new Uint8Array(photo), { headers: OG_PHOTO_HEADERS });
  }

  // No usable photo (or no listing): fall back to the branded card.
  const title = post?.title ?? "Shopi";
  const price = post ? priceLabel(post) : null;
  const loc = post ? locationName(post) : null;

  const rendered = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0a0a0e",
          fontFamily: "sans-serif",
        }}
      >
        {/* Left: placeholder - the fallback only renders when there is no photo */}
        <div
          style={{
            width: 560,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#15151c",
            fontSize: 120,
          }}
        >
          🛍️
        </div>

        {/* Right: title + price + meta */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 56px",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: siteConfig.themeColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              S
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>
              shopi
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {price && (
              <div
                style={{
                  fontSize: 58,
                  fontWeight: 800,
                  color: "#ec4899",
                  letterSpacing: -1,
                }}
              >
                {price}
              </div>
            )}
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: -1,
                display: "flex",
              }}
            >
              {title.length > 90 ? `${title.slice(0, 90)}…` : title}
            </div>
            {loc && (
              <div style={{ fontSize: 30, color: "#a1a1b3", display: "flex" }}>
                📍 {loc}
              </div>
            )}
          </div>

          <div style={{ fontSize: 26, color: "#8b8b9e", display: "flex" }}>
            Message the seller directly on Shopi
          </div>
        </div>
      </div>
    ),
    { ...size },
  );

  return ogJpegResponse(rendered);
}
