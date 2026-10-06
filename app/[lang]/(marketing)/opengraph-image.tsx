import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { isValidLocale, type Locale } from "@/i18n/config";
import { ogJpegResponse } from "@/lib/og-image";

// Node runtime so we can read the photos, logo and fonts from the public folder.
export const runtime = "nodejs";
export const alt =
  "A seller in his workshop and a buyer on her phone, connected by Shopi — buy and sell near you in Kenya. Free to post, 0% commission.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

const PINK = siteConfig.themeColor;
const INK = "#15151a";
const MUTED = "#5c5c66";

/**
 * The site-wide share card: buying and selling shown, not described.
 *
 * A seller (left) and a buyer (right) face each other with the Shopi mark on
 * the seam between them — the listing tag and the buyer's question are the
 * two halves of one deal. The mark sits dead centre on purpose: WhatsApp,
 * where most Shopi links are shared, can crop the preview to a centred square.
 *
 * Photos are Unsplash-licensed (free for commercial use): seller by Ali
 * Mkumbwa (unsplash.com/photos/K-f_gTvdwTM), buyer by Joyce Busola
 * (unsplash.com/photos/dwmhtK_zX6Y). They are pre-cropped to the card's
 * 548×430 photo boxes at 1.5×, so nothing is resized at render time.
 */
const COPY: Record<
  Locale,
  {
    sell: string;
    buy: string;
    item: string;
    place: string;
    message: string;
    headline: string;
    sub: string;
  }
> = {
  en: {
    sell: "SELL",
    buy: "BUY",
    item: "Wooden coffee table",
    place: "Gikomba, Nairobi",
    message: "Is the table still available?",
    headline: "Buy and sell near you.",
    sub: "Free to post · 0% commission · Message directly",
  },
  sw: {
    sell: "UZA",
    buy: "NUNUA",
    item: "Meza ya mbao",
    place: "Gikomba, Nairobi",
    message: "Meza bado inapatikana?",
    headline: "Nunua na uuze karibu nawe.",
    sub: "Bure kupost · 0% commission · Ongea moja kwa moja",
  },
};

const PHOTO = { width: 548, height: 430 };

async function publicFile(path: string) {
  return readFile(join(process.cwd(), "public", path));
}

async function dataUri(path: string, mime: string) {
  return `data:${mime};base64,${(await publicFile(path)).toString("base64")}`;
}

function Chip({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        background: PINK,
        color: "#ffffff",
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 1.5,
        padding: "7px 20px",
        borderRadius: 999,
      }}
    >
      {label}
    </div>
  );
}

export default async function OgImage({
  params,
}: {
  // Next 16 hands metadata image routes an async params object.
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = COPY[isValidLocale(lang) ? lang : "en"];

  const [logo, seller, buyer, bold, semibold, medium] = await Promise.all([
    dataUri("assets/shopi-logo.png", "image/png"),
    dataUri("assets/og/seller.jpg", "image/jpeg"),
    dataUri("assets/og/buyer.jpg", "image/jpeg"),
    publicFile("fonts/Poppins-Bold.ttf"),
    publicFile("fonts/Poppins-SemiBold.ttf"),
    publicFile("fonts/Poppins-Medium.ttf"),
  ]);

  const rendered = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "36px 40px 30px",
          background: "#ffffff",
          color: INK,
          fontFamily: "Poppins",
        }}
      >
        {/* Seller | Shopi | Buyer */}
        <div style={{ display: "flex", position: "relative", gap: 24 }}>
          {/* Seller */}
          <div
            style={{
              display: "flex",
              position: "relative",
              ...PHOTO,
              borderRadius: 28,
              overflow: "hidden",
            }}
          >
            <img src={seller} alt="" {...PHOTO} />
            <div style={{ display: "flex", position: "absolute", top: 22, left: 22 }}>
              <Chip label={t.sell} />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                position: "absolute",
                left: 22,
                bottom: 22,
                background: "#ffffff",
                borderRadius: 18,
                padding: "12px 18px 14px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
              }}
            >
              <div style={{ display: "flex", fontSize: 20, fontWeight: 500, color: MUTED }}>
                {t.item}
              </div>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, lineHeight: 1.15 }}>
                KES 12,500
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 2,
                  fontSize: 17,
                  fontWeight: 500,
                  color: MUTED,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={MUTED}
                  strokeWidth="2.4"
                >
                  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {t.place}
              </div>
            </div>
          </div>

          {/* Buyer */}
          <div
            style={{
              display: "flex",
              position: "relative",
              ...PHOTO,
              borderRadius: 28,
              overflow: "hidden",
            }}
          >
            <img src={buyer} alt="" {...PHOTO} />
            <div style={{ display: "flex", position: "absolute", top: 22, right: 22 }}>
              <Chip label={t.buy} />
            </div>
            {/* The buyer's question, top-left over the blurred background,
                clear of her face, her phone and the Shopi mark. */}
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 22,
                left: 22,
                background: "#ffffff",
                color: INK,
                fontSize: 21,
                fontWeight: 600,
                lineHeight: 1.3,
                padding: "12px 18px",
                borderRadius: "20px 20px 20px 6px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
              }}
            >
              {t.message}
            </div>
          </div>

          {/* Shopi, on the seam between the two */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: PHOTO.width + 12 - 70,
              top: PHOTO.height / 2 - 70,
              width: 140,
              height: 140,
              borderRadius: 999,
              background: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            {/* The logo PNG has opaque white corners; at 96px they stay
                inside the 140px circle, where white on white is invisible. */}
            <img src={logo} alt="" width={96} height={96} />
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 50,
                fontWeight: 700,
                letterSpacing: -1,
                lineHeight: 1.1,
              }}
            >
              {t.headline}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 8,
                fontSize: 24,
                fontWeight: 500,
                color: MUTED,
              }}
            >
              {t.sub}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 600,
              color: PINK,
              paddingBottom: 4,
            }}
          >
            shopi.co.ke
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Poppins", data: bold, weight: 700, style: "normal" },
        { name: "Poppins", data: semibold, weight: 600, style: "normal" },
        { name: "Poppins", data: medium, weight: 500, style: "normal" },
      ],
    },
  );

  // Three-quarters photograph, so JPEG — see ogJpegResponse.
  return ogJpegResponse(rendered);
}
