import Link from "next/link";
import { ListingPhotoCard } from "@/components/listings/ListingPhotoCard";
import { cultureCode } from "@/i18n/config";
import { getCountyByName } from "@/lib/counties";
import { profileHref } from "@/lib/profile-url";
import {
  searchIntentPageForTitle,
  searchIntentPath,
} from "@/lib/seo/search-intent-pages";
import type { SocialProofListing } from "@/features/social-proof/queries/socialProofSellers";
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
      profile?: { firstName?: string | null; lastName?: string | null } | null;
    } | null;
    location?: { county?: string | null } | null;
  };
}) {
  const intent = searchIntentPageForTitle(post.title);
  const county = post.location?.county ? getCountyByName(post.location.county) : null;
  const { fromSeller, similar } = await fetchRelatedListings({
    id: post.id,
    sellerId: post.creatorId ?? post.creator?.id ?? null,
    categoryId: post.categoryId ?? null,
    searchQuery: intent?.query ?? null,
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
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 md:px-6">
      {fromSeller.length > 0 && (
        <RelatedGrid
          title={`More from ${sellerName}`}
          listings={fromSeller}
          lang={lang}
          more={
            post.creator?.username
              ? { href: profileHref(lang, post.creator), label: "See all" }
              : undefined
          }
        />
      )}
      {similar.length > 0 && (
        <RelatedGrid
          title="Similar listings"
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
        <nav aria-label="Browse more listings">
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
}: {
  title: string;
  listings: SocialProofListing[];
  lang: string;
  more?: { href: string; label: string };
}) {
  return (
    <section>
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
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
        {listings.map((listing) => (
          <li key={listing.id}>
            <ListingPhotoCard
              listing={listing}
              lang={lang}
              locale={cultureCode(lang)}
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 240px"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
