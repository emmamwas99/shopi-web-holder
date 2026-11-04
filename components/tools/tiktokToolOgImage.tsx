import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

/**
 * Share card for the TikTok tool pages. Each page gets its own card rather
 * than the site-wide one, which sells "buying and selling locally" — the
 * wrong promise for someone who pasted a downloader link to be told what the
 * page does. Each card repeats its page's H1, so the preview and the page it
 * opens never disagree.
 */

export const ogSize = { width: 1200, height: 630 };

const PINK = siteConfig.themeColor;
const PINK_SOFT = "#ff5a9d";

// Filled shapes only: satori drops stroked paths.
const ICONS = {
  play: <path d="M8 5v14l11-7z" fill={PINK} />,
  music: (
    <path
      d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"
      fill={PINK}
    />
  ),
  photo: (
    <path
      d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
      fill={PINK}
    />
  ),
};

export async function tiktokToolOgImage(card: {
  eyebrow: string;
  headline: string;
  sub: string;
  chips: string[];
  icon: keyof typeof ICONS;
  savedAs: string;
}) {
  const badge = await readFile(join(process.cwd(), "public/assets/shopi-logo.png"));
  const logoSrc = `data:image/png;base64,${badge.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0b0b10 0%, #15101a 55%, #2b0a1e 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Glow behind the phone */}
        <div
          style={{
            position: "absolute",
            right: -140,
            top: -120,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(224,0,92,0.5) 0%, rgba(224,0,92,0) 70%)",
            display: "flex",
          }}
        />

        {/* Left: the promise */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 760,
            padding: "56px 0 56px 76px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* satori renders plain <img> only; next/image doesn't apply here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" width={60} height={60} />
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>Shopi</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 3,
                color: PINK_SOFT,
                textTransform: "uppercase",
              }}
            >
              {card.eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 66,
                fontWeight: 700,
                lineHeight: 1.06,
                letterSpacing: -2,
                maxWidth: 690,
              }}
            >
              {card.headline}
            </div>
            <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: "#b9b9c8" }}>
              {card.sub}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {card.chips.map((chip) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: "#ffd0e3",
                  background: "rgba(224,0,92,0.16)",
                  border: "1px solid rgba(255,90,157,0.45)",
                  borderRadius: 999,
                  padding: "8px 20px",
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>

        {/* Right: a post, ready to save */}
        <div
          style={{
            position: "absolute",
            right: 104,
            top: 64,
            width: 300,
            height: 502,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 44,
            border: "6px solid #33333f",
            background: `linear-gradient(160deg, ${PINK} 0%, #5a0f3a 55%, #1a0d18 100%)`,
            boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
            transform: "rotate(5deg)",
          }}
        >
          <div
            style={{
              width: 108,
              height: 108,
              borderRadius: 9999,
              background: "rgba(255,255,255,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24">
              {ICONS[card.icon]}
            </svg>
          </div>

          <div
            style={{
              position: "absolute",
              left: 28,
              right: 28,
              bottom: 96,
              height: 8,
              borderRadius: 9999,
              background: "rgba(255,255,255,0.28)",
              display: "flex",
            }}
          >
            <div
              style={{
                width: "62%",
                height: 8,
                borderRadius: 9999,
                background: "#ffffff",
                display: "flex",
              }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              left: 28,
              bottom: 38,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 24,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {/* Fixed box so the flex row can't squeeze the icon. */}
            <div
              style={{
                display: "flex",
                width: 32,
                height: 32,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24">
                <path
                  d="M10.6 2.5h2.8v9.1l3.2-3.2 2 2L12 17.4 4.4 10.4l2-2 3.2 3.2z"
                  fill="#ffffff"
                />
                <rect x="4" y="19" width="16" height="2.6" rx="1.3" fill="#ffffff" />
              </svg>
            </div>
            <div style={{ display: "flex" }}>{card.savedAs}</div>
          </div>
        </div>
      </div>
    ),
    { ...ogSize },
  );
}
