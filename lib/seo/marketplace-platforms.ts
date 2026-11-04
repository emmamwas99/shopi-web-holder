/**
 * Facts about the places Kenyans sell online, for the comparison page
 * (/marketplace-alternatives-kenya) and the "where to sell" pages.
 *
 * Why this exists: Google autocomplete for Kenya (gl=ke, 4 Nov 2026) shows
 * people asking which site to use far more than they ask for any one site —
 * "best online marketplace in kenya", "best online selling sites / platforms
 * / apps in kenya", "free ads sites in kenya", "apps like jiji", "apps like
 * jumia", "is facebook marketplace available in kenya". Answer engines answer
 * those with a list, so the page that is the clearest, fairest list is the one
 * they quote. Research: docs/seo-audit/keyword-map.md.
 *
 * Rules, the same as lib/seo/competitor-alternatives.ts:
 * - Only what a platform says about itself on its own pages (or, for
 *   history, a named news source), linked in `sources` with the check date.
 * - No prices or commission rates: they change, and a wrong number is a
 *   legal and trust problem. Say where to find the current figure instead.
 * - Say plainly what each one is best at, Shopi's limits included. A list
 *   that crowns its author everywhere doesn't get quoted.
 * Re-check every `checkedOn` source at least quarterly.
 */

export type Source = { label: string; url: string };

export type MarketplacePlatform = {
  id:
    | "shopi"
    | "jiji"
    | "pigiame"
    | "facebook-marketplace"
    | "jumia"
    | "kilimall"
    | "whatsapp-social";
  name: string;
  url?: string;
  /** What kind of place it is, in a few words. */
  type: string;
  summary: string;
  /** Short answers for the comparison table. */
  freeToPost: string;
  takesCut: string;
  payment: string;
  delivery: string;
  /** What a seller needs before the first listing. */
  sellerNeeds: string;
  bestFor: string;
  watchOut: string;
  sources: Source[];
  checkedOn: string;
};

const CHECKED = "2026-11-04";

export const marketplacePlatforms: MarketplacePlatform[] = [
  {
    id: "shopi",
    name: "Shopi",
    url: "https://www.shopi.co.ke",
    type: "Local marketplace for photos and video",
    summary:
      "A Kenyan marketplace built around a local discovery feed. You post from a photo or a short video, Shopi Agent drafts the listing, buyers near you find it while scrolling or searching, and they message you directly.",
    freeToPost: "Yes. Free listings, not capped per category, and no paid tier today",
    takesCut: "No commission",
    payment: "Directly between buyer and seller; Shopi never holds money",
    delivery: "Agreed between buyer and seller",
    sellerNeeds: "A free account. No registered business, KRA PIN or shop needed",
    bestFor:
      "Second-hand and everyday items, sellers who want nearby buyers, and anyone who sells with video or already posts on TikTok",
    watchOut:
      "Newer than the big classifieds sites, so some categories have fewer buyers. There's no payment protection, so buyers should inspect before paying.",
    sources: [
      { label: "Shopi FAQ", url: "https://www.shopi.co.ke/en/faq" },
      { label: "How Shopi makes money (llms.txt)", url: "https://www.shopi.co.ke/llms.txt" },
    ],
    checkedOn: CHECKED,
  },
  {
    id: "jiji",
    name: "Jiji",
    url: "https://jiji.co.ke",
    type: "Classifieds site",
    summary:
      "One of Kenya's best-known classifieds sites, with categories from vehicles and property to phones, fashion and jobs. Every ad is reviewed before it goes live.",
    freeToPost:
      "Yes, up to a free-ad limit in each category; more ads need a paid package",
    takesCut: "No cut on deals you arrange directly; sells TOP and Boost promotion packages",
    payment:
      "Directly, or through Jiji's Safe Deal checkout on eligible ads, which holds the buyer's payment until delivery",
    delivery: "You arrange it; Safe Deal orders go through delivery services",
    sellerNeeds:
      "An account. To receive Safe Deal orders, an active Boost Package plus verification and payout setup",
    bestFor:
      "Buyers who search classifieds by category and model, especially for cars, property and jobs",
    watchOut:
      "Free ads are capped per category, and paid packages push ads up the results. Jiji's own advice: never pay a seller in advance outside Safe Deal.",
    sources: [
      { label: "Jiji — How can I sell on Jiji?", url: "https://jiji.co.ke/faq/8" },
      { label: "Jiji — What does \"ads limit\" mean?", url: "https://jiji.co.ke/faq/113" },
      { label: "Jiji — Premium Services", url: "https://jiji.co.ke/faq/48" },
      { label: "Jiji — How is delivery arranged?", url: "https://jiji.co.ke/faq/128" },
      { label: "Jiji — Safe Deal for sellers", url: "https://jiji.co.ke/faq/185" },
    ],
    checkedOn: CHECKED,
  },
  {
    id: "pigiame",
    name: "PigiaMe",
    url: "https://www.pigiame.co.ke",
    type: "Classifieds site",
    summary:
      "A long-running Kenyan classifieds site covering cars, property, electronics and jobs, where you can post a free ad and pay to upgrade it.",
    freeToPost: "Yes, post a free ad; Premium Ads and a Gold upgrade cost extra",
    takesCut: "No cut on deals you arrange directly",
    payment: "Directly between buyer and seller",
    delivery: "Agreed between buyer and seller",
    sellerNeeds: "An account. Sellers who pass its checks get a verified badge",
    bestFor: "Cars, property and jobs, for buyers who like browsing classic classifieds",
    watchOut: "As on any classifieds site, meet in public and inspect before paying.",
    sources: [{ label: "PigiaMe — homepage", url: "https://www.pigiame.co.ke/" }],
    checkedOn: CHECKED,
  },
  {
    id: "facebook-marketplace",
    name: "Facebook Marketplace",
    url: "https://www.facebook.com/marketplace/",
    type: "Marketplace inside Facebook",
    summary:
      "Facebook's buy-and-sell section. Meta began rolling it out in Kenya in 2020, and it has local pages such as Nairobi. Buyers message you through Messenger.",
    freeToPost: "Yes, for local listings",
    takesCut:
      "No cut on local deals; Meta's selling fee applies only to its shipping checkout, which isn't offered everywhere",
    payment: "Directly between buyer and seller",
    delivery: "Pickup or delivery agreed between you",
    sellerNeeds: "A Facebook account",
    bestFor:
      "Furniture, household items and anything you'd sell to people in your area or network",
    watchOut:
      "Listings sink quickly in the feed, many \"is this available?\" messages go nowhere, and fake payment screenshots are a known trick.",
    sources: [
      {
        label: "CIO Africa — Facebook Marketplace launching in Kenya (2020)",
        url: "https://cioafrica.co/facebook-marketplace-launching-in-kenya/",
      },
      {
        label: "Facebook — Marketplace, Nairobi",
        url: "https://www.facebook.com/marketplace/114751268540391/",
      },
      {
        label: "Meta — About fees for sales",
        url: "https://www.facebook.com/business/help/223030991929920",
      },
    ],
    checkedOn: CHECKED,
  },
  {
    id: "jumia",
    name: "Jumia",
    url: "https://www.jumia.co.ke",
    type: "Online store with delivery",
    summary:
      "An online shopping platform where registered sellers open a store, and Jumia handles delivery, payment collection and customer service.",
    freeToPost: "Free to open a seller store",
    takesCut: "Yes, a commission on each successful sale, set by category",
    payment: "Jumia collects payment from the buyer",
    delivery: "Jumia delivers; with Jumia Express it also stores and packs your stock",
    sellerNeeds:
      "Seller registration with KYC: a National ID (or business registration for companies) and bank details",
    bestFor: "New stock in volume, when you want delivery and payment handled for you",
    watchOut:
      "Commission comes off every sale. Check the current rates in Jumia's VendorHub before pricing.",
    sources: [{ label: "Jumia VendorHub Kenya", url: "https://vendorhub.jumia.co.ke/" }],
    checkedOn: CHECKED,
  },
  {
    id: "kilimall",
    name: "Kilimall",
    url: "https://www.kilimall.co.ke",
    type: "Online store with delivery",
    summary:
      "A Kenyan online shopping platform with checkout and order tracking, where sellers apply for a store through its seller centre.",
    freeToPost: "Apply for a seller account through Kilimall's seller centre",
    takesCut: "Fees are set in Kilimall's seller centre; check them before you list",
    payment: "Through Kilimall's checkout",
    delivery: "Kilimall tracks orders from picking to delivery",
    sellerNeeds: "An approved seller account",
    bestFor: "Shops selling new products to buyers across Kenya",
    watchOut: "Read the seller terms and fees in the seller centre before listing.",
    sources: [{ label: "Kilimall — homepage and seller centre", url: "https://www.kilimall.co.ke/" }],
    checkedOn: CHECKED,
  },
  {
    id: "whatsapp-social",
    name: "WhatsApp, TikTok and Instagram",
    type: "Messaging and social media",
    summary:
      "Selling to people who already follow you: WhatsApp groups and Status, TikTok videos and Instagram posts, with the deal done in direct messages.",
    freeToPost: "Yes",
    takesCut: "No",
    payment: "Directly between buyer and seller",
    delivery: "Agreed between you",
    sellerNeeds: "Your own contacts and followers",
    bestFor: "Cheap, fast-moving items sold to people who already know or follow you",
    watchOut:
      "Reach stops at your contacts and followers, WhatsApp Status disappears after 24 hours, and nobody can search for your item.",
    sources: [],
    checkedOn: CHECKED,
  },
];

export function getPlatform(id: MarketplacePlatform["id"]): MarketplacePlatform {
  return marketplacePlatforms.find((platform) => platform.id === id)!;
}

/**
 * OLX Kenya, for the comparison page and /olx-kenya-alternative. People still
 * search "olx kenya app", "olx kenya phones", "olx kenya cars" seven years on.
 */
export const OLX_KENYA = {
  checkedOn: CHECKED,
  facts: [
    "OLX closed its Kenya office in early 2018.",
    "In April 2019 Naspers, OLX's owner, agreed to sell its OLX classifieds businesses in Kenya, Nigeria, Ghana, Tanzania and Uganda to Jiji, and OLX users there were to move to Jiji.",
    "Today olx.co.ke redirects to olx.com, OLX's global site, not to a Kenyan marketplace.",
  ],
  sources: [
    {
      label: "Business Today — OLX shuts its Kenyan office (2018)",
      url: "https://businesstoday.co.ke/30-employees-lose-jobs-olx-shuts-kenyan-office/",
    },
    {
      label: "TechMoran — Naspers sells OLX Africa to Jiji (2019)",
      url: "https://techmoran.com/2019/04/03/naspers-sells-olx-africa-to-jiji-in-its-ssa-africa-exit-drive/",
    },
  ] satisfies Source[],
};
