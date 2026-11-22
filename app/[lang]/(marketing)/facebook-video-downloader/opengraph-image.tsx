import { tiktokToolOgImage } from "@/components/tools/tiktokToolOgImage";

// Node runtime so the card can read the brand artwork from the public folder.
export const runtime = "nodejs";
export const alt = "Facebook Video Downloader — save Facebook videos and Reels in HD, no watermark";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function FacebookVideoDownloaderOgImage() {
  // Same card as the TikTok tools, so the free tools look like one family.
  return tiktokToolOgImage({
    eyebrow: "Free Facebook video downloader",
    headline: "Download Facebook videos and Reels in HD",
    sub: "Paste a link. Save the MP4. Done.",
    chips: ["Free", "Videos + Reels", "HD when available", "No app"],
    icon: "play",
    savedAs: "Saved as MP4",
  });
}
