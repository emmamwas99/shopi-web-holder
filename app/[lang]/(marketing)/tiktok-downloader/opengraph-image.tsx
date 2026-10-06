import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

// Node runtime so we can read the brand artwork from the public folder.
export const runtime = "nodejs";
// Says what the card says: the same promise as the page's H1 and description,
// so the preview and the page it opens never disagree.
export const alt =
  "TikTok Downloader — save TikTok videos as MP4 without the watermark";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PINK = siteConfig.themeColor;
const PINK_SOFT = "#ff5a9d";

const CHIPS = ["Free", "HD when available", "MP4", "No app or sign-up"];

/**
 * Share card for /tiktok-downloader. A dedicated card rather than the site-wide
 * one, which sells "buying and selling locally" — the wrong promise for someone
 * who pasted this link to be told what the page does.
 */
export default async function TiktokDownloaderOgImage() {
  const badge = await readFile(
    join(process.cwd(), "public/assets/shopi-logo.png"),
  );
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
          background:
            "linear-gradient(135deg, #0b0b10 0%, #15101a 55%, #2b0a1e 100%)",
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
            <img src={logoSrc} alt="" width={60} height={60} />
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
              Shopi
            </div>
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
              Free TikTok downloader
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 70,
                fontWeight: 700,
                lineHeight: 1.06,
                letterSpacing: -2,
                maxWidth: 690,
              }}
            >
              Download TikTok videos without the watermark
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 24,
                fontSize: 30,
                color: "#b9b9c8",
              }}
            >
              Paste a link. Save the MP4. Done.
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {CHIPS.map((chip) => (
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

        {/* Right: a video, ready to save */}
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
              <path d="M8 5v14l11-7z" fill={PINK} />
            </svg>
          </div>

          {/* Progress bar */}
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
            {/* Filled shapes only (satori drops stroked paths), in a fixed box so
                the flex row can't squeeze the icon. */}
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
            <div style={{ display: "flex" }}>Saved as MP4</div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
