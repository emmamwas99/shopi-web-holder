import { NextRequest, NextResponse } from "next/server";
import {
  isTiktokUrl,
  tiktokFileName,
  type TiktokAsset,
  type TiktokPostInfo,
  type TiktokSaverError,
  type ViewerGeo,
} from "@/lib/tiktokSaver";

export const runtime = "nodejs";

/**
 * TikTok saver lookups for the TikTok tool pages and the post composer.
 *
 * GET ?url=<tiktok link>
 *   → JSON TiktokPostInfo: kind (video | photo), the H.264 video, the HEVC
 *     "HD" video when it differs, the sound as MP3 and photo-mode images.
 *     The saver tool downloads those CDN URLs straight from the browser
 *     (they send `Access-Control-Allow-Origin: *`), so the bytes don't pass
 *     through this function. On Vercel Hobby every byte a function sends
 *     counts against the plan, and a popular downloader would spend it fast.
 *
 * GET ?url=<tiktok link>&download=video|hd|audio|image[&i=<n>]
 *   → streams that one file as an attachment. The tool's fallback for when a
 *     direct CDN fetch fails (an old browser, a CDN host outside the CSP).
 *
 * GET ?url=<tiktok link>&download=1   (post composer, features/create)
 *   → unchanged contract: streams the best video (HD first) with the metadata
 *     in the X-Tiktok-Meta header (URI-encoded JSON). A photo post answers 422
 *     instead of streaming its soundtrack as "video/mp4", which used to
 *     create picture-less audio posts.
 *
 * Same tikwm technique as the import pipeline in the API repo
 * (queues/workers/tiktok-download.worker.ts). We never proxy arbitrary URLs:
 * a streamed file is always one tikwm resolved for a validated tiktok.com link.
 */

const TIKWM_API = "https://www.tikwm.com/api/";

type TikwmData = {
  id?: string | number;
  title?: string;
  author?: { unique_id?: string; nickname?: string };
  cover?: string;
  origin_cover?: string;
  duration?: number;
  play?: string;
  hdplay?: string;
  size?: number;
  hd_size?: number;
  music?: string;
  music_info?: {
    title?: string;
    author?: string;
    duration?: number;
    play?: string;
  };
  images?: unknown;
};

type Lookup =
  | { ok: true; data: TikwmData }
  | { ok: false; error: TiktokSaverError; status: number };

/** tikwm sometimes returns relative media paths — normalise to absolute. */
function absoluteTikwmUrl(url: string): string {
  return url.startsWith("http") ? url : `https://www.tikwm.com${url}`;
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

async function lookup(url: string): Promise<Lookup> {
  let res: Response;
  try {
    res = await fetch(TIKWM_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ url, hd: "1" }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "fetch_failed", status: 502 };
  }
  if (!res.ok) return { ok: false, error: "fetch_failed", status: 502 };

  type TikwmPayload = { code?: number; msg?: string; data?: TikwmData } | null;
  let payload: TikwmPayload;
  try {
    payload = (await res.json()) as TikwmPayload;
  } catch {
    return { ok: false, error: "fetch_failed", status: 502 };
  }
  if (!payload || payload.code !== 0 || !payload.data) {
    // "Url parsing is failed! Please check url." (seen 4 Nov 2026) means the
    // post can't be resolved: private, deleted, region-blocked or not a post
    // link. Anything else — the ~1 request/second limit included — is worth
    // retrying, so it stays a 502 like every failure used to be.
    const unresolvable = /pars|check url|not ?found|private|deleted|unavailable/i.test(
      payload?.msg ?? "",
    );
    return unresolvable
      ? { ok: false, error: "unavailable", status: 404 }
      : { ok: false, error: "fetch_failed", status: 502 };
  }
  const { data } = payload;
  const hasImages = Array.isArray(data.images) && data.images.length > 0;
  if (!data.play && !hasImages) {
    return { ok: false, error: "unavailable", status: 404 };
  }
  return { ok: true, data };
}

function toPostInfo(data: TikwmData): TiktokPostInfo {
  const images = Array.isArray(data.images) ? data.images.filter(isHttpUrl) : [];
  const kind = images.length > 0 ? "photo" : "video";

  const video =
    kind === "video" && data.play
      ? { url: absoluteTikwmUrl(data.play), size: data.size || null }
      : null;
  const hdUrl = kind === "video" && data.hdplay ? absoluteTikwmUrl(data.hdplay) : null;
  const videoHd =
    hdUrl && hdUrl !== video?.url ? { url: hdUrl, size: data.hd_size || null } : null;

  // On a photo post `play` is the soundtrack, so it's a fallback for the MP3.
  const audioSource =
    data.music_info?.play || data.music || (kind === "photo" ? data.play : undefined);

  return {
    id: data.id != null ? String(data.id) : null,
    kind,
    title: data.title?.trim() || null,
    author: data.author?.nickname ?? data.author?.unique_id ?? null,
    authorUsername: data.author?.unique_id ?? null,
    cover: data.origin_cover || data.cover || images[0] || null,
    duration: kind === "video" ? (data.duration ?? null) : null,
    video,
    videoHd,
    audio: audioSource
      ? {
          url: absoluteTikwmUrl(audioSource),
          size: null,
          title: data.music_info?.title ?? null,
          author: data.music_info?.author ?? null,
          duration: data.music_info?.duration ?? null,
        }
      : null,
    images,
  };
}

const CONTENT_TYPE: Record<TiktokAsset, string> = {
  video: "video/mp4",
  hd: "video/mp4",
  audio: "audio/mpeg",
  image: "image/jpeg",
};

function assetSource(
  info: TiktokPostInfo,
  asset: TiktokAsset,
  index: number,
): string | null {
  switch (asset) {
    case "video":
      return info.video?.url ?? null;
    case "hd":
      return info.videoHd?.url ?? info.video?.url ?? null;
    case "audio":
      return info.audio?.url ?? null;
    case "image":
      return Number.isInteger(index) && index >= 0 ? (info.images[index] ?? null) : null;
  }
}

async function streamFile(
  source: string,
  filename: string,
  contentType: string,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(source, {
      signal: AbortSignal.timeout(120_000),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "download_failed" }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "download_failed" }, { status: 502 });
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { headers });
}

const ASSETS = new Set<TiktokAsset>(["video", "hd", "audio", "image"]);

/**
 * The visitor's country and city from Vercel's edge headers, returned with a
 * lookup so the tool's analytics can say where downloads come from without
 * the API geolocating anyone's IP. Nothing here is stored by this route.
 */
function viewerGeo(request: NextRequest): ViewerGeo | null {
  const country = request.headers.get("x-vercel-ip-country");
  const rawCity = request.headers.get("x-vercel-ip-city");
  let city: string | null = null;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      city = rawCity;
    }
  }
  return country || city ? { country: country || null, city } : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const url = (params.get("url") ?? "").trim();
  const download = params.get("download");

  if (!isTiktokUrl(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const result = await lookup(url);
  if (!result.ok) {
    // The composer retries on 502 and only on 502, so its path keeps the old
    // status for every lookup failure.
    if (download === "1") {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json(
      { error: result.error, ...(download ? {} : { geo: viewerGeo(request) }) },
      { status: result.status },
    );
  }
  const info = toPostInfo(result.data);

  // ── Post composer contract (features/create/utils/tiktokDownload.ts) ──
  if (download === "1") {
    if (info.kind === "photo") {
      return NextResponse.json({ error: "photo_post" }, { status: 422 });
    }
    const meta = {
      id: info.id,
      // Titles can be long; keep the header well inside proxy limits.
      title: info.title?.slice(0, 200) ?? null,
      author: info.author,
      authorUsername: info.authorUsername,
      cover: info.cover,
      duration: info.duration,
    };
    return streamFile(
      (info.videoHd ?? info.video)!.url,
      `shopi-tiktok-${info.id ?? "video"}.mp4`,
      "video/mp4",
      { "X-Tiktok-Meta": encodeURIComponent(JSON.stringify(meta)) },
    );
  }

  if (!download) {
    return NextResponse.json(
      { ...info, geo: viewerGeo(request) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // ── Fallback download of one asset for the saver tool ──
  if (!ASSETS.has(download as TiktokAsset)) {
    return NextResponse.json({ error: "invalid_asset" }, { status: 400 });
  }
  const asset = download as TiktokAsset;
  const index = Number(params.get("i") ?? "0");
  const source = assetSource(info, asset, index);
  if (!source) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }
  return streamFile(
    source,
    tiktokFileName(info.id, asset, index),
    CONTENT_TYPE[asset],
  );
}
