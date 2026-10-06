import "server-only";

import { siteConfig } from "@/config/site";
import { contentPath } from "@/lib/content-url";

export type MarketplaceCatalogItem = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  category: string | null;
  price: { amount: number; currency: string; negotiable: boolean } | null;
  location: string | null;
  seller: {
    name: string;
    username: string | null;
    profileUrl: string | null;
    verified: boolean;
  } | null;
  specifications: Record<string, string>;
  image: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type MarketplaceCatalog = {
  name: string;
  description: string;
  canonicalUrl: string;
  generatedAt: string;
  itemCount: number;
  usageNotes: string[];
  items: MarketplaceCatalogItem[];
};

type ApiListing = {
  id: string;
  slug?: string | null;
  title?: string | null;
  caption?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  price?: { amount: number; currency: string; negotiable: boolean } | null;
  specs?: { key?: string | null; value?: string | null }[] | null;
  category?: { name?: string | null } | null;
  aiClassification?: {
    level1?: string | null;
    level2?: string | null;
    level3?: string | null;
  } | null;
  location?: {
    placeName?: string | null;
    subregion?: string | null;
    county?: string | null;
    country?: string | null;
  } | null;
  creator?: {
    username?: string | null;
    isVerified?: boolean | null;
    profile?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
  media?:
    | {
        sortOrder?: number | null;
        imageUrl?: string | null;
        thumbnailUrl?: string | null;
        muxMeta?: { thumbnailUrl?: string | null } | null;
        r2Variants?: { url?: string | null; variant?: string | null }[] | null;
      }[]
    | null;
};

const CATALOG_QUERY = `
  query PublicMarketplaceCatalog($limit: Int!) {
    publicMarketplaceCatalog(limit: $limit) {
      id slug title caption createdAt updatedAt
      price { amount currency negotiable }
      specs { key value }
      category { name }
      aiClassification { level1 level2 level3 }
      location { placeName subregion county country }
      creator {
        username
        isVerified
        profile { firstName lastName }
      }
      media {
        sortOrder imageUrl thumbnailUrl
        muxMeta { thumbnailUrl }
        r2Variants { url variant }
      }
    }
  }
`;

function itemImage(item: ApiListing): string | null {
  const media = [...(item.media ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  )[0];
  return (
    media?.r2Variants?.find((variant) => variant.variant === "large")?.url ??
    media?.r2Variants?.[0]?.url ??
    media?.imageUrl ??
    media?.muxMeta?.thumbnailUrl ??
    media?.thumbnailUrl ??
    null
  );
}

function catalogItem(item: ApiListing): MarketplaceCatalogItem | null {
  if (!item.id || !item.title?.trim()) return null;
  const username = item.creator?.username?.trim() || null;
  const sellerName = [
    item.creator?.profile?.firstName,
    item.creator?.profile?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const category =
    [
      item.aiClassification?.level1,
      item.aiClassification?.level2,
      item.aiClassification?.level3,
    ]
      .filter(Boolean)
      .join(" / ") ||
    item.category?.name?.trim() ||
    null;

  return {
    id: item.id,
    url: `${siteConfig.url}${contentPath("en", item)}`,
    title: item.title.trim(),
    description: item.caption?.trim() || null,
    category,
    price: item.price ?? null,
    location:
      [
        item.location?.placeName,
        item.location?.subregion,
        item.location?.county,
        item.location?.country,
      ]
        .filter(Boolean)
        .join(", ") || null,
    seller:
      sellerName || username
        ? {
            name: sellerName || username || "Shopi seller",
            username,
            profileUrl: username
              ? `${siteConfig.url}/en/@${encodeURIComponent(username)}`
              : null,
            verified: item.creator?.isVerified === true,
          }
        : null,
    specifications: Object.fromEntries(
      (item.specs ?? [])
        .filter((spec) => spec.key?.trim() && spec.value?.trim())
        .slice(0, 40)
        .map((spec) => [spec.key!.trim(), spec.value!.trim()]),
    ),
    image: itemImage(item),
    publishedAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
  };
}

export async function fetchMarketplaceCatalog(): Promise<MarketplaceCatalog> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  let items: MarketplaceCatalogItem[] = [];

  if (apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: CATALOG_QUERY,
          variables: { limit: 50 },
        }),
        next: { revalidate: 900 },
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          data?: { publicMarketplaceCatalog?: ApiListing[] };
        };
        items = (payload.data?.publicMarketplaceCatalog ?? [])
          .map(catalogItem)
          .filter((item): item is MarketplaceCatalogItem => Boolean(item));
      }
    } catch {
      // Catalog routes remain available with an empty, explicit snapshot when
      // the backend is temporarily unreachable.
    }
  }

  return {
    name: "Shopi current public marketplace catalog",
    description:
      "Recently created or edited public listings on Shopi, Kenya's free social marketplace.",
    canonicalUrl: `${siteConfig.url}/catalog.json`,
    generatedAt: new Date().toISOString(),
    itemCount: items.length,
    usageNotes: [
      "Confirm availability, condition and final price with the seller because listings can change.",
      "Shopi does not process payments, hold money, provide escrow or arrange delivery.",
      "The buyer and seller agree payment, inspection, pickup or delivery directly.",
    ],
    items,
  };
}
