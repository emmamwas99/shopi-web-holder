import {
  ArrowRight,
  ArrowUpRight,
  Car,
  Flower2,
  Laptop,
  LayoutGrid,
  Refrigerator,
  Shirt,
  Smartphone,
  Sofa,
  type LucideIcon,
} from "lucide-react";
import { TrackedHomepageLink } from "@/components/analytics/TrackedHomepageLink";
import {
  fetchBrowseCards,
  fetchTopCategoryIds,
} from "@/features/discover/queries/browse.server";
import { stableListingImage, type ListingImage } from "@/lib/listingImage";
import { isPlaceholderListingTitle } from "@/lib/seo/where-to-sell";

export type HomeCategoryKey =
  | "phones"
  | "electronics"
  | "fashion"
  | "furniture"
  | "cars"
  | "beauty"
  | "appliances"
  | "more";

type Tile = {
  key: HomeCategoryKey;
  icon: LucideIcon;
  href: string;
  /** Tinted background for the icon fallback; reads on light and dark. */
  bg: string;
  /** The icon's colour. */
  ink: string;
  /**
   * Where the cover photo comes from: listings in these top-level categories
   * whose title says what the tile says. Category alone isn't enough — sellers
   * misfile (a BMW under Fashion, a licence under Beauty), and a wrong photo on
   * a category tile reads as a broken site.
   */
  cover?: { categories: string[]; title: RegExp };
};

/**
 * The homepage's way into the marketplace. Each tile wears a real photo from a
 * live listing in that category, so the section shows what's actually for
 * sale rather than eight generic icons. Phones: a compact four-up grid, like
 * an app's category row. md: four photo cards to a row; lg: all eight in one
 * row, so the section stays short.
 *
 * Every tile opens that category in Explore, the same listings the photo came
 * from: the server-rendered /explore/{category}/{subcategory} page where the
 * tile is one subcategory (phones, cars, appliances), otherwise Explore
 * filtered with ?category=. Property and farm produce are left off on purpose:
 * a buyer tapping them found next to nothing (October 2026 audit,
 * docs/seo-audit/keyword-map.md).
 *
 * A server component rendered into the ISR page: the cover lookups run once
 * per regeneration (daily), add no JavaScript, and are best-effort — a tile
 * without a matching photo falls back to its tinted icon.
 */
const TILES: Tile[] = [
  {
    key: "phones",
    icon: Smartphone,
    href: "/explore/electronics-technology/phones",
    bg: "bg-sky-500/12",
    ink: "text-sky-600 dark:text-sky-400",
    cover: {
      categories: ["electronics-technology"],
      title:
        /\b(i ?phone|samsung|galaxy|tecno|infinix|itel|oppo|redmi|xiaomi|pixel|nokia|huawei|vivo|realme|oneplus|smartphone)\b/i,
    },
  },
  {
    key: "cars",
    icon: Car,
    href: "/explore/automotive/cars",
    bg: "bg-slate-500/12",
    ink: "text-slate-600 dark:text-slate-300",
    cover: {
      categories: ["automotive"],
      title:
        /\b(toyota|nissan|mazda|subaru|honda|mitsubishi|isuzu|bmw|mercedes|benz|audi|volkswagen|vw|land ?rover|range ?rover|lexus|suzuki|prado|probox|vitz|fielder|premio|harrier|axio|noah|voxy)\b/i,
    },
  },
  {
    key: "furniture",
    icon: Sofa,
    href: "/explore?category=home-living",
    bg: "bg-amber-500/14",
    ink: "text-amber-700 dark:text-amber-400",
    cover: {
      categories: ["home-living"],
      title:
        /\b(sofas?|couch|seater|chairs?|tables?|beds?|wardrobes?|desks?|cabinets?|shelf|shelves|dresser|ottoman|stools?|furniture)\b/i,
    },
  },
  {
    key: "fashion",
    icon: Shirt,
    href: "/explore?category=fashion-apparel",
    bg: "bg-pink-500/12",
    ink: "text-pink-600 dark:text-pink-400",
    cover: {
      categories: ["fashion-apparel"],
      title:
        /\b(dress(es)?|shirts?|t-shirts?|jeans|trousers?|sweatpants|pants|jackets?|vest|hoodies?|sweaters?|shoes|sneakers|boots|heels|sandals|handbags?|bags?|jewel(le)?ry|necklace|earrings|skirts?|suits?|blouses?|coats?)\b/i,
    },
  },
  {
    key: "electronics",
    icon: Laptop,
    href: "/explore?category=electronics-technology",
    bg: "bg-violet-500/12",
    ink: "text-violet-600 dark:text-violet-400",
    cover: {
      categories: ["electronics-technology"],
      title:
        /\b(laptops?|macbook|tv|television|cameras?|lens|speakers?|headphones?|earbuds|airpods|monitor|tablet|ipad|playstation|ps[45]|xbox|console|printer|soundbar|smart ?watch)\b/i,
    },
  },
  {
    key: "beauty",
    icon: Flower2,
    href: "/explore?category=health-beauty",
    bg: "bg-rose-500/12",
    ink: "text-rose-600 dark:text-rose-400",
    cover: {
      categories: ["health-beauty"],
      title:
        /\b(perfumes?|parfum|toilette|fragrances?|mist|lotion|cream|serum|lipstick|makeup|foundation|wigs?|skincare|cologne)\b/i,
    },
  },
  {
    key: "appliances",
    icon: Refrigerator,
    href: "/explore/electronics-technology/home-appliances",
    bg: "bg-teal-500/12",
    ink: "text-teal-700 dark:text-teal-400",
    cover: {
      categories: ["electronics-technology", "home-living"],
      title:
        /\b(fridge|refrigerator|freezer|washing machine|microwave|cooker|oven|blender|kettle|air fryer|dispenser|vacuum)\b/i,
    },
  },
  {
    key: "more",
    icon: LayoutGrid,
    href: "/explore",
    bg: "bg-primary",
    ink: "text-white",
  },
];

/** Test and QA posts that can sit in the live feed. */
const JUNK_TITLE = /\b(e2e|test(ing)?|qa)\b/i;

/** Listings read per category: enough to find a match for every tile in it. */
const COVER_POOL = 24;

/**
 * One distinct photo per tile, with the same bar as the homepage listings row
 * (a stable, non-expiring thumbnail and a real title) plus the tile's title
 * match. Each category is fetched once however many tiles draw on it, and
 * tiles are filled in order so phones claim theirs before electronics.
 */
async function fetchCovers(): Promise<Partial<Record<HomeCategoryKey, ListingImage>>> {
  const ids = await fetchTopCategoryIds();
  const slugs = [...new Set(TILES.flatMap((tile) => tile.cover?.categories ?? []))];
  const pools = new Map(
    await Promise.all(
      slugs.map(async (slug) => {
        const categoryId = ids[slug];
        const posts = categoryId ? await fetchBrowseCards({ categoryId }, COVER_POOL) : [];
        return [slug, posts] as const;
      }),
    ),
  );

  const used = new Set<string>();
  const covers: Partial<Record<HomeCategoryKey, ListingImage>> = {};
  for (const { key, cover } of TILES) {
    if (!cover) continue;
    const candidates = cover.categories.flatMap((slug) => pools.get(slug) ?? []);
    for (const post of candidates) {
      const title = post.title?.trim() ?? "";
      if (
        used.has(post.id) ||
        !cover.title.test(title) ||
        JUNK_TITLE.test(title) ||
        isPlaceholderListingTitle(title) ||
        title.split(/\s+/).length < 2
      ) {
        continue;
      }
      const image = stableListingImage(post);
      if (!image) continue;
      used.add(post.id);
      covers[key] = image;
      break;
    }
  }
  return covers;
}

/**
 * A tile's width at each breakpoint, for the srcset: four columns on phones
 * (gap-x-2.5, px-4) and from md (gap-4, px-8), eight from lg (gap-3), and the
 * max-w-7xl container stops growing at 1344px.
 */
const TILE_SIZES =
  "(min-width: 1344px) 150px, (min-width: 1024px) calc((100vw - 148px) / 8), (min-width: 768px) calc((100vw - 112px) / 4), calc((100vw - 62px) / 4)";

/** The search landing pages behind the tiles' categories. */
export type HomeSearchLinkKey = "phones" | "cars" | "furniture" | "electronics" | "beauty";

/**
 * The tiles open Explore; these plain links keep the homepage pointing at the
 * indexable landing pages that rank for those searches, with their search
 * words as anchor text (audit finding F17: the homepage linked to no category
 * page at all, docs/seo-audit/keyword-map.md).
 */
const SEARCH_LINKS: { key: HomeSearchLinkKey; href: string }[] = [
  { key: "phones", href: "/for-sale/phones" },
  { key: "cars", href: "/for-sale/cars" },
  { key: "furniture", href: "/for-sale/furniture" },
  { key: "electronics", href: "/phones-electronics-kenya" },
  { key: "beauty", href: "/beauty-cosmetics-kenya" },
];

export async function HomeCategories({
  lang,
  title,
  body,
  labels,
  searchLinks,
}: {
  lang: string;
  title: string;
  body: string;
  labels: Record<HomeCategoryKey, string>;
  searchLinks: { title: string; labels: Record<HomeSearchLinkKey, string> };
}) {
  const covers = await fetchCovers();

  return (
    <section
      id="categories"
      aria-labelledby="categories-title"
      className="px-4 pt-7 pb-4 md:px-8 md:pt-6 md:pb-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              id="categories-title"
              className="font-display text-[1.375rem] font-medium leading-tight text-landing-ink md:text-[2rem] md:font-semibold"
            >
              {title}
            </h2>
            <p className="mt-1 text-[0.875rem] leading-snug text-landing-muted md:mt-2 md:text-base">
              {body}
            </p>
          </div>
          {/* Desktop only: phones have the "See all" tile in reach already. */}
          <TrackedHomepageLink
            href={`/${lang}/explore`}
            buttonId="category_more_header"
            placement="categories"
            className="hidden shrink-0 items-center gap-1.5 pb-1 text-sm font-semibold text-primary no-underline hover:gap-2.5 md:inline-flex md:transition-[gap]! md:duration-200!"
          >
            {labels.more}
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </TrackedHomepageLink>
        </div>

        <ul className="mt-4 grid list-none grid-cols-4 gap-x-2.5 gap-y-4 p-0 md:mt-5 md:gap-4 lg:grid-cols-8 lg:gap-3">
          {TILES.map(({ key, icon: Icon, href, bg, ink }) => {
            const cover = covers[key];
            const isMore = key === "more";
            return (
              <li key={key}>
                <TrackedHomepageLink
                  href={`/${lang}${href}`}
                  buttonId={`category_${key}`}
                  placement="categories"
                  className="group block text-landing-ink no-underline active:opacity-80"
                >
                  <span
                    className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl ring-1 ring-black/5 md:aspect-3/2 md:rounded-2xl lg:aspect-4/5 dark:ring-white/10 ${cover ? "bg-landing-tint" : `${bg} ${ink}`}`}
                  >
                    {cover ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cover.src}
                          srcSet={cover.srcSet}
                          sizes={cover.srcSet ? TILE_SIZES : undefined}
                          alt=""
                          width={480}
                          height={480}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 size-full object-cover transition-transform! duration-500! ease-out! group-hover:scale-[1.06]"
                        />
                        {/* Phones: a small icon badge says what the photo is. */}
                        <span
                          aria-hidden
                          className={`absolute bottom-1.5 left-1.5 grid size-6 place-items-center rounded-full bg-landing-card shadow-sm md:hidden ${ink}`}
                        >
                          <Icon className="size-3.5" strokeWidth={2.2} />
                        </span>
                        {/* md+: scrim for the overlaid label. */}
                        <span
                          aria-hidden
                          className="absolute inset-0 hidden bg-linear-to-t from-black/80 via-black/20 to-transparent md:block"
                        />
                      </>
                    ) : (
                      <>
                        <Icon
                          aria-hidden
                          className="size-7 transition-transform! duration-300! group-hover:scale-110 md:absolute md:right-4 md:top-4 md:size-10 md:opacity-90 lg:size-8"
                          strokeWidth={isMore ? 2 : 1.7}
                        />
                        {/* md+: a soft disc so icon cards aren't flat next to photos. */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -right-8 -top-8 hidden size-32 rounded-full bg-current opacity-[0.07] md:block"
                        />
                      </>
                    )}

                    {/* md+: label and arrow on the card. */}
                    <span
                      className={`absolute inset-x-0 bottom-0 hidden items-end justify-between gap-2 p-3.5 md:flex lg:p-3 ${cover || isMore ? "text-white" : "text-landing-ink"}`}
                    >
                      <span className="font-display text-base font-semibold leading-tight lg:text-[0.9375rem]">
                        {labels[key]}
                      </span>
                      <span
                        aria-hidden
                        className={`grid size-8 shrink-0 place-items-center lg:hidden rounded-full transition-transform! duration-300! group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${cover || isMore ? "bg-white/95 text-landing-ink dark:text-[#172226]" : "bg-landing-card text-landing-ink ring-1 ring-landing-line"}`}
                      >
                        <ArrowUpRight size={16} strokeWidth={2.4} />
                      </span>
                    </span>
                  </span>

                  {/* Phones: label under the tile, like an app icon. */}
                  <span className="mt-1.5 line-clamp-2 block text-center text-[0.8125rem] font-semibold leading-tight md:hidden">
                    {labels[key]}
                  </span>
                </TrackedHomepageLink>
              </li>
            );
          })}
        </ul>

        <nav
          aria-label={searchLinks.title}
          className="mt-5 flex flex-wrap items-baseline gap-x-1 gap-y-1.5 text-[0.8125rem] leading-snug md:mt-6 md:text-sm"
        >
          <span className="mr-1 font-semibold text-landing-muted">{searchLinks.title}:</span>
          {SEARCH_LINKS.map(({ key, href }, i) => (
            <span key={key} className="inline-flex items-baseline">
              <TrackedHomepageLink
                href={`/${lang}${href}`}
                buttonId={`category_search_${key}`}
                placement="categories"
                className="text-landing-body underline decoration-landing-line-strong underline-offset-3 hover:text-primary hover:decoration-primary"
              >
                {searchLinks.labels[key]}
              </TrackedHomepageLink>
              {i < SEARCH_LINKS.length - 1 ? (
                <span aria-hidden className="ml-1 text-landing-line-strong">
                  ·
                </span>
              ) : null}
            </span>
          ))}
        </nav>
      </div>
    </section>
  );
}
