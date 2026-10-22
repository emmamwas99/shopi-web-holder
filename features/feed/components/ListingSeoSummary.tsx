import Link from "next/link";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { profileHref } from "@/lib/profile-url";
import { listingPriceText } from "@/lib/format";
import { slugifyContentTitle, videoPath } from "@/lib/content-url";
import { isPlayableVideo } from "@/features/feed/lib/videoSource";

type SummaryPost = ContentCardFieldsFragment & {
  slug?: string | null;
  category?: { name?: string | null; slug?: string | null } | null;
  specs?: Array<{ key: string; value: string }>;
  aiClassification?: {
    level1?: string | null;
    level2?: string | null;
    level3?: string | null;
  } | null;
};

/**
 * The server-rendered form of a listing.
 *
 * ContentDetail's two real layouts are both gated on `useIsDesktop()`, which
 * returns `null` until the browser can measure the viewport. That means the
 * server — and the client's own hydration render — produce neither branch, so
 * the listing body existed only after JavaScript ran. Crawlers that don't
 * execute JS (every AI/answer engine, and Bing to a large extent) saw an empty
 * page, and Google saw Product JSON-LD with no matching on-page content.
 *
 * This renders in exactly that `isDesktop === null` window. Server and first
 * client render agree, so hydration is unaffected, and the interactive layout
 * replaces it the moment the viewport is measured. It also gives the page a
 * real LCP element instead of a blank frame.
 */
export function ListingSeoSummary({
  post,
  lang,
  categoryTrail = [],
}: {
  post: SummaryPost;
  lang: string;
  /** Taxonomy path, top level first — linked like the desktop breadcrumb. */
  categoryTrail?: Array<{ name: string; slug: string }>;
}) {
  // Matches the interactive layouts: an amount of 0 is an unstated price.
  const price = post.price
    ? (listingPriceText(post.price) ?? "Price on request")
    : null;

  const location =
    [post.location?.placeName, post.location?.county]
      .filter(Boolean)
      .join(", ")
      .trim() || null;

  const media = [...(post.media ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  )[0];
  const image =
    media?.r2Variants?.find((v) => v.variant === "large")?.url ??
    media?.r2Variants?.[0]?.url ??
    media?.imageUrl ??
    media?.muxMeta?.thumbnailUrl ??
    media?.thumbnailUrl ??
    null;

  const seller =
    [post.creator?.profile?.firstName, post.creator?.profile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    post.creator?.username ||
    null;
  const category =
    [
      post.aiClassification?.level1,
      post.aiClassification?.level2,
      post.aiClassification?.level3,
    ]
      .filter(Boolean)
      .join(" / ") || post.category?.name;
  const specs = (post.specs ?? []).filter(
    (item) => item.key?.trim() && item.value?.trim(),
  );

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- transient
        // pre-hydration node; next/image would queue an optimizer request for
        // markup that is replaced on the first client measurement.
        <img
          src={image}
          alt={post.title}
          width={1200}
          height={1200}
          className="w-full rounded-2xl object-cover"
        />
      )}

      <h1 className="font-display text-xl font-bold leading-snug text-default">
        {post.title}
      </h1>

      {(price || location) && (
        <p className="text-base font-semibold text-default">
          {[price, location].filter(Boolean).join(" · ")}
        </p>
      )}

      {post.caption && (
        <p className="text-base leading-normal text-muted">{post.caption}</p>
      )}

      {/* The video's watch page is the only page Google indexes the video on,
          and without this it was linked from nowhere but the sitemap. */}
      {isPlayableVideo(post) && (
        <p className="text-sm">
          <Link href={videoPath(lang, post)} className="font-semibold text-primary">
            Watch the video: {post.title}
          </Link>
        </p>
      )}

      {(category || specs.length > 0) && (
        <section aria-labelledby="listing-details">
          <h2
            id="listing-details"
            className="font-display text-lg font-bold text-default"
          >
            Listing details
          </h2>
          {/* Linked when the taxonomy trail is known: these are the crawl
              paths into the category pages, and the desktop breadcrumb that
              carries the same links only renders after hydration. */}
          {categoryTrail.length > 0 ? (
            <p className="mt-2 text-sm text-muted">
              Category:{" "}
              {categoryTrail.map((item, index) => (
                <span key={`${item.slug}-${index}`}>
                  {index > 0 && " › "}
                  <Link
                    href={
                      index === 0
                        ? `/${lang}/explore?category=${encodeURIComponent(item.slug)}`
                        : `/${lang}/explore/${categoryTrail[0].slug}/${slugifyContentTitle(item.name)}`
                    }
                    className="font-semibold text-primary"
                  >
                    {item.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : (
            category && (
              <p className="mt-2 text-sm text-muted">Category: {category}</p>
            )
          )}
          {specs.length > 0 && (
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {specs.map((item) => (
                <div
                  key={`${item.key}-${item.value}`}
                  className="rounded-lg border border-default bg-surface px-3 py-2"
                >
                  <dt className="text-xs font-semibold text-muted">
                    {item.key}
                  </dt>
                  <dd className="mt-1 text-sm text-default">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {seller && (
        <p className="text-sm text-muted">
          Sold by{" "}
          {post.creator?.username ? (
            <Link
              href={profileHref(lang, post.creator)}
              className="font-semibold text-primary"
            >
              {seller}
            </Link>
          ) : (
            <span className="font-semibold">{seller}</span>
          )}
        </p>
      )}

      <aside className="rounded-xl border border-default bg-surface p-4">
        <h2 className="font-display text-base font-bold text-default">
          How to buy on Shopi
        </h2>
        <p className="mt-2 text-sm leading-normal text-muted">
          Message the seller to confirm availability, condition and the final
          price. Inspect the item before paying where possible, meet in a public
          place, and agree payment, pickup or delivery directly with the seller.
          Shopi does not hold money or provide escrow.
        </p>
      </aside>

      {/* Crawlable routes out of the listing — without these the detail page is
          a dead end for a non-JS crawler. */}
      <nav className="flex flex-wrap gap-3 text-sm text-primary">
        <Link href={`/${lang}/explore`}>Explore listings</Link>
        <Link href={`/${lang}/for-you`}>Open For You</Link>
        <Link href={`/${lang}/search`}>Search Shopi</Link>
      </nav>
    </article>
  );
}
