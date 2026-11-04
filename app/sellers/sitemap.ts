import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { localeAlternates } from "@/lib/metadata";

const PAGE_SIZE = 48;
const MAX_SELLERS = 50_000;
const FETCH_BUDGET_MS = 20_000;

type PublicSeller = { username?: string | null; lastListedAt?: string | null };

/**
 * A dedicated sitemap for public seller shops: every seller with a visible
 * listing (the same set as the /stores directory and its `total`), dated by
 * their last listing. The main sitemap no longer lists profiles, so this is
 * the only place they're submitted and each URL has one lastmod.
 */
export default async function sellerSitemap(): Promise<MetadataRoute.Sitemap> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];

  // A missing or invalid lastListedAt leaves the entry undated: a generation
  // time stamped on it would claim a change that didn't happen.
  const sellers = new Map<string, Date | undefined>();
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
        next: { revalidate: 86400 },
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
        const modified = seller.lastListedAt ? new Date(seller.lastListedAt) : undefined;
        sellers.set(username, modified && !Number.isNaN(modified.getTime()) ? modified : undefined);
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
