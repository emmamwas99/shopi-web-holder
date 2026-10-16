import type { Metadata } from "next";
import { cache } from "react";
import { ContentDetail } from "@/features/feed/components/ContentDetail";
import { ListingRelated } from "@/features/feed/components/ListingRelated";
import { SINGLE_LISTING_CACHE, query } from "@/lib/apollo/ApolloClient";
import { ContentDetailDocument } from "@/features/feed/queries/contentDetail";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { CategoriesDocument } from "@/types/__generated__/graphql";
import { siteConfig } from "@/config/site";
import { notFound, permanentRedirect } from "next/navigation";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import {
  productSchema,
  productWebPageSchema,
  videoObjectSchema,
  breadcrumbSchema,
  jsonLd,
} from "@/lib/structured-data";
import { contentPath, contentSlugSegment, slugifyContentTitle } from "@/lib/content-url";
import { canonicalUrl, localeAlternates } from "@/lib/metadata";
import { profileHref } from "@/lib/profile-url";
import { listingPriceText } from "@/lib/format";
import {
  cleanPublicText,
  META_DESCRIPTION_MAX,
  truncateAtWord,
} from "@/lib/seo/public-text";
import {
  durationOf,
  hlsUrlOf,
  isPlayableVideo,
  posterOf,
} from "@/features/feed/lib/videoSource";

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

type CategoryEntry = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

type CategoryCrumb = Pick<CategoryEntry, "name" | "slug">;

// The full PDP query — the same document ContentDetail runs on the client, so
// one server fetch feeds the metadata, the JSON-LD *and* the first render of
// the page itself (passed down as `initialPost`). Fetching the narrower
// GetContent document here would leave the rendered listing waiting on a
// client round trip, which is what kept listings out of non-JS crawlers.
//
// Resolves to null only when the API says the listing doesn't exist (deleted,
// removed by moderation, or a bad link), which the page answers with a real
// 404 — a noindexed 200 is a soft 404 that engines keep recrawling.
//
// Any other failure (API down, rate-limited, a 5xx) throws, so the request
// fails with a 500 and the route's error boundary offers a retry. It used to
// fall through to a client render instead, but that render carried
// `noindex` and the title "Post": every crawl that landed during an API
// hiccup told engines to drop a live listing. A 5xx is the signal engines
// treat as temporary — they keep the indexed copy and come back later.
const getPost = cache(async (id: string): Promise<Post | null> => {
  let result;
  try {
    result = await query({
      query: ContentDetailDocument,
      variables: { id },
      // Hourly, not the daily default: a pre-approval NOT_FOUND must not
      // outlive the review by a day (see SINGLE_LISTING_CACHE).
      context: SINGLE_LISTING_CACHE,
    });
  } catch (error) {
    throw new Error(`Listing ${id} could not be loaded`, { cause: error });
  }
  const post =
    ((result.data as { content?: Post | null } | undefined)?.content as
      Post | undefined) ?? null;
  if (post) return post;
  const gone =
    CombinedGraphQLErrors.is(result.error) &&
    result.error.errors.some((e) => e.extensions?.code === "NOT_FOUND");
  if (gone) return null;
  throw new Error(`Listing ${id} could not be loaded`, { cause: result.error });
});

const getCategoryEntries = cache(async (): Promise<CategoryEntry[]> => {
  try {
    const result = await query({ query: CategoriesDocument });
    return (result.data?.categories ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
    }));
  } catch {
    return [];
  }
});

async function getCategoryTrail(
  categoryId: string | null | undefined,
  fallback?: { name?: string | null; slug?: string | null } | null,
  classification?: Post["aiClassification"],
): Promise<CategoryCrumb[]> {
  if (!categoryId) {
    return fallback?.name && fallback.slug
      ? [{ name: fallback.name, slug: fallback.slug }]
      : [];
  }

  const categories = await getCategoryEntries();
  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: CategoryEntry[] = [];
  let category = byId.get(categoryId);
  let remaining = 5;
  while (category && remaining > 0) {
    path.unshift(category);
    category = category.parentId ? byId.get(category.parentId) : undefined;
    remaining -= 1;
  }

  if (path.length > 0) {
    const trail = path.map(({ name, slug }) => ({ name, slug }));
    // Listings are filed under a top-level category; the subcategory lives
    // only in the classifier's level-2 label — the same label Explore's
    // subcategory pages filter on. Without it the trail stopped at the top
    // level and no listing linked to a subcategory page. Only when the
    // classifier agrees on the top level, so the link can't cross categories.
    const level2 = classification?.level2?.trim();
    if (
      trail.length === 1 &&
      level2 &&
      classification?.level1?.trim().toLowerCase() ===
        trail[0].name.toLowerCase()
    ) {
      trail.push({ name: level2, slug: slugifyContentTitle(level2) });
    }
    return trail;
  }
  return fallback?.name && fallback.slug
    ? [{ name: fallback.name, slug: fallback.slug }]
    : [];
}

function categoryHref(lang: string, trail: CategoryCrumb[], index: number): string {
  if (index === 0) {
    return `/${lang}/explore?category=${encodeURIComponent(trail[0].slug)}`;
  }
  return `/${lang}/explore/${trail[0].slug}/${slugifyContentTitle(trail[index].name)}`;
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

// No price → no price claim. See listingPriceText: 0 means "not stated".
function priceLabel(post: Post): string | null {
  return listingPriceText(post.price);
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
  if (!post) notFound();
  const path = `/content/${contentSlugSegment(post)}`;
  // Listings are seller-written and never translated, so /sw canonicalises to /en.
  const canonical = canonicalUrl(lang, path);

  const isIndexable = post.isLive !== false;
  const price = priceLabel(post);
  const loc = locationName(post);
  const titleParts = [post.title, price, loc].filter(Boolean);
  const title = titleParts.join(" · ");
  const shareTitle = `${title} | ${siteConfig.name}`;
  const description = buildDescription(post);
  const category = categoryLabel(post);
  const images = listingImages(post);
  const shareAlt = [post.title, price, loc].filter(Boolean).join(" · ");
  const fallbackImage = `${siteConfig.url}/og/listing/${encodeURIComponent(post.id)}`;
  // The original listing media is deliberately first. The local image route
  // is a resilient second choice: it converts that photo to a social-safe JPEG
  // and renders a branded ImageResponse only when the source cannot be used.
  const shareImages = [
    ...images.slice(0, 3).map((url) => ({ url, alt: shareAlt })),
    {
      url: fallbackImage,
      width: 1200,
      height: 630,
      alt: shareAlt,
      type: "image/jpeg",
    },
  ];

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
    authors: sellerName(post) ? [{ name: sellerName(post)! }] : undefined,
    creator: sellerName(post) ?? siteConfig.name,
    publisher: siteConfig.name,
    category: category ?? undefined,
    alternates: { canonical, ...localeAlternates(path) },
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
      images: shareImages,
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title: shareTitle,
      description,
      images: shareImages,
    },
  };
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function ContentDetailPage({ params }: Props) {
  const { lang, id } = await params;
  const post = await getPost(id);
  if (!post) notFound();
  const categoryTrail = await getCategoryTrail(
    post.categoryId,
    post.category,
    post.aiClassification,
  );
  const canonical = canonicalUrl(lang, `/content/${contentSlugSegment(post)}`);
  const canonicalPath = contentPath(lang, post);

  if (canonicalPath !== `/${lang}/content/${id}`) {
    permanentRedirect(canonicalPath);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            productSchema({
              id,
              url: canonical,
              title: post.title,
              description: buildDescription(post),
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
            ...(isPlayableVideo(post) && posterOf(post) && post.createdAt
              ? [
                  videoObjectSchema({
                    url: canonical,
                    name: post.title,
                    description: buildDescription(post),
                    thumbnailUrl: posterOf(post)!,
                    uploadDate: new Date(
                      post.createdAt as string,
                    ).toISOString(),
                    contentUrl: hlsUrlOf(post),
                    durationSeconds: durationOf(post),
                    creatorName: sellerName(post),
                    creatorUrl: post.creator?.username
                      ? `${siteConfig.url}${profileHref(lang, post.creator)}`
                      : null,
                    viewCount: post.stats?.views,
                  }),
                ]
              : []),
            // Home › Explore › category › subcategory › listing — the same
            // trail the page's own breadcrumb links, so the subcategory crumb
            // points at that subcategory's landing page.
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/${lang}` },
              { name: "Explore", url: `${siteConfig.url}/${lang}/explore` },
              ...categoryTrail.map((category, index) => ({
                name: category.name,
                url: `${siteConfig.url}${categoryHref(lang, categoryTrail, index)}`,
              })),
              { name: post.title, url: canonical },
            ]),
          ),
        }}
      />
      <ContentDetail
        id={id}
        lang={lang}
        desktopMode="page"
        initialPost={post}
        categoryTrail={categoryTrail}
        related={<ListingRelated lang={lang} post={post} />}
      />
    </>
  );
}
