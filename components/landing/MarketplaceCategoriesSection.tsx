import Link from "next/link";
import {
  Car,
  Flower2,
  House,
  Laptop,
  Shirt,
  Smartphone,
  Sofa,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/i18n/getDictionary";

type CategoryKey = Exclude<keyof Dictionary["landing"]["categories"], "heading">;

/**
 * Visual category grid: an icon and a word per card, nothing to read.
 *
 * Every `href` is a real route. The four category hubs (/phones-electronics-
 * kenya, /property-for-sale-kenya, /sell-car-kenya, /beauty-cosmetics-kenya)
 * stay linked from here — they are the homepage's popular-categories
 * structured data. The rest go to /for-sale/* search-intent pages; fashion
 * has no page yet, so it opens a search.
 */
const categories: {
  key: CategoryKey;
  icon: LucideIcon;
  href: string;
  tint: string;
}[] = [
  { key: "phones", icon: Smartphone, href: "/for-sale/phones", tint: "primary" },
  { key: "cars", icon: Car, href: "/sell-car-kenya", tint: "secondary" },
  { key: "fashion", icon: Shirt, href: "/search?q=fashion", tint: "accent" },
  { key: "furniture", icon: Sofa, href: "/for-sale/furniture", tint: "primary" },
  { key: "property", icon: House, href: "/property-for-sale-kenya", tint: "secondary" },
  { key: "beauty", icon: Flower2, href: "/beauty-cosmetics-kenya", tint: "accent" },
  { key: "farm", icon: Sprout, href: "/for-sale/farm-produce", tint: "primary" },
  { key: "electronics", icon: Laptop, href: "/phones-electronics-kenya", tint: "secondary" },
];

const TINTS: Record<string, string> = {
  primary: "bg-[rgb(var(--brand-primary)/0.12)] text-primary",
  secondary: "bg-highlight-soft text-highlight-strong",
  accent: "bg-[rgb(var(--brand-accent)/0.12)] text-accent",
};

export function MarketplaceCategoriesSection({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: string;
}) {
  const t = dict.landing.categories;

  return (
    <section
      id="marketplace-categories"
      className="border-y border-default bg-surface px-(--landing-page-x) py-8 md:py-20"
    >
      <div className="mx-auto max-w-(--landing-page-max)">
        <h2 className="mb-5 font-display text-[1.375rem] font-bold leading-tight tracking-normal text-foreground md:mb-8 md:text-[clamp(1.65rem,2.8vw,2.5rem)]">
          {t.heading}
        </h2>

        {/* Phones: an app-style shortcut grid — four icons a row, label
            underneath, no card chrome. From md up: cards. */}
        <ul className="grid list-none grid-cols-4 gap-x-2 gap-y-5 p-0 md:gap-4">
          {categories.map(({ key, icon: Icon, href, tint }) => (
            <li key={key}>
              <Link
                href={`/${lang}${href}`}
                className="group flex h-full flex-col items-center gap-2 text-center no-underline active:opacity-70 md:gap-3 md:rounded-[1.1rem] md:border md:border-border md:bg-elevated md:px-4 md:py-6 md:transition-colors md:hover:border-[rgb(var(--color-border-strong))]"
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${TINTS[tint]}`}
                >
                  <Icon className="size-6 md:size-6.5" strokeWidth={1.9} aria-hidden />
                </span>
                <span className="font-display text-[0.75rem] leading-tight font-medium text-foreground md:text-base md:font-semibold">
                  {t[key]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
