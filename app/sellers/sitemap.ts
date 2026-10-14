import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { localeAlternates } from "@/lib/metadata";

const PAGE_SIZE = 48;
const MAX_SELLERS = 50_000;
const FETCH_BUDGET_MS = 20_000;

type PublicSeller = { username?: string | null; lastListedAt?: string | null };

/**
 * A dedicated sitemap for public seller shops. Keeping these URLs in their own
 * file lets the main Shopi sitemap retain its existing URL set and size.
 */
export default async function sellerSitemap(): Promise<MetadataRoute.Sitemap> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];

  const sellers = new Map<string, Date>();
  const deadline = Date.now() + FETCH_BUDGET_MS;
  let after: string | null = null;

  try {
    while (sellers.size < MAX_SELLERS && Date.now() < deadline) {
      const res = await fetch(`${api}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query SellerShopSitemap($input: StoreDirectoryInput) {
              stores(input: $input) {
                hasMore
                nextCursor
                stores { username lastListedAt }
              }
            }
          `,
          variables: { input: { limit: PAGE_SIZE, sort: "RECENT", after } },
        }),
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;

      const json = (await res.json()) as {
        data?: {
          stores?: {
            hasMore?: boolean;
            nextCursor?: string | null;
            stores?: PublicSeller[];
          };
        };
      };
      const page = json.data?.stores;
      if (!page?.stores?.length) break;

      for (const seller of page.stores) {
        const username = seller.username?.trim().toLowerCase();
        if (!username || !/^[a-z0-9._-]{1,40}$/.test(username)) continue;
        const modified = seller.lastListedAt ? new Date(seller.lastListedAt) : new Date();
        sellers.set(username, Number.isNaN(modified.getTime()) ? new Date() : modified);
      }

      if (!page.hasMore || !page.nextCursor) break;
      after = page.nextCursor;
    }
  } catch {
    // Return the profiles collected so far; the next sitemap refresh retries.
  }

  return [...sellers].map(([username, lastModified]) => {
    const path = `/@${username}`;
    return {
      url: `${siteConfig.url}/en${path}`,
      lastModified,
      alternates: localeAlternates(path),
    };
  });
}
