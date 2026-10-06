import { ImageResponse } from "next/og";
import { query } from "@/lib/apollo/ApolloClient";
import { ReferralInviteDocument } from "@/types/__generated__/graphql";
import { siteConfig } from "@/config/site";
import { normalizeReferralCode } from "@/lib/referral";
import { ogImageDataUri, ogJpegResponse } from "@/lib/og-image";
import { REFERRALS_PAUSED, REFERRALS_PAUSED_TITLE } from "@/features/referrals/paused";

/**
 * The card WhatsApp shows under a shared invite link. It is the first thing an
 * invited seller sees, so it carries the inviter's face and name — "a friend
 * invited you" gets tapped where a generic Shopi card gets scrolled past.
 *
 * While referrals are paused it carries no inviter, just the paused headline.
 */

// Node runtime so we can reuse the Apollo `query` helper.
export const runtime = "nodejs";
export const revalidate = 3600;
export const alt = REFERRALS_PAUSED ? REFERRALS_PAUSED_TITLE : "You're invited to sell on Shopi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

const PERKS = ["Free to post", "0% commission", "Buyers message you directly"];

export default async function InviteOgImage({
  params,
}: {
  params: Promise<{ lang: string; code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = normalizeReferralCode(rawCode);

  let name: string | null = null;
  let avatarUrl: string | null | undefined;
  if (code && !REFERRALS_PAUSED) {
    try {
      const { data } = await query({ query: ReferralInviteDocument, variables: { code } });
      name = data?.referralInvite?.inviter.displayName ?? null;
      avatarUrl = data?.referralInvite?.inviter.avatar;
    } catch {
      name = null;
    }
  }

  // Avatars are .webp and satori has no webp decoder — see lib/og-image.
  const avatar = await ogImageDataUri([avatarUrl], { width: 220, height: 220 });
  const initials = (name ?? "Shopi").replace(/^@/, "").slice(0, 2).toUpperCase();
  const headline = REFERRALS_PAUSED
    ? REFERRALS_PAUSED_TITLE
    : name
      ? `${name.length > 26 ? `${name.slice(0, 26)}…` : name} invited you to sell on Shopi`
      : "You're invited to sell on Shopi";

  const rendered = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0a0a0e 0%, #15101f 60%, #1f1330 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
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
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>shopi</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          {!name ? null : avatar ? (
            <img
              src={avatar}
              alt=""
              width={220}
              height={220}
              style={{
                width: 220,
                height: 220,
                borderRadius: 110,
                objectFit: "cover",
                border: `6px solid ${siteConfig.themeColor}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: 110,
                background: siteConfig.themeColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 84,
                fontWeight: 800,
              }}
            >
              {initials}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flex: 1,
              fontSize: 60,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.1,
            }}
          >
            {headline}
          </div>
        </div>

        {/* Bullets are drawn, not typed: the OG font has no check-mark glyph. */}
        <div style={{ display: "flex", gap: 44, fontSize: 28, color: "#c9c9d6" }}>
          {PERKS.map((perk) => (
            <div key={perk} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  background: siteConfig.themeColor,
                  display: "flex",
                }}
              />
              {perk}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );

  return ogJpegResponse(rendered);
}
