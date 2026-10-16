# Monitoring plan and production acceptance tests

What to check once this branch is deployed, which baselines to capture, and which numbers to watch afterwards. Nothing here has been run against production yet (see [README.md](README.md#how-this-audit-was-done-and-what-it-could-not-see)).

## Access this needs

| Access | Used for | Status |
|---|---|---|
| Google Search Console, domain property `shopi.co.ke` (Owner or Full user) | Indexing, sitemaps, queries, URL Inspection, Core Web Vitals, crawl stats | Not available to this audit. Check how ownership is verified: there's no verification meta tag in the code, so it's probably DNS. |
| Bing Webmaster Tools | Bing and Copilot indexing; IndexNow | Not available |
| Cloudflare dashboard (zone `shopi.co.ke`) | Bot protection, AI Crawl Control, managed robots.txt, WAF events | Not available |
| Vercel project | Function logs (5xx), ISR and Data Cache behaviour, analytics | Not available |
| Admin → Social proof → performance (seller funnel, `trackSellerEvent`) | Listing views and contacts by traffic source, including `SEARCH` and `AI` | Exists in the product |

## Production verification (run once after deploy)

1. **Smoke test:** `npm run seo:smoke -- https://www.shopi.co.ke --listings=20`. It must print "All checks passed". The listing count should match the live total, which admin or the API's `discoveryResultCount` reports.
2. **robots.txt as served** (Cloudflare can rewrite it): open `https://www.shopi.co.ke/robots.txt` in a browser. It should match `app/robots.ts`: one `User-agent: *` group plus the two `Sitemap:` lines. Any extra `User-agent: GPTBot` / `ClaudeBot` / `Google-Extended` groups, or a `Content-Signal` line, come from Cloudflare's managed robots.txt. Decide on them deliberately (README § E, F31).
3. **Cloudflare bot settings** (Security → Bots, and AI Crawl Control):
   - Verified bots (Googlebot, Bingbot, OAI-SearchBot, PerplexityBot) must not be challenged or blocked, on both `www.shopi.co.ke` and **`api.shopi.co.ke`**.
   - Check Security → Events for blocks and challenges whose user agent contains `Googlebot`, `bingbot`, `OAI-SearchBot` or `PerplexityBot`.
4. **URL Inspection → Test live URL** for a listing, `/en/explore`, `/en/explore/electronics-technology/headphones-earphones`, a profile and the homepage. For each:
   - "Page fetch: Successful", and "Indexing allowed: Yes" (except subcategories marked `noindex` by design).
   - User-declared canonical equals the URL.
   - In **More info → Page resources**, no failed requests to `api.shopi.co.ke`. If they fail, the interactive grids are blank for Google's renderer.
   - The screenshot shows real listings, not skeletons.
5. **Sitemaps:**
   - In Search Console → Sitemaps, resubmit `https://www.shopi.co.ke/sitemap.xml` and `https://www.shopi.co.ke/sellers/sitemap.xml`. Both should be "Success", with discovered URLs about 2,000 and about 330 respectively.
   - In Bing Webmaster → Sitemaps, submit the same two.
6. **Rich results:** run the [Rich Results Test](https://search.google.com/test/rich-results) on one priced listing (Product snippet and Breadcrumb valid), one video listing (Video valid) and one unpriced listing. The unpriced one is expected to show Product as ineligible, with no `offers`.

## Baselines to capture before deploy

Export from Search Console the day before deploying, so the effect of this branch can be measured:
- **Pages report:** totals for indexed and not indexed, plus counts for each "Why pages aren't indexed" reason, especially *Soft 404*, *Duplicate without user-selected canonical*, *Crawled – currently not indexed*, *Discovered – currently not indexed*, *Excluded by 'noindex' tag* and *Server error (5xx)*.
- **Sitemaps:** discovered and indexed counts for both sitemaps.
- **Performance, last 3 months:** clicks, impressions, CTR and position for each page group below, plus the top 200 queries.
- **Core Web Vitals:** mobile and desktop URL-group status.
- **Crawl stats (Settings):** requests per day, average response time, and the share of 5xx and 404 responses.

Local baselines already measured (16 Oct 2026; from [technical-findings.md](technical-findings.md)):

| Measure | Before | After (this branch, production build) |
|---|---|---|
| Listings in sitemap | 978 / 1,520 | 1,520 / 1,520 |
| Indexable category pages (`/explore/{c}/{s}`) with a unique title and content | 0 | 43 |
| Listing links in `/en/explore` HTML | 0 | 20 |
| H1s and Product nodes in a listing's raw HTML | 2 / 2 | 1 / 1 |
| Listing pages with a false "Free" claim | 78 | 0 |
| Same-seller duplicate listings (surplus copies) | 248 (16.3%) | unchanged (product work) |
| Titles of two words or fewer | 484 (31.8%) | unchanged (product work) |

## Page groups for Search Console

Use these as **Performance → Page → Custom (regex)** filters, and as URL prefixes in the Pages report:

| Group | Regex |
|---|---|
| Listings | `/content/` |
| Category pages (new) | `/explore/[^/]+/[^/]+$` |
| Curated product pages | `/for-sale/` |
| County pages | `/marketplace/` |
| Seller-acquisition pages | `/(sell-in-kenya\|sell-car-kenya\|sell/)` |
| Seller profiles | `/@` |
| Blog | `/blog` |
| Homepage | `^https://www\.shopi\.co\.ke/(en\|sw)$` |

## What to watch, and when

| When | Metric | Healthy signal | Act if |
|---|---|---|---|
| Week 1 | Server errors (5xx) in Crawl stats and Vercel logs | Under 1% of crawl requests | Above 1%: the F02 fix is surfacing real API failures. Investigate the API rate limit and egress (F02, F15). |
| Week 1–2 | *Soft 404* count | Falling | Rising: check category pages under the threshold, and the empty curated pages (F12). |
| Week 2–4 | Sitemap indexed / submitted, listings group | Rising toward the submitted count | Flat: inspect sample URLs; likely duplicate (F14) or thin listings (F20). |
| Week 2–6 | Category pages indexed; impressions for the category group | Indexed pages appear; first impressions on "{subcategory} Kenya" queries | No impressions after 6 weeks: add intro copy and internal links from the homepage and hubs (F17). |
| Monthly | Clicks and impressions per page group; top queries | Growth in listings and category groups | Homepage and `/buy-and-sell-in-kenya` trading positions on the same query: resolve the cannibalisation (keyword map). |
| Monthly | Seller funnel by source: `LISTING_VIEW` → `MESSAGE_CLICK` / `CONTACT_REVEAL` / `CALL_CLICK` where source is `SEARCH` or `AI` | Contact rate from search at least as good as other sources | Search traffic that views but never contacts usually means stale or sold listings (F19). |
| Monthly | New sellers whose first-touch source is organic (`lib/attribution.ts` → signup and first post) | Rising | Seller-acquisition pages (keyword map clusters 3–5) aren't converting. |
| Quarterly | Core Web Vitals, mobile (CrUX via Search Console or PageSpeed Insights) | "Good" for the listing and explore groups | INP or LCP "Poor": act on F21 (JS weight). |
| Quarterly | AI answers: ask ChatGPT search, Perplexity, Copilot and Google AI Mode the questions in the keyword map; note whether Shopi is cited and which URL | Shopi cited with correct facts (free, no commission, direct chat) | Wrong facts: check `llms.txt`, `/about` and `/faq` for stale statements, and the entity notes (F28). |

`llms.txt` and `llms-full.txt` are static and dated "Last updated: 2026-09-15". Review them whenever product facts change (fees, features, referral terms), alongside `lib/faq.ts`.

## Acceptance tests for each change

| Change | How to verify in production |
|---|---|
| No false "Free" (F01) | `curl -s https://www.shopi.co.ke/en/content/<an unpriced listing>` shows no `"price":0` in JSON-LD and no "Free" in `<title>`; the page shows "Price on request". The smoke test checks sampled listings. |
| API failure means 500 (F02) | Vercel logs: a listing render error returns 500, not 200. Search Console shows no "Excluded by 'noindex' tag" growth in the listings group. |
| Category pages (F03, F07) | `/en/explore/x/y` returns 404. An inventory-backed subcategory returns 200, has a self-canonical, is indexable, and has at least 1 listing link (smoke test). Any listing's HTML contains `href="/en/explore/{category}/{subcategory}"`. |
| Explore content (F04) | `/en/explore` HTML has listing links (smoke test). |
| Single render (F06) | A listing's raw HTML has exactly one `<h1>` and one Product (smoke test). |
| Sitemap (F05, F08, F09) | Listing count matches the live total; no `/for-you`; `lastmod` only on listings, profiles and blog posts (smoke test). |
| Video markup (F11) | Rich Results Test on a video listing shows VideoObject with `contentUrl`. |
