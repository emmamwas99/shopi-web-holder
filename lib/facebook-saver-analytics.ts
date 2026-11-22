"use client";

import { currentTrafficSource, sellerAnalyticsSession } from "@/lib/seller-analytics";
import { currentLocale, landingReferrerHost } from "@/lib/tiktok-saver-analytics";
import type {
  FacebookAsset,
  FacebookSaverError,
  FacebookVideoCodec,
  FacebookVideoInfo,
} from "@/lib/facebookSaver";

/**
 * First-party analytics for the Facebook video downloader page (API:
 * `trackFacebookSaverEvent`, read in the admin under Insights → Facebook
 * downloader). The same model as the TikTok tool's (lib/tiktok-saver-analytics):
 * which Facebook links are looked up and saved, what was saved and how, and
 * where visitors come from — anonymously, with the same per-tab session id as
 * seller analytics, no user id and no IP. Country and city are added by the
 * API from Cloudflare's headers, so nothing location-related is sent from here.
 *
 * Fire-and-forget: `keepalive` lets a CTA click survive the navigation it
 * starts, and nothing here may throw into the tool.
 */

type SaverEventType = "LOOKUP" | "DOWNLOAD" | "CTA_CLICK";

/** "direct" from Facebook's CDN, "proxy" through the API, "attachment" for big files. */
export type FacebookSaverDelivery = "direct" | "proxy" | "attachment";

const MUTATION = `mutation TrackFacebookSaverEvent($input: TrackFacebookSaverEventInput!) {
  trackFacebookSaverEvent(input: $input)
}`;

const ERROR: Record<FacebookSaverError | "save_failed", string> = {
  invalid_url: "INVALID_URL",
  tiktok_link: "TIKTOK_LINK",
  unavailable: "UNAVAILABLE",
  login_required: "LOGIN_REQUIRED",
  fetch_failed: "FETCH_FAILED",
  rate_limited: "RATE_LIMITED",
  save_failed: "SAVE_FAILED",
};

const CODEC: Record<FacebookVideoCodec, string> = {
  h264: "H264",
  vp9: "VP9",
  av1: "AV1",
  hevc: "HEVC",
};

export function recordFacebookSaverEvent(event: {
  type: SaverEventType;
  outcome?: "success" | "error";
  asset?: FacebookAsset;
  /** Codec of the file that was saved. */
  codec?: FacebookVideoCodec | null;
  error?: FacebookSaverError | "save_failed";
  delivery?: FacebookSaverDelivery;
  /** CTA_CLICK: which link. */
  cta?: string;
  /** The Facebook link that was looked up. Never sent for a link that isn't Facebook's. */
  url?: string | null;
  video?: FacebookVideoInfo | null;
}): void {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    const video = event.video;

    const input: Record<string, unknown> = {
      type: event.type,
      outcome: event.outcome === "error" ? "ERROR" : "SUCCESS",
      sessionId: sellerAnalyticsSession(),
      source: currentTrafficSource(),
      referrerHost: landingReferrerHost(),
      locale: currentLocale(),
      asset: event.asset?.toUpperCase(),
      codec: event.codec ? CODEC[event.codec] : undefined,
      error: event.error ? ERROR[event.error] : undefined,
      delivery: event.delivery?.toUpperCase(),
      cta: event.cta,
      facebookUrl: event.url ?? undefined,
      videoId: video?.id ?? undefined,
      author: video?.author ?? undefined,
      authorId: video?.authorId ?? undefined,
      title: video?.title?.slice(0, 150) ?? undefined,
      postKind: video ? (video.permalink?.includes("/reel/") ? "REEL" : "VIDEO") : undefined,
    };
    // GraphQL rejects explicit nulls on some fields; drop empty ones.
    for (const key of Object.keys(input)) {
      if (input[key] === undefined || input[key] === null) delete input[key];
    }

    void fetch(`${apiUrl}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      keepalive: true,
      body: JSON.stringify({ query: MUTATION, variables: { input } }),
    }).catch(() => {});
  } catch {
    // Analytics must never break the tool.
  }
}
