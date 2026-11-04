import { tiktokToolOgImage } from "@/components/tools/tiktokToolOgImage";

// Node runtime so the card can read the brand artwork from the public folder.
export const runtime = "nodejs";
export const alt = "TikTok to MP3 — download the sound from any TikTok as an MP3";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TiktokMp3OgImage() {
  return tiktokToolOgImage({
    eyebrow: "TikTok to MP3",
    headline: "Download the sound from any TikTok",
    sub: "Paste a link. Save the MP3. Done.",
    chips: ["Free", "Videos + slideshows", "MP3", "No app"],
    icon: "music",
    savedAs: "Saved as MP3",
  });
}
