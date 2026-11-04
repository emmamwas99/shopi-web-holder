import { tiktokToolOgImage } from "@/components/tools/tiktokToolOgImage";

// Node runtime so the card can read the brand artwork from the public folder.
export const runtime = "nodejs";
export const alt = "TikTok photo and slideshow downloader — save every photo as a JPG";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TiktokPhotoOgImage() {
  return tiktokToolOgImage({
    eyebrow: "TikTok slideshow downloader",
    headline: "Download TikTok photos and slideshows",
    sub: "Every photo as a JPG, or all in one ZIP.",
    chips: ["Free", "No watermark", "JPG + ZIP", "No app"],
    icon: "photo",
    savedAs: "Saved as JPG",
  });
}
