/**
 * "Where to sell X in Kenya" pages: /where-to-sell/{item}.
 *
 * Google autocomplete for Kenya (gl=ke, 4 Nov 2026; docs/seo-audit/
 * keyword-map.md) shows "where to sell" queries are item-first: "where to
 * sell my phone in kenya" leads, then laptops ("where to sell my laptop in
 * nairobi", "dead laptops", "old laptops"), a long tail of farm produce and
 * livestock (eggs, kienyeji chicken, broilers, rabbits, hass avocado, honey,
 * chillies, maize, dorper sheep, pigs…), then used furniture and electronics
 * in Nairobi. Precious metals, coins and scrap are left out: they're not
 * something Shopi can honestly help sell.
 *
 * A seller page doesn't need stock to be useful (the answer is the process),
 * but it must answer the question honestly, which means naming the channels
 * that aren't Shopi — dealers, repairers, brokers, exporters — and saying
 * when they're the better choice. Generic pages spun per keyword are doorway
 * pages; each page here is written for its item. No prices: live listings
 * answer "what is it worth" better than a number that goes stale.
 */

export type WhereToSellSlug = "phones" | "laptops" | "electronics" | "furniture" | "farm-produce";

export type WhereSection =
  | {
      kind: "steps";
      id: string;
      heading: string;
      intro?: string;
      items: { title: string; body: string }[];
    }
  | {
      kind: "cards";
      id: string;
      heading: string;
      intro?: string;
      cards: { title: string; body: string }[];
    }
  | {
      kind: "list";
      id: string;
      heading: string;
      intro?: string;
      items: string[];
      closing?: string;
    };

export type WhereToSellPage = {
  slug: WhereToSellSlug;
  /** <title>; the layout appends " | Shopi". */
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  /** One line for link cards on other pages. */
  cardLine: string;
  /** Answer-first: the paragraph an answer engine can quote whole. */
  intro: string;
  options: { channel: string; youGet: string; speed: string; bestWhen: string }[];
  sections: WhereSection[];
  /**
   * Live Shopi listings in these subcategories (the classifier's level-2
   * names). The classifier is sometimes wrong and some listings are tests,
   * so titles are filtered too, the way article listing blocks are: keep a
   * listing only if its title has one of `titleIncludes` (when set), and drop
   * it if it has any of `titleExcludes` or is priced above `maxPrice`.
   */
  live: {
    heading: string;
    intro: string;
    subcategories: string[];
    noun: string;
    titleIncludes?: string[];
    titleExcludes?: string[];
    maxPrice?: number;
  };
  faq: { q: string; a: string }[];
  keywords: string[];
  /** Buyer-side pages for the same item. Paths must exist. */
  related: { label: string; path: string }[];
};

export const whereToSellPath = (slug: WhereToSellSlug) => `/where-to-sell/${slug}` as const;

/** Test posts and placeholder titles: "test two", "rrrr", "500". */
const PLACEHOLDER_TITLE = /^\s*(test\b.*|[a-z]{1,2}|(.)\2{2,}|[\d\s.,]+)\s*$/i;

/** Whether a live listing belongs on the page, by its title and price. */
export function isRelevantLiveListing(
  live: WhereToSellPage["live"],
  listing: { title?: string | null; price?: { amount: number } | null },
): boolean {
  const title = (listing.title ?? "").toLowerCase();
  if (!title.trim() || PLACEHOLDER_TITLE.test(title)) return false;
  if (live.titleIncludes && !live.titleIncludes.some((word) => title.includes(word))) {
    return false;
  }
  if (live.titleExcludes?.some((word) => title.includes(word))) return false;
  if (live.maxPrice && (listing.price?.amount ?? 0) > live.maxPrice) return false;
  return true;
}

// ── Shared ───────────────────────────────────────────────────────────────────

const PAID_SAFELY: WhereSection = {
  kind: "list",
  id: "get-paid-safely",
  heading: "Get paid safely",
  items: [
    "Meet in a busy public place in daylight, such as a shopping mall, and bring someone along for anything valuable.",
    "Let the buyer inspect and test the item before any money changes hands.",
    "Hand it over only once the money is in your account. Check your M-PESA balance or bank app yourself: an SMS can be faked and a screenshot proves nothing.",
    "If a buyer \"sends too much\" and asks for the difference back, or asks you to reverse a payment, stop and check your balance first. Both are common tricks.",
    "Keep the conversation in Shopi chat until the deal is done, so there's a record of what was agreed.",
  ],
};

// ── Phones ───────────────────────────────────────────────────────────────────

const PHONES: WhereToSellPage = {
  slug: "phones",
  title: "Where to Sell My Phone in Kenya — Used, Broken or Dead",
  description:
    "Where to sell your phone in Kenya: marketplaces, phone shops, trade-ins and repairers compared, plus how to wipe it and get paid safely. Free to list.",
  eyebrow: "Sell your phone",
  h1: "Where to sell your phone in Kenya",
  cardLine: "Used, broken or dead: who pays most, and how to wipe it first.",
  intro:
    "The best price for a used phone in Kenya usually comes from selling it yourself to another person, through an online marketplace such as Shopi, Jiji or Facebook Marketplace. Phone shops and second-hand dealers pay less but pay on the spot, a trade-in takes the value off a new phone, and a broken or dead phone still sells to repair technicians for parts. Whichever you choose, back the phone up, sign out of your Google or Apple account and reset it before you hand it over.",
  options: [
    {
      channel: "Online marketplace (Shopi, Jiji, Facebook Marketplace)",
      youGet: "Close to what your model is selling for",
      speed: "A few days to a couple of weeks",
      bestWhen: "The phone works and you can wait for the right buyer",
    },
    {
      channel: "Phone shop or second-hand dealer",
      youGet: "Less, because the dealer has to resell at a profit",
      speed: "Same day",
      bestWhen: "You need cash today",
    },
    {
      channel: "Trade-in when you buy a new phone",
      youGet: "A discount on the new phone, not cash",
      speed: "Same day",
      bestWhen: "You're upgrading anyway, at a shop that offers trade-ins",
    },
    {
      channel: "Friends, family and WhatsApp groups",
      youGet: "A fair price, if someone wants your model",
      speed: "Hours to days",
      bestWhen: "It's a popular model and people around you need a phone",
    },
    {
      channel: "Repair technician",
      youGet: "A parts price",
      speed: "Same day",
      bestWhen: "The phone is broken, water-damaged or won't switch on",
    },
  ],
  sections: [
    {
      kind: "steps",
      id: "wipe-it",
      heading: "Before you sell: wipe your phone properly",
      intro:
        "A phone still linked to your account can lock the buyer out, and leaves your photos, chats and money apps on a stranger's device.",
      items: [
        {
          title: "Back it up",
          body: "Save photos and contacts to Google or iCloud, and back up WhatsApp under Settings, Chats, Chat backup.",
        },
        {
          title: "Remove your accounts",
          body: "On an iPhone, turn off Find My and sign out of your Apple ID. On Android, remove your Google account in Settings before resetting; otherwise Factory Reset Protection asks the buyer for your password.",
        },
        {
          title: "Take out your SIM and memory card",
          body: "Your number and M-PESA stay with your SIM. Log out of the M-PESA app and your banking apps too.",
        },
        {
          title: "Factory reset",
          body: "On iPhone: Settings, General, Transfer or Reset iPhone, Erase All Content and Settings. On most Android phones: Settings, System, Reset options, Erase all data.",
        },
      ],
    },
    {
      kind: "list",
      id: "price-it",
      heading: "How to price your phone",
      items: [
        "Look at what the same model with the same storage is listed for right now. That range is the market, whatever you paid.",
        "Adjust for condition: screen scratches, a replaced screen or back, and battery health all move the price.",
        "The box, original charger and receipt add value and reassure buyers it isn't stolen.",
        "Price a little under the middle of the range to sell fast, or near the top if you can wait. Say whether it's negotiable.",
      ],
    },
    {
      kind: "list",
      id: "buyers-ask",
      heading: "What buyers ask first, so put it in the listing",
      items: [
        "Storage and RAM, e.g. 128GB / 6GB.",
        "Battery health. On iPhone it's under Settings, Battery, Battery Health.",
        "Any repairs, and whether the screen or battery is original.",
        "Whether it's a local unit or imported, and whether it's network-unlocked.",
        "That it's signed out of iCloud or Google, so it isn't locked.",
        "What comes with it: box, charger, receipt.",
      ],
      closing:
        "A 20-second video of the phone switching on and the screen responding answers half of these before anyone asks.",
    },
    {
      kind: "list",
      id: "broken-phone",
      heading: "Selling a broken or dead phone",
      items: [
        "Repair technicians buy phones for parts: screens, boards, cameras and batteries. Ask two or three for a price.",
        "You can also list it on Shopi as \"for parts\" or \"not working\". Say exactly what's wrong; an honest fault description sells, a hidden one gets reported.",
        "If it still powers on, wipe it first. If it doesn't, at least remove your SIM and memory card.",
      ],
    },
    PAID_SAFELY,
  ],
  live: {
    heading: "What sellers are asking for phones on Shopi right now",
    intro:
      "Live asking prices, not a valuation. Compare the same model and storage as yours.",
    subcategories: ["Phones"],
    noun: "phone",
  },
  faq: [
    {
      q: "Where can I sell my phone in Kenya?",
      a: "For the best price, sell it to a person through an online marketplace such as Shopi, Jiji or Facebook Marketplace. For speed, a phone shop or second-hand dealer pays the same day but less. A broken phone sells to repair technicians for parts.",
    },
    {
      q: "Where can I sell my phone in Nairobi?",
      a: "Nairobi has plenty of phone shops and dealers that buy used phones for quick cash, but you'll usually get more by selling to a person online. List it on Shopi with your area set, so buyers near you see it first, and meet them somewhere public.",
    },
    {
      q: "Where can I sell my phone for cash quickly?",
      a: "A phone shop or second-hand dealer pays on the spot, at a lower price. If you can wait a few days, a marketplace listing usually gets you more.",
    },
    {
      q: "Where can I sell a dead or broken phone?",
      a: "Repair technicians buy dead and broken phones for parts. You can also list it on Shopi as \"for parts\" with the fault described honestly.",
    },
    {
      q: "Where can I sell my iPhone in Kenya?",
      a: "Anywhere you'd sell another phone, but turn off Find My and sign out of your Apple ID first, or the buyer can't use it. State the storage and battery health in the listing; iPhone buyers ask about both.",
    },
    {
      q: "How much is my phone worth?",
      a: "Whatever the same model with the same storage is selling for now, adjusted for condition, battery health and what comes with it. Check current listings before you set a price.",
    },
    {
      q: "Should I sell my phone with the SIM card?",
      a: "No. Take out your SIM and memory card. Your number and M-PESA are tied to the SIM, not the phone.",
    },
    {
      q: "Is it free to sell a phone on Shopi?",
      a: "Yes. Posting is free, there's no commission, and the buyer pays you directly.",
    },
  ],
  keywords: [
    "where to sell my phone in Kenya",
    "where can I sell my phone in Nairobi",
    "sell my phone Kenya",
    "where to sell used phones in Nairobi",
    "where to sell second hand phones in Nairobi for cash",
    "where to sell dead phones in Nairobi",
    "where to sell broken phones in Kenya",
    "where can I sell my iPhone in Kenya",
  ],
  related: [
    { label: "Phones for sale in Kenya", path: "/for-sale/phones" },
    { label: "Phones under KSh 20,000", path: "/blog/phones-under-20000-in-kenya" },
    { label: "Phones and electronics in Kenya", path: "/phones-electronics-kenya" },
  ],
};

// ── Laptops ──────────────────────────────────────────────────────────────────

const LAPTOPS: WhereToSellPage = {
  slug: "laptops",
  title: "Where to Sell My Laptop in Kenya — Used, Old or Dead",
  description:
    "Where to sell a laptop in Kenya: marketplaces, computer shops and repairers compared, with how to price it by its specs and wipe it before you sell.",
  eyebrow: "Sell your laptop",
  h1: "Where to sell your laptop in Kenya",
  cardLine: "Price it by its specs, wipe it properly, sell it for parts if it's dead.",
  intro:
    "You'll usually get the most for a used laptop by selling it to a person through an online marketplace such as Shopi, Jiji or Facebook Marketplace, with the processor, RAM and storage in the title. Computer shops that buy used laptops pay less but pay quickly, students and colleagues are a ready market for mid-range machines, and a dead laptop still sells to repair shops for parts. Back up your files, sign out of your accounts and reset it before you hand it over.",
  options: [
    {
      channel: "Online marketplace (Shopi, Jiji, Facebook Marketplace)",
      youGet: "Close to what laptops with the same specs sell for",
      speed: "A few days to a couple of weeks",
      bestWhen: "It works and you can wait for the right buyer",
    },
    {
      channel: "Computer shop or second-hand dealer",
      youGet: "Less, because the shop resells at a profit",
      speed: "Same day",
      bestWhen: "You need cash today",
    },
    {
      channel: "Students, colleagues and campus WhatsApp groups",
      youGet: "A fair price for a reliable everyday machine",
      speed: "Days, around the start of a term",
      bestWhen: "It's a mid-range laptop good for study and office work",
    },
    {
      channel: "Repair shop",
      youGet: "A parts price for the screen, RAM, storage or board",
      speed: "Same day",
      bestWhen: "It's dead, water-damaged or not worth fixing",
    },
  ],
  sections: [
    {
      kind: "list",
      id: "price-by-specs",
      heading: "Price it by the specs, not just the brand",
      intro:
        "Laptop buyers compare specifications, so a listing without them gets skipped. Put the essentials in the title, like \"HP EliteBook 840 G5, Core i5 8th gen, 8GB RAM, 256GB SSD\".",
      items: [
        "Processor and generation: a Core i5 8th gen and a Core i5 4th gen are very different machines.",
        "RAM and storage, and whether the storage is an SSD (fast) or a hard drive (slow).",
        "Screen size and resolution, and any marks, dead pixels or lines.",
        "Battery life in real use. On Windows, typing powercfg /batteryreport in Command Prompt creates a battery report; on a Mac, see System Settings, Battery.",
        "Keyboard, hinges and ports: anything loose or not working.",
        "Whether the original charger comes with it.",
      ],
    },
    {
      kind: "steps",
      id: "wipe-it",
      heading: "Before you sell: wipe your laptop",
      items: [
        {
          title: "Back up your files",
          body: "Copy documents and photos to an external drive or cloud storage such as Google Drive, OneDrive or iCloud.",
        },
        {
          title: "Sign out of everything",
          body: "Browsers, email, cloud storage and any work accounts. On a Mac, turn off Find My Mac and sign out of your Apple ID. On Windows, remove the laptop from your Microsoft account's device list.",
        },
        {
          title: "Reset it",
          body: "Windows 11: Settings, System, Recovery, Reset this PC, Remove everything. Windows 10: Settings, Update & Security, Recovery. Recent Macs: System Settings, General, Transfer or Reset, Erase All Content and Settings.",
        },
      ],
    },
    {
      kind: "list",
      id: "dead-laptop",
      heading: "Selling an old or dead laptop",
      items: [
        "Repair shops buy dead laptops for parts. Get two or three prices.",
        "If it won't switch on and you can't wipe it, take out the hard drive or SSD before you sell, or ask for it back.",
        "An old laptop that still works can sell to a student or a small business for basic work. Say plainly what it can and can't do.",
      ],
    },
    PAID_SAFELY,
  ],
  live: {
    heading: "What sellers are asking for laptops on Shopi right now",
    intro: "Live asking prices, not a valuation. Compare machines with the same processor, RAM and storage.",
    subcategories: ["Laptops"],
    noun: "laptop",
  },
  faq: [
    {
      q: "Where can I sell my laptop in Nairobi?",
      a: "For the best price, sell it to a person through an online marketplace such as Shopi, Jiji or Facebook Marketplace, with the specs in the title. Computer shops in town buy used laptops for quick cash at a lower price.",
    },
    {
      q: "Where can I sell my laptop in Kenya outside Nairobi?",
      a: "Anywhere in Kenya, from Kisumu to Eldoret, you can list it on Shopi with your town set, so buyers near you see it first. Local computer shops and repairers are the quick-cash option.",
    },
    {
      q: "Where can I sell a dead laptop in Nairobi?",
      a: "Repair shops buy dead laptops for parts. If you can't wipe it, remove the hard drive or SSD first.",
    },
    {
      q: "How much is my laptop worth in Kenya?",
      a: "Whatever laptops with the same processor generation, RAM and storage are selling for now, adjusted for condition and battery life. Check current listings before setting a price.",
    },
    {
      q: "Do I need to include the charger?",
      a: "It's not required, but a laptop without its original charger sells for less and takes longer, because the buyer has to find one.",
    },
    {
      q: "Is it free to sell a laptop on Shopi?",
      a: "Yes. Posting is free, there's no commission, and the buyer pays you directly.",
    },
  ],
  keywords: [
    "where to sell my laptop in Nairobi",
    "where can I sell my laptop in Kenya",
    "sell my laptop Kenya",
    "where to sell used laptops in Nairobi",
    "where to sell dead laptops in Nairobi",
    "where to sell old laptops in Nairobi",
    "sell second hand laptop Nairobi",
  ],
  related: [
    { label: "Laptops for sale in Kenya", path: "/for-sale/laptops" },
    { label: "Phones and electronics in Kenya", path: "/phones-electronics-kenya" },
  ],
};

// ── Electronics ──────────────────────────────────────────────────────────────

const ELECTRONICS: WhereToSellPage = {
  slug: "electronics",
  title: "Where to Sell Used Electronics in Kenya: TVs, Fridges & More",
  description:
    "Where to sell used electronics in Kenya: TVs, fridges, washing machines, speakers, consoles and cameras. Who pays most, how to price, and how to sell safely.",
  eyebrow: "Sell your electronics",
  h1: "Where to sell used electronics in Kenya",
  cardLine: "TVs, fridges, washing machines, speakers, consoles and cameras.",
  intro:
    "For TVs, fridges, washing machines, speakers, game consoles and cameras, you'll usually get the best price by selling to a person through an online marketplace such as Shopi, Jiji or Facebook Marketplace, with a short video of the item working. Second-hand electronics dealers pay less but buy on the spot, and faulty items still sell to repairers for parts. Bulky appliances sell fastest to buyers near you who can collect.",
  options: [
    {
      channel: "Online marketplace (Shopi, Jiji, Facebook Marketplace)",
      youGet: "Close to what the same model is selling for",
      speed: "A few days to a couple of weeks",
      bestWhen: "It works and you can show it working",
    },
    {
      channel: "Second-hand electronics dealer",
      youGet: "Less, because the dealer resells at a profit",
      speed: "Same day",
      bestWhen: "You need it gone or need cash fast",
    },
    {
      channel: "Neighbours and estate WhatsApp groups",
      youGet: "A fair price, with no transport to arrange",
      speed: "Days",
      bestWhen: "It's bulky, or you're moving out",
    },
    {
      channel: "Repair technician",
      youGet: "A parts price",
      speed: "Same day",
      bestWhen: "It's faulty and not worth fixing",
    },
  ],
  sections: [
    {
      kind: "cards",
      id: "what-buyers-check",
      heading: "What buyers check, item by item",
      cards: [
        {
          title: "TVs",
          body: "Screen size, smart or not (and which apps), Full HD or 4K, any lines or dead pixels, remote, stand or wall bracket. Film it switched on showing a picture.",
        },
        {
          title: "Fridges and freezers",
          body: "Capacity in litres, single or double door, age, and whether it cools properly. Film it running, ideally with frost or a cold drink inside.",
        },
        {
          title: "Washing machines",
          body: "Front or top loader, capacity in kg, age, any leaks or noise. A short clip of a wash cycle running settles most doubts.",
        },
        {
          title: "Speakers and sound systems",
          body: "Power, Bluetooth, inputs and whether all the speakers work. Play a song in the video.",
        },
        {
          title: "Game consoles",
          body: "Model and storage, controllers and games included. Sign out of your PlayStation or Xbox account and reset the console before handing it over.",
        },
        {
          title: "Cameras",
          body: "Body and lenses, shutter count for DSLRs and mirrorless cameras, batteries, charger and memory card. Include a sample photo taken with it.",
        },
      ],
    },
    {
      kind: "list",
      id: "price-it",
      heading: "How to price used electronics",
      items: [
        "Find the same model in current listings; that range is the market.",
        "Knock off for age, wear, missing remotes or accessories, and anything that's been repaired.",
        "Keep receipts and manuals; they show the item's age and that it's yours.",
        "Bulky items: a fair price beats a high one, because few buyers will travel far to collect.",
      ],
    },
    {
      kind: "list",
      id: "moving-out",
      heading: "Moving out? Sell it all together",
      items: [
        "Start listing a week or two before you move, so you're not giving things away on the last day.",
        "Post each item separately on Shopi with your area set, then share the links in your estate or apartment WhatsApp group.",
        "Offer a discount to anyone who takes several items, and agree pickup dates in writing in chat.",
      ],
    },
    {
      kind: "list",
      id: "transport",
      heading: "Getting it to the buyer",
      items: [
        "For fridges, cookers and washing machines the buyer usually collects. Say so in the listing.",
        "If you can deliver, quote the transport cost separately from the item's price.",
        "Agree who pays for transport before the day, and take payment before loading.",
      ],
    },
    PAID_SAFELY,
  ],
  live: {
    heading: "Used electronics on Shopi right now",
    intro: "Live asking prices, not valuations. Compare the same model and condition as yours.",
    subcategories: ["Televisions", "Refrigerators", "Home Appliances", "Audio & Speakers", "Gaming Consoles"],
    noun: "item",
  },
  faq: [
    {
      q: "Where can I sell used electronics in Nairobi?",
      a: "For the best price, sell to a person through an online marketplace such as Shopi, Jiji or Facebook Marketplace, with a video of the item working. Second-hand electronics dealers buy on the spot at a lower price.",
    },
    {
      q: "Where can I sell my TV in Kenya?",
      a: "List it on an online marketplace with the size, model and whether it's smart, plus a clip of it switched on. Dealers buy TVs too, for less.",
    },
    {
      q: "Where can I sell a used fridge?",
      a: "Locally: post it on Shopi or Facebook Marketplace with your area set and share it in your estate WhatsApp group. Buyers usually collect fridges themselves, so nearby buyers matter more than reach.",
    },
    {
      q: "Where can I sell faulty electronics?",
      a: "Repair technicians buy faulty TVs, fridges and consoles for parts. You can also list them on Shopi as \"for parts\", with the fault described honestly.",
    },
    {
      q: "Is it better to sell to a dealer or online?",
      a: "Online usually pays more because you sell to the person who'll use it. A dealer pays less but takes it the same day, which is worth it when you're short on time.",
    },
    {
      q: "Is it free to sell electronics on Shopi?",
      a: "Yes. Posting is free, there's no commission, and the buyer pays you directly.",
    },
  ],
  keywords: [
    "where to sell used electronics in Nairobi",
    "where to sell second hand electronics in Nairobi",
    "sell second hand electronics in Kenya",
    "where to sell my TV in Kenya",
    "where to sell a used fridge in Kenya",
    "sell used appliances Kenya",
  ],
  related: [
    { label: "TVs for sale in Kenya", path: "/for-sale/tvs" },
    { label: "Fridges for sale in Kenya", path: "/for-sale/fridges" },
    { label: "Home appliances for sale", path: "/for-sale/home-appliances" },
    { label: "PS5 price in Kenya", path: "/blog/ps5-price-in-kenya" },
  ],
};

// ── Furniture ────────────────────────────────────────────────────────────────

const FURNITURE: WhereToSellPage = {
  slug: "furniture",
  title: "Where to Sell Used Furniture in Nairobi and Across Kenya",
  description:
    "Where to sell second-hand furniture in Nairobi and Kenya: marketplaces, dealers and moving-out sales compared, plus how to price, photograph and deliver it.",
  eyebrow: "Sell your furniture",
  h1: "Where to sell second-hand furniture in Kenya",
  cardLine: "Sofas, beds, tables and wardrobes: sell locally, measure, plan transport.",
  intro:
    "Second-hand furniture sells best to buyers near you, because moving a sofa or a wardrobe across town costs time and money. Post it on an online marketplace such as Shopi, Facebook Marketplace or Jiji with your area set, the measurements and clear daylight photos, and share it in your estate or apartment WhatsApp group. Second-hand furniture dealers buy quickly but pay less, since they have to resell.",
  options: [
    {
      channel: "Online marketplace, with your area set",
      youGet: "Close to what similar pieces are selling for",
      speed: "Days to a couple of weeks",
      bestWhen: "You can wait and the buyer can collect",
    },
    {
      channel: "Estate or apartment WhatsApp group, neighbours",
      youGet: "A fair price, with no transport",
      speed: "Days",
      bestWhen: "You're moving out or selling something bulky",
    },
    {
      channel: "Second-hand furniture dealer",
      youGet: "Less, because the dealer resells at a profit",
      speed: "Same day, often with their own transport",
      bestWhen: "You need everything gone quickly",
    },
  ],
  sections: [
    {
      kind: "list",
      id: "describe-it",
      heading: "Measure, photograph, describe",
      intro: "Furniture buyers can't sit on a photo, so the listing has to answer their questions.",
      items: [
        "Measurements: width, depth and height. Buyers check them against their doorways and rooms.",
        "What it's made of: solid wood (and which, such as mvule, mahogany or cypress) or board, and the fabric on sofas.",
        "Size in the terms buyers use: a 3-seater or an L-shape, a 5x6 bed, a three-door wardrobe.",
        "Condition, honestly: stains, scratches, loose joints, sagging cushions. Photograph them.",
        "Photos in daylight from several angles, and whether a mattress, cushions or covers are included.",
        "Whether it comes apart. Beds and wardrobes that dismantle are far easier to sell.",
      ],
    },
    {
      kind: "list",
      id: "price-it",
      heading: "How to price second-hand furniture",
      items: [
        "Check what similar pieces are listed for near you right now.",
        "Solid wood holds its value far better than board; well-kept hardwood can sell close to new.",
        "Bulky pieces sell to fewer people, so price them to move, and say whether the price is negotiable.",
      ],
    },
    {
      kind: "list",
      id: "transport",
      heading: "Transport: who moves it?",
      items: [
        "The standard is that the buyer collects. Say so in the listing.",
        "If you can deliver, quote transport separately, for example by pickup truck.",
        "Dismantle beds and wardrobes before the buyer arrives, and keep the screws in a labelled bag.",
        "Take payment before the furniture is loaded.",
      ],
    },
    {
      kind: "list",
      id: "moving-out",
      heading: "Moving out? Sell it all at once",
      items: [
        "Start a week or two before the move, not the weekend you leave.",
        "List each piece on Shopi with your area set, then share the links in your estate WhatsApp group.",
        "Offer a better price for several items together, and agree pickup dates in chat.",
      ],
    },
    PAID_SAFELY,
  ],
  live: {
    heading: "Second-hand furniture on Shopi right now",
    intro: "Live asking prices, not valuations. Compare similar size, material and condition.",
    subcategories: ["Furniture", "Sofas & Couches", "Beds & Mattresses", "Tables & Desks", "Wardrobes & Storage"],
    noun: "piece",
    // Timber and boards get filed under Furniture; they're building material.
    // Not "board": it would drop cupboards and sideboards.
    titleExcludes: ["timber", "hardwood", "plank", "plywood"],
    maxPrice: 2_000_000,
  },
  faq: [
    {
      q: "Where can I sell second-hand furniture in Nairobi?",
      a: "Post it on an online marketplace such as Shopi or Facebook Marketplace with your area set, so buyers nearby see it first, and share it in your estate WhatsApp group. Second-hand furniture dealers buy quickly but pay less.",
    },
    {
      q: "Who buys used furniture in Kenya?",
      a: "People setting up a home: students, young families, people moving to a new town, and small businesses furnishing an office or a rental. Dealers buy too, to resell.",
    },
    {
      q: "How do I price second-hand furniture?",
      a: "Check what similar pieces are listed for near you, then adjust for material and condition. Solid wood holds its value better than board.",
    },
    {
      q: "How do I sell furniture when moving out?",
      a: "Start listing a week or two early, post each piece separately with your area set, share the links with your neighbours, and offer a discount for several items together.",
    },
    {
      q: "Should I deliver the furniture?",
      a: "You don't have to; buyers usually collect. If you offer delivery, quote it separately so the item's price stays comparable.",
    },
    {
      q: "Is it free to sell furniture on Shopi?",
      a: "Yes. Posting is free, there's no commission, and the buyer pays you directly.",
    },
  ],
  keywords: [
    "where to sell second hand furniture in Nairobi",
    "where to sell used furniture in Nairobi",
    "sell second hand furniture Kenya",
    "sell used furniture Nairobi",
    "who buys used furniture in Kenya",
    "sell furniture when moving out Kenya",
  ],
  related: [
    { label: "Furniture for sale in Kenya", path: "/for-sale/furniture" },
    { label: "Sofas for sale in Kenya", path: "/for-sale/sofas" },
    { label: "Sofa prices in Kenya", path: "/blog/sofa-prices-in-kenya" },
  ],
};

// ── Farm produce and livestock ───────────────────────────────────────────────

const FARM: WhereToSellPage = {
  slug: "farm-produce",
  title: "Where to Sell Farm Produce in Kenya: Eggs, Chicken & More",
  description:
    "Where to sell farm produce in Kenya: eggs, chicken, rabbits, avocados, honey, vegetables and livestock. Brokers, markets, hotels, aggregators and online buyers.",
  eyebrow: "Sell your produce",
  h1: "Where to sell farm produce and livestock in Kenya",
  cardLine: "Eggs, chicken, rabbits, avocados, honey, vegetables and livestock.",
  intro:
    "Farmers in Kenya sell through brokers at the farm gate, local markets, direct to hotels, restaurants, schools and shops, through cooperatives and aggregators, to exporters for crops such as Hass avocados, and online to households and small businesses. Selling direct usually pays more per tray or kilo but needs steady supply and transport; brokers pay less but take everything at once. Many farmers use two or three channels together.",
  options: [
    {
      channel: "Brokers at the farm gate",
      youGet: "A lower price, but quick payment and no transport",
      speed: "Same day",
      bestWhen: "You need to clear a harvest fast",
    },
    {
      channel: "Local and wholesale markets",
      youGet: "The market price, minus your transport and time",
      speed: "Market days",
      bestWhen: "You're near a busy market and can get there",
    },
    {
      channel: "Hotels, restaurants, schools and shops",
      youGet: "Better, steadier prices",
      speed: "Regular orders",
      bestWhen: "You can supply reliably, on schedule",
    },
    {
      channel: "Cooperatives and aggregators",
      youGet: "An agreed price, sometimes with inputs or training",
      speed: "Per collection",
      bestWhen: "You grow a crop the group buys",
    },
    {
      channel: "Exporters",
      youGet: "Export-grade prices for produce that passes grading",
      speed: "Per season",
      bestWhen: "Your crop meets their standards and season",
    },
    {
      channel: "Online: Shopi, Facebook and WhatsApp",
      youGet: "Retail prices from households and small businesses nearby",
      speed: "Days",
      bestWhen: "You can sell smaller lots and deliver, or buyers can collect",
    },
  ],
  sections: [
    {
      kind: "cards",
      id: "product-by-product",
      heading: "Who buys what",
      cards: [
        {
          title: "Eggs",
          body: "Households, shops, hotels and bakeries. A shop or hotel wants the same number of trays every week, so consistency matters as much as price. Kienyeji eggs usually sell at a premium; say which you have.",
        },
        {
          title: "Kienyeji chicken and broilers",
          body: "Broilers sell to hotels, butcheries and households, best in batches at the right weight. Kienyeji and improved kienyeji sell to households and restaurants that pay more for them. Say live or dressed, the weight, and whether you deliver.",
        },
        {
          title: "Rabbits",
          body: "Meat buyers, other farmers looking for breeding stock, and pet buyers. Give the breed, age, sex and weight, and photograph the animals clearly.",
        },
        {
          title: "Avocados",
          body: "Exporters buy Hass avocados that pass maturity tests, within the export seasons the Agriculture and Food Authority sets each year. Ask how they grade, weigh and pay before you harvest. Local varieties sell in markets and to households.",
        },
        {
          title: "Honey",
          body: "Households, shops and supermarkets. Formal retailers usually want it packed, labelled and often certified, so ask what they need. Buyers ask whether it's pure, so say where your hives are.",
        },
        {
          title: "Vegetables and fruit",
          body: "Perishable, so line buyers up before you harvest. Wholesale markets such as Wakulima (Marikiti) in Nairobi and Kongowea in Mombasa move volume; hotels, schools and grocers pay better for steady supply.",
        },
        {
          title: "Goats, sheep, pigs and cattle",
          body: "Livestock markets, butcheries, and farmers buying breeding stock. Give the breed, age and weight, and keep deworming and vaccination records; buyers of breeding stock ask for them.",
        },
      ],
    },
    {
      kind: "list",
      id: "better-price",
      heading: "Getting a better price",
      items: [
        "Sort and grade before you sell. Mixed sizes get the lowest price for everything.",
        "Sell by weight or a standard unit (tray, kilo, crate), not by the sack or heap, and use a scale.",
        "Line up buyers before harvest, especially for perishables.",
        "Keep a list of repeat buyers and tell them when you'll have stock.",
        "Quote delivery separately from the price of the produce.",
      ],
    },
    {
      kind: "list",
      id: "traps",
      heading: "Avoid the common traps",
      items: [
        "Real buyers don't ask you to pay a \"registration\" or \"contract\" fee to sell to them. Walk away.",
        "Get grading, weights and payment terms in writing before delivering to an exporter or aggregator.",
        "Release produce or animals only once payment has arrived in your account. Check it yourself; don't trust an SMS someone shows you.",
      ],
    },
    {
      kind: "steps",
      id: "sell-on-shopi",
      heading: "Selling produce on Shopi",
      intro:
        "Shopi reaches households and small businesses near you. It suits trays, crates and a few animals better than export volumes.",
      items: [
        {
          title: "Post a photo or short video",
          body: "Show the produce or animals as they are today. Shopi Agent drafts the listing for you to check.",
        },
        {
          title: "Say how much you have and the unit price",
          body: "\"Kienyeji eggs, 20 trays available, price per tray\" beats \"eggs for sale\".",
        },
        {
          title: "Set your location",
          body: "Buyers near you see it first, which matters for anything that has to be collected or delivered fresh.",
        },
      ],
    },
  ],
  live: {
    heading: "Farm produce and livestock on Shopi right now",
    intro: "Live listings from farmers and sellers. Use them to see how others describe and price similar produce.",
    subcategories: ["Eggs", "Poultry", "Fruits", "Vegetables", "Honey", "Goats & Sheep"],
    noun: "listing",
    titleIncludes: [
      "egg", "chick", "chicken", "kienyeji", "broiler", "layer", "kuku", "poultry",
      "rabbit", "goat", "sheep", "dorper", "cow", "heifer", "pig", "piglet",
      "honey", "avocado", "hass", "mango", "banana", "orange", "pawpaw", "watermelon",
      "fruit", "vegetable", "tomato", "onion", "cabbage", "kale", "sukuma", "spinach",
      "potato", "carrot", "chilli", "pepper", "maize", "beans", "ndengu", "millet",
      "sorghum", "milk", "fish", "tilapia", "macadamia", "coffee", "tea leaves",
    ],
  },
  faq: [
    {
      q: "Where can I sell eggs in Kenya?",
      a: "To households, shops, hotels and bakeries near you, and through local markets. Shops and hotels want steady weekly supply. You can also post your trays on Shopi with your location and how many you have.",
    },
    {
      q: "Where can I sell kienyeji chicken in Nairobi?",
      a: "To households and restaurants that pay a premium for kienyeji, to butcheries, and online. List them on Shopi with live or dressed weight and whether you deliver.",
    },
    {
      q: "Where can I sell rabbits in Kenya?",
      a: "To meat buyers, to farmers looking for breeding stock, and to pet buyers. Give the breed, age, sex and weight in your listing.",
    },
    {
      q: "Where can I sell Hass avocados in Kenya?",
      a: "To exporters, if your fruit passes their maturity and quality checks and the export season is open; the Agriculture and Food Authority sets the seasons. Otherwise to aggregators, markets and households.",
    },
    {
      q: "Where can I sell honey in Kenya?",
      a: "To households, shops and supermarkets. Supermarkets usually want it packed, labelled and certified, so ask what they need first.",
    },
    {
      q: "Where can I sell my farm produce online in Kenya?",
      a: "On Shopi, Facebook and WhatsApp. Shopi is free to post on with no commission, and buyers near you see your listing first.",
    },
    {
      q: "How do I avoid being cheated by brokers?",
      a: "Sell by weight with a scale rather than by the sack, know the current market price before you negotiate, and release produce only once payment is in your account.",
    },
  ],
  keywords: [
    "where to sell farm produce in Kenya",
    "where to sell eggs in Kenya",
    "where to sell kienyeji chicken in Nairobi",
    "where to sell broilers in Kenya",
    "where to sell rabbits in Kenya",
    "where to sell hass avocado in Kenya",
    "where to sell honey in Kenya",
    "where to sell chillies in Kenya",
  ],
  related: [
    { label: "Farm produce for sale in Kenya", path: "/for-sale/farm-produce" },
    { label: "Livestock for sale in Kenya", path: "/for-sale/livestock" },
    { label: "Buy and sell in Kenya", path: "/buy-and-sell-in-kenya" },
  ],
};

export const whereToSellPages: WhereToSellPage[] = [PHONES, LAPTOPS, ELECTRONICS, FURNITURE, FARM];

export function getWhereToSellPage(slug: string): WhereToSellPage | undefined {
  return whereToSellPages.find((page) => page.slug === slug);
}
