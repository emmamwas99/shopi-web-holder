import { tiktokToolOgImage } from "@/components/tools/tiktokToolOgImage";

// Node runtime so the card can read the brand artwork from the public folder.
export const runtime = "nodejs";
export const alt = "TikTok Downloader — save TikTok videos in HD without the watermark";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TiktokDownloaderOgImage() {
  return tiktokToolOgImage({
    eyebrow: "Free TikTok downloader",
    headline: "Download TikTok videos without the watermark",
    sub: "Paste a link. Save the MP4. Done.",
    chips: ["Free", "HD when available", "MP4 + MP3", "No app"],
    icon: "play",
    savedAs: "Saved as MP4",
  });
}
