/**
 * Shared by the Facebook video downloader page and its tool
 * (components/tools/FacebookSaverTool.tsx). Isomorphic: no server-only imports.
 *
 * The lookup runs on the Shopi API, GET {NEXT_PUBLIC_API_URL}/tools/facebook-save
 * (shopi-social-commerce-api src/modules/facebook-saver). The browser calls it
 * directly rather than through a Next route, so the API's per-visitor rate
 * limit sees the visitor's IP instead of one Vercel address for everyone.
 *
 * What Facebook serves, checked 22 Nov 2026:
 * - Every public video or Reel has a progressive MP4 with AAC sound. The SD
 *   file is H.264 (around 360p) and plays everywhere.
 * - The HD file, when there is one (720p–1080p in the tests), is H.264 for
 *   some videos but VP9 or AV1 for many. Those play in Chrome and on Android
 *   but not reliably on iPhone, so the tool says which one it is.
 * - Files are signed fbcdn.net URLs that answer with
 *   `Access-Control-Allow-Origin: *` and stay valid for a few days, so the
 *   browser downloads them directly. The API hands them out on
 *   video.xx.fbcdn.net: the regional hosts in Facebook's page redirect phones
 *   there with a 302 that has no CORS header, which made every phone download
 *   fall back to the API. Adding `dl=1` makes the CDN send a file as an
 *   attachment, which is how files too big to hold in memory are saved.
 * - Facebook adds no watermark. A logo the creator put in the video stays.
 */

export type FacebookVideoCodec = "h264" | "vp9" | "av1" | "hevc";

export type FacebookVideoFile = {
  url: string;
  size: number | null;
  width: number | null;
  height: number | null;
  codec: FacebookVideoCodec | null;
};

export type FacebookVideoInfo = {
  id: string | null;
  title: string | null;
  author: string | null;
  authorId: string | null;
  cover: string | null;
  /** Seconds. */
  duration: number | null;
  permalink: string | null;
  /** SD H.264 when Facebook has it, otherwise the only file there is. */
  video: FacebookVideoFile;
  /** The HD file, when it exists and differs from `video`. */
  videoHd: FacebookVideoFile | null;
};

export type FacebookAsset = "video" | "hd";

/** The API's error codes, plus the ones the tool decides on before asking. */
export type FacebookSaverError =
  | "invalid_url"
  | "tiktok_link"
  | "unavailable"
  | "login_required"
  | "fetch_failed"
  | "rate_limited";

const FACEBOOK_HOST = /(^|\.)(facebook\.com|fb\.com|fb\.watch)$/i;
// Facebook's link shim forwards to other sites; the API refuses it too.
const LINK_SHIM_HOST = /^(l|lm)\.facebook\.com$/i;

export function isFacebookUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw);
    return (
      (protocol === "https:" || protocol === "http:") &&
      FACEBOOK_HOST.test(hostname) &&
      !LINK_SHIM_HOST.test(hostname)
    );
  } catch {
    return false;
  }
}

/**
 * The first Facebook link in pasted text. Share sheets sometimes copy a
 * sentence around the link, and people paste whatever they have.
 */
export function extractFacebookUrl(text: string): string | null {
  const trimmed = text.trim();
  if (isFacebookUrl(trimmed)) return trimmed;
  const match = trimmed.match(/https?:\/\/[^\s"'<>]*(?:facebook\.com|fb\.watch|fb\.com)[^\s"'<>]*/i);
  if (match && isFacebookUrl(match[0])) return match[0];
  // "fb.watch/abc123/" or "www.facebook.com/reel/…" without a scheme
  const bare = trimmed.match(
    /(?:^|\s)((?:[a-z0-9-]+\.)*(?:facebook\.com|fb\.watch|fb\.com)\/[^\s"'<>]+)/i,
  );
  if (bare && isFacebookUrl(`https://${bare[1]}`)) return `https://${bare[1]}`;
  return null;
}

/** For pointing people who paste a TikTok link at the right tool. */
export function looksLikeTiktokLink(text: string): boolean {
  return /(^|[\s/.])tiktok\.com\//i.test(text);
}

export function facebookSaveEndpoint(
  link: string,
  download?: FacebookAsset,
): string | null {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  const params = new URLSearchParams({ url: link });
  if (download) params.set("download", download);
  return `${api.replace(/\/$/, "")}/tools/facebook-save?${params}`;
}

/** "shopi-facebook-647537299265662.mp4", "…-hd.mp4". */
export function facebookFileName(id: string | null, asset: FacebookAsset): string {
  const safeId = id && /^\d+$/.test(id) ? id : "video";
  return `shopi-facebook-${safeId}${asset === "hd" ? "-hd" : ""}.mp4`;
}

/** The CDN URL with `dl=1`, which fbcdn answers as an attachment. */
export function attachmentUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("dl", "1");
    return parsed.toString();
  } catch {
    return url;
  }
}

/** "720p" for 720×1280 and for 1280×720: the short side, as people say it. */
export function qualityLabel(file: FacebookVideoFile): string | null {
  if (!file.width) return null;
  const short = file.height ? Math.min(file.width, file.height) : file.width;
  // Heights come from the aspect ratio and can be a few pixels off (398 for 400).
  const standard = [240, 360, 480, 540, 720, 1080, 1440, 2160].find(
    (p) => Math.abs(p - short) <= 12,
  );
  // Encoders use multiples of 8, so 225 is really 224.
  return `${standard ?? Math.floor(short / 8) * 8}p`;
}

/** True when the file plays everywhere (H.264). Unknown codecs are not assumed safe. */
export function playsEverywhere(file: FacebookVideoFile): boolean {
  return file.codec === "h264";
}

export const CODEC_NAME: Record<FacebookVideoCodec, string> = {
  h264: "H.264",
  vp9: "VP9",
  av1: "AV1",
  hevc: "HEVC",
};
