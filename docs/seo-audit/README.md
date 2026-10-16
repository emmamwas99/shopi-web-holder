# Shopi SEO, AEO and GEO audit — October 2026

**Date:** 16 October 2026 · **Branch:** `SEO-AUDITS` (base `75b4833`) · **Scope:** the web app in this repository (www.shopi.co.ke). The API repository was read to confirm listing lifecycle and data rules.

| Document | Contents |
|---|---|
| [technical-findings.md](technical-findings.md) | Every finding with its evidence (files, lines, measurements, official docs) |
| [implementation-log.md](implementation-log.md) | What changed, file by file, and how it was validated |
| [keyword-map.md](keyword-map.md) | Search intents mapped to pages, prioritised by real inventory |
| [monitoring-plan.md](monitoring-plan.md) | Production checks, Search Console baselines, what to watch afterwards |

## How this audit was done, and what it could not see

- **Code.** Every public route, the metadata and structured-data helpers, `robots.ts`, both sitemaps, the proxy, layouts, and the listing lifecycle in the API (`getContentById`, deletion, rate limiting).
- **Rendering.** Production builds (`next build && next start`) before and after the changes, fetched as Googlebot smartphone, Googlebot desktop, Bingbot, desktop Chrome and iPhone. The raw HTML was parsed for status, title, canonical, robots, H1s, links and JSON-LD.
- **Data.** The local API, which reads the production database, using read-only queries: 1,520 live listings, the category and county distribution, sitemap timing, duplicates and title quality.
- **Platform guidance.** Google Search Central, OpenAI's crawler documentation and the Bing Webmaster blog, cited in the findings.
- **Not verified in production.** Following the team's standing instruction, the live site wasn't fetched. That leaves several things unobserved:
  - Cloudflare, WAF and bot-protection behaviour;
  - robots.txt as Cloudflare actually serves it;
  - live headers and caching;
  - Search Console and Bing data;
  - Core Web Vitals field data;
  - backlinks and rankings.

  None of these is estimated. [monitoring-plan.md](monitoring-plan.md) gives the exact checks, and `npm run seo:smoke -- https://www.shopi.co.ke` automates the HTML-level ones.

---

## A. Executive summary

**Maturity: advanced foundations with gaps in the marketplace core.** A lot of SEO work was already in place and is correct:
- canonical and hreflang helpers with a deliberate Kiswahili policy;
- server-rendered listing pages that 404 when a listing is removed and 308 to their slug URL;
- Organization, Product, Video, Breadcrumb, ProfilePage and BlogPosting markup;
- well-formed sitemaps;
- 10 curated county pages and 36 product-intent pages;
- seller-acquisition pages for cars;
- a blog with live listing blocks;
- AI-facing `llms.txt` and a live catalog.

Most gaps were in how inventory reaches crawlers, and in a few places where the code told engines something untrue.

**Biggest verified barriers (now fixed):**

1. **The browse surfaces were invisible to non-JS crawlers.**
   - `/explore` shipped no listing links.
   - About 290 `/explore/{category}/{subcategory}` URLs shared the site-default title, had no canonical and no content.
   - Any made-up subcategory URL returned 200.
   - No listing linked to any subcategory page.
2. **An API hiccup made listing pages `noindex`.** A failed fetch rendered a 200 page titled "Post" with `noindex`, which Google may act on without rendering.
3. **A third of listings were missing from the sitemap** in local measurement (978 of 1,520), because one sequential walk ran out of its 20-second budget.
4. **False "Free" prices.** 78 listings with no stated price were labelled "Free" in titles, descriptions and Product markup (`price: 0`, which Google reads as "available without payment").
5. **Every app page was rendered twice in the HTML** (two H1s, duplicate JSON-LD), introduced on 13 Oct.

**Biggest opportunities:**
- **Inventory-backed category pages.** Electronics (815 listings) and fashion (328) can carry real "{product} for sale in Kenya" pages. 43 subcategory pages now qualify, and top-level category pages are the next step.
- **Seller acquisition for electronics.** Electronics is 54% of supply but has no "sell your phone" page; the car-selling pages show the model to copy.
- **Listing quality.** 16% of live listings are duplicate reposts, and 32% have titles of two words or fewer. Better listings mean better long-tail rankings.
- **AI search.** No special file or markup is required (Google, OpenAI), so the lever is crawlable, accurate pages, plus confirming that the CDN isn't blocking search crawlers.

**What was fixed:** items 1–5 above, plus:
- `/for-you` removed from the sitemap;
- honest sitemap `lastmod` values;
- correct VideoObject `contentUrl`;
- accurate AI-catalog facts;
- a production smoke test (`npm run seo:smoke`).

All of this is validated on a production build; see section D.

**What needs investigation or approval** (section E):
- confirm Cloudflare isn't blocking or rewriting for crawlers;
- decide what to do with the 15 curated pages that show zero listings;
- the homepage's lack of category and inventory links;
- AI-crawler policy;
- duplicate-listing and sold-state product work;
- restoring ISR on listing pages.

---

## B. Audit matrix

Severity: Critical / High / Medium / Low. Confidence: Verified / Probable / Unverified. Evidence details for each ID are in [technical-findings.md](technical-findings.md).

| ID | Area | Finding | Evidence | Sev. | Conf. | Business impact | Recommendation | Status |
|---|---|---|---|---|---|---|---|---|
| F15 | Crawl access | Cloudflare sits in front of the site and bot protection is active on the API host. Whether crawlers (and Google's renderer calling `api.shopi.co.ke`) are challenged, or robots.txt is rewritten, couldn't be checked | `next.config.ts` CSP comment; API returns 403 to CLI clients | Critical if blocking | Unverified | Site-wide | Run monitoring-plan checks 2–4 | Pending (infra access) |
| F02 | Indexability | API failure → 200 + `noindex` + title "Post" on listing pages | Before: `content/[id]/page.tsx:84,228-235`; API limit 600/min/IP shared by SSR | High | Verified (mechanism); production frequency unverified | Every listing, during any API hiccup | Return a 5xx on failure; retry UI for people | **Fixed, tested** (dev simulation: 500) |
| F03 | Categories | `/explore/{c}/{s}`: site-default title, no canonical, empty HTML; any slug returns 200 | Production build probe; route had no `generateMetadata` | High | Verified | About 290 URLs; category queries | Unique metadata, 404s, inventory-gated indexing, server-rendered cards | **Fixed, tested** (43 indexable) |
| F04 | JS SEO | `/explore` HTML had 0 listing links | Production build probe | High | Verified | Main browse page | Server-render the first page of cards | **Fixed, tested** (20 links) |
| F05 | Sitemap | 978 of 1,520 listings in the sitemap (20 s sequential walk) | Timed walk: 31 pages × 1.05 s | High | Verified locally; probable in production as inventory grows | About 36% of listings undiscoverable except by links | Parallel per-category walks | **Fixed, tested** (1,520/1,520) |
| F01 | Structured data / metadata | Unpriced listings (amount 0) labelled "Free"; Offer `price: 0` | Before: `content/[id]/page.tsx:177`, `structured-data.ts:322`; composer default `isFree: true` (`stores/create.ts:218`); 8/8 sampled not free | High | Verified | 78 listings (5.1%) | Treat 0 as unstated everywhere | **Fixed, tested** |
| F12 | Thin pages | 15 of 36 curated `/for-sale` pages show 0 listings, and 12 show 1–4; `/property-for-sale-kenya` shows 0. All are indexable | Production build probe of all 36 | High | Verified | Soft-404 risk; poor searcher experience | Gate indexing on inventory, or source by taxonomy (F13), or reframe for sellers | **Pending (owner decision)** |
| F14 | Duplicates | 248 surplus same-seller copies (16.3% of live listings) | Live data walk | Medium–High | Verified | Duplicate pages, diluted signals, feed quality | Duplicate warning at publish; admin merge | Pending (API/product) |
| F06 | Rendering | Every app page emitted twice in the HTML (2 H1s, 2× JSON-LD) | Before: `MainShell.tsx:59`; HTML offsets 11,187 and 38,062 | Medium | Verified | All app pages; listing HTML −30% after fix | Isolate `useSearchParams` in its own boundary | **Fixed, tested** |
| F07 | Internal links | No listing linked to its subcategory page | 60/60 sampled listings have a top-level `categoryId` | Medium | Verified | New category pages would be orphans | Extend the trail with the classifier's level-2 label | **Fixed, tested** |
| F08 | Sitemap | About 140 URLs stamped `lastmod` = generation time on every rebuild | Before: `app/sitemap.ts:325-374` | Medium | Verified | Engines may distrust all `lastmod`s, including listings | Only real dates | **Fixed, tested** |
| F09 | Sitemap / URLs | `/for-you` in the sitemap; desktop crawlers 307 to `/explore` | `proxy.ts:104`; probes | Medium | Verified | Mixed signals; personalised page | Remove from sitemap; decide on `noindex` | **Fixed** (sitemap); `noindex` pending |
| F13 | Categories | Curated pages fetch by text query: home appliances shows 3 of 99 | Probe vs facets | Medium | Verified | Curated pages look empty | Source by taxonomy, with text fallback for brands and models | Pending (engineering) |
| F16 | Performance / resilience | `cookies()` in the `(shell)` layout makes every app route dynamic; listing `revalidate = 3600` is ignored | `ApiPreconnect.tsx:33`; build marks `ƒ /[lang]/content/[id]` | Medium | Verified | Every crawl is a fresh render; no stale fallback | Client-side preconnect plus explicit dynamic opt-ins, with measurement | Pending (engineering) |
| F17 | Internal links | Homepage: 0 listing or category links (cars only); 6 CTAs to `/upload`, which is auth-only and disallowed | Probe: 36 links, 0 listings | Medium | Verified | The strongest page passes little to inventory | Compact category row and a latest-listings row | Pending (design approval) |
| F18 | Categories | No top-level category pages (`?category=` canonicalises to `/explore`) | `lib/metadata.ts`, probes | Medium | Verified | Largest category queries unserved | `/explore/{category}` route | Pending (engineering) |
| F19 | Lifecycle | No sold state or expiry; Offers always `InStock` | `structured-data.ts:361`; API has no sold status | Medium | Verified | Stale results; poor contact rate | "Mark as sold", re-confirm after 60–90 days | Pending (product) |
| F20 | Content quality | 31.8% of titles are two words or fewer; 30.5% of descriptions are under 60 characters; 6.6% are empty | Live data walk | Medium | Verified | Weak long-tail rankings | Composer nudges; prefer Shopi Agent titles | Pending (product) |
| F21 | Performance | Listing page JS 438 KB gzip, Explore 672 KB gzip; about 1.8 KB of inline placeholder per grid image | Production build measurement | Medium | Verified bytes; CWV impact unverified | 95% mobile audience | Collect CrUX first; then code-split and use a CSS shimmer | Pending (measure) |
| F22 | Discovery | Only page 1 server-rendered on categories, profiles and stores | Code and probes | Medium | Verified | Deep listings rely on the sitemap | Crawlable `?page=N` views | Pending (engineering) |
| F31 | GEO policy | robots.txt allows every crawler, training ones included | `app/robots.ts` | Policy | Verified (repo); live file unverified | AI visibility vs training use | Explicit groups; decide GPTBot and Google-Extended separately | Pending (owner decision) |
| F10 | GEO accuracy | `catalog.json` exposed `price: 0`; `catalog.md` claimed homepage-featured sellers | Before: `marketplace-catalog.ts:137`, `catalog.md/route.ts:30` | Low | Verified | AI answers quoting false facts | Correct both | **Fixed** |
| F11 | Structured data | VideoObject `embedUrl` = the listing page | Before: `structured-data.ts:522` | Low | Verified | Video indexing | `contentUrl` = HLS stream | **Fixed** |
| F23 | Metadata | Titles use Places POI names ("Club HQ, Meru") | Live data | Low | Verified | Local relevance | Prefer subregion when the place is a POI | Pending |
| F25 | Errors | 404 pages: two robots tags and the homepage title | Probe | Low | Verified | Cosmetic | 404 metadata | Pending |
| F26 | Headings | Stores H1 reads "Stores· 332" | Probe | Low | Verified | Cosmetic | Move the count out of the H1 | Pending |
| F27 | Structured data | FAQPage and HowTo no longer produce Google rich results (FAQ ended 7 May 2026) | Google docs | Low | Verified | Expectations | Keep where visible; add no more for rich results | Intentionally unchanged |
| F28 | Entity | `sameAs` handles and founder facts need owner confirmation | `structured-data.ts` | Low | Unverified | Knowledge panel and AI accuracy | Confirm accounts exist and are consistent | Pending (owner) |
| F29 | Sitemap | Profiles listed in both sitemaps with different `lastmod` sources | Sitemap output | Low | Verified | Minor | List profiles only in `/sellers/sitemap.xml` | Pending |
| F30 | GEO | `catalog.*` served with `X-Robots-Tag: index` (may appear in Google results) | Response headers | Low | Verified | Minor | Owner choice | Intentionally unchanged |

---

## C. Existing implementation inventory

| Status | What |
|---|---|
| **Correct** | Canonical and hreflang helpers and the `/sw` policy (`lib/metadata.ts`). Listing slug URLs with 308 from ids. 404s for removed, rejected, private and unknown listings, profiles, counties, blog posts and routes. robots.txt private-route rules and sitemap references. Apex → www 308. `/` → `/en` 308. Trailing-slash 308. `noindex` on internal search results. Metadata in `<head>` for all user agents. Organization (with disambiguation), WebSite, ProfilePage and BlogPosting markup. County pages (10, county-filtered listings). Seller-acquisition car pages. Blog with an audited content system (`npm run seo:audit`). Crawler-visible listing summary (`ListingSeoSummary`). TikTok-signed image URLs kept out of the sitemap. OG images per listing, profile and blog post. |
| **Partial** | Sitemaps (now full coverage; will need an index and an API sitemap query at scale). Curated `/for-sale` pages (good copy, weak inventory, F12/F13). Internal linking (good from listings, profiles and landing pages; weak from the homepage; no category pagination). Structured data (Product correct for classifieds but no sold state). Performance (sensible image and caching decisions, heavy JS). AI-facing files (accurate after F10; static `llms.txt` needs a review cadence). |
| **Incorrect (fixed here)** | F01–F11 above. |
| **Missing** | Top-level category pages (F18). An electronics or phone seller page (keyword map). Sold or expired listing state (F19). Duplicate-listing controls (F14). Crawlable pagination (F22). A production SEO smoke test (added: `scripts/seo-smoke.mjs`). |

---

## D. Fixes completed

Details and file lists are in [implementation-log.md](implementation-log.md).

1. **No false "Free".** One rule (`listingPriceText`) across listing metadata, Product JSON-LD, the visible listing page, hub, county and for-sale cards, the OG image and the AI catalog.
2. **API failures return 500 instead of `noindex`.** Real 404s are unchanged, and a retry screen is added.
3. **Single render of app pages** in `MainShell`. Listing HTML went from 130 to 91 KB, with one H1 and one Product.
4. **Crawlable browse surfaces:**
   - server-rendered first page on `/explore` and on subcategory pages;
   - unique subcategory metadata and canonicals;
   - 404 for unknown slugs;
   - inventory-gated indexing (`lib/seo/browse-pages.ts`);
   - Breadcrumb and ItemList markup;
   - a subcategory link from every listing.
5. **Sitemap:** parallel listing walk (1,520 of 1,520), 43 category pages, `/for-you` removed, honest `lastmod`.
6. **VideoObject:** `contentUrl` points to the HLS stream.
7. **Daily rebuilds instead of hourly** (requested). Landing pages, profiles and sitemaps regenerate every 24 hours. Single-listing lookups keep a 1-hour cache, so a listing opened before admin approval isn't stuck on a 404 for a day.
8. **`npm run seo:smoke`** for production verification.

**Validation:**
- `tsc` clean;
- ESLint shows 0 errors (warnings pre-existing);
- `npm run seo:audit` passes;
- `next build` passes with no render-mode changes;
- the smoke test passes on the final production build.

---

## E. Outstanding recommendations

### E1. Needs infrastructure or Search Console access (do first)

1. **Confirm the edge isn't blocking crawlers (F15).** Follow monitoring-plan steps 2–4: robots.txt as served, Cloudflare bot and AI-crawler settings for both `www` and `api`, and URL Inspection page resources.
2. **Capture the Search Console baselines** before deploy, then resubmit both sitemaps (monitoring plan).
3. **Run the smoke test against production** after deploy.

### E2. Needs an owner decision

1. **Empty curated pages (F12).** Options, best first:
   - (a) source listings by taxonomy (F13) and gate indexing at 5 or more listings, using the same rule as the browse pages;
   - (b) keep the pages but make them seller pages ("list your Toyota Fielder free") with `noindex` on the buyer framing until inventory exists;
   - (c) `noindex` them now.

   The audit didn't change them, because a mass indexing change to deliberately built pages needs approval.
2. **AI crawler policy (F31).** Recommendation:
   - allow `Googlebot`, `Bingbot`, `OAI-SearchBot`, `PerplexityBot` and `ChatGPT-User` explicitly;
   - decide separately on training crawlers (`GPTBot`, `Google-Extended`, `CCBot`, `ClaudeBot`). OpenAI documents GPTBot and OAI-SearchBot as independent, and Google-Extended doesn't affect Search.
3. **`/for-you` indexing (F09).** It's a personalised feed with no H1, and desktop crawlers are redirected. Suggest `noindex, follow`.
4. **Homepage links (F17).** Add a compact "Browse categories" row (the top inventory-backed category pages) and a "Latest listings" row. Point the secondary CTAs at browse pages rather than `/upload`. This is a design call; the 26 Sep revamp was deliberate.
5. **Homepage vs `/buy-and-sell-in-kenya` cannibalisation** (keyword map).
6. **Feed "Free" label.** `PriceTag` on the desktop feed rail still shows "Free" for amount 0; that surface isn't crawler-facing.

### E3. Engineering (next sprints)

1. **Top-level category pages** `/explore/{category}` (F18), reusing `browse.server.ts`.
2. **Source curated pages by taxonomy** (F13).
3. **Crawlable pagination** `?page=N` for categories and profiles (F22).
4. **Restore ISR on listing pages (F16).** Move the signed-in preconnect to the client, add explicit `connection()` where request-time rendering is needed, and measure TTFB and invocations.
5. **Sitemap scale (F05-next).**
   - An API sitemap query: ids, slugs, `updatedAt` and image URLs, about 1,000 per page;
   - a sitemap index with per-category children once the walk approaches its budget;
   - profiles only in the sellers sitemap (F29).
6. **Small fixes:** 404 metadata (F25), the stores H1 (F26), POI place names in titles (F23).
7. **Performance (F21), after field data:** split the desktop listing layout and heavy dependencies out of the listing first load; replace per-image blur data URLs with a CSS shimmer.

### E4. Product and API

1. **Duplicate-listing guard (F14)** at publish, plus an admin merge tool.
2. **"Mark as sold" and listing expiry (F19).**
3. **Listing-quality nudges (F20).** A title template (brand + model + attribute) and a description prompt; prefer Shopi Agent suggestions.
4. **API rate limit and SSR (F02).** Confirm the limiter's `req.ip` behind Cloudflare (`trust proxy` is 1). Consider exempting or raising the limit for the web tier's server-to-server traffic.

### E5. Content (needs approval; no fabricated facts or prices)

1. **"Sell your phone / electronics in Kenya"** page, modelled on `/sell-car-kenya` (keyword map cluster 4).
2. **One or two sentences of intro copy** for the top 10 category pages, written from what's actually listed.
3. **Buyer-safety link from every listing** to `/safety-centre`, and a "how to check a used phone before buying" guide.
4. **County page set by inventory:**
   - add Garissa, Kajiado, Kisii, Kericho and Homa Bay;
   - review Laikipia (3 listings) and Nyeri (7).

---

## F. Keyword and landing-page roadmap (summary)

Full map in [keyword-map.md](keyword-map.md). Priorities follow inventory, not guessed volumes:

1. **Electronics and fashion category pages.** 43 indexable now, top-level pages next.
2. **Seller acquisition for electronics**, alongside the existing car pages.
3. **Fix or gate the empty curated pages.** Cars and property have the most pages and the least stock.
4. **Listing-level long tail,** through better titles and fewer duplicates.
5. **Local pages driven by inventory.** Counties first; Nairobi × category only after category pages gain traction.

---

## G. 30/60/90-day roadmap

| Window | Technical | Content | Authority and entity | Measurement |
|---|---|---|---|---|
| **Days 0–30** | Deploy this branch. Edge and crawler checks (E1). Decide F12 and F31. Small fixes (F25, F26). Start top-level category pages (F18). | Sell-electronics page draft. Intro copy for the top 10 category pages. | Confirm the `sameAs` accounts exist and match (F28). List Shopi only in directories it genuinely qualifies for, such as company profiles; no Google Business Profile, because Shopi has no storefront or service area. Keep `/about` and `llms.txt` facts in sync. | Search Console baselines; resubmit sitemaps; smoke test after each deploy; weekly 5xx and soft-404 check. |
| **Days 31–60** | Curated pages sourced by taxonomy (F13). Crawlable pagination (F22). ISR restoration with measurement (F16). | County set by inventory; safety guide; two price guides for the top electronics subcategories, with live listings only. | Outreach with genuine assets: e.g. a quarterly "what Kenyans sell on Shopi" note built from anonymised category and county counts. | Category-group indexing and impressions; seller funnel `SEARCH` → contact rate. |
| **Days 61–90** | Sitemap index and API sitemap query (F05-next). Performance work driven by CrUX (F21). Homepage link rows (F17). | Expand guides where Search Console shows impressions without clicks. | Partnerships that link naturally: Kenyan tech and consumer communities, seller associations. No paid links. | Monthly report by page group; AI-answer citation spot checks; organic seller sign-ups. |

---

## H. Acceptance tests

Run after each deploy:

```bash
npm run seo:smoke -- https://www.shopi.co.ke --listings=20
```

It checks:
- robots.txt answers and doesn't block the site;
- the sitemap covers every listing, holds only `www` URLs, omits `/for-you`, and carries honest `lastmod`s;
- sampled listings have one canonical (to themselves), are indexable, and have one H1, parsable JSON-LD, one Product and no `price: 0`;
- `/en/explore` and a category page link to listings;
- unknown listings, categories and routes return 404.

Checks that need a browser or Search Console (URL Inspection page resources, Rich Results Test, Cloudflare settings, coverage trends) are listed change by change in [monitoring-plan.md § Acceptance tests](monitoring-plan.md#acceptance-tests-for-each-change).
