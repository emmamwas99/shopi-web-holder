# Technical findings

Every finding from the October 2026 audit, with its evidence. IDs match the matrix in [README.md](README.md). "Before" line references are to commit `75b4833` (the branch point); current line references are to this branch.

**Confidence labels**

- **Verified**: reproduced on a local production build (`next build && next start`) fetched as a crawler would, or read directly from code or live data.
- **Probable**: the mechanism is verified, but its size in production can't be measured from here.
- **Unverified**: depends on infrastructure or data this audit couldn't see.

**What "live data" means here:** the local API (`localhost:4000`) reads the production database. Only read-only queries were used. Inventory figures are from 16 October 2026.

---

## 1. Crawlability and indexability

### F02 · A failed API call told engines to drop a live listing (fixed)

**Before.** `getPost` in `app/[lang]/(app)/(shell)/content/[id]/page.tsx` returned `{ post: null, gone: false }` on any API error (line 84). `generateMetadata` then emitted `title: "Post"` and `robots: { index: false, follow: true }` (lines 228–235), with HTTP 200.

The comment said the client render would take over "so an outage can't deindex listings". It did the opposite. Google's JavaScript SEO guide says that when it finds `noindex` in the original HTML "it may skip rendering and JavaScript execution". So the client-side recovery never helped Google.

**Why it can happen in production.** The API applies one global limiter of 600 requests per minute per IP (`api/src/middleware/rate-limit.middleware.ts:76-80`, mounted globally at `api/src/loaders/express.loader.ts:91`). Server-side rendering on Vercel shares egress IPs, and a listing render makes 3–5 API calls. A crawl burst, or any API restart, could therefore serve `noindex` to whichever crawler arrived at that moment. How often this happened in production is **unverified**.

**Fix.** Any non-`NOT_FOUND` failure now throws, so the response is a 500, which Google treats as temporary. A new `error.tsx` gives people a retry button. In a dev simulation the outage returned 500, a real listing returned 200, and a missing one 404.

### F03 · `/explore/{category}/{subcategory}` was an unbounded soft-404 space (fixed)

**Before.** The route had no `generateMetadata`. Every subcategory page carried the site-default title ("Shopi — Sell Online in Kenya | Buy & Sell Locally") with no canonical. Its server HTML had one "All listings" heading and no listing links.

`/en/explore/not-a-category/nothing` answered **200** with the same indexable page. Listing breadcrumbs (JSON-LD, and the desktop layout) link to these URLs.

Inventory makes this matter: 136 of roughly 290 subcategories had any live listings on 16 Oct 2026, and only 50 had five or more. Every Property & Rentals subcategory had 0–1 listings.

**Fix.**
- Unknown category or subcategory slugs return **404**, using a route-specific not-found page.
- Each real subcategory gets its own title ("Headphones & Earphones for Sale in Kenya"), description, canonical, BreadcrumbList, and an ItemList of the cards it renders.
- Its first 20 listings render in the server HTML.
- The page is indexed only when it has at least 5 live listings and no curated page already owns the intent (`lib/seo/browse-pages.ts`).
- 43 subcategory pages qualify today and are in the sitemap.

**Note for reviewers:** this changes the indexing of about 250 previously indexable but empty URLs to `noindex, follow`, or to 404 for invalid slugs. They had no canonical, no unique title and no content, so they almost certainly weren't ranking. The threshold and the curated-page map are constants in one file, so the decision is easy to revisit.

### F09 · `/for-you` was in the sitemap but redirected desktop crawlers (fixed)

**Behaviour.** `proxy.ts:104` sends every non-mobile user agent from `/for-you` to `/explore` with a 307. On the production build that included Googlebot desktop and Bingbot, while Googlebot smartphone received the page. The page is a personalised feed with no H1.

It was in the sitemap at priority 0.9 with `changefreq=always` (before: `app/sitemap.ts:286`).

**Fix.** Removed from the sitemap. Whether to `noindex` it is an open owner decision, recorded in [README.md § E](README.md#e-outstanding-recommendations).

### F15 · Crawler access at the edge is unverified (open, potentially critical)

The site sits behind Cloudflare. The CSP allows Cloudflare Web Analytics because "the beacon is injected by the Cloudflare proxy in front of the site" (`next.config.ts`). The production API returns 403 to command-line clients (team note, Sept 2026), so bot protection is active on at least the API host.

Three things could not be verified from here:

- Whether Cloudflare's managed robots.txt or AI Crawl Control prepends AI-crawler blocks to `/robots.txt`. The repo's `app/robots.ts` allows everything.
- Whether Bot Fight Mode or WAF rules challenge verified crawlers on `www`.
- Whether Googlebot's renderer can call `api.shopi.co.ke`. Explore grids, profiles and the interactive listing layout fetch from it in the browser, so a blocked renderer sees skeletons.

How to check each is in [monitoring-plan.md § Production verification](monitoring-plan.md#production-verification-run-once-after-deploy).

### Verified correct (no change)

| Check | Result |
|---|---|
| Removed, rejected, pending, private or suspended listings | 404. The API throws `NOT_FOUND` for anything not public (`api/src/modules/content/content.service.ts:499`), and the page calls `notFound()`. Deletion sets `status: REMOVED` (`content.service.ts:911`). |
| Unknown listing, profile, county, blog post, for-sale slug, top-level route | 404 (production build). |
| Private routes | `/upload`, `/notifications`, `/auth/*` and the profile management screens are disallowed in robots.txt and redirected to sign-in by `proxy.ts`. |
| Internal search results (`/search?q=`) | `noindex, follow`, canonical `/en/search`. This follows Google's advice to keep internal search results out of the index. |
| Metadata placement | `<title>`, canonical and robots are in `<head>` for Googlebot smartphone and desktop, Bingbot, Chrome and iPhone user agents. Next 16's metadata streaming did not move them into `<body>`. |
| Robots signals | No `X-Robots-Tag` header conflicts on HTML pages; no `noindex` on intended pages. |

---

## 2. JavaScript SEO and server rendering

### F04 · Explore shipped no listing links (fixed)

**Before.** `/en/explore` is the homepage's "Browse listings" target and sits at sitemap priority 0.8. Its server HTML had **0 listing links** and about 180 characters of text.

`DiscoverPage` loads everything with Apollo `useQuery` in the browser, so the server rendered a skeleton. A `BrowseHub` crawl fallback written for exactly this problem is still used on `/search`, but it had been replaced on `/explore` by a skeleton to avoid a visual flash.

**Fix.** `DiscoverPage` takes optional `initialPosts` and `initialTitle` props. The route fetches the first page on the server (`features/discover/queries/browse.server.ts`) and renders the same `DiscoverGridCard`s in place of the skeleton until the first client load settles. Later filter changes still show the skeleton.

The server HTML now has 20 real cards, with crawlable `<a href>` links, images and prices. Filtered deep links (`?q=`, `?category=`) keep the skeleton, so unrelated cards never appear under a filtered heading.

### F06 · Every app page was rendered twice in the HTML (fixed)

**Before.** `components/layout/MainShell.tsx:59` wrapped the page in `<Suspense fallback={<div>{children}</div>}>`. When the page's server data streamed in, React emitted it twice: once as the visible fallback, and again in a hidden segment swapped in by script.

Crawlers that read raw HTML saw two H1s and two copies of every JSON-LD block. The listing page's Product appeared at byte 11,187 and again at 38,062.

This was introduced on 13 Oct 2026 (`0de459d`) to keep `useSearchParams()` from forcing client rendering on static routes.

**Fix.** The search-param reader now has its own empty-fallback Suspense boundary and reports up through state. The page is never inside a boundary whose fallback is itself.

| Page (production build) | Before | After |
|---|---|---|
| `/en/content/dining-table` | 130 KB HTML, 2 H1s, 2× JSON-LD | 91 KB HTML, 1 H1, 1× JSON-LD |
| `/en/stores` | 1,330 KB HTML, 2 H1s, 8 store links | 679 KB HTML, 1 H1, 24 store links |

One known trade-off: on desktop, a *direct* load of `/explore?category=…` now gets the sidebar padding at hydration, together with the sidebar itself, which already rendered client-side.

### F16 · ISR is inert on every app route (open)

`components/providers/ApiPreconnect.tsx:33` calls `cookies()`. It's mounted in the `(shell)` layout (`app/[lang]/(app)/(shell)/layout.tsx:23`), which makes every route in the group dynamic.

The build output marks `ƒ /[lang]/content/[id]` as dynamic even though the page exports `revalidate = 3600`. The same applies to Explore, Search, Stores and the video pages.

**Consequences:**
- Every crawl of a listing is a fresh server render. API responses are still cached by the fetch Data Cache: for a day by default, and for an hour for single-listing lookups (`SINGLE_LISTING_CACHE`, see implementation log § 7).
- There is no stale-page fallback when a regeneration fails.

**Why it wasn't changed here.** Removing the cookie read would make `/explore` statically prerenderable. `DiscoverPage` reads `useSearchParams`, so `/explore` would then bail out to client rendering and lose the server content added for F04.

**Recommended approach:**
1. Move the signed-in `preconnect` to a client `ReactDOM.preconnect()` call.
2. Mark the routes that need request-time rendering explicitly, with `await connection()` or `dynamic = "force-dynamic"`.
3. Measure time to first byte and function invocations before and after.

### F07 · No listing linked to a subcategory page (fixed)

All 60 listings sampled have a **top-level** `categoryId`; the subcategory exists only as `aiClassification.level2`. So the category trail always stopped at the top level, and `categoryHref` never produced an `/explore/{category}/{subcategory}` link.

**Fix.** The listing page appends `level2` to the trail when the classifier's `level1` matches the listing's category. Every listing now carries a crawlable link to its subcategory, both in `ListingSeoSummary`, which renders before hydration, and in BreadcrumbList JSON-LD. The desktop breadcrumb shows it too. All three sampled links returned 200.

### Verified correct

- `ListingSeoSummary` puts the title, price, location, caption, specs, seller link and buyer-safety note into the server HTML of every listing.
- Profiles, county pages, `/for-sale/*`, the blog and `/search` server-render their listing links.
- Grid cards use `next/link`, so they're real `<a href>` elements.

---

## 3. URL architecture and canonicalisation

| Pattern | Behaviour (production build) | Assessment |
|---|---|---|
| `shopi.co.ke/*` | 308 → `https://www.shopi.co.ke/*` | Correct. The apex root takes two hops (apex → www → `/en`). |
| `/` | 308 → `/en` | Correct. |
| Trailing slash | `/en/about/` → 308 `/en/about` | Correct. |
| Listing by id or legacy slug | 308 → `/en/content/{slug}` | Correct (`permanentRedirect`). |
| `/en/profile/{username}` | 308 → `/en/@{username}` | Correct. |
| `/en/video/{slug}` | Self-canonical watch page for playable videos (changed 2026-10-18); non-video listings 307 to the listing | Correct. A 308 would be better for non-video listings (low). Pointing it at `/content/{slug}` left every video "not on a watch page" in Search Console. |
| `?utm_*` and other unknown parameters | 200, canonical without parameters | Correct. |
| `/sw/*` (untranslated pages) | Canonical → `/en/*`, no `sw` hreflang | Correct, per the policy in `lib/metadata.ts`. |
| `/EN/about`, `/fr/content/x` | 307 → `/en/EN/about` → 404 | Low: uppercase or unknown locales aren't normalised. |
| `/explore?category=x` | Canonical → `/en/explore` | Consistent, but it means top-level categories have no indexable page (F18). |

Listing slugs come from the title at creation. Repeated titles get `-2`, `-3` and so on, for example `comica-ejoy-d10-pro-…-10`. The API resolves both the slug and a trailing ObjectId, so links survive.

---

## 4. Sitemaps

### F05 · About a third of listings never reached the sitemap (fixed)

**Before.** The listing walk was one newest-first cursor walk with a 20-second budget (`app/sitemap.ts:50`). Measured against live data on 16 Oct 2026, each page took about 1.05 s and the full walk 32.5 s. The budget ran out after page 19, and the built sitemap held **978 of 1,520** live listings (64%).

Production API latency is likely lower, so coverage there was probably higher; that's unverified. The same design caps coverage as inventory grows.

**Fix.** Walk the 17 top-level categories in parallel, sharing the same budget. Every listing has a top-level category, and the union of the per-category walks was all 1,520. A two-page all-categories newest walk runs alongside as a safety net for freshness and anything uncategorised. If the taxonomy can't be fetched, the old single walk is the fallback.

The final build's sitemap holds **1,520 of 1,520** listings. Electronics, the largest category, takes about 24 s locally under parallel load, so it is the current bound. See F05-next in the README for scaling past this.

### F08 · `lastmod` was the generation time on about 140 URLs (fixed)

Static pages, county pages, for-sale pages, car-selling pages and featured profiles were all stamped `lastModified: now` (before: lines 325, 334, 345, 360, 374), so they "changed" on every hourly rebuild.

- Google uses `lastmod` only if it's "consistently and verifiably accurate" ([build-sitemap docs](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), updated 2026-07-08).
- Bing names generation-time stamps as the common error that makes it distrust a sitemap's dates ([Bing Webmaster blog, Feb 2023](https://blogs.bing.com/webmaster/february-2023/The-Importance-of-Setting-the-lastmod-Tag-in-Your-Sitemap)).

That puts the accurate listing dates at risk too. **Fix:** `lastmod` now appears only on listings, profiles (their newest listing) and blog posts.

### Other sitemap observations

- **Well-formed:** both sitemaps parse, every URL is `https://www.shopi.co.ke`, there are no duplicates, and TikTok-signed image URLs are excluded (existing guard).
- **`priority` and `changefreq`** are ignored by Google per the same documentation, so they're harmless but meaningless.
- **F29 (low).** Profiles appear in both `/sitemap.xml` (derived from listings) and `/sellers/sitemap.xml`, with different `lastmod` sources. Consider listing profiles only in the sellers sitemap.
- **Scaling.** One sitemap holds at most 50,000 URLs or 50 MB. The main sitemap is 1.2 MB for about 2,000 URLs, about 0.6 KB per URL with image and hreflang entries. A sitemap index with per-category listing sitemaps will be needed long before 50,000 listings, and the sequential walk will need an API-side sitemap query well before that.

---

## 5. Metadata

| Page type | Title pattern (live data) | Notes |
|---|---|---|
| Homepage | "Buy and Sell Online in Kenya \| Shopi" | One H1: "Buy and sell anything in Kenya". |
| Listing | "{title} · {KES price} · {place}, {county} \| Shopi" | Unique per listing; price omitted when unstated (F01). |
| Subcategory (new) | "{Subcategory} for Sale in Kenya \| Shopi" | "…in Kenya" for services, jobs, events and property. |
| County | "Buy & Sell in {County} — Free Marketplace \| Shopi" | 10 curated counties. |
| For-sale intent | "{Label} for Sale in Kenya \| Shopi" | See F12 on empty pages. |
| Profile | "{Name} (@{handle}) · {County} \| Shopi" | |
| 404 | Site default title, two robots tags (`noindex` and `index, follow`) | F25, low. |

### F01 · "Free" was claimed for listings with no stated price (fixed)

**Before.** The listing page labelled `amount === 0` as "Free" in the `<title>`, meta description and OG tags (before: `content/[id]/page.tsx:177`). `productSchema` emitted an Offer with `price: 0` (`lib/structured-data.ts:322`). The crawler summary, desktop layout, `BrowseHub`, county and for-sale pages, the OG image and `catalog.json`/`.md` all said "Free" too.

**Why it was wrong.**
- The composer starts every draft with `isFree: true` and no price (`stores/create.ts:218`), so a blank price is stored as 0.
- `ImmersiveMeta.tsx:51` already documented that "a zero amount means the seller never entered a price… It does NOT mean free".
- None of the 8 zero-priced listings in the 300 newest was actually free. They included a used Oppo phone, paid knotless braiding and a training course.
- Across all live listings, **78 (5.1%)** have amount 0.
- Google documents `price: 0` as the way to mark a product "available without payment" ([product snippet docs](https://developers.google.com/search/docs/appearance/structured-data/product-snippet), updated 2026-09-08). This markup was making a false claim.

**Fix.**
- A shared `listingPriceText()` in `lib/format.ts` documents the rule.
- Titles, descriptions and structured data omit the price.
- The Product node keeps everything except the Offer. That makes these few listings ineligible for product snippets, which is the honest outcome, and a comment says so.
- Visible surfaces show "Price on request", matching the feed cards.

### F23 · Place names in titles (open, low)

`location.placeName` comes from Google Places and is often a business or building ("Ethanest Solutions", "Club HQ", "The Bazaar"), so titles read "Dining table · KES 30,000 · Ethanest Solutions, Meru". The county is always present, and the subcounty (`subregion`) exists on 299 of the 300 newest listings.

Consider "{subregion}, {county}" when the place is a point of interest. That needs the place type stored at creation.

---

## 6. Marketplace SEO

### Inventory reality (16 Oct 2026, live, public)

| Measure | Value |
|---|---|
| Live listings | 1,520 (28% video) |
| By category | Electronics & Technology 815 · Fashion 328 · Home & Living 152 · Health & Beauty 81 · Automotive 57 (cars: 20) · Services 21 · Baby & Kids 13 · Food 11 · Industrial 9 · Books 9 · Sports 8 · Agriculture 7 · Pets 5 · **Property 2** · Jobs 1 · Other 1 |
| By county | Nairobi 835 · Meru 74 · Garissa 59 · Nyandarua 59 · Kiambu 56 · Kajiado 46 · Kisumu 42 · Kisii 32 · Kericho 26 · Uasin Gishu 26 · Homa Bay 24 · Nakuru 24 · Mombasa 15 · … (32 counties have at least one listing) |
| Subcategories with ≥1 / ≥5 / ≥10 listings | 136 / 50 / 31 |
| Sellers with live listings | 332. **One seller holds 662 (43.6%)**; the top five hold 48.6%. |

### F12 · Most curated landing pages show few or no listings (open, high)

Of the 36 `/for-sale/{slug}` pages (all indexable), **15 show 0 listings** in their HTML:

> toyota-premio, probox, plots, houses-for-rent, infinix, beds, home-services, farm-produce, livestock, toyota-axio, toyota-fielder, nissan-note, subaru-forester, isuzu-d-max, toyota-hiace

**12 show 1–4.** Only 9 show 5 or more: cars, phones, iphone, samsung, laptops, tvs, skincare, furniture, sofas. `/en/property-for-sale-kenya` shows 0.

An indexable "Toyota Fielder for sale in Kenya" page with no Toyota Fielders gives searchers nothing. Google reports pages like this as soft 404s, and at scale they read as doorway pages.

This needs an owner decision; options are in the README. Car-*selling* pages (`/sell-car-kenya/*`) are different: they target sellers and are useful without inventory.

### F13 · Curated pages find listings by text query, with poor recall (open, medium)

`/for-sale/{slug}` fetches with `query: page.query`. `/for-sale/home-appliances` showed **3** listings while the Home Appliances subcategory holds **99**. `/for-sale/beds` showed 0 while Beds & Mattresses holds 6.

Sourcing these pages from the taxonomy (category id plus level-2 label), and falling back to the text query for brand and model pages, would fill many of them immediately.

Until then, `lib/seo/browse-pages.ts` defers to a curated page only where it actually shows inventory (7 pairs). That's why `/explore/electronics-technology/home-appliances` is indexable.

### F18 · No top-level category landing pages (open, opportunity)

Top-level categories exist only as `/explore?category={slug}`, which canonicalises to `/explore`. With 815 electronics and 328 fashion listings, "/en/explore/electronics-technology" pages, built the same way as the subcategory route, would be the strongest category pages Shopi could have.

### F22 · Listing discovery depth (open, medium)

- Explore and category grids paginate by infinite scroll (client cursor); the server HTML has the first 20.
- Profiles server-render only their first page, and one seller has 662 listings.
- The stores directory server-renders 24 of 332 stores.

Discovery beyond page one relies on the sitemap and on related-listing links (13–16 per listing page). Crawlable `?page=N` views (server-rendered, self-canonical, linked with plain `<a>`) for categories and profiles would give every listing an internal path.

### Location pages (assessment)

The 10 county pages are a controlled set. Each shows up to 24 listings filtered by county (`fetchRecentListings(24, county.name)`) and has unique copy, FAQs, and CollectionPage and Place markup. That's the right model.

The set doesn't match inventory, though:
- Laikipia shows 3 listings and Nyeri 7.
- Garissa (59 listings), Kajiado (46), Kisii (32), Kericho (26) and Homa Bay (24) have no page.

A threshold-driven set is recommended (see the keyword map). Category × county combinations are **not** recommended yet: Nairobi is the only county where most categories have more than a handful of listings.

---

## 7. Structured data

| Page | Types | Assessment |
|---|---|---|
| Homepage | OnlineBusiness, WebSite (SearchAction), WebApplication, FAQPage | Valid. SearchAction no longer triggers a feature in Google (sitelinks search box retired Nov 2024); the WebSite node still supports site names. |
| Listing | Product (+Offer when priced), ItemPage, BreadcrumbList, VideoObject (video listings) | Fixed F01 and F11. Duplicate copies removed (F06). |
| Subcategory (new) | BreadcrumbList, ItemList of rendered cards | Matches visible content. |
| County, for-sale and landing pages | CollectionPage or WebPage, BreadcrumbList, FAQPage, ItemList, Service | FAQ markup reflects visible FAQs. |
| Profile | ProfilePage → Person, ItemList | Valid. |
| Blog | BlogPosting, CollectionPage+Blog, BreadcrumbList | Valid. |

- **F11 (fixed).** VideoObject `embedUrl` pointed at the listing page itself; `embedUrl` means a bare player. It now gives `contentUrl` as the Mux HLS stream (`stream.mux.com/{id}.m3u8`).
- **F27 (unchanged, informational).** Google stopped showing FAQ rich results on 7 May 2026 and removed the documentation ([FAQPage docs](https://developers.google.com/search/docs/appearance/structured-data/faqpage)). HowTo rich results were retired in 2023. The existing FAQPage and HowTo markup describes visible content, so it's harmless and may still help other engines. Don't add more of it for rich results.
- **Product on peer-to-peer listings.** Google's guidance separates product snippets (pages where people can't buy directly) from merchant listings (pages where they can buy from you). Shopi listings are the former. The markup correctly has no shipping, returns or ratings, so Search Console's merchant-listing report will show missing-field warnings; those fields would be fabrications.
- **F19 (open).** `availability` is always `InStock` (`lib/structured-data.ts:361`), because listings have no sold state and never expire. See section 10.

---

## 8. AEO (answer engines)

The question-led content is already strong:
- `/faq` has 32 questions, translated to Kiswahili.
- The homepage FAQ, `/about` with the founder bio, `/safety-centre`, `/prohibited-items`, `/sell-in-kenya` and the blog's selling guides all exist.

Direct answers to the brief's sample questions exist and are accurate. For example, "Is Shopi free?" → "Posting is free, and Shopi does not take a commission". "How do buyers reach me?" → in-app messaging, and the buyer and seller arrange payment and delivery themselves.

**Gaps (content):**
- No page answers "where can I sell my phone in Kenya" or "where to sell electronics", even though electronics is 54% of inventory. The `/sell/{slug}` family covers only 11 car models (`lib/seo/sell-car-pages.ts`). The blog has phone *price* guides (`iphone-13-price-in-kenya`, `phones-under-20000-in-kenya`) but no phone or electronics *selling* guide.
- Buyer-safety guidance exists, but listing pages give only one paragraph. A link from each listing to `/safety-centre` would put it one click from every landing page.

---

## 9. GEO (generative engines)

- **Platform requirements (verified in official docs).** Google: "There are no additional requirements to appear in AI Overviews or AI Mode", and "no special schema.org structured data" or AI text files are needed. Pages must be indexed and eligible for a snippet ([AI features docs](https://developers.google.com/search/docs/appearance/ai-features), updated 2025-12-10). OpenAI: `OAI-SearchBot` controls ChatGPT search inclusion; `GPTBot` (training) is independent; `ChatGPT-User` is user-initiated and "robots.txt rules may not apply" ([OpenAI bots](https://developers.openai.com/api/docs/bots)).
- **What exists.** `llms.txt` and `llms-full.txt` (static, last updated 15 Sep 2026), `catalog.json` and `catalog.md` (live snapshot), and Organization, Person and disambiguation markup. These are harmless. Per Google's statement they're not a ranking or inclusion lever, so they shouldn't be expanded at the expense of crawlable pages.
- **F10 (fixed).**
  - `catalog.json` exposed `{ amount: 0 }` prices, which an agent reads as free.
  - `catalog.md` said its sellers are "featured on the Shopi homepage", which has been false since the 26 Sep revamp removed that section. It now says "selected by the Shopi team".
- **F31 (policy decision).** `robots.txt` is `User-agent: * Allow: /`, which admits every search and training crawler. Options are in the README. It's only meaningful once F15 confirms what the edge actually serves.
- **F28 (owner verification).** The organization `sameAs` handles (`@shopiapp` on TikTok, X and Instagram) and founder details should be confirmed as real, active and consistent. Several unrelated companies are called "Shopi"; the existing `disambiguatingDescription` handles that well.

---

## 10. Duplicate content, thin pages and listing lifecycle

| Issue | Measure (all 1,520 live listings) | Recommendation |
|---|---|---|
| **F14** Same seller, same title | 154 groups covering 402 listings (26.4%); **248 surplus copies (16.3%)**. One seller posted the same microphone 10 times in 90 minutes with identical price and caption. | Warn at publish when a seller's new listing matches one of their live listings. Add an admin "merge duplicates" action. Optionally canonicalise exact copies to the oldest. API and product work. |
| **F20** Thin titles | 484 (31.8%) are two words or fewer ("Table", "Furniture"); 21 are all caps | Composer nudge: brand + model + one attribute. Shopi Agent already drafts titles, so prefer its suggestion. |
| **F20** Thin descriptions | 101 empty (6.6%); 464 under 60 characters (30.5%) | Prompt for condition, size or model and what's included. Never auto-generate claims. |
| **F19** No "sold" state or expiry | Listings stay `InStock` until deleted | Add "Mark as sold" (keep the page, show "Sold", drop the Offer, `noindex` after N days) and a re-confirm prompt after 60–90 days. |
| Deleted or removed listings | 404 | Correct. Consider showing related live listings on the 404 for that category. |

---

## 11. Images and video

- Listing images are served from `media.shopi.co.ke` R2 variants, with Next image optimisation disabled (`images.unoptimized: true`, a deliberate quota decision). The sitemap carries up to 6 image entries per listing.
- Alt text is the listing title on cards and the summary. No `<img>` without an `alt` was found on the probed pages.
- Video listings (28%) carry their VideoObject (thumbnail, duration, `contentUrl`) on the watch page `/video/{slug}`, which is self-canonical, server-renders the video and is in the sitemap. The product page `/content/{slug}` has no VideoObject: Google indexes videos only where the video is the main content, and on 2026-10-18 Search Console showed 248 videos, 0 indexed, all "Video isn't on a watch page".

---

## 12. Performance (lab bytes only; no field data available)

| Page (production build) | JS referenced (raw / gzip) | HTML gzip |
|---|---|---|
| `/en` | 846 KB / 260 KB | 21 KB |
| `/en/content/{slug}` | 1,560 KB / 438 KB | 14 KB |
| `/en/explore` | 2,424 KB / 672 KB | 29 KB |
| `/en/marketplace/nairobi` | 699 KB / 210 KB | 17 KB |

CSS is 199 KB raw on every page. About 95% of traffic is mobile. Listing and Explore pages ship 0.4–0.7 MB of gzipped JavaScript, which is likely to hurt INP and LCP on low-end Android, but that's **unverified** without CrUX or Search Console Core Web Vitals data. Collect that before changing architecture.

**F21.** Grid cards inline a blur-placeholder SVG data URL of about 1.8 KB per image. That's 412 KB of the stores page's raw HTML. Transfer is small after gzip (32 KB), but it all has to be parsed. A shared CSS shimmer class would remove it.

---

## 13. Competitors (public pages only)

Jiji's `/nairobi/cars` page:
- Title: "Cars in Nairobi for sale ▷ Price on Jiji.co.ke". H1: "Cars in Nairobi".
- Breadcrumb ends "20176 results for Cars in Nairobi".
- Category × location URLs (`/{location}/{category}`) and listing URLs of the form `/{area}/cars/{make-model-year-colour}-{id}.html`.

Shopi has 20 cars nationwide, so competing on "cars for sale in Nairobi" with inventory pages isn't realistic yet. Shopi's angles are:
- seller-acquisition intent (the car-selling pages already target it);
- video-first listings (28% of inventory);
- electronics and fashion, where Shopi has depth;
- AI-assisted listing creation.

No backlink, ranking or traffic data was available. None is estimated here.

---

## 14. Analytics and measurement

- **Installed.** Vercel Analytics; Google Tag Manager, loaded only after cookie consent (`components/layout/CookieConsent.tsx`); Meta Pixel; Mixpanel (the CSP allows `api.mixpanel.com`); and Cloudflare Web Analytics, injected at the edge. First-touch attribution is in `lib/attribution.ts`.
- **Search Console.** No verification meta tag in the code. Ownership is probably by DNS; confirm. No Search Console or Bing Webmaster data was available to this audit.
- What to measure and how is in [monitoring-plan.md](monitoring-plan.md).
