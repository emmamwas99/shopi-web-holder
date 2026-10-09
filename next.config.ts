import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// ── Content-Security-Policy ──────────────────────────────────────────────────
// A static (non-nonce) policy tuned to the origins this app actually uses. It
// keeps static rendering/CDN caching (no per-request nonce) while still passing
// security scanners and materially reducing XSS/clickjacking surface.
//
// `'unsafe-inline'` is retained for scripts and styles because the app relies on
// an inline theme-flash script (components/layout/AppDocument.tsx), the Mux player (injects inline
// styles), and the Google/Apple OAuth widgets. Moving to a nonce-based policy
// would require forcing every page dynamic and threading a nonce through all of
// these — a separate, larger change.
//
// connect-src derives the API/WebSocket origins from env vars so it works in
// every environment; the staging/prod origins are also listed explicitly so a
// build with a localhost .env still permits the deployed backends.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "";

// CSP source expressions match PATHS when one is present — an entry like
// "ws://localhost:4000/graphql" only permits that exact path and silently
// blocks Socket.IO's "/socket.io" endpoint (the browser then loops on
// "websocket error" and realtime never connects). Reduce every backend URL to
// its bare origin, and mirror the API origin onto the ws scheme, since
// browsers don't let an http: source authorize a ws: connection.
const toOrigin = (value: string): string => {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
};
const toWsOrigin = (value: string): string =>
  toOrigin(value).replace(/^http/, "ws");

const connectSrc = [
  "'self'",
  toOrigin(apiUrl),
  toWsOrigin(apiUrl), // Socket.IO + any WS endpoint on the API origin
  toOrigin(wsUrl),
  // Deployed backends (in case the build's .env points at localhost)
  "https://api.shopi.co.ke",
  "https://staging.shopi.co.ke",
  "wss://api.shopi.co.ke",
  "wss://staging.shopi.co.ke",
  // Media + CDNs
  "https://storage.shopi.co.ke",
  "https://media.shopi.co.ke",
  "https://image.mux.com",
  "https://stream.mux.com",
  "https://*.litix.io", // Mux Data analytics
  // Direct browser uploads PUT straight to presigned URLs on these hosts:
  // images → the R2 bucket endpoint, videos → Mux direct-upload endpoints
  // (regional hosts like direct-uploads-*.mux.com). Without them the CSP
  // silently kills every upload from the post composer.
  "https://*.r2.cloudflarestorage.com",
  "https://*.mux.com",
  // Maps / geocoding
  "https://maps.googleapis.com",
  "https://nominatim.openstreetmap.org",
  "https://tile.openstreetmap.org",
  // OAuth
  "https://accounts.google.com",
  "https://appleid.apple.com",
  // Analytics
  "https://api.mixpanel.com",
  // Google Tag Manager beacons + whatever tags the container loads report to.
  // Without these the container script parses and then fails on every send,
  // which is worse than not loading it at all.
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  // Cloudflare Web Analytics. The beacon is injected by the Cloudflare proxy
  // in front of the site, not by this app, so it has to be allowed here or it
  // reports a CSP violation on every page view.
  "https://static.cloudflareinsights.com",
  "https://cloudflareinsights.com",
]
  .filter(Boolean)
  .join(" ");

// `upgrade-insecure-requests` rewrites every http:// subresource to https://.
// That is exactly right for the deployed site, but it also rewrites an http
// API origin — so a production build pointed at http://localhost:4000 has all
// of its browser GraphQL requests silently upgraded to https and fail with
// "TypeError: Failed to fetch". (SSR is unaffected: CSP only governs the
// browser, which is why the page renders and then dies on the first
// client-side query.) Emit it only when the API is already https, i.e. on a
// real deployment, where it never changes behaviour but keeps the hardening.
const upgradeInsecureRequests = apiUrl.startsWith("http://")
  ? ""
  : "upgrade-insecure-requests;";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://accounts.google.com https://appleid.cdn-apple.com https://maps.googleapis.com https://*.mux.com https://www.googletagmanager.com https://static.cloudflareinsights.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style;
  img-src 'self' blob: data: https: ;
  font-src 'self' data: https://fonts.gstatic.com;
  media-src 'self' blob: https://stream.mux.com https://*.mux.com;
  connect-src ${connectSrc};
  frame-src 'self' https://accounts.google.com https://appleid.apple.com https://www.tiktok.com;
  worker-src 'self' blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  ${upgradeInsecureRequests}
`
  .replace(/\s{2,}/g, " ")
  .trim();

// Security headers applied to every response. HSTS, X-Frame-Options,
// X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and CSP are all
// standard hardening headers surfaced by security scanners.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
  {
    // Enforce HTTPS for 2 years incl. subdomains; eligible for preload list.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // Google Identity Services needs an opener relationship to deliver the
    // credential from its popup in browsers without FedCM (including many
    // installed-PWA contexts).
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,

  // `experimental.inlineCss` is deliberately OFF.
  //
  // Inlining saved two render-blocking round trips, but Next emits the inline
  // <style> before the metadata, and the uncompressed stylesheet is ~180 KB.
  // That pushed og:title/og:image to byte ~191,000 of a 193 KB <head>. Link
  // scrapers only parse a prefix of the document — WhatsApp gives up within
  // the first few tens of KB — so every shared Shopi URL came back with no
  // title, no description and no image, even though the tags were present and
  // the page returned 200. WhatsApp is the main sharing channel in this market,
  // so a working preview on every shared listing is worth far more than the
  // CSS round trips. The stylesheet goes back to a <link>, and the head drops
  // to a few KB with the meta tags near the top.
  //
  // If this is ever re-enabled, check the byte offset of og:title in the
  // response HTML before shipping.

  // Send hardening headers on every route. Next prefixes each source with the
  // configured locales automatically, and "/(.*)" covers everything else.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // The app is served under /[lang] (e.g. /en). Redirect the bare domain and
  // common non-locale paths to the default locale so the homepage, blog, etc.
  // are reachable (and indexable) at the root URL.
  async redirects() {
    const paths = [
      "blog",
      "blog/:slug",
      "about",
      "faq",
      "shopi-agent",
      "online-selling-jobs-kenya",
      "marketplace-alternatives-kenya",
      "marketplace/:county",
      "jiji-alternative-kenya",
      "pigiame-alternative-kenya",
      "sell-in-kenya",
      "sell-car-kenya",
      "sell-car-kenya/:city",
      "sell/:slug",
      "for-sale/:slug",
      "property-for-sale-kenya",
      "beauty-cosmetics-kenya",
      "phones-electronics-kenya",
      "tiktok-downloader",
      "privacy",
      "terms",
      "cookies",
      "feed",
      "explore",
      "search",
      "contact",
      "community-guidelines",
      "prohibited-items",
      "safety-centre",
    ];
    return [
      // Host consolidation. www is the canonical host (siteConfig.url), so the
      // apex must 301 to it — otherwise both hosts serve the full site and the
      // duplicate signals split ranking equity. Kept first so it resolves
      // before any path-level rule.
      {
        source: "/:path*",
        has: [{ type: "host", value: "shopi.co.ke" }],
        destination: "https://www.shopi.co.ke/:path*",
        permanent: true,
      },
      {
        source: "/:lang(en|sw)/careers",
        destination: "/:lang/online-selling-jobs-kenya",
        permanent: true,
      },
      {
        source: "/careers",
        destination: "/en/online-selling-jobs-kenya",
        permanent: true,
      },
      { source: "/", destination: "/en", permanent: true },
      ...paths.map((p) => ({
        source: `/${p}`,
        destination: `/en/${p}`,
        permanent: true,
      })),
    ];
  },

  images: {
    // Vercel's Image Optimization quota can fail closed once exhausted, which
    // leaves product/feed/profile cards with blank media. Serve the original
    // CDN URLs directly instead; the upstream image variants already carry the
    // sizing work for this app.
    //unoptimized: true,
    // Serve AVIF first (≈20-30% smaller than WebP) then fall back to WebP.
    // Addresses Lighthouse "Improve image delivery" on the hero listing images.
    formats: ["image/avif", "image/webp"],
    // Restrict the quality values the optimizer will honor; 75 is the default
    // used across the app. 45/55 are reserved for small decorative imagery.
    qualities: [45, 55, 75, 82],
    // Vercel bills every distinct width × quality × format of an image as its
    // own transformation, so fewer width buckets means fewer transformations
    // and more cache hits shared between devices. Phones (~95% of traffic)
    // land on 828 (2x) or 1200 (3x). Nothing above 1920: uploaded photos are
    // at most 1200px (the API's R2 "original" variant) and the optimizer never
    // upscales, so 2048/3840 only produced duplicate copies of the same pixels.
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [64, 128, 256, 384],
    // Keep optimized copies for 31 days instead of Next's 4-hour default, so an
    // image is re-transformed monthly rather than several times a day. R2
    // uploads already send a 1-year immutable Cache-Control (the larger value
    // wins); this mainly covers Mux thumbnails, TikTok covers and Google
    // avatars, whose URLs change when the image does.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.mux.com",
      },
      // TikTok CDN — cover images served from various p*-sign.tiktokcdn.com hosts
      {
        protocol: "https",
        hostname: "**.tiktokcdn.com",
      },
      {
        protocol: "https",
        hostname: "**.tiktokcdn-us.com",
      },
      {
        protocol: "https",
        hostname: "storage.shopi.co.ke",
      },
      {
        protocol: "https",
        hostname: "media.shopi.co.ke",
      },

      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.shopi.co.ke",
      },
    ],
  },
};

export default nextConfig;
