"use client";

import { currentTrafficSource, sellerAnalyticsSession } from "@/lib/seller-analytics";
import type {
  TiktokAsset,
  TiktokPostInfo,
  TiktokSaverError,
  TiktokSaverMode,
  ViewerGeo,
} from "@/lib/tiktokSaver";
import type { SaverDelivery } from "@/components/tools/saverDownloads";

/**
 * First-party analytics for the TikTok tool pages (API: `trackTiktokSaverEvent`,
 * read in the admin under Insights → TikTok downloader).
 *
 * Records which TikTok links are looked up and saved, what was saved and how
 * (CDN or our proxy), and where visitors come from — anonymously: the same
 * random per-tab session id as seller analytics, no user id, no IP. Country
 * and city come from the lookup response (Vercel edge headers).
 *
 * Fire-and-forget: `keepalive` lets a CTA click survive the navigation it
 * starts, and nothing here may throw into the tool.
 */

type SaverEventType = "LOOKUP" | "DOWNLOAD" | "CTA_CLICK";

const MUTATION = `mutation TrackTiktokSaverEvent($input: TrackTiktokSaverEventInput!) {
  trackTiktokSaverEvent(input: $input)
}`;

const REFERRER_KEY = "shopi:tiktok-saver:referrer";

const TOOL: Record<TiktokSaverMode, string> = { video: "VIDEO", audio: "AUDIO", photo: "PHOTO" };

const ERROR: Record<TiktokSaverError | "save_failed", string> = {
  invalid_url: "INVALID_URL",
  unavailable: "UNAVAILABLE",
  fetch_failed: "FETCH_FAILED",
  photo_post: "UNAVAILABLE",
  save_failed: "SAVE_FAILED",
};

let viewerGeo: ViewerGeo | null = null;

/** Called with each lookup response; later events in the visit reuse it. */
export function rememberViewerGeo(geo: ViewerGeo | null | undefined): void {
  if (geo) viewerGeo = geo;
}

/** The external site that sent this visitor, captured once per tab session. */
function landingReferrerHost(): string | undefined {
  try {
    const store = window.sessionStorage;
    const saved = store.getItem(REFERRER_KEY);
    if (saved !== null) return saved || undefined;
    let host = "";
    if (document.referrer) {
      const referrer = new URL(document.referrer).hostname.toLowerCase();
      if (referrer !== window.location.hostname.toLowerCase()) host = referrer;
    }
    store.setItem(REFERRER_KEY, host);
    return host || undefined;
  } catch {
    return undefined;
  }
}

function currentLocale(): string | undefined {
  const segment = window.location.pathname.split("/")[1] ?? "";
  return /^[a-z]{2}(-[A-Za-z]{2})?$/.test(segment) ? segment : undefined;
}

export function recordTiktokSaverEvent(event: {
  type: SaverEventType;
  mode: TiktokSaverMode;
  outcome?: "success" | "error";
  asset?: TiktokAsset | "zip";
  /** Which photo, for single-photo saves. */
  index?: number;
  error?: TiktokSaverError | "save_failed";
  delivery?: SaverDelivery;
  /** CTA_CLICK: which link. */
  cta?: string;
  /** The link that was looked up. */
  url?: string | null;
  post?: TiktokPostInfo | null;
}): void {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    const post = event.post;

    const input: Record<string, unknown> = {
      type: event.type,
      outcome: event.outcome === "error" ? "ERROR" : "SUCCESS",
      tool: TOOL[event.mode],
      sessionId: sellerAnalyticsSession(),
      source: currentTrafficSource(),
      referrerHost: landingReferrerHost(),
      locale: currentLocale(),
      country: viewerGeo?.country ?? undefined,
      city: viewerGeo?.city ?? undefined,
      asset: event.asset?.toUpperCase(),
      index: event.index,
      error: event.error ? ERROR[event.error] : undefined,
      delivery: event.delivery?.toUpperCase(),
      cta: event.cta,
      tiktokUrl: event.url ?? undefined,
      tiktokId: post?.id ?? undefined,
      authorUsername: post?.authorUsername ?? undefined,
      title: post?.title?.slice(0, 150) ?? undefined,
      postKind: post ? post.kind.toUpperCase() : undefined,
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
