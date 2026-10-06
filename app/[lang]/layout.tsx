import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { AppDocument } from "@/components/layout/AppDocument";
import { siteConfig } from "@/config/site";
import { isValidLocale, locales } from "@/i18n/config";
import "../globals.css";
import { Analytics } from "@vercel/analytics/next";
import { AttributionTracker } from "@/components/layout/AttributionTracker";
import { MetaPixel } from "@/components/layout/MetaPixel";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.metaTitle,
    template: `%s | ${siteConfig.name}`,
  },
  applicationName: siteConfig.name,
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "marketplace",
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.metaTitle,
    description: siteConfig.description,
    // OG/Twitter images are supplied by the sibling opengraph-image route
    // (app/[lang]/opengraph-image.tsx), so they resolve under the locale prefix.
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    title: siteConfig.metaTitle,
    description: siteConfig.description,
  },
  // No web app manifest and no apple-mobile-web-app hints: Shopi is a website,
  // not an installable app. A native mobile app is the delivery path for that,
  // so browsers must never offer "Install" or open this in a standalone shell.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  // No site-wide canonical: every page inherits this, so a default here would
  // declare any page that forgets its own canonical a duplicate of the
  // homepage. Public pages set their own.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0e" },
  ],
};

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  return (
    <AppDocument lang={lang}>
      {children}
      <Analytics />
      <AttributionTracker />
      <MetaPixel />
    </AppDocument>
  );
}
