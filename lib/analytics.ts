"use client";

import { track } from "@vercel/analytics";
import { attributionProps } from "@/lib/attribution";

/**
 * Custom-event wrappers. Each event fans out to three sinks:
 *
 * - Vercel Analytics, with first-touch attribution, so the dashboard can break
 *   signups down by source/medium instead of only showing referrers for
 *   anonymous pageviews. `track()` is a no-op on the Hobby plan — custom events
 *   need Web Analytics Plus. Pageview referrers work on every plan regardless.
 * - The GTM dataLayer, where a GA4 event tag forwards it so it can be marked as
 *   a key event. Without this GA4 only ever sees pageviews and scrolls.
 * - The Meta Pixel, so Meta ads optimise for sign-ups and published posts
 *   rather than clicks. Inert until the pixel is configured (see MetaPixel).
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
  }
}

type AuthMethod = "email" | "google" | "apple" | "facebook" | "tiktok";
type AnalyticsProperties = Record<string, string | number | boolean>;
type PostJourneyEvent =
  | "post_flow_started"
  | "post_method_selected"
  | "post_content_type_selected"
  | "post_media_upload_started"
  | "post_media_upload_completed"
  | "post_media_upload_failed"
  | "post_details_submitted"
  | "post_publish_started"
  | "post_publish_failed"
  | "post_draft_saved";

function pushDataLayer(event: string, params: Record<string, string> = {}) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
  } catch {
    // Analytics must never break the flow that fired it.
  }
}

function trackEvent(event: string, properties: AnalyticsProperties = {}) {
  try {
    track(event, properties);
  } catch {
    // Analytics must never break the flow that fired it.
  }
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...properties });
  } catch {
    // Analytics must never break the flow that fired it.
  }
}

/** Records which homepage CTA was clicked, including its position. */
export function trackHomepageButtonClick(
  buttonId: string,
  placement: string,
  destination: string,
) {
  trackEvent("homepage_button_click", {
    button_id: buttonId,
    placement,
    destination,
  });
}

/** Records a step in the listing creation flow without sending listing text. */
export function trackPostJourney(
  event: PostJourneyEvent,
  properties: AnalyticsProperties = {},
) {
  trackEvent(event, properties);
}

function metaPixel(...args: unknown[]) {
  try {
    window.fbq?.(...args);
  } catch {
    // Analytics must never break the flow that fired it.
  }
}

/** Fired when a brand-new account is created. */
export function trackSignup(method: AuthMethod) {
  try {
    track("signup", { method, ...attributionProps() });
  } catch {
    // Analytics must never break an auth flow.
  }
  // GA4's recommended name, so the key-event reports label it correctly.
  pushDataLayer("sign_up", { method });
  metaPixel("track", "CompleteRegistration", { method });
}

/**
 * Fired when an existing account signs in. New accounts fire `signup` instead,
 * decided by the server's `isNewUser` rather than by inference. `surface`
 * records which screen the user authenticated from.
 */
export function trackAuthSuccess(
  method: AuthMethod,
  surface: "register" | "welcome" | "login" | "one_tap" | "unknown",
) {
  try {
    track("auth_success", { method, surface, ...attributionProps() });
  } catch {
    // Analytics must never break an auth flow.
  }
}

/**
 * Fired when a post goes live — the seller-side conversion. `surface` separates
 * the create flow from publishing a saved draft off the profile.
 */
export function trackPostPublished(
  surface: "create" | "drafts",
  details: { category?: string | null; contentType?: string | null } = {},
) {
  const properties: AnalyticsProperties = {
    surface,
    ...attributionProps(),
    ...(details.category ? { category: details.category } : {}),
    ...(details.contentType ? { content_type: details.contentType } : {}),
  };
  trackEvent("post_published", properties);
  metaPixel("trackCustom", "PostPublished", { surface });
}
