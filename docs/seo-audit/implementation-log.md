# Implementation log

Changes made on branch `SEO-AUDITS` (base `75b4833`), in priority order. Finding IDs refer to [technical-findings.md](technical-findings.md). Nothing has been committed, deployed or run against production.

## Changes

### 1. Stop claiming "Free" for unpriced listings (F01, F10)

An amount of 0 means the seller left the price blank. The composer starts every draft with `isFree: true`. This affected 78 live listings (5.1%).

| File | Change |
|---|---|
| `lib/format.ts` | New `listingPriceText(price)`: "KES 30,000", or `null` when the amount isn't above 0. The comment records why. |
| `app/[lang]/(app)/(shell)/content/[id]/page.tsx` | Title, meta description and OG text use it, so no price claim is made when none was stated. |
| `lib/structured-data.ts` | `productSchema` emits an Offer only when `price > 0`. The comment explains the expected Search Console "ineligible" status. |
| `features/feed/components/ListingSeoSummary.tsx`, `features/feed/components/ContentDetail.tsx` (2 places) | Visible label is "Price on request", matching feed cards and the mobile layout. |
| `components/seo/BrowseHub.tsx`, `app/[lang]/(marketing)/marketplace/[county]/page.tsx`, `app/[lang]/(marketing)/for-sale/[slug]/page.tsx`, `app/og/listing/[id]/route.tsx` | Use `listingPriceText`, so no "Free". |
| `lib/seo/marketplace-catalog.ts`, `app/catalog.md/route.ts` | `catalog.json` reports `price: null` instead of `{ amount: 0 }`, and the Markdown no longer prints "Free". |

Not changed: `features/feed/components/PriceTag.tsx` still renders "Free" on the desktop feed rail. It's a feed surface, not crawler-facing, and `ImmersiveMeta` says some surfaces want that label. Worth a product decision.

### 2. API failures return a 500, not a noindexed 200 (F02)

| File | Change |
|---|---|
| `app/[lang]/(app)/(shell)/content/[id]/page.tsx` | `getPost` resolves `null` only for the API's `NOT_FOUND`, which becomes a 404. Any other failure throws. `generateMetadata` calls `notFound()` for a missing listing instead of emitting `title: "Post"` and `noindex`. |
| `app/[lang]/(app)/(shell)/content/[id]/error.tsx` (new) | Retry screen. Uses `unstable_retry`, which refreshes the server render, because the failure is server-side. |

### 3. Render each app page once (F06)

| File | Change |
|---|---|
| `components/layout/MainShell.tsx` | `useSearchParams()` moves into `CategoryParamWatcher`, inside its own `<Suspense fallback={null}>`, and reports up through state. The page is no longer inside a boundary whose fallback is the page itself. |

### 4. Crawlable Explore and subcategory pages (F03, F04, F07)

| File | Change |
|---|---|
| `lib/seo/browse-pages.ts` (new) | Indexing policy: at least 5 live listings (`MIN_INDEXABLE_LISTINGS`), and not one of 7 subcategories a curated page already owns (`CURATED_SUBCATEGORY_PAGES`). Also `browseHeading()` ("…for Sale in Kenya", or "…in Kenya" for services, jobs, events and property) and `browsePath()`. |
| `features/discover/queries/browse.server.ts` (new) | Server fetchers: taxonomy and facet counts (throw on failure, so the response is a 500 rather than a false 404); `resolveBrowseRoute()` (accepts taxonomy names and facet labels, else `null`); `fetchBrowseCards()` (best effort); `fetchIndexableBrowsePages()` for the sitemap. |
| `app/[lang]/(app)/(shell)/explore/[category]/[subcategory]/page.tsx` | `generateMetadata` gives a unique title, description and canonical, with robots set from the policy. Unknown slugs get `notFound()`. Adds BreadcrumbList and an ItemList of the rendered cards, and passes the first 20 cards and the heading to `DiscoverPage`. |
| `app/[lang]/(app)/(shell)/explore/[category]/[subcategory]/not-found.tsx` (new) | Category-appropriate 404 copy. The shell's own copy is about listings. |
| `app/[lang]/(app)/(shell)/explore/page.tsx` | The unfiltered `/explore` passes its first 20 cards. Filtered deep links don't. |
| `features/discover/components/DiscoverPage.tsx` | New optional props `initialPosts` and `initialTitle`. Server cards stand in for the skeleton until the first client load settles; after that, filter changes show the skeleton as before. |
| `app/[lang]/(app)/(shell)/content/[id]/page.tsx` | The category trail appends the classifier's level-2 subcategory when its level-1 label matches the listing's category. Every listing now links to its subcategory page. |
| `features/feed/components/ListingSeoSummary.tsx`, `features/feed/components/ContentDetail.tsx` | The crawler-visible summary links the category trail, using the same URLs as the desktop breadcrumb. |

### 5. Sitemap: full listing coverage, honest dates, no redirecting URLs (F05, F08, F09)

| File | Change |
|---|---|
| `app/sitemap.ts` | Listings are walked per top-level category in parallel, alongside a 2-page newest walk; falls back to the single walk if the taxonomy fails. Adds indexable subcategory pages (43 today). Removes `/for-you`. Sets `lastmod` only where a real modification date exists. Comments corrected: social-proof sellers are no longer "featured on the homepage". |

### 6. Video markup (F11)

| File | Change |
|---|---|
| `lib/structured-data.ts`, `app/[lang]/(app)/(shell)/content/[id]/page.tsx` | `videoObjectSchema` takes `contentUrl` (the Mux HLS stream from `hlsUrlOf`) and no longer sets `embedUrl` to the listing page. |

### 7. Rebuild interval: hourly → daily (requested by the team)

Listings are posted a few dozen times a day, so hourly regeneration was mostly wasted ISR writes and function invocations.

| File | Change |
|---|---|
| `lib/apollo/ApolloClient.ts` | Default server fetch revalidate goes from 3600 to **86400**. New `SINGLE_LISTING_CACHE` (3600) for single-listing lookups. |
| `app/[lang]/(marketing)/[handle]/page.tsx` and `opengraph-image.tsx`, `invite/[code]/opengraph-image.tsx`, `sell/[slug]`, `sell-car-kenya/[city]`, `marketplace/[county]`, `for-sale/[slug]` | `revalidate` goes from 3600 to **86400**. |
| `app/sitemap.ts`, `app/sellers/sitemap.ts` | Fetch revalidate goes from 3600 to **86400**, so new listings reach the sitemap within a day. |
| `content/[id]/page.tsx`, `video/[slug]/page.tsx`, `og/listing/[id]/route.tsx` | **Kept at one hour** through `SINGLE_LISTING_CACHE`. New posts wait for admin review (`NEW_POSTS_REQUIRE_REVIEW = true` in the API) and answer NOT_FOUND until approved, and that answer is cached. A link opened before approval would otherwise keep returning 404 for up to a day after approval. The WhatsApp preview bot opens every shared link immediately. |

Build check: every ISR route (for-sale, county, car-selling, sell, blog, both sitemaps) now shows `1d`; none shows `1h`.

Unchanged on purpose: the For You feed's 30-second data cache (new posts should appear within seconds), the AI catalog's 15 minutes, and the share-image `Cache-Control` headers in `lib/og-image.ts` (CDN caching, not rebuilds).

### 8. Production smoke test

| File | Change |
|---|---|
| `scripts/seo-smoke.mjs` (new), `package.json` | `npm run seo:smoke [-- baseUrl] [--listings=N]` checks robots.txt, the sitemap (coverage, hosts, `/for-you`, `lastmod`), sampled listings (one canonical, one H1, parsable JSON-LD, one Product, no `price: 0`), Explore and a category page (listing links, canonical, robots), and real 404s. It uses no dependencies, and exits 1 on any failure. |

## Validation

| Check | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit -p tsconfig.json` | Exit 0, no errors. |
| Lint (changed files) | `npx eslint <changed files>` | 0 errors. 16 warnings, all pre-existing: the HEAD versions of `DiscoverPage.tsx` and `ListingSeoSummary.tsx` produce the same 14 and 2. |
| Content audit | `npm run seo:audit` | 0 errors, 5 warnings (existing thin-article prompts). |
| Production build | `npx next build` | Succeeds. Every route's render mode is identical to the baseline build. |
| Smoke test, final build | `npm run seo:smoke -- http://localhost:3100 --listings=10` | **All checks passed.** 2,015 sitemap URLs: 1,520 listings, 43 category pages, 332 profiles. 10 sampled listings clean. Real 404s for unknown listing, category and route. |
| Outage path | Temporary hook (removed) throwing in `getPost`, on the dev server | 500 for the simulated outage; real listing 200; missing listing 404. |

Smoke-test notes:
- Run against `localhost`, it warns that robots.txt doesn't list localhost sitemaps. That's expected; robots.txt always names the production host.
- On the developer's running `next dev`, `/robots.txt` returned 500. The dev server's persistent cache still references `app/robots.txt/route.ts`, which was replaced by `app/robots.ts` in an earlier commit. The production build serves it correctly. Restarting `next dev`, or deleting `.next/dev`, clears it.

### Before and after (production build, Googlebot smartphone user agent, raw HTML)

| URL | Before | After |
|---|---|---|
| `/en/content/dining-table` | 2 H1s, 6 JSON-LD nodes (3 duplicated), 130 KB HTML | 1 H1, 3 JSON-LD nodes, 91 KB HTML, links to its subcategory |
| `/en/content/furniture-18` (price 0) | Title and description used "Free"; Offer `price: 0` | No price claim; no Offer; page shows "Price on request" |
| `/en/explore` | 0 listing links | 20 listing links (server-rendered cards) |
| `/en/explore/electronics-technology/headphones-earphones` | Site-default title, no canonical, 0 listing links | "Headphones & Earphones for Sale in Kenya", self-canonical, indexable, 20 listing links, BreadcrumbList and ItemList |
| `/en/explore/electronics-technology/phones` | As above | Own title, `noindex, follow` (the curated `/for-sale/phones` owns the query), 20 listing links |
| `/en/explore/not-a-category/nothing` | **200**, indexable | **404** |
| `/en/stores` | 2 H1s, 1.33 MB HTML | 1 H1, 0.68 MB HTML |
| `/sitemap.xml` | 1,261 URLs; 978 of 1,520 listings; `/for-you` listed; about 140 generation-time `lastmod`s | 2,015 URLs; 1,520 of 1,520 listings; 43 category pages; no `/for-you`; `lastmod` only on dated content |
