import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { publicPageMetadata } from "@/lib/metadata";
import { StoresPage } from "@/features/stores/components/StoresPage";
import type { StoreSort } from "@/features/stores/queries/stores";
import {
  fetchStoreCounties,
  fetchStores,
} from "@/features/stores/queries/stores.server";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    q?: string;
    county?: string;
    sort?: string;
    verified?: string;
  }>;
};

const VALID_SORTS: StoreSort[] = ["LISTINGS", "RECENT", "POPULAR"];
const PAGE_SIZE = 24;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: siteConfig.routes.stores.path,
    title: siteConfig.routes.stores.title,
    description: siteConfig.routes.stores.description,
  });
}

/**
 * The Stores directory.
 *
 * The first page is fetched here rather than on the client so the grid is in
 * the HTML: this is a crawl surface — every card is an internal link to a
 * seller's storefront, which is exactly the kind of page that earns those
 * profiles their indexing.
 */
export default async function StoresRoute({ params, searchParams }: Props) {
  const { lang } = await params;
  const { q, county, sort, verified } = await searchParams;

  const safeSort: StoreSort = VALID_SORTS.includes(sort as StoreSort)
    ? (sort as StoreSort)
    : "LISTINGS";
  const search = q?.trim() || undefined;
  const safeCounty = county?.trim() || undefined;
  const verifiedOnly = verified === "1" || verified === "true";

  const [initialPage, counties] = await Promise.all([
    fetchStores({
      search,
      county: safeCounty,
      sort: safeSort,
      verifiedOnly: verifiedOnly || undefined,
      limit: PAGE_SIZE,
    }),
    fetchStoreCounties(),
  ]);

  return (
    <StoresPage
      lang={lang}
      counties={counties}
      initialPage={initialPage}
      initialFilters={{
        search,
        county: safeCounty,
        sort: safeSort,
        verifiedOnly,
      }}
    />
  );
}
