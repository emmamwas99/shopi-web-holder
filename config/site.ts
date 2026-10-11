export const siteConfig = {
  name: "Shopi",

  // Short brand positioning, rendered as display copy (e.g. inside the OG card
  // image). Kept prose-shaped — the keyword-led form belongs in metaTitle.
  tagline: "Kenya's social marketplace for buying and selling locally",

  // The <title> / og:title / twitter:title for the site root. Leads with the
  // primary commercial query ("sell online in Kenya") rather than the brand
  // positioning, since the brand term already ranks on its own.
  metaTitle: "Shopi — Sell Online in Kenya | Buy & Sell Locally",

  // Primary brand description used for SEO, Open Graph and structured data.
  description:
    "Sell online in Kenya for free with Shopi. Use Shopi Agent to create listings with AI, discover local buyers, and connect directly with buyers and sellers. Zero commission.",

  answerEngineSummary:
    "Shopi is a free Kenyan social commerce marketplace where people buy and sell locally through photo and video listings, direct in-app messaging, and Shopi Agent, an AI assistant for creating listings and finding products.",

  // Default canonical domain. Override per-environment with NEXT_PUBLIC_APP_URL.
  //
  // The production site is served from the www host and the apex redirects to
  // it (see next.config.ts). Canonicals, sitemap URLs, JSON-LD @ids and OG
  // urls all derive from this value, so it must match the host that actually
  // serves pages — pointing it at the apex makes every canonical a redirect.
  url: process.env.NEXT_PUBLIC_APP_URL || "https://www.shopi.co.ke",

  // The site-wide OG card is rendered by app/[lang]/opengraph-image.tsx. Keep
  // that file out of route groups: Next adds a hash suffix to image routes
  // under a (group), and this hand-built URL then 404s on every share.
  ogImage: "/en/opengraph-image",

  // The single monitored inbox. Everything — support, business, legal, privacy,
  // copyright, abuse, job applications — routes here, so contact pages, legal
  // pages and structured data must all read this constant rather than hardcode
  // an address. Enquiries are separated by mailto subject prefix, not by
  // address (see app/[lang]/contact/page.tsx).
  supportEmail: "tech.team@shopi.co.ke",

  twitterHandle: "@shopiapp",
  locale: "en-KE",
  themeColor: "#E0005C",

  // Primary search/discovery terms.
  keywords: [
    // Brand
    "Shopi",
    "Shopi Kenya",
    "Shopi Agent",
    "Shopi marketplace",
    "Shopi app",

    // Marketplace
    "classifieds Kenya",
    "Kenya classifieds",
    "social marketplace Kenya",
    "local marketplace Kenya",
    "online marketplace Kenya",
    "marketplace Kenya",
    "buy and sell Kenya",
    "buy and sell locally",
    "sell online",
    "sell online Kenya",
    "sell online in Kenya",
    "how to sell online in Kenya",
    "sell online for free",
    "buy and sell online",
    "buy and sell online in Kenya",
    "where can I sell online",
    "where to sell used items",
    "where to sell used items in Kenya",
    "best place to sell online in Kenya",
    "sell things online Kenya",
    "start selling online Kenya",
    "local buying and selling",
    "discover products near me",
    "nearby marketplace Kenya",
    "free online selling platform Kenya",
    "post items for sale Kenya",
    "sell second hand items Kenya",
    "used items for sale Kenya",

    // AI
    "Shopi AI agent",
    "AI buyer agent Kenya",
    "AI seller agent Kenya",
    "AI marketplace Kenya",
    "AI shopping assistant",
    "AI selling assistant",
    "AI product listings",
    "AI classifieds",
    "sell with AI",
    "buy with AI",
    "photo to listing AI",
    "find products with AI",

    // Bulk upload
    "bulk upload listings Kenya",
    "bulk upload products from Excel",
    "upload multiple listings at once",
    "post many items at once Kenya",
    "bulk listing tool Kenya",
    "AI bulk listing upload",
    "auto categorize products AI",

    // Categories
    "Mazda Atenza for sale Kenya",
    "Toyota Premio for sale Kenya",
    "Toyota Harrier for sale Kenya",
    "Probox for sale Kenya",
    "cars for sale Kenya",
    "used cars for sale Kenya",
    "phones for sale Kenya",
    "Samsung phones for sale Kenya",
    "iPhone for sale Kenya",
    "laptops for sale Kenya",
    "electronics for sale Kenya",
    "TVs for sale Kenya",
    "smart TVs for sale Kenya",
    "phone accessories Kenya",
    "fashion marketplace Kenya",
    "furniture for sale Kenya",
    "sofas for sale Kenya",
    "beds for sale Kenya",
    "home items Kenya",
    "beauty products Kenya",
    "cosmetics Kenya",
    "body lotion Kenya",
    "body oils Kenya",
    "skincare products Kenya",
    "hair products Kenya",
    "farm produce Kenya",
    "livestock for sale Kenya",
    "cows for sale Kenya",

    // Property
    "land for sale Kenya",
    "land for sale in Kenya",
    "plots for sale Kenya",
    "houses for sale Kenya",
    "houses for rent Kenya",
    "property for sale Kenya",
    "property for sale Nairobi",
    "plots for sale in Nyahururu",
    "plots for sale in Nyandarua",

    // Local intent
    "Nairobi marketplace",
    "Mombasa marketplace",
    "Kisumu marketplace",
    "Nakuru marketplace",
    "Meru marketplace",

    // Competitor searches. People look for the name they already know, so the
    // comparison page has to be reachable by it.
    "Jiji alternative Kenya",
    "sites like Jiji Kenya",
    "PigiaMe alternative",
    "alternative to Jiji and PigiaMe",
    "best site to sell online in Kenya",
    "free classifieds Kenya",
    "Facebook Marketplace Kenya",
    "TikTok marketplace Kenya",
  ],

  routes: {
    // for-you/explore/search are indexed (see app/sitemap.ts), so their titles
    // carry the query people type rather than the in-app tab name.
    feed: {
      path: "/for-you",
      title: "For You — Products for Sale Near You in Kenya",
      description:
        "Shopi For You is a personalized marketplace feed of products for sale near you in Kenya — phones, cars, fashion, furniture and more. Message local sellers directly.",
    },

    explore: {
      path: "/explore",
      title: "Explore Products for Sale Near You in Kenya",
      description:
        "Explore products for sale near you in Kenya by category, or ask Shopi Agent to find exactly what you need and chat with local sellers directly.",
    },

    search: {
      path: "/search",
      title: "Search Cars, Phones and More for Sale in Kenya",
      description:
        "Search cars, phones, fashion, furniture, farm produce and other local listings across Kenya.",
    },

    // The directory of sellers. Indexed: every card is an internal link to a
    // storefront, which is how those profiles earn their own indexing.
    stores: {
      path: "/stores",
      title: "Online Stores and Sellers in Kenya",
      description:
        "Browse verified sellers and online stores across Kenya on Shopi — phones, fashion, furniture, cars and more. See live stock counts and message sellers directly.",
    },

    notifications: {
      path: "/notifications",
      title: "Inbox",
      description:
        "Stay connected with buyers and sellers through your Shopi conversations and activity.",
    },

    profile: {
      path: "/profile",
      title: "Profile",
      description:
        "Manage your Shopi profile, listings, saved items and account settings.",
    },

    upload: {
      path: "/upload",
      title: "Create a Listing",
      description:
        "Create a listing yourself or let Shopi Agent turn your photos into a complete listing in seconds.",
    },
  },
} as const;
