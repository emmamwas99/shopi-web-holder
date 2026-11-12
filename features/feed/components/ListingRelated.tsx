import Link from "next/link";
import Image from "next/image";
import { ImageIcon, MapPin } from "lucide-react";
import { ListingPhotoCard } from "@/components/listings/ListingPhotoCard";
import { listingPlaceLabel, listingPriceLabel } from "@/components/listings/ListingPhotoCard";
import { VerifiedIdBadge } from "@/components/verification/VerifiedIdBadge";
import { cultureCode } from "@/i18n/config";
import { contentPath } from "@/lib/content-url";
import { getCountyByName } from "@/lib/counties";
import { shouldUnoptimize } from "@/lib/imageUtils";
import { profileHref } from "@/lib/profile-url";
import {
  CAR_PRICE_FLOOR,
  CAR_SUBCATEGORY,
  getSearchIntentPage,
  searchIntentPageForTitle,
  searchIntentPath,
} from "@/lib/seo/search-intent-pages";
import { isCarListing } from "@/lib/seo/vehicle";
import { listingCover, type SocialProofListing } from "@/features/social-proof/queries/socialProofSellers";
import { fetchRelatedListings } from "../queries/relatedListings";

/**
 * Server-rendered links out of a listing page: the seller's other listings,
 * similar listings from other sellers, and the /for-sale and county pages the
 * listing belongs under.
 *
 * Rendered by the listing route and handed to ContentDetail as a node, which
 * places it inside whichever layout is showing (the mobile layout is a fixed
 * overlay, so anything appended after ContentDetail would sit behind it).
 */
export async function ListingRelated({
  lang,
  post,
}: {
  lang: string;
  post: {
    id: string;
    title: string;
    creatorId?: string | null;
    categoryId?: string | null;
    creator?: {
      id?: string | null;
      username?: string | null;
      isVerified?: boolean | null;
      profile?: { firstName?: string | null; lastName?: string | null } | null;
    } | null;
    location?: { county?: string | null } | null;
    aiClassification?: { level2?: string | null } | null;
  };
}) {
  const isCar = isCarListing(post.aiClassification);
  // A car whose title names no model we have a page for ("BMW 3 Series")
  // still belongs under the cars hub.
  const intent =
    searchIntentPageForTitle(post.title, post.aiClassification?.level2) ??
    (isCar ? getSearchIntentPage("cars") : null);
  const county = post.location?.county ? getCountyByName(post.location.county) : null;
  const { fromSeller, similar } = await fetchRelatedListings({
    id: post.id,
    sellerId: post.creatorId ?? post.creator?.id ?? null,
    categoryId: post.categoryId ?? null,
    searchQuery: intent?.query ?? null,
    // Cars sit in Automotive beside parts and accessories; a car's
    // "similar listings" should be other cars.
    narrow: isCar
      ? { subcategory: CAR_SUBCATEGORY, minPrice: CAR_PRICE_FLOOR }
      : null,
  });

  const sellerName =
    [post.creator?.profile?.firstName, post.creator?.profile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || (post.creator?.username ? `@${post.creator.username}` : "this seller");

  const hubs = [
    intent && {
      href: `/${lang}${searchIntentPath(intent.slug)}`,
      label: `${intent.label} for sale in Kenya`,
    },
    county && {
      href: `/${lang}/marketplace/${county.slug}`,
      label: `Buy and sell in ${county.label}`,
    },
  ].filter((hub): hub is { href: string; label: string } => Boolean(hub));

  if (!fromSeller.length && !similar.length && !hubs.length) return null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-0 md:space-y-8 md:px-5 md:py-10 md:max-w-[1440px] lg:px-8">
      {fromSeller.length > 0 && (
        <RelatedGrid
          title={`More from ${sellerName}`}
          listings={fromSeller}
          lang={lang}
          verified={Boolean(post.creator?.isVerified)}
          sellerRail
          more={
            post.creator?.username && fromSeller.length > 10
              ? { href: profileHref(lang, post.creator), label: "See all" }
              : undefined
          }
        />
      )}
      {similar.length > 0 && (
        <RelatedGrid
          title="Similar items"
          listings={similar}
          lang={lang}
          more={
            intent
              ? { href: `/${lang}${searchIntentPath(intent.slug)}`, label: "See more" }
              : undefined
          }
        />
      )}
      {hubs.length > 0 && (
        <nav aria-label="Browse more listings" className="hidden md:block">
          <h2 className="mb-3 font-display text-base font-bold text-default">Browse more</h2>
          <div className="flex flex-wrap gap-2">
            {hubs.map((hub) => (
              <Link
                key={hub.href}
                href={hub.href}
                className="rounded-full border border-default bg-surface px-4 py-2 text-sm font-semibold text-default no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
              >
                {hub.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

function RelatedGrid({
  title,
  listings,
  lang,
  more,
  verified,
  sellerRail = false,
}: {
  title: string;
  listings: SocialProofListing[];
  lang: string;
  more?: { href: string; label: string };
  /** Every listing here is from one seller whose verification is known. */
  verified?: boolean;
  sellerRail?: boolean;
}) {
  return (
    <section className="border-b-8 border-surface px-4 py-4 md:border-0 md:px-0 md:py-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 truncate font-display text-base font-bold text-default">
          {title}
        </h2>
        {more && (
          <Link
            href={more.href}
            className="shrink-0 text-sm font-semibold text-primary no-underline"
          >
            {more.label}
          </Link>
        )}
      </div>
      {sellerRail && (
        <ul className="flex list-none snap-x snap-mandatory gap-3 overflow-x-auto pb-1 scrollbar-none md:hidden">
          {listings.slice(0, 10).map((listing) => (
            <li key={listing.id} className="w-[136px] shrink-0 snap-start">
              <RelatedRailCard listing={listing} lang={lang} />
            </li>
          ))}
        </ul>
      )}
      {!sellerRail && (
        <ul className="grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 md:hidden">
          {listings.slice(0, 10).map((listing) => (
            <li key={listing.id}><RelatedMobileTile listing={listing} lang={lang} /></li>
          ))}
        </ul>
      )}
      <ul className="m-0 hidden list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid md:gap-4 lg:grid-cols-4 xl:grid-cols-6">
        {listings.map((listing) => (
          <li key={listing.id}>
            <ListingPhotoCard
              listing={listing}
              lang={lang}
              verified={verified}
              locale={cultureCode(lang)}
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, (max-width: 1280px) 24vw, 230px"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RelatedRailCard({ listing, lang }: { listing: SocialProofListing; lang: string }) {
  const cover = listingCover(listing);
  const price = listingPriceLabel(listing, cultureCode(lang));
  return (
    <Link href={contentPath(lang, listing)} className="block no-underline" data-scroll-anchor={listing.id}>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface">
        {cover ? (
          <Image src={cover} alt={listing.title ?? ""} fill sizes="136px" unoptimized={shouldUnoptimize(cover)} className="object-cover" />
        ) : (
          <ImageIcon size={24} className="absolute inset-0 m-auto text-muted" aria-hidden />
        )}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-main tabular-nums">{price ?? "Price on request"}</p>
      <p className="line-clamp-2 text-xs leading-4 text-muted">{listing.title}</p>
    </Link>
  );
}

function RelatedMobileTile({ listing, lang }: { listing: SocialProofListing; lang: string }) {
  const cover = listingCover(listing);
  const price = listingPriceLabel(listing, cultureCode(lang));
  const place = listingPlaceLabel(listing.location?.placeName, listing.location?.county);
  return (
    <Link href={contentPath(lang, listing)} data-scroll-anchor={listing.id} className="block no-underline">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface">
        {cover ? (
          <Image src={cover} alt={listing.title ?? ""} fill sizes="46vw" unoptimized={shouldUnoptimize(cover)} className="object-cover" />
        ) : (
          <ImageIcon size={24} className="absolute inset-0 m-auto text-muted" aria-hidden />
        )}
        {listing.price?.negotiable && price && (
          <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white">Negotiable</span>
        )}
        {listing.creator?.isVerified && <VerifiedIdBadge variant="overlay" className="absolute bottom-2 right-2" />}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-main tabular-nums">{price ?? "Price on request"}</p>
      <p className="line-clamp-2 text-[13px] leading-5 text-main">{listing.title}</p>
      {place && <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted"><MapPin size={12} className="shrink-0" aria-hidden /><span className="truncate">{place}</span></p>}
    </Link>
  );
}
