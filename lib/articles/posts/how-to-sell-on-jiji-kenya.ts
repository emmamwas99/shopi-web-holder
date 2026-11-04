import type { Article } from "../types.ts";

/**
 * "How to sell on Jiji Kenya" — the biggest Jiji cluster in Google
 * autocomplete for Kenya (gl=ke, 4 Nov 2026): "how to sell on jiji kenya",
 * "... for free", "how to post on jiji kenya", "how to post an ad on jiji",
 * "how much does it cost to post on jiji", "how to become a seller on jiji",
 * "is jiji legit", "is jiji free". These are sellers choosing where to list,
 * which is exactly who Shopi wants to meet — so the article answers the Jiji
 * question properly first, then offers Shopi as a second place to list.
 *
 * Every Jiji fact comes from Jiji's own help pages, checked 4 Nov 2026 and
 * linked in the sources section: posting steps (faq/8), review (faq/9, 12,
 * 130), posting rules (faq/10), ad lifetime (faq/15), the free-ad limit
 * (faq/113), packages (faq/48, 50), Safe Deal (faq/128, 184, 185, 187, 195),
 * Verified ID (faq/153), selling tips (faq/131). The OLX history is from
 * TechMoran (2019). No prices: Jiji shows them per category, and they change.
 * Re-check all of it at each content review.
 */
export const article: Article = {
  slug: "how-to-sell-on-jiji-kenya",
  status: "published",
  intent: "selling-guide",
  title: "How to Sell on Jiji Kenya: Free Ads, Costs and Tips (2026)",
  seoTitle: "How to Sell on Jiji Kenya (2026): Free Ads, Costs, Tips",
  seoDescription:
    "How to sell on Jiji Kenya step by step: posting a free ad, the free-ad limit, what TOP and Boost are for, Safe Deal, and how to sell faster and safely.",
  excerpt:
    "Here's how to sell on Jiji Kenya: sign in, tap Sell, add photos, a clear title, a description and a fair price, then post the ad for review. Posting is free up to a limit of ads in each category; to post more, or to push ads higher, Jiji sells TOP and Boost packages. Many sellers also list the same items free on Shopi.",
  primaryKeyword: "how to sell on Jiji Kenya",
  keywords: [
    "how to sell on Jiji Kenya for free",
    "how to post on Jiji Kenya",
    "how to post an ad on Jiji",
    "how much does it cost to post on Jiji",
    "how to become a seller on Jiji",
    "is Jiji free",
    "is Jiji legit",
    "Jiji premium packages",
  ],
  category: "selling",
  tags: ["selling", "jiji", "classifieds", "marketplaces"],
  author: "shopi-team",
  publishedAt: "2026-11-04",
  sections: [
    {
      id: "steps",
      heading: "How to post an ad on Jiji, step by step",
      blocks: [
        {
          type: "p",
          text: "This is how to sell on Jiji Kenya, as Jiji's own help pages describe it. You need an account, and one ad for each item:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Sign in** to Jiji on jiji.co.ke or in the Jiji app, or create an account.",
            "**Tap Sell** to start a new ad.",
            "**Fill in the details.** Choose the right category, upload photos of your item, write a clear title and a detailed description, and enter a fair price.",
            "**Check everything and tap Post ad.**",
            "**Wait for the review.** Jiji checks every ad against its rules before it goes live. You get an email when it's live, or a note telling you what to fix.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "If you can't find your ad",
          text: "It's probably still in review. Jiji says ads usually appear in search within a few hours. Editing a live ad sends it back for review, and it disappears from search until it's approved again.",
        },
      ],
    },
    {
      id: "is-it-free",
      heading: "Is it free to sell on Jiji?",
      blocks: [
        {
          type: "p",
          text: "Yes, up to a point. Jiji gives each seller a number of free listings in each category, which it calls the ads limit. Once you reach the limit in a category, you need a Premium Package to post more there.",
        },
        {
          type: "p",
          text: "So if you sell a few things now and then, free ads are usually enough. If you're a shop with a lot of stock in one category, expect to hit the limit, and to be offered a package. The limit for your category is shown on Jiji when you choose it.",
        },
      ],
    },
    {
      id: "costs",
      heading: "What Jiji charges for: TOP, Boost and Pro Sales",
      blocks: [
        {
          type: "p",
          text: "Everything you pay Jiji for is about visibility and volume. There's no commission on a sale you arrange directly with the buyer. Jiji sells:",
        },
        {
          type: "list",
          items: [
            "**TOP**, which puts one ad at the top of search results for 7 or 30 days.",
            "**Boost packages** (Basic, Premium, VIP, VIP Gold, and Diamond or Enterprise for large sellers), which show all your ads more often for 1, 3, 6 or 12 months, auto-renew them, and add TOP+ credits on the higher tiers.",
            "**Pro Sales**, pay-per-click promotion that comes with every Boost package: you set a budget and pay only for clicks on your ads.",
          ],
        },
        {
          type: "p",
          text: "Packages are grouped by what you sell (Others, Cars, Property, or All-in-one for sellers across many categories). Prices depend on the group and the length, and Jiji shows them when you choose your category, so check them in your account before you budget.",
        },
      ],
    },
    {
      id: "approval",
      heading: "Why Jiji declines ads, and how to get approved first time",
      blocks: [
        {
          type: "p",
          text: "Most declined ads break one of a handful of posting rules. Get these right and your ad goes live on the first try:",
        },
        {
          type: "checklist",
          items: [
            "One item per ad. Jiji's rule is \"1 ad = 1 item\".",
            "Your own photos: unique pictures you took, with no phone numbers, watermarks, screenshots or other sites' logos.",
            "A realistic price. Prices far from what similar items sell for get declined.",
            "The right category, and a title that says exactly what you're selling.",
            "No duplicates. Posting the same ad twice gets the copy rejected.",
            "The item is in Kenya and legal to sell.",
          ],
        },
        {
          type: "p",
          text: "Photos get the closest look. Jiji's list of reasons for declining an ad includes screenshots, photos showing several items, low-quality or irrelevant images, photos already used in an earlier ad, and pictures with a price, a logo or writing on them. One sharp photo of the actual item beats five borrowed ones.",
        },
        {
          type: "p",
          text: "If an ad is declined, Jiji tells you what to change. Fix it and post again.",
        },
      ],
    },
    {
      id: "how-long",
      heading: "How long Jiji ads stay up",
      blocks: [
        {
          type: "p",
          text: "Jiji ads stay live for one to three months from the last renewal, then they're deleted automatically unless you renew them. Close an ad as soon as the item sells. Jiji asks sellers to, and it stops buyers calling about something that's gone.",
        },
      ],
    },
    {
      id: "safe-deal",
      heading: "Jiji Safe Deal: getting paid through Jiji",
      blocks: [
        {
          type: "p",
          text: "On eligible ads, buyers can pay through Jiji's Safe Deal checkout instead of paying you directly. Jiji holds the payment while the item is delivered and releases it to you 24 hours after delivery, unless the buyer reports a problem in that window.",
        },
        {
          type: "list",
          items: [
            "To receive Safe Deal orders you need an active Boost Package, plus verification and payout details set up under Settings, then Safe Deal.",
            "The buyer pays the item price plus a delivery fee and any payment fee shown at checkout.",
            "You accept the order, choose a delivery service from those offered and add the tracking number before the deadline, or deliver it yourself where the order allows.",
            "Not every ad qualifies: it needs a price above zero, and its category and price have to be eligible.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Outside Safe Deal",
          text: "Jiji's advice is plain: don't ask buyers for advance payments, don't send one, and never pay through a link sent in chat.",
        },
      ],
    },
    {
      id: "verified",
      heading: "The Verified ID badge",
      blocks: [
        {
          type: "p",
          text: "Sellers with an active Boost Package can verify their identity with an ID document and a selfie to get a Verified ID badge on their profile and ads. The badge shows only while a package is active; the verification itself stays on record.",
        },
      ],
    },
    {
      id: "sell-faster",
      heading: "How to sell faster on Jiji, and anywhere else",
      blocks: [
        {
          type: "list",
          items: [
            "**Photos that answer questions.** Daylight, several angles, and any wear shown honestly. Buyers trust a scratch they can see over a listing that hides it.",
            "**Specific titles.** \"Samsung Galaxy A54, 128GB, with box\" gets found; \"Phone for sale\" doesn't.",
            "**A price inside the market range.** Look at what similar items are listed for first.",
            "**Fast replies.** Jiji's own tip is to stay online: buyers message several sellers and buy from whoever answers.",
            "**Feedback.** Ask happy buyers to rate you; good reviews help the next sale.",
            "**No deposits.** Don't ask buyers to pay before they've seen the item. It's the first thing a cautious buyer walks away from.",
          ],
        },
        {
          type: "p",
          text: "The same habits work on every marketplace. For item-by-item advice, see [where to sell your phone in Kenya](/where-to-sell/phones) and [where to sell used electronics](/where-to-sell/electronics).",
        },
      ],
    },
    {
      id: "is-jiji-legit",
      heading: "Is Jiji legit?",
      blocks: [
        {
          type: "p",
          text: "Jiji is a legitimate, established classifieds company: it took over OLX's Kenyan business in 2019 and runs one of Kenya's best-known marketplaces. As on any classifieds site, the risk comes from individual users rather than the site, so the usual rules apply: inspect the item before paying, meet somewhere public, use Safe Deal where it's offered, and never pay a deposit to a stranger. Our [safety guide](/safety-centre) covers the rest.",
        },
      ],
    },
    {
      id: "also-shopi",
      heading: "Selling on Jiji and Shopi at the same time",
      blocks: [
        {
          type: "p",
          text: "Nothing stops you posting the same item on more than one site, and it's the simplest way to reach more buyers. Shopi is a free Kenyan marketplace with no cap on free listings per category, no paid tier and no commission. Post from a photo or a short video, let Shopi Agent draft the listing, and buyers near you find it in a local feed and message you directly.",
        },
        {
          type: "p",
          text: "When the item sells, take it down everywhere. For a side-by-side look at the options, see the [best online selling sites in Kenya](/marketplace-alternatives-kenya) or the [Jiji alternative guide](/jiji-alternative-kenya).",
        },
      ],
    },
    {
      id: "sources",
      heading: "Sources",
      blocks: [
        {
          type: "p",
          text: "Jiji's help pages, checked on 4 November 2026. Jiji changes its terms from time to time, so check them before you rely on a detail. Shopi is not affiliated with Jiji.",
        },
        {
          type: "links",
          title: "Jiji help pages",
          links: [
            { kind: "external", url: "https://jiji.co.ke/faq/8", label: "How can I sell on Jiji?" },
            { kind: "external", url: "https://jiji.co.ke/faq/113", label: "What does \"ads limit\" mean?" },
            { kind: "external", url: "https://jiji.co.ke/faq/48", label: "Types of Premium Services" },
            { kind: "external", url: "https://jiji.co.ke/faq/10", label: "Posting rules" },
            { kind: "external", url: "https://jiji.co.ke/faq/15", label: "How long will my ads stay on Jiji?" },
            { kind: "external", url: "https://jiji.co.ke/faq/195", label: "How Safe Deal works for buyers" },
            { kind: "external", url: "https://jiji.co.ke/faq/185", label: "Enabling Safe Deal for sellers" },
            { kind: "external", url: "https://jiji.co.ke/faq/153", label: "The Verified ID badge" },
            {
              kind: "external",
              url: "https://techmoran.com/2019/04/03/naspers-sells-olx-africa-to-jiji-in-its-ssa-africa-exit-drive/",
              label: "TechMoran: Naspers sells OLX Africa to Jiji (2019)",
            },
          ],
        },
      ],
    },
  ],
  faq: [
    {
      q: "How do I sell on Jiji Kenya for free?",
      a: "Sign in, tap Sell, add photos, a title, description and a fair price, and post the ad. Each category allows a number of free ads; you only pay if you go over that limit or want your ads promoted.",
    },
    {
      q: "How much does it cost to post on Jiji?",
      a: "Nothing, up to the free-ad limit in each category. To post more, or to put ads at the top of search, you need a paid TOP or Boost package; Jiji shows the prices for your category in your account.",
    },
    {
      q: "How long does Jiji take to approve an ad?",
      a: "Usually a few hours. Every ad is reviewed before it goes live, and you get an email when it's approved, or a note on what to fix.",
    },
    {
      q: "Why was my Jiji ad declined?",
      a: "The usual reasons are several items in one ad, photos with contact details or watermarks, a price far from the market, the wrong category, or a duplicate of another ad.",
    },
    {
      q: "How long do ads stay on Jiji?",
      a: "One to three months from the last renewal. After that they're deleted automatically unless you renew them.",
    },
    {
      q: "Is Jiji legit?",
      a: "Jiji is a legitimate, established classifieds company that took over OLX's Kenyan business in 2019. The risk on any classifieds site comes from individual users, so inspect before paying and use Safe Deal where it's offered.",
    },
    {
      q: "Can I sell on Jiji and Shopi at the same time?",
      a: "Yes. Post the same item on both to reach more buyers, and take it down everywhere when it sells. Shopi is free to post on, with no commission.",
    },
  ],
  marketplaceLinks: [
    { kind: "hub", path: "/sell-in-kenya" },
    {
      kind: "page",
      path: "/marketplace-alternatives-kenya",
      label: "Best online selling sites in Kenya",
      description: "Jiji, PigiaMe, Facebook Marketplace, Jumia, Kilimall and Shopi compared.",
    },
    {
      kind: "page",
      path: "/jiji-alternative-kenya",
      label: "Apps and sites like Jiji in Kenya",
      description: "Free alternatives to list on alongside Jiji.",
    },
    {
      kind: "page",
      path: "/where-to-sell/phones",
      label: "Where to sell your phone in Kenya",
      description: "Marketplaces, phone shops and repairers compared.",
    },
  ],
  related: [
    "where-to-sell-used-items-in-kenya",
    "how-to-sell-on-shopi-complete-guide-for-kenyan-sellers",
    "dropshipping-in-kenya",
  ],
  cta: {
    label: "List it on Shopi too",
    to: { kind: "page", path: "/upload", label: "Post your first item" },
    text: "Post the same item on Shopi in a few minutes. Free, with no commission.",
  },
};
