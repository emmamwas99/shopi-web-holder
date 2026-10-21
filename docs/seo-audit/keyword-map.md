# Keyword and landing-page map

How Kenyan search intents map to Shopi pages.

**No search-volume, difficulty or ranking data was available**, and none is estimated here. Priorities come from three things this audit could measure:
1. **Real inventory**: live listing counts on 16 Oct 2026, below.
2. **Intent fit**: whether the page can actually satisfy the searcher.
3. **What already exists.**

Validate every row against Search Console queries once that access exists (see [monitoring-plan.md](monitoring-plan.md)).

## Rules that prevent cannibalisation

1. **One indexable page per intent.** When two pages target the same query, choose one and make the other link to it. Use `noindex, follow` or a 301 only when the second page has no separate purpose.
2. **Inventory gates indexing for buyer-intent pages.** A "{product} for sale" page with nothing for sale is a soft 404. The rule in `lib/seo/browse-pages.ts` (at least 5 live listings) should apply to the curated `/for-sale` pages too (README § E).
3. **Seller-intent pages don't need inventory.** "Sell my car in Nakuru" is answered by the process, the fees (none) and the pricing advice. That's why the `/sell-car-kenya` pages are fine with 20 cars nationwide.
4. **The homepage targets the brand and the broad marketplace; categories target products; listings target specific items.**

## Inventory that should drive priorities

| Subcategory (live listings) | Indexable page now | Curated page |
|---|---|---|
| Computer Accessories (153) | `/en/explore/electronics-technology/computer-accessories` | — |
| Headphones & Earphones (107) | `/en/explore/electronics-technology/headphones-earphones` | — |
| Phone Accessories (101) | `/en/explore/electronics-technology/phone-accessories` | — |
| Home Appliances (99) | `/en/explore/electronics-technology/home-appliances` | `/for-sale/home-appliances` shows 3; overlaps |
| Phones (79) | `/en/for-sale/phones` | Owns the intent; explore page is `noindex` |
| Audio & Speakers (66) | `/en/explore/electronics-technology/audio-speakers` | — |
| Men's Clothing (66) / Women's Clothing (55) / Shoes (53) | explore subcategory pages | — |
| Cameras (47) / Power Banks & Chargers (40) | explore subcategory pages | — |
| Furniture (35) / Sofas & Couches (25) | `/en/for-sale/furniture`, `/en/for-sale/sofas` | Own the intents |
| Bags (29) · Storage & Drives (26) · Watches (25) · Sneakers (22) · Smartwatches (21) · Car Accessories (20) · Tops (18) · Laptops (17, curated) · Perfumes (16) · Kitchenware (15) · Televisions (13, curated) · Networking (13) · Tables & Desks (12) | explore subcategory pages or curated pages | |
| Cars (20) | `/en/for-sale/cars` (12 shown) | Model pages mostly empty (F12) |
| Property, all subcategories (0–1 each) | none should be indexable for buyers | `/property-for-sale-kenya`, `/for-sale/land`, `/plots`, `/houses-for-rent` show 0–3 |

## Clusters

| # | Cluster and example queries | Intent | Target page | Exists? | Gap | Priority | Success measure |
|---|---|---|---|---|---|---|---|
| 1 | **Marketplace**: "online marketplace Kenya", "buy and sell in Kenya", "free classifieds Kenya", "post an advert Kenya" | Navigational / commercial | `/en` (brand and broad), `/en/buy-and-sell-in-kenya` (keyword hub) | Yes | Homepage title "Buy and Sell Online in Kenya" and the hub's "Buy and Sell in Kenya — Free Local Marketplace" target the same head term. The homepage has no links to inventory or categories (F17). | High | GSC: which of the two ranks for "buy and sell Kenya"; homepage → listing click-through |
| 2 | **Competitor alternatives**: "sites like Jiji", "Jiji alternative", "PigiaMe alternative", "where to sell besides Jiji" | Commercial | `/en/jiji-alternative-kenya`, `/en/pigiame-alternative-kenya`, `/en/marketplace-alternatives-kenya` | Yes | Keep claims factual (fees, features), and re-check them quarterly. | Medium | Impressions and CTR; sign-ups from these pages |
| 3 | **Sell (general)**: "sell online in Kenya", "where to sell used items in Kenya", "sell things online for free Kenya" | Seller acquisition | `/en/sell-in-kenya`; blog "Where to Sell Used Items in Kenya" | Yes | The default `metaTitle` ("Shopi — Sell Online in Kenya…") is used by every page without its own title, such as 404s. Give the 404 its own title (F25). | High | Organic sign-ups → first listing |
| 4 | **Sell phones and electronics**: "where to sell my phone in Kenya", "sell used iPhone Nairobi", "sell laptop Kenya", "uza simu" | Seller acquisition | **New**: `/en/sell/phones` (or a blog guide), modelled on `/sell-car-kenya` | **No** | Electronics is 54% of inventory and has no seller landing page. The `/sell/{slug}` family covers only 11 car models. | **High** | Listings created by organic first-touch users in electronics |
| 5 | **Sell cars**: "sell my car Kenya", "sell car Nakuru", "how much is my car worth Kenya" | Seller acquisition | `/en/sell-car-kenya`, `/en/sell/{model}`, `/en/sell-car-kenya/{city}`; blog pricing guides | Yes | — | Medium | Car listings created; inquiries per car listing |
| 6 | **Inventory-backed categories**: "headphones for sale Kenya", "earphones price Kenya", "power bank Kenya", "phone accessories Nairobi", "men's clothes online Kenya", "shoes for sale Kenya" | Transactional | `/en/explore/{category}/{subcategory}` (43 indexable now) | **New in this branch** | No intro copy beyond the heading and cards. Consider 1–2 sentences per top subcategory, written from real inventory, not boilerplate. | **High** | GSC page group `/explore/`: indexed count, impressions, clicks; organic listing views |
| 7 | **Top-level categories**: "electronics for sale Kenya", "fashion online Kenya", "home appliances Kenya" | Transactional | **New**: `/en/explore/{category}` (F18) | **No** (`?category=` canonicalises to `/explore`) | Build it like the subcategory route. | High | As #6 |
| 8 | **Curated product pages**: "iPhone for sale Kenya", "Samsung phones Kenya", "TVs for sale Kenya", "sofas for sale" | Transactional | `/en/for-sale/{slug}` | Yes (36 pages) | 15 show 0 listings and 12 show 1–4 (F12). Text-query sourcing has poor recall (F13). | High | Pages with at least 5 listings shown; soft-404 count in GSC |
| 9 | **Product and model long tail**: "Comica eJoy D10 Pro price Kenya", "Anker Soundcore Kenya", "Sage Barista Express Kenya" | Transactional | Individual listings `/en/content/{slug}` | Yes (1,520) | 31.8% of titles are two words or fewer; 16.3% of listings are surplus duplicates (F14, F20). | Medium | Listing impressions by query; duplicate rate trend |
| 10 | **Price guides**: "iPhone 13 price in Kenya", "PS5 price in Kenya", "sofa prices Kenya", "phones under 20000" | Informational → transactional | Blog (`lib/articles`) with live listing blocks | Yes (18 articles) | Extend only where inventory exists: power banks, headphones, laptops, TVs. | Medium | Article clicks; article → listing clicks |
| 11 | **Safety and how-to**: "how to avoid scams buying online in Kenya", "what to check before buying a used phone", "is it safe to pay via M-Pesa before delivery" | Informational (AEO) | `/en/safety-centre`; blog | Partly | Listing pages give one safety paragraph and no link to the safety centre. No "check a used phone" guide, despite electronics being the core category. | Medium | AI-answer citations (manual checks); safety-centre entrances |
| 12 | **Local, county level**: "buy and sell in Nakuru", "{county} marketplace" | Local | `/en/marketplace/{county}` (10 counties) | Yes | The set doesn't follow inventory. Laikipia (3) and Nyeri (7) have pages; Garissa (59), Kajiado (46), Kisii (32), Kericho (26) and Homa Bay (24) don't. | Medium | County page impressions; listings per county page |
| 13 | **Local, category × place**: "phones for sale Nairobi", "electronics at the Bazaar" | Local transactional | Not yet | No | Only Nairobi has depth (835 listings). Start with Nairobi × the top 5 subcategories once #6 shows indexing traction. Don't create a category × county matrix. | Later | — |
| 14 | **Property and land**: "land for sale Kenya", "plots for sale Nyahururu", "bedsitters Nairobi" | Transactional | `/property-for-sale-kenya`, `/for-sale/land`, `/plots`, `/houses-for-rent`; blog | Yes | 2 live property listings. Reframe the pages for sellers ("list your plot free") or `noindex` until inventory exists. | Low until supply exists | Property listings created |
| 15 | **Swahili**: "nunua na uza Kenya", "soko la mtandaoni", "uza simu" | Mixed | `/sw` and `/sw/faq` (the only translated pages) | Partly | Demand unknown. Check GSC for Swahili queries before translating more (policy in `lib/metadata.ts`). | Low (validate first) | Swahili query impressions |

## Merge or retarget decisions for the owner

| Pages | Overlap | Suggested resolution |
|---|---|---|
| `/en` and `/en/buy-and-sell-in-kenya` | Same head term ("buy and sell in Kenya") | Lead the homepage title with the brand and value ("Shopi — Kenya's free marketplace: buy and sell locally"), and let the hub own "buy and sell in Kenya". Or fold the hub into the homepage and 301 it. |
| `/en/for-sale/home-appliances` (3 shown) and `/en/explore/electronics-technology/home-appliances` (99) | Same intent | Source the curated page from the taxonomy (F13). Then add the pair to `CURATED_SUBCATEGORY_PAGES`. Or 301 the curated page to the explore page. |
| `/en/phones-electronics-kenya` and `/for-sale/phones`, `/iphone`, `/samsung`, `/tvs` | Hub and spokes | Keep the hub broad ("electronics in Kenya") and make sure it links every spoke. |
| 15 empty `/for-sale` pages and `/property-for-sale-kenya` | Buyer intent, no inventory | Gate indexing on inventory, the same rule as browse pages (README § E2). |

## Cars: what Kenyans search, October 2026

Added 21 October 2026. **Source:** Google autocomplete with `gl=ke`. Seeds that name Kenya or a Kenyan town were expanded a–z, for 41 seeds and about 2,500 suggestions. Autocomplete shows what people type, not how often, so these clusters rank by breadth of variants, not by volume. Check them against Search Console's car queries once that access exists.

| Cluster | What people type (examples) | Intent | Page that answers it |
|---|---|---|---|
| Ownership transfer | "logbook transfer kenya", "ntsa transfer fees", "ntsa transfer process", "how long does logbook transfer take", "ntsa forced transfer", "transfer logbook on ecitizen", "logbook transfer status" | Both sides; the largest cluster | `/blog/logbook-transfer-in-kenya` (**new**) |
| Sale agreement | "car sale agreement kenya pdf", "... template", "... word doc free download", "motor vehicle sale agreement form kenya" | Both sides | `/blog/car-sale-agreement-in-kenya` (**new**, with a copyable template) |
| Buying process | "process of buying a used car in kenya", "steps to follow when buying a car in kenya", "requirements for buying a car in kenya", "how to avoid being conned while buying a car in kenya" | Buyer | `/blog/how-to-buy-a-used-car-in-kenya` (**new**); inspection detail stays in `/blog/how-to-check-a-used-car-before-buying-in-kenya` |
| Where to sell | "car selling sites kenya", "car buyers in kenya", "where can i sell my car in nairobi", "commission for selling a car in kenya" | Seller | `/sell-car-kenya` (FAQ now names every route), city pages, legacy city-by-city post |
| Valuation | "car valuation kenya", "car valuation cost", "online car valuation kenya", "how much is my car worth" | Seller | Legacy post `how-much-is-my-car-worth-in-kenya`; `/sell/{model}` live comparables |
| Edge cases | "selling a duty free car in kenya", "logbook loan", "grounded car buyers" | Seller | `/sell-car-kenya` FAQ (duty-free, logbook loan); transfer guide § logbook loans |
| By owner | "used toyota cars for sale in kenya by owner", "second hand cars sold by owners in kenya", "personal cars for sale in kenya" | Buyer; matches how Shopi works | `/for-sale/cars` (keywords, intro and FAQ updated) |
| Model price | "axio / premio / fielder / aqua / passo / ractis / noah / probox car price in kenya" | Buyer | Only the Vitz has a price guide. Write more only for models with ≥ 3 priced live listings (`MIN_PRICE_SAMPLE`) |
| Budget | "cars under 500k in kenya", "second hand cars below 300k", "best cars under 1 million" | Buyer | **None.** About 4 live cars under KES 500k, so a budget page would be thin. Revisit when inventory grows |
| Import and duty | "kra car duty calculator", "car import age limit kenya 2026", "cost of importing a car to kenya" | Buyer | None. Out of scope for a marketplace, and the figures change; don't build without a maintained source |
| Finance | "car financing kenya", "hire purchase cars", "logbook loans", "mogo cars for sale" | Buyer | Covered briefly in the buying guide. No page; lender comparisons would need verified rates |
| Swahili | "uza gari", "uza nunua gari", "gari za mkopo", "gari transfer fees" | Mixed | `/sw` only translates `/` and `/faq` (policy in `lib/metadata.ts`). Validate demand in Search Console first |

**Facts that changed, and where they now live.** NTSA closed TIMS and moved its services to eCitizen from 2 January 2024. The e-Logbook replaced paper logbooks on 10 June 2026. Every car page used to say "NTSA TIMS portal". `SELLER_PAPERWORK` in `lib/seo/sell-car-pages.ts` is now the single list for the hub and town pages, and the source notes sit at the top of `lib/articles/posts/logbook-transfer-in-kenya.ts`. Re-check both at each content review.
