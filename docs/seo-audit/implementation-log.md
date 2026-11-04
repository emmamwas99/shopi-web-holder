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

---

# November 2026: marketplace, "where to sell" and TikTok tools

Done on 4 November 2026 on `main` (uncommitted). The research behind every page is in [keyword-map.md](keyword-map.md) § "Marketplaces, competitors and 'where to sell'" and § "TikTok tools", with the evidence in [keywords-2026-11.csv](keywords-2026-11.csv).

### 1. Comparison, competitor and seller pages

| File | Change |
|---|---|
| `lib/seo/marketplace-platforms.ts` | **New.** Sourced facts (checked 4 Nov 2026) for Shopi, Jiji, PigiaMe, Facebook Marketplace, Jumia, Kilimall and WhatsApp/social selling, plus the OLX Kenya history. No prices or commission rates; audience-size and quality claims are banned in the header. |
| `app/[lang]/(marketing)/marketplace-alternatives-kenya/page.tsx` | Rewritten as **"Best Online Selling Sites & Marketplaces in Kenya (2026)"**: answer-first intro, quick picks, comparison table, platform cards with sources, free-ads, apps-like-Jiji/Jumia, Facebook Marketplace and OLX sections, 10-question FAQ, `ItemList` of the platforms. URL kept. |
| `lib/seo/competitor-alternatives.ts`, `components/seo/CompetitorAlternativePage.tsx` | Jiji page retitled "Apps & Sites Like Jiji in Kenya"; Jiji and PigiaMe facts re-checked (Jiji's free-ad limit and **Safe Deal** are new); "is Jiji free / legit", "how does PigiaMe work / is it legit" answered factually; new "Other apps like…" section; canonical and breadcrumbs now use `canonicalUrl()` (they built `/sw` URLs by hand). The "Shopi has no jobs" lines were removed: the taxonomy has a Jobs & Gigs category. |
| `lib/articles/posts/how-to-sell-on-jiji-kenya.ts` | **New guide** (selling-guide, 1,527 words) from Jiji's own help pages, linked as sources. Passes `npm run seo:audit`. |
| `app/[lang]/(marketing)/olx-kenya-alternative/page.tsx` | **New.** What happened to OLX Kenya, where each category goes now, live listings. ISR, daily. |
| `lib/seo/where-to-sell.ts`, `app/[lang]/(marketing)/where-to-sell/[item]/page.tsx` | **New** `/where-to-sell/{phones, laptops, electronics, furniture, farm-produce}`: channels compared (Shopi included, with when others are better), prepare/wipe/price steps, getting paid safely, FAQ, live listings filtered for relevance (misfiled and test listings dropped by title and price). ISR, daily. |
| `features/discover/queries/recentListings.ts` | `fetchRecentListingsAcross()` — newest listings over several subcategories, interleaved and de-duplicated. |

### 2. TikTok tools

| File | Change |
|---|---|
| `app/api/tiktok-save/route.ts`, `lib/tiktokSaver.ts` | Lookup returns `kind` (video/photo), the H.264 video, the HEVC "HD" video when it differs, the sound as MP3 and photo-mode images; `?download=video|hd|audio|image&i=` streams one file as a fallback. **Bug fixed:** photo posts used to "download" their soundtrack as a `.mp4`; the composer's `download=1` now answers 422 for them instead of creating a picture-less audio post (its contract is otherwise unchanged, including 502 on every lookup failure, which it retries). "Post not found" is now a 404 for the tool, with its own message. |
| `components/tools/TiktokSaverTool.tsx`, `components/tools/saverDownloads.ts` | Modes (video / MP3 / photos), Paste button and auto-lookup on paste, share text with a link in it accepted, specific errors, progress, MP4 + HD + MP3, photo grid with per-photo save and **ZIP of all photos** (dependency-free STORE writer, verified with `unzip -t` and byte comparison). **Downloads go browser → TikTok CDN directly** (CORS `*`), so file bytes no longer stream through a Vercel function; the API stream is only the fallback. Native URL validation turned off (it rejected pasted share text). |
| `next.config.ts` | CSP `connect-src` allows TikTok's CDN hosts (and tikwm, whose relative paths redirect there). Locale-free redirects for the new routes. |
| `lib/seo/tiktok-tools.ts`, `components/tools/TiktokToolPage.tsx`, `components/tools/tiktokToolOgImage.tsx` | The three tool pages from one data module and one layout, each with its own steps, sections, FAQ, HowTo/WebApplication/FAQ schema and OG card. **New:** `/tiktok-mp3-downloader`, `/tiktok-photo-downloader`. `/tiktok-downloader` retitled for HD, with an MP4-vs-HD table, "why won't it download", and "is it safe". |
| `lib/analytics.ts` | `trackTiktokSaver()` — `tiktok_saver_lookup` and `tiktok_saver_download` events (mode, kind, asset, outcome, error) to GA4 via the dataLayer. |

### 3. Discovery and AI-facing files

`app/sitemap.ts` (5 where-to-sell pages, 3 TikTok tools, OLX page), `components/seo/CategoryCrossLinks.tsx` ("Where to sell in Kenya" row on every landing page), `components/landing/LandingFooter.tsx` (best selling sites, OLX Kenya, where to sell a phone; the TikTok downloader link, CSS-hidden since 23 Oct, shown again at the owner's request), `app/[lang]/(marketing)/sell-in-kenya/page.tsx` (hub → where-to-sell cards; Jiji guide in seller guides), `lib/blog.ts` (where-to-sell-used-items links the new pages), `lib/articles/links.ts` (new routes known to the audit), `public/llms.txt` and `public/llms-full.txt` (new pages, prompts and preferred answers; the TikTok facts corrected — the files said "no MP3").

### 4. Regression found and fixed: empty category pages since 31 October

`/explore/{category}/{subcategory}` became ISR on 31 Oct (`generateStaticParams` returning `[]`, commit `30fd269`, the Vercel CPU fix). `DiscoverPage` reads `useSearchParams()`, so a static render bails out to the Suspense fallback — and the fallback was a bare skeleton. Production HTML for every category page therefore had **no H1 and no listing links** (`npm run seo:smoke` failed on `/en/explore/home-living/sofas`), undoing F03/F04. The dev server didn't show it because it renders per request. The fallback now renders the same H1 and the server-fetched cards (`DiscoverGridCard`), keeping ISR and its CPU savings.

### Validation

- `tsc` clean; ESLint 0 errors on every changed file; `npm run seo:audit` 0 errors (5 warnings, all pre-existing).
- `next build`: every new or changed page is ● (prerendered; seller and OLX pages ISR 1 day). No new ƒ page routes. The OG image routes are ƒ, like every OG card on the site.
- Rendered HTML (production build): one H1, self-canonical (`/sw` → `/en`), valid JSON-LD, FAQ in schema matches the page; seller pages carry live listing links; `/en/where-to-sell/nope` → 404; all new URLs in a well-formed sitemap.
- TikTok API against real posts: video (MP4 + HEVC HD + MP3), photo post (8 JPEGs + MP3), composer contract (`download=1` → video with `X-Tiktok-Meta`; photo → 422), fallbacks per asset, 400/404 errors.
- Browser at 390×844 (`agent-browser`): lookup from pasted share text, result card, photo grid; direct CDN fetches succeed under the real CSP header (2.9 MB MP4, 2.0 MB HD, 87 KB MP3, 3 JPEGs), no console errors.

### Not done, and why

- **Jumia/Kilimall "how to sell" guides**: queries are large, but Kilimall's seller terms aren't published where they could be verified, and Jumia's rates vary by category.
- **Search Console**: none of this has been checked against real query data. Baseline the new URLs after deploy (monitoring-plan.md).
