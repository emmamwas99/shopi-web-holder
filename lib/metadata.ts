import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { isValidLocale, locales, type Locale } from "@/i18n/config";

/**
 * Locale-agnostic paths ("" is the homepage) whose /sw copy is actually
 * written in Kiswahili. Add a path here only once its page is translated.
 *
 * Every other page renders the same English text under /sw. Declaring that
 * copy a Kiswahili alternate tells engines a translation exists when it
 * doesn't, and leaves two indexable copies of every listing, profile and
 * landing page competing as duplicates.
 */
const TRANSLATED_PATHS: ReadonlySet<string> = new Set(["", "/faq"]);

export function isTranslatedPath(path: string): boolean {
  return TRANSLATED_PATHS.has(path);
}

function pathLocales(path: string): readonly Locale[] {
  return isTranslatedPath(path) ? locales : ["en"];
}

/**
 * The canonical URL of a locale-agnostic path viewed under `lang`. A
 * translated page is its own canonical in each locale; an English-only page
 * canonicalises to /en from /sw too (the same rule the blog follows).
 */
export function canonicalUrl(lang: string, path: string): string {
  const locale =
    isValidLocale(lang) && pathLocales(path).includes(lang) ? lang : "en";
  return `${siteConfig.url}/${locale}${path}`;
}

/**
 * hreflang alternates for a locale-agnostic path (e.g. "/about", "/blog/x").
 *
 * Translated pages list both locales so Kiswahili speakers get the Kiswahili
 * page; English-only pages list just /en. x-default points at /en as the
 * fallback for unmatched locales. app/sitemap.ts emits the same set — the two
 * have to agree or engines drop the annotations as unconfirmed.
 */
export function localeAlternates(path: string) {
  return {
    languages: {
      ...Object.fromEntries(
        pathLocales(path).map((l) => [l, `${siteConfig.url}/${l}${path}`]),
      ),
      "x-default": `${siteConfig.url}/en${path}`,
    },
  };
}

/**
 * Metadata for private, personalized, or not-yet-built pages. Keeps them out
 * of the index (thin/duplicate pages dilute crawl budget and sitelink quality)
 * while still letting crawlers follow links through them.
 */
export function privatePageMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: true } };
}

/**
 * Consistent metadata for public, locale-prefixed informational pages.
 *
 * Every page shares the site-wide OG card by default. A page with its own
 * `opengraph-image` file passes `ownImage: true` so that file supplies the
 * og:image / twitter:image tags — listing an `images` array here as well would
 * override it, and a hand-built URL can miss the fingerprint Next adds to
 * image routes.
 */
export function publicPageMetadata(input: {
  lang: string;
  path: `/${string}`;
  title: string;
  description: string;
  ownImage?: boolean;
}): Metadata {
  const canonical = canonicalUrl(input.lang, input.path);
  const shareTitle = `${input.title} | ${siteConfig.name}`;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical, ...localeAlternates(input.path) },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: siteConfig.name,
      locale:
        input.lang === "sw" && isTranslatedPath(input.path) ? "sw_KE" : "en_KE",
      title: shareTitle,
      description: input.description,
      ...(input.ownImage
        ? {}
        : {
            images: [
              {
                url: siteConfig.ogImage,
                width: 1200,
                height: 630,
                alt: input.title,
              },
            ],
          }),
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title: shareTitle,
      description: input.description,
      ...(input.ownImage ? {} : { images: [siteConfig.ogImage] }),
    },
  };
}
