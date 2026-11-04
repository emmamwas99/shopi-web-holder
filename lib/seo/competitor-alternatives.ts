/**
 * "{Competitor} alternative" landing pages.
 *
 * People who type "jiji alternative" or "sites like pigiame" are comparing, not
 * browsing — the generic /marketplace-alternatives-kenya hub can't rank for
 * each named query, so each gets its own page from this data. Google
 * autocomplete for Kenya (gl=ke, 4 Nov 2026) shows "apps like jiji" is typed
 * more than "jiji alternative", and that people also ask "is jiji free" and
 * "is jiji legit", so the Jiji page leads with the first and answers both.
 *
 * Rules for everything written about a competitor, because a wrong claim is a
 * legal problem and a credibility problem at once:
 * - Only what the competitor says about itself on its own site (or, for
 *   company history, a named news source), with the page linked in `sources`
 *   and the date it was checked. No prices (they change), no claims about
 *   safety, audience size or quality.
 * - Every comparative point is a fact about Shopi, checkable on Shopi.
 * - Say plainly when the competitor is the better fit. It is true, it builds
 *   trust, and answer engines quote balanced sources over sales copy.
 * Names are used descriptively only; no logos. Re-check `checkedOn` sources
 * when refreshing the page (see README "Blog content: SEO checks"), together
 * with lib/seo/marketplace-platforms.ts, which states the same facts.
 */

export type CompetitorAlternative = {
  slug: "jiji-alternative-kenya" | "pigiame-alternative-kenya";
  competitor: string;
  competitorUrl: string;
  checkedOn: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  about: { heading: string; body: string };
  sources: { label: string; url: string }[];
  differencesHeading: string;
  differences: { title: string; body: string }[];
  whenCompetitorFits: { heading: string; points: string[]; closing: string };
  /** Other places people compare against, for "apps like X" searches. */
  otherOptions: {
    heading: string;
    items: { name: string; body: string; path?: string }[];
  };
  steps: { heading: string; items: { title: string; body: string }[] };
  faq: { q: string; a: string }[];
  /** A how-to guide about selling on the competitor, when there is one. */
  guide?: { label: string; path: string };
  keywords: string[];
};

const JIJI: CompetitorAlternative = {
  slug: "jiji-alternative-kenya",
  competitor: "Jiji",
  competitorUrl: "https://jiji.co.ke",
  checkedOn: "2026-11-04",
  title: "Apps & Sites Like Jiji in Kenya — Free Jiji Alternative",
  metaDescription:
    "Apps and sites like Jiji in Kenya: PigiaMe, Facebook Marketplace and Shopi, a free alternative with no commission and no cap on free listings.",
  eyebrow: "Jiji alternative",
  h1: "Apps and sites like Jiji in Kenya",
  intro:
    "The main apps and sites like Jiji in Kenya are PigiaMe, Facebook Marketplace and Shopi. Shopi is a free Kenyan marketplace built around a local discovery feed: you post from one photo or a short video, buyers near you come across it while they scroll, and they message you directly. Shopi takes no commission, charges no listing fees and doesn't cap free listings per category, and you can keep your Jiji ads running at the same time.",
  about: {
    heading: "What Jiji is, in brief",
    body: "Jiji is one of Kenya's best-known online classifieds sites, with categories from vehicles and property to phones, fashion and jobs. Every ad is reviewed before it goes live. Posting is free up to a limit of ads in each category; to post more, or to promote ads, Jiji sells TOP placements and Boost packages, with a pay-per-click Pro Sales tool included in Boost. On eligible ads buyers can also pay through Jiji's Safe Deal checkout, which holds the payment until delivery; sellers need an active Boost Package to receive those orders.",
  },
  sources: [
    { label: "Jiji — How can I sell on Jiji?", url: "https://jiji.co.ke/faq/8" },
    { label: "Jiji — What does \"ads limit\" mean?", url: "https://jiji.co.ke/faq/113" },
    { label: "Jiji — Types of Premium Services", url: "https://jiji.co.ke/faq/48" },
    { label: "Jiji — Safe Deal for sellers", url: "https://jiji.co.ke/faq/185" },
  ],
  differencesHeading: "What's different about selling on Shopi",
  differences: [
    {
      title: "Found in a feed, not only in search",
      body: "Shopi shows listings in a feed ranked by what's near each buyer and what they're interested in, so a new post can reach people who weren't searching for that exact item. Buyers who know what they want can still search.",
    },
    {
      title: "A full listing from one photo",
      body: "Upload a photo and Shopi Agent drafts the title, description, category and specifications. You check and edit everything before it goes live, so posting a lot of stock doesn't mean filling in the same form again and again.",
    },
    {
      title: "Free, with no ad cap and no commission",
      body: "Posting is free, Shopi doesn't cap free listings per category, and there's no paid placement today, so every post competes on what it is and where it is. Shopi never takes payment or holds money: the price you agree with the buyer is what you receive.",
    },
    {
      title: "Video-first, with TikTok built in",
      body: "Post a short video of the item, or bring in the TikTok videos you've already made instead of filming again. A clip that shows the item working answers the questions photos leave open.",
    },
    {
      title: "Local first, across all 47 counties",
      body: "Nearby listings surface first, from the buyer's neighbourhood outward, so the people who see your post are the ones who can realistically come and collect.",
    },
  ],
  whenCompetitorFits: {
    heading: "When Jiji may suit you better",
    points: [
      "You're hiring or job hunting. Jiji has long-established jobs and CV sections.",
      "You want buyers to pay through the platform. Jiji's Safe Deal holds the buyer's payment until delivery on eligible ads (you'll need a Boost Package); Shopi doesn't handle payments.",
      "You want to pay for placement at the top of search results. Jiji sells that through TOP and Boost.",
      "You're selling in a category where buyers habitually start on Jiji and search for an exact model.",
    ],
    closing:
      "You don't have to choose. Many sellers keep their Jiji ads and post the same items on Shopi to reach buyers who browse rather than search.",
  },
  otherOptions: {
    heading: "Other apps like Jiji in Kenya",
    items: [
      {
        name: "PigiaMe",
        body: "A long-running Kenyan classifieds site for cars, property, electronics and jobs, with free ads and paid upgrades.",
        path: "/pigiame-alternative-kenya",
      },
      {
        name: "Facebook Marketplace",
        body: "Free local listings inside Facebook, available in Kenya since 2020; best for furniture and household items.",
      },
      {
        name: "Jumia and Kilimall",
        body: "Online stores rather than classifieds: they handle checkout and delivery for new products and set their own seller fees.",
      },
      {
        name: "OLX",
        body: "Closed in Kenya. Its Kenyan business went to Jiji in 2019.",
        path: "/olx-kenya-alternative",
      },
    ],
  },
  steps: {
    heading: "How to put your Jiji items on Shopi",
    items: [
      {
        title: "Reuse the photos you already have",
        body: "Upload the photos from your Jiji ad, or a short video. Shopi Agent drafts the listing from them.",
      },
      {
        title: "Check the price and details",
        body: "Confirm the price in KES, mark it negotiable if it is, and set your location so nearby buyers see it first.",
      },
      {
        title: "Keep both live, and update both",
        body: "Publish, then remove the item from both sites when it sells so no buyer messages about something that's gone.",
      },
    ],
  },
  faq: [
    {
      q: "What apps are like Jiji in Kenya?",
      a: "PigiaMe, Facebook Marketplace and Shopi are the closest: all let you post items for sale free and deal with buyers directly. Jumia and Kilimall are online stores with their own checkout and delivery, rather than classifieds.",
    },
    {
      q: "What is the best alternative to Jiji in Kenya?",
      a: "It depends on what you sell. For everyday items — phones, electronics, furniture, fashion, beauty, property and cars — Shopi is a free alternative: listing is free, there's no commission and no cap on free listings, buyers near you find your post in a local feed, and they message you directly.",
    },
    {
      q: "Is Jiji free?",
      a: "Up to a point. Jiji lets you post a number of free ads in each category, and you need a paid package to post more or to promote your ads. Shopi is free with no per-category cap.",
    },
    {
      q: "Is Jiji legit?",
      a: "Jiji is a legitimate, established classifieds company: it took over OLX's Kenyan business in 2019. As on any classifieds site, the risk comes from individual users, so inspect items before paying and never send a deposit to a stranger.",
    },
    {
      q: "Is there a free app like Jiji in Kenya?",
      a: "Shopi is free to browse and free to post on, with no commission and no listing fees. It works in any phone or computer browser at shopi.co.ke; there is no app-store download yet.",
    },
    {
      q: "Can I sell on Jiji and Shopi at the same time?",
      a: "Yes. Nothing stops you listing the same item on both. When it sells, remove it from both so buyers aren't disappointed.",
    },
    {
      q: "Does Shopi charge to promote listings, like Jiji's Premium Services?",
      a: "No. Shopi has no paid tier today: posting is free, there are no listing fees and no commission on the sale.",
    },
    {
      q: "Can I sell my car on Shopi instead of Jiji?",
      a: "Yes. List your car free with photos or a walkaround video, the year, mileage, price and location, and buyers message you directly — no broker and no commission. Shopi's Sell a car in Kenya guide covers pricing and the NTSA ownership transfer.",
    },
    {
      q: "Is Shopi part of Jiji?",
      a: "No. Shopi is an independent Kenyan marketplace, founded in Nairobi in 2025, and is not affiliated with Jiji.",
    },
  ],
  guide: { label: "How to sell on Jiji Kenya, step by step", path: "/blog/how-to-sell-on-jiji-kenya" },
  keywords: [
    "apps like Jiji",
    "apps like Jiji Kenya",
    "sites like Jiji Kenya",
    "Jiji alternative",
    "Jiji alternative Kenya",
    "is Jiji free",
    "is Jiji legit",
    "free marketplace Kenya",
  ],
};

const PIGIAME: CompetitorAlternative = {
  slug: "pigiame-alternative-kenya",
  competitor: "PigiaMe",
  competitorUrl: "https://www.pigiame.co.ke",
  checkedOn: "2026-11-04",
  title: "PigiaMe Alternative in Kenya: Sell Free on Shopi",
  metaDescription:
    "Looking for a PigiaMe alternative? Shopi is a free Kenyan marketplace: post from a photo or video, get found nearby, chat directly. No commission.",
  eyebrow: "PigiaMe alternative",
  h1: "A PigiaMe alternative for buying and selling in Kenya",
  intro:
    "Shopi is a free Kenyan marketplace you can use instead of, or as well as, PigiaMe. Post an item from one photo or a short video, get found by buyers near you in a local feed, and chat with them directly. There's no commission and no listing fee.",
  about: {
    heading: "What PigiaMe is, in brief",
    body: "PigiaMe is a long-running Kenyan classifieds site covering cars, property, electronics and jobs, where you can post a free ad. It sells Premium Ads and a Gold upgrade for extra visibility, and highlights verified sellers who have passed its checks.",
  },
  sources: [{ label: "PigiaMe — homepage", url: "https://www.pigiame.co.ke/" }],
  differencesHeading: "What's different about Shopi",
  differences: [
    {
      title: "A feed built for discovery",
      body: "Instead of starting from a category tree, buyers on Shopi scroll a feed ranked by what's nearby and what they're interested in — and come across listings they weren't searching for. Search is there for exact items.",
    },
    {
      title: "Photos and video, not just a form",
      body: "Posts lead with photos or a short video that shows the item working. Already sell on TikTok? Bring those videos into Shopi listings instead of filming again.",
    },
    {
      title: "Shopi Agent writes the listing",
      body: "Upload a photo and Shopi Agent drafts the title, description, category and specifications for you to review before publishing.",
    },
    {
      title: "No commission, no listing fees, no paid tier",
      body: "Posting is free and Shopi takes nothing from the sale. It never processes payments or holds money, so buyer and seller agree the price, payment and pickup directly.",
    },
  ],
  whenCompetitorFits: {
    heading: "When PigiaMe may suit you better",
    points: [
      "You're posting or looking for jobs. PigiaMe has a jobs section.",
      "You want a paid upgrade for extra visibility. PigiaMe offers Premium Ads and a Gold upgrade.",
      "You prefer a classic classifieds layout where buyers browse by category first.",
    ],
    closing:
      "Plenty of sellers use both: a PigiaMe ad for buyers who search categories, and a Shopi post for buyers who discover things while scrolling.",
  },
  otherOptions: {
    heading: "Other sites like PigiaMe in Kenya",
    items: [
      {
        name: "Jiji",
        body: "One of Kenya's best-known classifieds sites; free up to a limit of ads per category, with paid TOP and Boost packages.",
        path: "/jiji-alternative-kenya",
      },
      {
        name: "Facebook Marketplace",
        body: "Free local listings inside Facebook, available in Kenya since 2020.",
      },
      {
        name: "OLX",
        body: "Closed in Kenya. Its Kenyan business went to Jiji in 2019.",
        path: "/olx-kenya-alternative",
      },
    ],
  },
  steps: {
    heading: "How to list your PigiaMe items on Shopi",
    items: [
      {
        title: "Start from your existing photos",
        body: "Upload the photos you used on PigiaMe, or record a quick video, and let Shopi Agent draft the words.",
      },
      {
        title: "Set price, category and location",
        body: "Enter the price in KES, say whether it's negotiable, and set your town so buyers nearby see it first.",
      },
      {
        title: "Publish and reply in chat",
        body: "Buyers message you inside Shopi. When the item sells, take it down everywhere you listed it.",
      },
    ],
  },
  faq: [
    {
      q: "What is a good alternative to PigiaMe in Kenya?",
      a: "Shopi is a free alternative for selling everyday items, cars and property in Kenya. Listing is free with no commission, buyers near you find posts in a local discovery feed, Shopi Agent writes listings from a photo, and buyers message sellers directly.",
    },
    {
      q: "How does PigiaMe work?",
      a: "You post a free ad with photos, a price and your location in a category such as cars, property or electronics. Buyers contact you, and you agree payment and pickup directly. Premium Ads and a Gold upgrade cost extra.",
    },
    {
      q: "Is PigiaMe legit?",
      a: "PigiaMe is a long-running, established Kenyan classifieds site, and it marks verified sellers who have passed its checks. As on any classifieds site, inspect the item and meet somewhere public before you pay.",
    },
    {
      q: "Is it free to sell on Shopi?",
      a: "Yes. Posting is free, there are no listing fees and no commission, and there is no paid tier today. The full price you agree with the buyer is yours.",
    },
    {
      q: "Can I post on PigiaMe and Shopi at the same time?",
      a: "Yes. You can list the same item on both to reach more buyers. Remove it from both once it sells.",
    },
    {
      q: "Does Shopi have verified sellers?",
      a: "Some sellers carry a verified badge on Shopi, but Shopi does not verify every seller or listing. Inspect the item and confirm the details in chat before you pay.",
    },
    {
      q: "Can I sell land or property on Shopi?",
      a: "Yes. Post land, plots, houses for sale or rentals with photos, price and location, and interested buyers message you directly.",
    },
    {
      q: "Is Shopi connected to PigiaMe?",
      a: "No. Shopi is an independent Kenyan marketplace, founded in Nairobi in 2025, and is not affiliated with PigiaMe.",
    },
  ],
  keywords: [
    "PigiaMe alternative",
    "PigiaMe alternative Kenya",
    "sites like PigiaMe",
    "is PigiaMe legit",
    "how does PigiaMe work",
    "free classifieds Kenya",
    "free marketplace Kenya",
  ],
};

export const competitorAlternatives: CompetitorAlternative[] = [JIJI, PIGIAME];

export function getCompetitorAlternative(slug: CompetitorAlternative["slug"]) {
  return competitorAlternatives.find((page) => page.slug === slug)!;
}
