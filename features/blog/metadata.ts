import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

/**
 * Metadata for the blog's pages.
 *
 * Blog content is written in English only, but every route also exists under
 * /sw. Declaring the /sw copy as a Kiswahili alternate would tell engines
 * there is a Kiswahili version when there isn't one, so both locales
 * canonicalise to /en and the only hreflang is English (plus x-default).
 *
 * Articles leave images out on purpose: their own opengraph-image route
 * supplies og:image, and listing one here would override it with a hand-built
 * URL that misses Next's fingerprint. The index and category pages have no
 * such route, and setting `openGraph` replaces the inherited one wholesale, so
 * they name the site-wide card explicitly.
 */
export function blogCanonical(path: string, canonicalUrl?: string) {
  return canonicalUrl ?? `${siteConfig.url}/en${path}`;
}

export function blogPageMetadata(input: {
  path: `/${string}`;
  title: string;
  description: string;
  canonicalUrl?: string;
  keywords?: string[];
  noindex?: boolean;
  article?: {
    publishedTime: string;
    modifiedTime: string;
    authors: string[];
    section: string;
    tags: string[];
  };
}): Metadata {
  const canonical = blogCanonical(input.path, input.canonicalUrl);
  const ownCanonical = canonical === `${siteConfig.url}/en${input.path}`;

  return {
    title: input.title,
    description: input.description,
    ...(input.keywords?.length ? { keywords: input.keywords } : {}),
    alternates: {
      canonical,
      // hreflang only makes sense for a page that is its own canonical.
      ...(ownCanonical
        ? { languages: { en: canonical, "x-default": canonical } }
        : {}),
    },
    ...(input.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: input.article ? "article" : "website",
      url: canonical,
      siteName: siteConfig.name,
      locale: "en_KE",
      title: input.title,
      description: input.description,
      ...(input.article ?? {
        images: [
          { url: siteConfig.ogImage, width: 1200, height: 630, alt: input.title },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title: input.title,
      description: input.description,
      ...(input.article ? {} : { images: [siteConfig.ogImage] }),
    },
  };
}
