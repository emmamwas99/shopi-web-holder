import type { Metadata } from "next";
import { ContentDetail } from "@/features/feed/components/ContentDetail";
import { query } from "@/lib/apollo/ApolloClient";
import { ContentDetailDocument } from "@/features/feed/queries/contentDetail";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { siteConfig } from "@/config/site";
import { permanentRedirect } from "next/navigation";
import {
  productSchema,
  productWebPageSchema,
  breadcrumbSchema,
  jsonLd,
} from "@/lib/structured-data";
import { contentPath } from "@/lib/content-url";
import { localeAlternates } from "@/lib/metadata";
import { profileHref } from "@/lib/profile-url";
import {
  cleanPublicText,
  META_DESCRIPTION_MAX,
  truncateAtWord,
} from "@/lib/seo/public-text";

type Props = { params: Promise<{ lang: string; id: string }> };

// Listings change (price edits, sells out) — revalidate hourly so shared links
// and crawled metadata stay reasonably fresh without re-rendering every hit.
export const revalidate = 3600;

// ── Server-side fetch + SEO field derivation ────────────────────────────────

type Post = ContentCardFieldsFragment & {
  updatedAt?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  specs?: { key: string; value: string }[];
  aiClassification?: {
    categoryId?: string | null;
    confidence?: number | null;
    level1?: string | null;
    level2?: string | null;
    level3?: string | null;
    rawLabel?: string | null;
  } | null;
};

// The full PDP query — the same document ContentDetail runs on the client, so
// one server fetch feeds the metadata, the JSON-LD *and* the first render of
// the page itself (passed down as `initialPost`). Fetching the narrower
// GetContent document here would leave the rendered listing waiting on a
// client round trip, which is what kept listings out of non-JS crawlers.
async function getPost(id: string): Promise<Post | null> {
  try {
    const { data } = await query({
      query: ContentDetailDocument,
      variables: { id },
    });
    return (
      ((data as { content?: Post | null } | undefined)?.content as
        Post | undefined) ?? null
    );
  } catch {
    return null;
  }
}

function sellerName(post: Post): string | null {
  const p = post.creator?.profile;
  const full = [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();
  return full || post.creator?.username || null;
}

function locationName(post: Post): string | null {
  const loc = post.location;
  return (
    [loc?.placeName, loc?.county].filter(Boolean).join(", ").trim() || null
  );
}

function listingImages(post: Post): string[] {
  return [...(post.media ?? [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .flatMap((media) => [
      media.r2Variants?.find((variant) => variant.variant === "large")?.url,
      media.r2Variants?.[0]?.url,
      media.imageUrl,
      media.muxMeta?.thumbnailUrl,
      media.thumbnailUrl,
    ])
    .filter((image): image is string => Boolean(image?.trim()))
    .filter((image, index, images) => images.indexOf(image) === index)
    .slice(0, 10);
}

function priceLabel(post: Post): string | null {
  const price = post.price;
  if (!price) return null;
  if (price.amount === 0) return "Free";
  return `${price.currency} ${price.amount.toLocaleString()}`;
}

function categoryLabel(post: Post): string | null {
  return (
    post.category?.name ||
    post.aiClassification?.level3 ||
    post.aiClassification?.level2 ||
    post.aiClassification?.level1 ||
    post.hashtags?.[0] ||
    null
  );
}

/**
 * A concise, human + engine-friendly description for the listing: price and
 * place first (what a buyer scans a results page for), then the seller's
 * caption cleaned of emoji bullets, line breaks and contact numbers, cut at a
 * word inside the length engines actually show.
 */
function buildDescription(post: Post): string {
  const bits: string[] = [];
  const price = priceLabel(post);
  if (price) bits.push(price);
  const loc = locationName(post);
  if (loc) bits.push(loc);
  const lead = bits.length ? `${bits.join(" · ")}. ` : "";
  const body =
    cleanPublicText(post.caption) ||
    `${post.title} — available now on ${siteConfig.name}, Kenya's social marketplace. Message the seller directly.`;
  const details = (post.specs ?? [])
    .filter((item) => item.key?.trim() && item.value?.trim())
    .slice(0, 5)
    .map((item) => `${item.key}: ${item.value}`)
    .join("; ");
  return truncateAtWord(
    `${lead}${body}${details ? ` Details: ${details}.` : ""}`,
    META_DESCRIPTION_MAX,
  );
}

// ── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const post = await getPost(id);
  const canonical = post
    ? `${siteConfig.url}${contentPath(lang, post)}`
    : `${siteConfig.url}/${lang}/content/${id}`;

  if (!post) {
    return {
      title: "Post",
      description: siteConfig.description,
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }

  const isIndexable = post.isLive !== false;
  const price = priceLabel(post);
  const loc = locationName(post);
  const titleParts = [post.title, price, loc].filter(Boolean);
  const title = titleParts.join(" · ");
  const shareTitle = `${title} | ${siteConfig.name}`;
  const description = buildDescription(post);
  const category = categoryLabel(post);

  return {
    title,
    description,
    keywords: [
      post.title,
      ...(post.hashtags ?? []),
      loc,
      category,
      sellerName(post),
      price ? `${post.title} ${price}` : null,
      loc ? `${post.title} in ${loc}` : null,
      category ? `${category} for sale Kenya` : null,
      "buy",
      "sell",
      "for sale",
      siteConfig.name,
      "Kenya marketplace",
      "local seller",
    ].filter(Boolean) as string[],
    // contentPath() is locale-prefixed; strip it back to the bare path so the
    // same listing is declared under both /en and /sw.
    alternates: {
      canonical,
      ...localeAlternates(contentPath(lang, post).replace(`/${lang}`, "")),
    },
    robots: {
      index: isIndexable,
      follow: true,
      googleBot: {
        index: isIndexable,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: siteConfig.name,
      title: shareTitle,
      description,
      locale: "en_KE",
      // og:image is intentionally omitted: the sibling opengraph-image route
      // supplies it. Next fingerprints image routes under dynamic segments
      // (/…/opengraph-image-<hash>), so a hand-built "/opengraph-image" URL
      // 404s — and an explicit `images` here would override the real one.
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title: shareTitle,
      description,
    },
  };
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function ContentDetailPage({ params }: Props) {
  const { lang, id } = await params;
  const post = await getPost(id);
  const canonical = post
    ? `${siteConfig.url}${contentPath(lang, post)}`
    : `${siteConfig.url}/${lang}/content/${id}`;
  const canonicalPath = post ? contentPath(lang, post) : null;

  if (canonicalPath && canonicalPath !== `/${lang}/content/${id}`) {
    permanentRedirect(canonicalPath);
  }

  return (
    <>
      {post && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              productSchema({
                id,
                url: canonical,
                title: post.title,
                description: post.caption,
                images: listingImages(post),
                price: post.price?.amount,
                currency: post.price?.currency,
                negotiable: post.price?.negotiable,
                sellerName: sellerName(post),
                // The canonical /@handle profile — /profile/* is a legacy
                // address that redirects, which weakens the seller link.
                sellerUrl: post.creator?.username
                  ? `${siteConfig.url}${profileHref(lang, post.creator)}`
                  : null,
                locationName: locationName(post),
                category: categoryLabel(post),
                specs: post.specs,
                createdAt: post.createdAt
                  ? new Date(post.createdAt as string).toISOString()
                  : null,
                updatedAt: post.updatedAt
                  ? new Date(post.updatedAt as string).toISOString()
                  : null,
              }),
              productWebPageSchema({
                url: canonical,
                name: post.title,
                description: buildDescription(post),
                createdAt: post.createdAt
                  ? new Date(post.createdAt as string).toISOString()
                  : null,
                updatedAt: post.updatedAt
                  ? new Date(post.updatedAt as string).toISOString()
                  : null,
              }),
              // Home › Seller › Listing: the seller is the listing's real
              // parent, and the crumb shows in results as a second link to
              // their storefront. Falls back to Explore without a handle.
              breadcrumbSchema([
                { name: "Home", url: `${siteConfig.url}/${lang}` },
                post.creator?.username
                  ? {
                      name: sellerName(post) ?? `@${post.creator.username}`,
                      url: `${siteConfig.url}${profileHref(lang, post.creator)}`,
                    }
                  : { name: "Browse", url: `${siteConfig.url}/${lang}/explore` },
                { name: post.title, url: canonical },
              ]),
            ),
          }}
        />
      )}
      <ContentDetail
        id={id}
        lang={lang}
        desktopMode="page"
        initialPost={post}
      />
    </>
  );
}
