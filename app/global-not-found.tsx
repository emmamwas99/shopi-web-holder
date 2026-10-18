import type { Metadata } from "next";
import "./globals.css";
import { fontVariables, themeScript } from "@/components/layout/documentAssets";
import { NotFoundView } from "@/components/layout/NotFoundView";
import { siteConfig } from "@/config/site";
import { cultureCode } from "@/i18n/config";

/**
 * The 404 for URLs that match no route at all (e.g. /en/a/b/c).
 *
 * The root layout lives at app/[lang]/layout.tsx, a top-level dynamic segment,
 * so there's no app/layout.tsx for an app/not-found.tsx to render inside —
 * the case Next's docs give for global-not-found. It skips the layout tree,
 * so it builds its own document with the site's fonts, styles and theme
 * script (but none of the app's providers or analytics, keeping it light).
 * Requires `experimental.globalNotFound` in next.config.ts.
 *
 * There's no locale segment to read here, so it's in English; the links go
 * to /en, which is where the proxy sends unprefixed URLs anyway.
 */
export const metadata: Metadata = {
  title: `Page not found | ${siteConfig.name}`,
  description: "The page you were looking for isn't on Shopi.",
};

export default function GlobalNotFound() {
  return (
    <html
      lang={cultureCode("en")}
      suppressHydrationWarning
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-app text-default">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <NotFoundView lang="en" />
      </body>
    </html>
  );
}
