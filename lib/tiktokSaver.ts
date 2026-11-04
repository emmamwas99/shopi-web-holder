/**
 * Shared by /api/tiktok-save and the saver tool on the TikTok tool pages
 * (components/tools/TiktokSaverTool.tsx). Isomorphic: no server-only imports.
 *
 * What the lookup service (tikwm) returns, checked 4 Nov 2026:
 * - Video posts: `play` is H.264 (plays everywhere); `hdplay`, when present
 *   and different, is a higher-resolution HEVC (H.265) file. HEVC plays on
 *   recent phones but not on every Windows PC or older Android, so the tool
 *   offers both and keeps the H.264 file as the default.
 * - Photo posts (slideshows): `images` holds the photos as JPEGs and `play`
 *   is the soundtrack MP3, not a video. Treating `play` as a video saved an
 *   MP3 named ".mp4" — the bug this split fixes.
 * - `music` / `music_info.play` is the sound as MP3 for both kinds.
 * - Every media URL is a signed TikTok CDN link that answers with
 *   `Access-Control-Allow-Origin: *` and expires within hours, so the browser
 *   can fetch it directly instead of streaming it through our function.
 */

export type TiktokSaverMode = "video" | "audio" | "photo";

export type TiktokFile = { url: string; size: number | null };

export type TiktokAudio = TiktokFile & {
  title: string | null;
  author: string | null;
  /** Seconds. */
  duration: number | null;
};

export type TiktokPostInfo = {
  id: string | null;
  kind: "video" | "photo";
  title: string | null;
  author: string | null;
  authorUsername: string | null;
  cover: string | null;
  /** Seconds; null for photo posts. */
  duration: number | null;
  /** H.264 MP4 that plays everywhere. Null for photo posts. */
  video: TiktokFile | null;
  /** HEVC "HD" MP4, only when TikTok has one that differs from `video`. */
  videoHd: TiktokFile | null;
  /** The post's sound as MP3. */
  audio: TiktokAudio | null;
  /** Photo-mode images in order (JPEG). Empty for video posts. */
  images: string[];
};

/** What a fallback download through /api/tiktok-save asks for. */
export type TiktokAsset = "video" | "hd" | "audio" | "image";

export type TiktokSaverError =
  | "invalid_url"
  | "unavailable"
  | "fetch_failed"
  | "photo_post";

const TIKTOK_HOST = /(^|\.)tiktok\.com$/i;

export function isTiktokUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw);
    return (protocol === "https:" || protocol === "http:") && TIKTOK_HOST.test(hostname);
  } catch {
    return false;
  }
}

/**
 * The first TikTok link in pasted text. Sharing from the TikTok app to the
 * clipboard sometimes copies a sentence around the link ("Check out this
 * video! https://vm.tiktok.com/…"), and people paste whatever they have.
 */
export function extractTiktokUrl(text: string): string | null {
  const trimmed = text.trim();
  if (isTiktokUrl(trimmed)) return trimmed;
  const match = trimmed.match(/https?:\/\/[^\s"'<>]*tiktok\.com[^\s"'<>]*/i);
  if (match && isTiktokUrl(match[0])) return match[0];
  // "vm.tiktok.com/ZM…" without a scheme
  const bare = trimmed.match(/(?:^|\s)((?:[a-z0-9-]+\.)*tiktok\.com\/[^\s"'<>]+)/i);
  if (bare && isTiktokUrl(`https://${bare[1]}`)) return `https://${bare[1]}`;
  return null;
}

const EXTENSION: Record<TiktokAsset, string> = {
  video: "mp4",
  hd: "mp4",
  audio: "mp3",
  image: "jpg",
};

/**
 * "shopi-tiktok-7123…-hd.mp4", "shopi-tiktok-7123…-3.jpg". Pass the file's
 * MIME type when it's known: photo posts are JPEGs today, but a WebP saved
 * as ".jpg" won't open in some gallery apps.
 */
export function tiktokFileName(
  id: string | null,
  asset: TiktokAsset,
  index?: number,
  mimeType?: string,
): string {
  const base = `shopi-tiktok-${id ?? "post"}`;
  const suffix =
    asset === "hd"
      ? "-hd"
      : asset === "audio"
        ? "-audio"
        : asset === "image"
          ? `-${(index ?? 0) + 1}`
          : "";
  const fromMime =
    asset === "image" && mimeType
      ? ({ "image/webp": "webp", "image/png": "png", "image/heic": "heic" } as Record<string, string>)[
          mimeType.split(";")[0].trim().toLowerCase()
        ]
      : undefined;
  return `${base}${suffix}.${fromMime ?? EXTENSION[asset]}`;
}

/** "1:05" from 65 seconds. */
export function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "2.9 MB" */
export function formatBytes(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
