import {
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

export type HomeCategoryKey =
  | "phones"
  | "electronics"
  | "fashion"
  | "furniture"
  | "cars"
  | "beauty"
  | "appliances"
  | "more";

/**
 * The homepage's way into the marketplace: an app-style category row, four a
 * row on phones and one row from md. A server component, so it adds no
 * JavaScript to the page.
 *
 * Every tile opens a page with stock in it (inventory in the October 2026
 * audit, docs/seo-audit/keyword-map.md). Property and farm produce are left
 * off on purpose: a buyer tapping them found next to nothing. Tiles point at
 * the indexable landing pages where one exists, so the homepage's weight goes
 * to the pages that rank for those searches (audit finding F17: the homepage
 * linked to no category at all). Fashion has no landing page yet, so it opens
 * Explore filtered to fashion.
 */
const TILES: { key: HomeCategoryKey; icon: LucideIcon; href: string }[] = [
  { key: "phones", icon: Smartphone, href: "/for-sale/phones" },
  { key: "electronics", icon: Laptop, href: "/phones-electronics-kenya" },
  { key: "fashion", icon: Shirt, href: "/explore?category=fashion-apparel" },
  { key: "furniture", icon: Sofa, href: "/for-sale/furniture" },
  { key: "cars", icon: Car, href: "/for-sale/cars" },
  { key: "beauty", icon: Flower2, href: "/beauty-cosmetics-kenya" },
  {
    key: "appliances",
    icon: Refrigerator,
    href: "/explore/electronics-technology/home-appliances",
  },
  { key: "more", icon: LayoutGrid, href: "/explore" },
];

export function HomeCategories({
  lang,
  title,
  labels,
}: {
  lang: string;
  title: string;
  labels: Record<HomeCategoryKey, string>;
}) {
  return (
    <section
      id="categories"
      aria-labelledby="categories-title"
      className="px-4 pt-6 pb-4 md:px-8 md:pt-4 md:pb-10"
    >
      <div className="mx-auto max-w-7xl">
        <h2
          id="categories-title"
          className="font-display text-[1.375rem] font-semibold leading-tight text-landing-ink md:text-[2rem]"
        >
          {title}
        </h2>
        <ul className="mt-5 grid list-none grid-cols-4 gap-x-2 gap-y-5 p-0 md:mt-7 md:grid-cols-8 md:gap-4">
          {TILES.map(({ key, icon: Icon, href }) => (
            <li key={key}>
              <TrackedHomepageLink
                href={`/${lang}${href}`}
                buttonId={`category_${key}`}
                placement="categories"
                className="group flex flex-col items-center gap-2 text-center no-underline active:opacity-70"
              >
                <span className="flex size-14 items-center justify-center rounded-2xl bg-landing-surface text-primary ring-1 ring-landing-line transition-transform group-hover:scale-105 md:size-16">
                  <Icon className="size-6" strokeWidth={1.9} aria-hidden />
                </span>
                <span className="text-[0.8125rem] font-semibold leading-tight text-landing-ink">
                  {labels[key]}
                </span>
              </TrackedHomepageLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
