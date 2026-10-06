import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { getArticle, getCategory, type Article } from "@/lib/articles";
import { ogJpegResponse } from "@/lib/og-image";

// Node runtime to read the photo, logo and fonts from /public.
export const runtime = "nodejs";
export const alt = "A Shopi guide to prices and buying in Kenya";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

const PINK = siteConfig.themeColor;
const INK = "#15151a";
const MUTED = "#5c5c66";
const PHOTO = { width: 440, height: 630 };

/** One line under the title that says what kind of page the link opens. */
const KICKER: Partial<Record<Article["intent"], string>> = {
  "price-guide": "Current asking prices from real Shopi listings",
  "budget-guide": "What to look for, and what's listed right now",
  "location-guide": "Where to look, and what to check before you pay",
  "buying-guide": "A step-by-step checklist before you pay",
};

async function publicFile(path: string) {
  return readFile(join(process.cwd(), "public", path));
}

/** The featured photo, cropped to the card's photo column. Null on any failure. */
async function photoDataUri(src: string): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(await publicFile(src.replace(/^\//, "")))
      .resize(PHOTO.width, PHOTO.height, { fit: "cover", position: "centre" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function ArticleOgImage({
  params,
}: {
  // Next 16 hands metadata image routes an async params object.
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug, {
    includeDrafts: process.env.NODE_ENV !== "production",
  });
  const title = article?.title ?? `${siteConfig.name} Blog`;
  const category = article ? getCategory(article.category)?.name : undefined;
  const kicker = article ? KICKER[article.intent] : undefined;

  const [logo, bold, semibold, medium, photo] = await Promise.all([
    publicFile("assets/shopi-logo.png").then(
      (png) => `data:image/png;base64,${png.toString("base64")}`,
    ),
    publicFile("fonts/Poppins-Bold.ttf"),
    publicFile("fonts/Poppins-SemiBold.ttf"),
    publicFile("fonts/Poppins-Medium.ttf"),
    article?.featuredImage ? photoDataUri(article.featuredImage.src) : null,
  ]);

  const titleSize = title.length <= 28 ? 68 : title.length <= 46 ? 58 : 50;

  const rendered = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#ffffff",
          color: INK,
          fontFamily: "Poppins",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "60px 64px 52px",
          }}
        >
          {category ? (
            <div style={{ display: "flex" }}>
              <div
                style={{
                  display: "flex",
                  background: PINK,
                  color: "#ffffff",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  padding: "8px 20px",
                  borderRadius: 999,
                  textTransform: "uppercase",
                }}
              >
                {category}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: 1.08,
                letterSpacing: -1.5,
              }}
            >
              {title}
            </div>
            {kicker && (
              <div
                style={{
                  display: "flex",
                  marginTop: 22,
                  fontSize: 26,
                  fontWeight: 500,
                  color: MUTED,
                }}
              >
                {kicker}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* The logo PNG has white corners; on a white card they vanish. */}
            <img src={logo} alt="" width={52} height={52} />
            <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: PINK }}>
              shopi.co.ke
            </div>
          </div>
        </div>

        {photo && <img src={photo} alt="" {...PHOTO} />}
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

  return ogJpegResponse(rendered);
}
