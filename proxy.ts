import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from "@/i18n/config";

// Routes that require a valid accessToken cookie.
// Matched after locale prefix is stripped, so "/upload" covers "/{locale}/upload".
const PROTECTED_PATHS = ["/upload", "/notifications", "/settings"];

// "/profile" needs finer treatment than the list above. The viewer's own
// profile and its management screens are private, but "/profile/{username}" is
// a public seller page — it carries a canonical, ProfilePage JSON-LD and its
// own OG image route, and robots.ts deliberately leaves it crawlable.
// Protecting the whole prefix redirected every crawler (and every logged-out
// visitor following a shared seller link) to the auth screen, which made those
// pages impossible to index.
const PRIVATE_PROFILE_PATHS = [
  "/profile/edit",
  "/profile/followers",
  "/profile/visitors",
  "/profile/posts",
  // Account settings sub-pages. These are static segments so they beat the
  // /profile/{username} dynamic route, but they must also be listed here or a
  // signed-out visitor reaches them instead of the sign-in screen.
  "/profile/change-password",
  "/profile/rate",
  "/profile/verification",
];

// Routes a logged-in user shouldn't see — the auth flows. They're redirected
// straight to the feed instead.
const GUEST_ONLY_PATHS = ["/auth"];

// …except the OAuth callback, which must run even when a session already exists
// (it finalizes tokens and posts them back to the login popup's opener).
const GUEST_ONLY_EXCEPTIONS = ["/auth/tiktok-callback"];

function getBarePath(pathname: string): string {
  const locale = locales.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  return locale ? pathname.slice(`/${locale}`.length) || "/" : pathname;
}

function isProtected(pathname: string): boolean {
  const bare = getBarePath(pathname);
  if (PROTECTED_PATHS.some((p) => bare === p || bare.startsWith(`${p}/`))) {
    return true;
  }
  // Bare "/profile" is the viewer's own profile; the named subpaths are its
  // management screens. Anything else under /profile/ is a public username.
  if (bare === "/profile") return true;
  return PRIVATE_PROFILE_PATHS.some(
    (p) => bare === p || bare.startsWith(`${p}/`),
  );
}

function isGuestOnly(pathname: string): boolean {
  const bare = getBarePath(pathname);
  if (
    GUEST_ONLY_EXCEPTIONS.some((p) => bare === p || bare.startsWith(`${p}/`))
  ) {
    return false;
  }
  return GUEST_ONLY_PATHS.some((p) => bare === p || bare.startsWith(`${p}/`));
}

function getPathLocale(pathname: string) {
  return locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameLocale = getPathLocale(pathname);
  const barePath = getBarePath(pathname);

  // accessToken is stored in localStorage by Zustand, so the proxy can't read
  // it directly. We rely on a lightweight "shopi-auth-hint" cookie that the
  // client sets on login and clears on logout (see stores/auth.ts).
  const hasSession = !!request.cookies.get("shopi-auth-hint")?.value;

  // /feed was the old app URL. Keep it alive for shared links and crawlers,
  // but make /for-you the canonical destination.
  if (barePath === "/feed" || barePath.startsWith("/feed/")) {
    const locale = pathnameLocale ?? defaultLocale;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}${barePath.replace(/^\/feed/, "/for-you")}`;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Signed-in users enter the app by default. The logo can explicitly open
  // the public homepage without changing that default.
  if (
    hasSession &&
    barePath === "/" &&
    request.nextUrl.searchParams.get("view") !== "home"
  ) {
    const locale = pathnameLocale ?? defaultLocale;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/for-you`;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (isProtected(pathname) && !hasSession) {
    const locale = pathnameLocale ?? defaultLocale;

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/auth/auth-welcome`;
    // Keep the query: /profile?tab=invite should come back to the invite
    // section after sign-in, not to the bare profile.
    loginUrl.search = `?from=${encodeURIComponent(`${pathname}${request.nextUrl.search}`)}`;
    return NextResponse.redirect(loginUrl);
  }

  // ── Logged-in guard ───────────────────────────────────────────────────────
  // A signed-in user shouldn't land on the marketing page or the auth flows.
  // Send them back to wherever they came from — the auth route itself may
  // carry a "from" param (e.g. an old login link), otherwise fall back to the
  // same-origin Referer, otherwise For You.
  if (hasSession && isGuestOnly(pathname)) {
    const locale = pathnameLocale ?? defaultLocale;

    const from = request.nextUrl.searchParams.get("from");
    const referer = request.headers.get("referer");

    let backTo: string | null = null;
    if (from?.startsWith("/")) {
      backTo = from;
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (
          refererUrl.origin === request.nextUrl.origin &&
          !isGuestOnly(refererUrl.pathname)
        ) {
          backTo = `${refererUrl.pathname}${refererUrl.search}`;
        }
      } catch {
        // malformed referer — ignore
      }
    }

    const redirectUrl = request.nextUrl.clone();
    if (backTo) {
      const target = new URL(backTo, request.nextUrl.origin);
      redirectUrl.pathname = target.pathname;
      redirectUrl.search = target.search;
    } else {
      redirectUrl.pathname = `/${locale}/for-you`;
      redirectUrl.search = "";
    }
    return NextResponse.redirect(redirectUrl);
  }

  // ── Locale prefix ─────────────────────────────────────────────────────────
  if (pathnameLocale) return NextResponse.next();

  // No locale in path — redirect to the default English prefix.
  const locale = defaultLocale;
  const newUrl = request.nextUrl.clone();
  const bare = pathname === "/" ? "" : pathname;
  newUrl.pathname = `/${locale}${bare}`;

  return NextResponse.redirect(newUrl);
}

// Proxy runs on the Node.js runtime, so on Vercel every matched request is a
// Fluid function invocation billed for Active CPU. It used to match every page
// — every crawler hit on a static or ISR page and every client navigation paid
// for a function that then did nothing. Match only the requests the proxy can
// actually act on; the cookie conditions skip it when the auth state means it
// would pass the request through anyway. Keep these in sync with the path
// lists at the top of this file.
export const config = {
  matcher: [
    "/",
    // No locale prefix → redirect to /en. Skips Next.js internals, static
    // files, and /og/* (locale-free share-image routes; prefixing them 404s).
    "/((?!(?:en|sw)(?:/|$)|_next|api|og/|favicon.ico|manifest.json|og-default.png|robots.txt|sitemap.xml|.*\\..*).*)",
    // Old /feed URLs → /for-you.
    "/:lang(en|sw)/feed/:path*",
    // Signed in: the homepage and the auth flows send you into the app.
    {
      source: "/:lang(en|sw)",
      has: [{ type: "cookie", key: "shopi-auth-hint" }],
    },
    {
      source: "/:lang(en|sw)/auth/:path*",
      has: [{ type: "cookie", key: "shopi-auth-hint" }],
    },
    // Signed out: protected routes go to sign-in.
    {
      source: "/:lang(en|sw)/(upload|notifications|settings)/:path*",
      missing: [{ type: "cookie", key: "shopi-auth-hint" }],
    },
    {
      source: "/:lang(en|sw)/profile",
      missing: [{ type: "cookie", key: "shopi-auth-hint" }],
    },
    {
      source:
        "/:lang(en|sw)/profile/(edit|followers|visitors|posts|change-password|rate|verification)/:path*",
      missing: [{ type: "cookie", key: "shopi-auth-hint" }],
    },
  ],
};
