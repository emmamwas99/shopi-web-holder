import { VerifiedTick } from "@/components/verification/VerifiedTick";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageIcon, MapPin } from "lucide-react";
import type { Dictionary } from "@/i18n/getDictionary";
import { siteConfig } from "@/config/site";
import { contentPath } from "@/lib/content-url";
import { shouldUnoptimize } from "@/lib/imageUtils";
import { jsonLd } from "@/lib/structured-data";
import {
  fetchSocialProofSellers,
  isUsableImageUrl,
  listingCover,
  withCoversFirst,
  type SocialProofSeller,
} from "@/features/social-proof/queries/socialProofSellers";
import { listingPlaceLabel, listingPriceLabel } from "@/components/listings/ListingPhotoCard";
import { SellerAvatarImage } from "./SellerAvatarImage";
import { SocialProofTracker } from "./SocialProofTracker";

type Copy = Dictionary["socialProof"];

/**
 * Real sellers as social proof, chosen in the admin (Users → Social proof).
 *
 * The homepage requests one featured shop for a focused spotlight; nothing
 * renders when no seller is featured.
 * Every number is live from the API — listing count and views are never typed
 * in — so the proof stays true as the seller's stock changes.
 *
 * Seller names, listing titles and prices are server-rendered; the profile,
 * listing and structured-data URLs point to the same public entities.
 */

/** Below these, a figure reads as weak proof rather than strong, so it's left out. */
const MIN_FOLLOWERS_SHOWN = 10;
const MIN_VIEWS_SHOWN = 100;

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

function profileHref(lang: string, seller: SocialProofSeller) {
  return `/${lang}/@${seller.username}`;
}

/** "See all 12 listings" reads wrong for one listing, so that case says "Visit shop". */
function seeAllLabel(t: Copy, seller: SocialProofSeller, count: string) {
  return seller.listingCount === 1 ? t.visitShop : fill(t.seeAll, { count });
}

export async function SocialProofSection({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: string;
}) {
  const sellers = await fetchSocialProofSellers(1, 1);
  if (sellers.length === 0) return null;

  const t = dict.socialProof;
  const locale = lang === "sw" ? "sw-KE" : "en-KE";
  const siteBase = `${siteConfig.url}/${lang}`;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteBase}#featured-sellers`,
    name: "Featured sellers on Shopi",
    numberOfItems: sellers.length,
    itemListElement: sellers.map((seller, i) => {
      const url = `${siteConfig.url}/en/@${seller.username}`;
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "ProfilePage",
          "@id": `${url}#profile`,
          url,
          name: `${seller.displayName} (@${seller.username}) on Shopi`,
        },
      };
    }),
  };

  return (
    <section
      id="social-proof"
      aria-labelledby="social-proof-heading"
      className="border-b border-landing-line px-5 py-16 md:px-8 md:py-24"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }}
      />
      <div className="mx-auto max-w-7xl">
        {/* Impressions and clicks per seller → admin Social proof page. */}
        <SocialProofTracker>
          {sellers.length === 1 ? (
            <SellerSpotlight seller={sellers[0]} lang="en" locale={locale} t={t} />
          ) : (
            <div>
              <h2 id="social-proof-heading" className="mb-7 font-display text-[2rem] font-semibold leading-tight text-landing-ink md:text-[3.25rem]">{t.headline}</h2>
              <ul className="grid list-none gap-5 p-0 md:grid-cols-2 xl:grid-cols-3">
                {sellers.map((seller) => <li key={seller.id}><SellerCard seller={seller} lang="en" locale={locale} t={t} /></li>)}
              </ul>
            </div>
          )}
        </SocialProofTracker>
      </div>
    </section>
  );
}

// ── One seller: spotlight ────────────────────────────────────────────────────

function SellerSpotlight({
  seller,
  lang,
  locale,
  t,
}: {
  seller: SocialProofSeller;
  lang: string;
  locale: string;
  t: Copy;
}) {
  const href = profileHref(lang, seller);
  const count = seller.listingCount.toLocaleString(locale);
  const listing = withCoversFirst(seller.listings)[0];
  const cover = listing ? listingCover(listing) : null;
  const price = listing ? listingPriceLabel(listing, locale) : null;

  return (
    <article data-sp-seller={seller.id} className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
      <div className="min-w-0">
        {listing && (
          <div data-sp-content={listing.id}>
            <Link href={contentPath(lang, listing)} className="group block text-landing-ink no-underline">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-landing-tint">
                {cover ? (
                  <Image src={cover} alt={listing.title ?? ""} fill sizes="(max-width: 768px) 100vw, 600px" unoptimized={shouldUnoptimize(cover)} className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                ) : (
                  <ImageIcon size={32} className="absolute inset-0 m-auto text-muted" aria-hidden />
                )}
              </div>
              <div className="mt-3 flex items-start justify-between gap-4 text-sm">
                <span className="min-w-0 truncate font-medium">{listing.title}</span>
                {price && <span className="shrink-0 font-semibold tabular-nums">{price}</span>}
              </div>
            </Link>
          </div>
        )}
      </div>

      <div className="min-w-0 max-w-lg">
        <h2 id="social-proof-heading" className="font-display text-[2rem] font-semibold leading-tight text-landing-ink md:text-[3.25rem]">{t.headline}</h2>
        <div className="mt-6 flex items-center gap-3">
          <SellerAvatar seller={seller} size={48} />
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-landing-ink">
              <Link href={href} className="text-inherit no-underline hover:text-primary">{seller.displayName}</Link>
            </h3>
            <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
              <span className="truncate">@{seller.username}</span>
              {seller.isVerified && <VerifiedTick size={16} label={t.verified} />}
            </p>
          </div>
        </div>
        {seller.headline && <p className="mt-4 text-base leading-relaxed text-landing-body">{seller.headline}</p>}
        <SellerPlace seller={seller} className="mt-2" />
        <SellerStats seller={seller} locale={locale} t={t} className="mt-5" />
        <Link href={href} className="mt-7 inline-flex items-center gap-2 border-b-2 border-primary pb-1 font-semibold text-landing-ink no-underline">
          {seeAllLabel(t, seller, count)} <ArrowRight size={18} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

// ── Two or more sellers: cards ───────────────────────────────────────────────

function SellerCard({
  seller,
  lang,
  locale,
  t,
}: {
  seller: SocialProofSeller;
  lang: string;
  locale: string;
  t: Copy;
}) {
  const href = profileHref(lang, seller);
  const count = seller.listingCount.toLocaleString(locale);
  const thumbs = withCoversFirst(seller.listings).slice(0, 3);

  return (
    <article
      data-sp-seller={seller.id}
      className="flex w-full flex-col rounded-[1.2rem] border border-default bg-elevated p-4 shadow-sm md:p-5"
    >
      <div className="flex items-center gap-3">
        <SellerAvatar seller={seller} size={48} />
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-bold leading-tight text-default">
            <Link href={href} className="text-default no-underline hover:underline">
              {seller.displayName}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted">
            @{seller.username}
            {seller.isVerified && <VerifiedTick size={15} label={t.verified} />}
          </p>
        </div>
      </div>

      {seller.headline && (
        <p className="mt-4 text-sm font-semibold leading-snug text-default">
          {seller.headline}
        </p>
      )}
      <SellerPlace seller={seller} className="mt-2" />
      <SellerStats seller={seller} locale={locale} t={t} className="mt-4" compact />

      {thumbs.length > 0 && (
        <ul className="mt-4 grid list-none grid-cols-3 gap-2 p-0">
          {thumbs.map((listing) => {
            const cover = listingCover(listing);
            return (
              <li key={listing.id} data-sp-content={listing.id}>
                <Link
                  href={contentPath(lang, listing)}
                  className="relative block aspect-square overflow-hidden rounded-xl border border-default bg-subtle"
                  aria-label={listing.title ?? undefined}
                >
                  {cover ? (
                    <Image
                      src={cover}
                      alt={listing.title ?? ""}
                      fill
                      sizes="(max-width: 768px) 30vw, 140px"
                      unoptimized={shouldUnoptimize(cover)}
                      className="object-cover"
                    />
                  ) : (
                    <ImageIcon size={18} className="absolute inset-0 m-auto text-muted" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <span className="text-xs text-muted">
          <SinceLabel seller={seller} locale={locale} t={t} />
        </span>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary no-underline hover:underline"
        >
          {seeAllLabel(t, seller, count)}
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

// ── Shared pieces ────────────────────────────────────────────────────────────

function SellerAvatar({
  seller,
  size,
  className = "",
}: {
  seller: SocialProofSeller;
  size: number;
  /** Overrides the inline size per breakpoint (use `!` classes). */
  className?: string;
}) {
  const initials = seller.displayName
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatar = isUsableImageUrl(seller.avatar) ? seller.avatar : null;

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-elevated bg-primary font-display font-bold text-white shadow-sm ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {avatar ? (
        <SellerAvatarImage
          src={avatar}
          alt={seller.displayName}
          size={size}
          initials={initials}
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}

function SellerPlace({
  seller,
  className = "",
}: {
  seller: SocialProofSeller;
  className?: string;
}) {
  const place = listingPlaceLabel(seller.placeName, seller.county);
  if (!place) return null;
  return (
    <p className={`flex items-center gap-1.5 text-sm text-muted ${className}`}>
      <MapPin size={14} className="shrink-0" aria-hidden />
      {place}
    </p>
  );
}

function SellerStats({
  seller,
  locale,
  t,
  className = "",
  compact = false,
}: {
  seller: SocialProofSeller;
  locale: string;
  t: Copy;
  className?: string;
  compact?: boolean;
}) {
  const stats = [
    {
      value: seller.listingCount,
      label: seller.listingCount === 1 ? t.listingOne : t.listings,
      show: true,
    },
    { value: seller.totalViews, label: t.views, show: seller.totalViews >= MIN_VIEWS_SHOWN },
    {
      value: seller.followerCount,
      label: t.followers,
      show: seller.followerCount >= MIN_FOLLOWERS_SHOWN,
    },
  ].filter((stat) => stat.show);

  return (
    <dl className={`flex flex-wrap gap-x-6 gap-y-3 ${className}`}>
      {stats.map(({ value, label }) => (
        <div key={label} className="flex flex-col-reverse">
          <dt className="text-xs font-semibold uppercase tracking-normal text-muted">
            {label}
          </dt>
          <dd
            className={`m-0 font-display font-bold leading-none text-default tabular-nums ${
              compact ? "text-xl" : "text-xl md:text-[1.75rem]"
            }`}
          >
            {value.toLocaleString(locale)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SinceLabel({
  seller,
  locale,
  t,
}: {
  seller: SocialProofSeller;
  locale: string;
  t: Copy;
}) {
  const since = new Date(seller.memberSince);
  if (Number.isNaN(since.getTime())) return null;
  const date = since.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return (
    <time dateTime={since.toISOString()}>{fill(t.since, { date })}</time>
  );
}
