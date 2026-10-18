import { RouteProviders } from "@/components/providers/RouteProviders";
import {
  ConsentedTagManager,
  CookieConsentBanner,
} from "@/components/layout/CookieConsent";
import { fontVariables, themeScript } from "@/components/layout/documentAssets";
import { cultureCode } from "@/i18n/config";

const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

export function AppDocument({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang: string;
}) {
  return (
    <html
      lang={cultureCode(lang)}
      suppressHydrationWarning
      className={`${fontVariables} h-full antialiased`}
    >
      {/* llms.txt discovery.
          The convention relies on crawlers guessing the well-known path, so a
          site that only *hosts* the file may never have it read. These links
          let anything parsing the HTML find it directly. No <head> wrapper —
          React 19 hoists link tags into the document head on its own, which is
          the App Router-safe way to do this. */}
      <link
        rel="alternate"
        type="text/plain"
        href="/llms.txt"
        title="LLM reference (summary)"
      />
      <link
        rel="alternate"
        type="text/plain"
        href="/llms-full.txt"
        title="LLM reference (full)"
      />
      <link
        rel="alternate"
        type="text/markdown"
        href="/catalog.md"
        title="Current Shopi marketplace catalog"
      />
      <link
        rel="alternate"
        type="application/json"
        href="/catalog.json"
        title="Current Shopi marketplace catalog (JSON)"
      />
      <body className="min-h-full flex flex-col bg-app text-default">
        <script
          id="theme-script"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <RouteProviders>{children}</RouteProviders>
        {/* Google Tag Manager (and the Google Analytics / Meta Pixel tags it
            carries) loads only after the visitor accepts analytics cookies. */}
        <ConsentedTagManager gtmId={gtmId} />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
