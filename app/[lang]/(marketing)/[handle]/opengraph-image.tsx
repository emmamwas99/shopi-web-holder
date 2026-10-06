import { ImageResponse } from "next/og";
import { query } from "@/lib/apollo/ApolloClient";
import { GetUserProfileDocument } from "@/types/__generated__/graphql";
import type { ProfileUserFieldsFragment } from "@/types/__generated__/graphql";
import { siteConfig } from "@/config/site";
import { ogImageDataUri, ogJpegResponse } from "@/lib/og-image";

// Node runtime so we can reuse the Apollo `query` helper to fetch the profile.
export const runtime = "nodejs";
export const revalidate = 3600;
export const alt = "Shopi seller profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

type Profile = ProfileUserFieldsFragment;

function displayName(p: Profile): string {
  const full = [p.profile?.firstName, p.profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || p.username || "Shopi seller";
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default async function ProfileOgImage({
  params,
}: {
  // Next 16 hands metadata image routes an async params object — see the
  // sibling listing OG route; reading it synchronously rendered a blank card.
  params: Promise<{ lang: string; handle: string }>;
}) {
  const { handle } = await params;
  // The segment carries the leading "@" (see page.tsx) — strip it before the
  // lookup, which keys on the bare username.
  const username = decodeURIComponent(handle).replace(/^@/, "").toLowerCase();

  let profile: Profile | null = null;
  try {
    const { data } = await query({
      query: GetUserProfileDocument,
      variables: { username },
    });
    profile = (data?.userProfile as Profile | undefined) ?? null;
  } catch {
    profile = null;
  }

  const name = profile ? displayName(profile) : "Shopi";
  const handleLabel = profile?.username ? `@${profile.username}` : "";
  // Avatars are served as .webp and satori has no webp decoder, so the image
  // is converted to a JPEG data URI rather than skipped. If anything about
  // that fails, this stays null and the initials tile renders instead.
  const avatar = await ogImageDataUri([profile?.profile?.avatar], {
    width: 200,
    height: 200,
  });
  const initials = name.slice(0, 2).toUpperCase();

  const stats = [
    typeof profile?.postCount === "number"
      ? { label: "Listings", value: fmtCount(profile.postCount) }
      : null,
    typeof profile?.followerCount === "number"
      ? { label: "Followers", value: fmtCount(profile.followerCount) }
      : null,
    // No view count. This card is what a shopper sees when a seller link is
    // shared, and the profile itself stopped showing views to shoppers for the
    // same reason: a young seller's real number reads as "nobody comes here".
  ].filter(Boolean) as { label: string; value: string }[];

  const rendered = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(135deg, #0a0a0e 0%, #15101f 60%, #1f1330 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: siteConfig.themeColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>
            shopi
          </div>
        </div>

        {/* Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {avatar ? (
            <img
              src={avatar}
              alt=""
              width={200}
              height={200}
              style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                objectFit: "cover",
                border: "4px solid rgba(255,255,255,0.15)",
              }}
            />
          ) : (
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                background: "#ec4899",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 80,
                fontWeight: 800,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                letterSpacing: -2,
                lineHeight: 1.05,
                display: "flex",
              }}
            >
              {name.length > 28 ? `${name.slice(0, 28)}…` : name}
            </div>
            {handleLabel && (
              <div style={{ fontSize: 34, color: "#F5A8C4", display: "flex" }}>
                {handleLabel}
              </div>
            )}
          </div>
        </div>

        {/* Stats + tagline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 48 }}>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <div style={{ fontSize: 44, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 24, color: "#a1a1b3", display: "flex" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 26, color: "#8b8b9e", display: "flex" }}>
            Selling on Shopi
          </div>
        </div>
      </div>
    ),
    { ...size },
  );

  // JPEG for the same reason as the listing card — see ogJpegResponse.
  return ogJpegResponse(rendered);
}
