import { ArrowRight } from "lucide-react";
import { TrackedHomepageLink } from "@/components/analytics/TrackedHomepageLink";
import { contentPath } from "@/lib/content-url";
import { listingPriceText } from "@/lib/format";
import { listingPlace } from "@/lib/listingPlace";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";

export type HomeListing = { post: ContentCardFieldsFragment; thumb: string };

/**
 * Real listings on the homepage: the fastest way to show a first-time visitor
 * what Shopi is, and the link path crawlers were missing (audit F17: the
 * homepage linked to no listing). A swipe row on phones, a grid from md, and a
 * last tile that hands over to For You.
 *
 * A server component with plain <img> tags: the homepage keeps Apollo and the
 * app's interactive card out of its first load (the nav and support chat load
 * Apollo only when used), and image optimisation is off site-wide anyway
 * (next.config.ts), so next/image would add nothing here.
 */
export function HomeListings({
  lang,
  listings,
  t,
}: {
  lang: string;
  listings: HomeListing[];
  t: { title: string; all: string; more: string; priceOnRequest: string };
}) {
  if (listings.length === 0) return null;

  return (
    <section
      id="live-listings"
      aria-labelledby="live-listings-title"
      className="px-4 py-8 md:px-8 md:py-12"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="live-listings-title"
            className="font-display text-[1.375rem] font-semibold leading-tight text-landing-ink md:text-[2rem]"
          >
            {t.title}
          </h2>
          <TrackedHomepageLink
            href={`/${lang}/for-you`}
            buttonId="see_all_listings"
            placement="listings_row"
            className="shrink-0 pb-0.5 text-sm font-semibold text-primary no-underline"
          >
            {t.all}
          </TrackedHomepageLink>
        </div>

        {/* The row bleeds to the screen edges (-mx-4) and pads back in (px-4).
            scroll-px-4 matters: snapping aligns cards to the scroll port, not
            the padding, so without it the browser scrolls the first card
            flush against the screen edge, out of line with the heading. */}
        <ul className="-mx-4 mt-4 flex list-none snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:mt-6 md:grid md:scroll-px-0 md:grid-cols-5 md:gap-5 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          {listings.map(({ post, thumb }) => {
            const price = listingPriceText(post.price);
            const place = listingPlace(post.location);
            return (
              <li key={post.id} className="w-[42%] shrink-0 snap-start sm:w-[28%] md:w-auto">
                <TrackedHomepageLink
                  href={contentPath(lang, post)}
                  buttonId="listing_card"
                  placement="listings_row"
                  className="block text-landing-ink no-underline"
                >
                  <span className="block aspect-3/4 overflow-hidden rounded-xl bg-landing-tint">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb}
                      alt={post.title ?? ""}
                      width={480}
                      height={640}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="mt-2 block text-[0.9375rem] font-bold">
                    {price ?? t.priceOnRequest}
                  </span>
                  <span className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[0.8125rem] leading-[1.3] text-landing-body">
                    {post.title}
                  </span>
                  {place ? (
                    <span className="mt-0.5 block truncate text-xs text-landing-muted">{place}</span>
                  ) : null}
                </TrackedHomepageLink>
              </li>
            );
          })}
          {/* Phones: the row ends in the app, not in nothing. */}
          <li className="w-[42%] shrink-0 snap-start sm:w-[28%] md:hidden">
            <TrackedHomepageLink
              href={`/${lang}/for-you`}
              buttonId="listings_more"
              placement="listings_row"
              className="flex aspect-3/4 flex-col items-center justify-center gap-3 rounded-xl bg-primary px-4 text-center text-white no-underline active:opacity-80"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-white/20">
                <ArrowRight className="size-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold leading-snug">{t.more}</span>
            </TrackedHomepageLink>
          </li>
        </ul>
      </div>
    </section>
  );
}
