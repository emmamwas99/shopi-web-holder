import Script from "next/script";

function apiOrigin() {
  const value = process.env.NEXT_PUBLIC_API_URL;
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Emit API connection hints only on app routes that actually query the API.
 *
 * The `preconnect` is issued only for signed-in visitors. Anonymous visitors
 * get their first feed page server-rendered (see the feed route's PreloadQuery
 * branch), so the browser makes no API request at all during the initial load —
 * for them the preconnect opened a TLS connection that was never used, which is
 * what Lighthouse flags, and it competed with the LCP image for the small pool
 * of parallel connections. Signed-in visitors take the client-fetching branch
 * and issue API requests during hydration. The client-side hint may help later
 * requests, though the first request can race it.
 *
 * The signed-in check runs in the browser when the shell hydrates.
 * It used to read the `shopi-auth-hint` cookie on the server with cookies(),
 * but this renders in the (shell) layout, so that one call made every route
 * under it — listings, videos, explore — dynamic: rendered by a Vercel
 * Function on every hit instead of served from the ISR cache. That burned the
 * Fluid Active CPU allowance and paused deployments (Oct 2026).
 *
 * `dns-prefetch` stays unconditional: it is a DNS lookup, not a connection, so
 * it costs essentially nothing and still helps the anonymous case as soon as
 * the user interacts.
 */
export function ApiPreconnect() {
  const origin = apiOrigin();
  if (!origin) return null;

  const preconnectWhenSignedIn = `if(/(?:^|; )shopi-auth-hint=[^;]/.test(document.cookie)){var l=document.createElement("link");l.rel="preconnect";l.href=${JSON.stringify(origin)};l.crossOrigin="anonymous";document.head.appendChild(l)}`;

  return (
    <>
      <link rel="dns-prefetch" href={origin} />
      <Script
        id="api-preconnect"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: preconnectWhenSignedIn }}
      />
    </>
  );
}
