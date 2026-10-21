export type BlogPost = {
  slug: string;
  title: string;
  /**
   * The one search query this post is written to rank for. It has to appear
   * verbatim (case-insensitive) in the title, the excerpt — rendered as the
   * lead paragraph — the body copy and the meta description.
   * `npm run seo:audit` checks all four.
   */
  primaryKeyword: string;
  description: string; // meta description, 155 chars max
  excerpt: string;     // card teaser, and the lead paragraph on the post page
  category: string;
  readTime: string;
  publishedAt: string; // ISO date
  /**
   * ISO date of the last substantive edit. Feeds `dateModified` in the Article
   * schema, the sitemap's lastmod and the visible "Updated" date — generative
   * engines weight recency when choosing between sources, and an undated page
   * loses to a dated one on the same topic. Falls back to publishedAt when a
   * post has never been revised. Bump it only for real content changes, never
   * for typo fixes; `npm run seo:audit` flags posts due for a review.
   */
  updatedAt?: string;
  author: { name: string; role: string; initials: string; color: string };
  keywords: string[];
  sections: BlogSection[];
  faq: { q: string; a: string }[];
  relatedLinks?: { label: string; url: string; description: string }[];
};

type BlogSection = {
  heading: string;
  body: string; // supports \n\n for paragraph breaks
  list?: string[];
};

export const blogPosts: BlogPost[] = [
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "how-shopi-agent-helps-kenyan-buyers-and-sellers-every-day",
    title: "How Shopi Agent Helps Kenyan Buyers and Sellers Every Day",
    primaryKeyword: "Shopi Agent",
    description:
      "Shopi Agent is the free AI assistant inside Shopi. Learn how it helps Kenyan sellers create listings and buyers find products through everyday language.",
    excerpt:
      "Shopi Agent turns everyday buying and selling into a conversation: sellers upload a photo, buyers describe what they need, and Shopi helps both sides move faster.",
    category: "AI Guide",
    readTime: "7 min read",
    publishedAt: "2026-09-09",
    author: {
      name: "Shopi Team",
      role: "Product Education",
      initials: "S",
      color: "#d81470",
    },
    keywords: [
      "Shopi Agent",
      "AI shopping assistant Kenya",
      "AI marketplace Kenya",
      "AI listing assistant",
      "AI for sellers Kenya",
      "AI product search Kenya",
      "photo to listing AI",
      "social commerce AI",
      "sell online Kenya with AI",
      "find products online Kenya",
    ],
    sections: [
      {
        heading: "What is Shopi Agent?",
        body: "Shopi Agent is the AI assistant built into Shopi, Kenya's social marketplace. It helps sellers create better listings from simple product photos and helps buyers find relevant products by describing what they want in normal language.\n\nThe important difference is that Shopi Agent sits inside the marketplace. It is not a separate chatbot that gives general advice and sends people away. It works around real Shopi buying and selling tasks: creating a listing, improving product details, understanding a buyer's request, and guiding the user toward the next useful step.",
      },
      {
        heading: "How Shopi Agent helps sellers day to day",
        body: "For many small sellers, the hardest part of selling online is not the product. It is the blank form: title, category, description, specifications, condition, and the small details buyers expect before they message. Shopi Agent reduces that work.\n\nA seller can upload a product photo and use Shopi Agent to draft the listing details. The seller still checks the price, condition, location, and any details the photo cannot prove, but the first draft is no longer starting from zero.",
        list: [
          "Turns product photos into listing drafts",
          "Suggests product titles buyers can understand",
          "Helps write descriptions that mention condition, use case, and key details",
          "Suggests categories and specifications where the product is clear",
          "Leaves the seller in control before anything is published",
        ],
      },
      {
        heading: "How Shopi Agent helps buyers day to day",
        body: "Buyers do not always know the perfect search term. Someone may want 'a clean used fridge near Nakuru under 30k' or 'a good phone for TikTok videos around 20,000' rather than a specific brand and model. Shopi Agent is designed for those moments.\n\nInstead of forcing the buyer to think like a filter menu, Shopi Agent lets them explain the need in plain language. It can use the item, budget, location, and intent inside the request to help surface useful Shopi listings.",
        list: [
          "Understands natural buying requests",
          "Helps buyers move from vague need to relevant listings",
          "Makes local discovery easier by considering location language",
          "Supports product discovery when buyers do not know the exact category",
        ],
      },
      {
        heading: "Why AI matters for social commerce in Kenya",
        body: "Kenyan commerce is already conversational. People ask questions before buying, negotiate in chat, confirm location, ask for more photos, and decide based on trust. AI is useful when it supports that behaviour instead of replacing it.\n\nShopi Agent helps with the repetitive parts of commerce: writing, structuring, describing, and searching. The human parts remain human. Buyers and sellers still message directly, agree price directly, arrange payment directly, and decide whether a deal feels right.",
      },
      {
        heading: "Everyday examples",
        body: "A clothes seller in Nairobi can photograph a dress and get help turning it into a clear listing with size, style, condition, and a buyer-friendly title. A phone dealer can create a faster draft that reminds them to mention storage, battery health, accessories, and location. A furniture seller can describe dimensions and delivery options in a way buyers can scan quickly.\n\nOn the buyer side, someone furnishing a bedsitter can ask for affordable sofas near them. A parent can search for a school bag within a budget. A small business owner can look for a second-hand phone for content creation. The goal is not to make shopping complicated; it is to remove the typing and guessing that slow people down.",
      },
      {
        heading: "What Shopi Agent does not do",
        body: "For trust and safety, Shopi Agent has clear limits. It does not publish a listing without the seller reviewing it. It does not negotiate prices. It does not message buyers or sellers on anyone's behalf. It does not process payments, hold money, provide escrow, or guarantee that a seller or buyer is trustworthy.\n\nThat matters because Shopi is a direct marketplace. The agent helps people create and discover better listings, but every deal remains between the buyer and the seller.",
        list: [
          "No automatic publishing without review",
          "No payment handling or escrow",
          "No price negotiation on behalf of users",
          "No messaging other people without the user's action",
          "No replacement for checking product condition before paying",
        ],
      },
      {
        heading: "How to get the best results from Shopi Agent",
        body: "AI works best when the input is specific. Sellers should upload clear photos, add the real price, correct details that only they know, and be honest about condition. Buyers should mention the product, budget, location, preferred condition, and any must-have details.\n\nA simple request like 'used Samsung phone in Nairobi under 25,000 with good camera' is more useful than 'phone'. A seller photo taken in good light is more useful than a dark or cropped image. Shopi Agent is powerful, but better context still creates better results.",
      },
    ],
    faq: [
      {
        q: "What is Shopi Agent?",
        a: "Shopi Agent is the free AI assistant inside Shopi. It helps sellers create listings from product photos and helps buyers find products by describing what they want in plain language.",
      },
      {
        q: "How does Shopi Agent help sellers in Kenya?",
        a: "It reduces the work of creating listings by suggesting titles, descriptions, categories, and specifications from a product photo. Sellers review and edit the draft before publishing.",
      },
      {
        q: "How does Shopi Agent help buyers?",
        a: "Buyers can describe what they want naturally, including budget and location, and Shopi Agent helps them discover relevant listings instead of relying only on exact search keywords.",
      },
      {
        q: "Is Shopi Agent free?",
        a: "Yes. Shopi Agent is part of Shopi and is free for buyers and sellers. Shopi does not charge listing fees or take commission from sales.",
      },
      {
        q: "Can Shopi Agent negotiate or buy products for me?",
        a: "No. Shopi Agent helps with listing creation and product discovery. It does not negotiate, send messages on your behalf, process payments, or complete purchases.",
      },
      {
        q: "Does Shopi Agent publish listings automatically?",
        a: "No. The seller reviews and edits the listing draft first. Nothing is published until the seller confirms it.",
      },
    ],
    relatedLinks: [
      {
        label: "Shopi Agent",
        url: "/shopi-agent",
        description:
          "The main Shopi Agent page explains how the AI assistant works for sellers and buyers.",
      },
      {
        label: "How to sell on Shopi",
        url: "/blog/how-to-sell-on-shopi-complete-guide-for-kenyan-sellers",
        description:
          "A practical guide for sellers who want to create better listings and close more direct chats.",
      },
      {
        label: "Explore Shopi listings",
        url: "/explore",
        description:
          "Browse the marketplace and see how product discovery works across categories and locations.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: "why-social-discovery-is-the-future-of-shopping-in-kenya",
    title: "Why Social Discovery Is the Future of Shopping in Kenya",
    primaryKeyword: "social discovery",
    description:
      "Kenyan shoppers are skipping search and heading straight to social feeds. See why social discovery is reshaping how Nairobi and the rest of Kenya shop.",
    excerpt:
      "Search is dead for product discovery. Kenyan buyers now find what they want by scrolling — not typing. Here's why social discovery changes everything.",
    category: "Trends",
    readTime: "6 min read",
    publishedAt: "2026-05-10",
    author: { name: "Shopi Team", role: "Editorial", initials: "S", color: "#f59e0b" },
    keywords: [
      "social commerce Kenya",
      "social discovery shopping",
      "buy online Kenya",
      "Nairobi e-commerce",
      "TikTok shopping Africa",
      "video commerce",
      "discover products online",
      "local sellers Kenya",
    ],
    sections: [
      {
        heading: "The search-first era is ending",
        body: "For two decades, product discovery meant opening a search engine, typing a query, and hoping the algorithm surfaced what you were looking for. That model worked when catalogues were the only alternative. Today, it feels like work.\n\nAcross Kenya — in Nairobi's Westlands, Mombasa's Old Town, Kisumu's lakeside markets — a different behaviour has taken hold. People open an app, start scrolling, and discover products they didn't know they needed. The product found them. That is social discovery.",
      },
      {
        heading: "Why video is the product page that actually converts",
        body: "A static image shows you what something looks like. A video shows you how it feels, how it moves, who made it, and why they love it. For categories like fashion, home décor, food, and electronics — the categories that define Kenyan informal commerce — video is not a nice-to-have. It is the product page.\n\nVideo-first social platforms consistently see buyers engage far more with moving product demos than with static photos. On Shopi there is no cart, no checkout friction, no abandoned sessions — a buyer watches, messages the seller, and the two of them close the deal in a single conversation.",
      },
      {
        heading: "Trust is local, and local is powerful",
        body: "In Kenya's social commerce landscape, proximity builds trust. Buyers want to know a seller is in Kiambu, not a warehouse in Guangzhou. They want to see a face, hear a voice, and talk to the actual person selling.\n\nSocial discovery feeds that surface local sellers first tap into a trust dynamic that no global marketplace can replicate. When you see your neighbour's favourite fashion vendor on your feed, the decision to buy is already half-made.",
        list: [
          "Location-tagged posts surface sellers near the buyer first",
          "Every post carries a real price and a real location",
          "Video shows the actual product — not a stock photo",
          "Direct messaging lets buyers negotiate, ask questions, and build relationships",
        ],
      },
      {
        heading: "The infrastructure is finally here",
        body: "Mobile internet is how most Kenyans get online at all, and smartphone ownership keeps climbing. M-PESA makes payment frictionless. Affordable smartphones mean video content is accessible to sellers at every income level. The infrastructure for social commerce has quietly assembled itself — all it needed was a platform built around discovery rather than search.",
      },
      {
        heading: "What this means for sellers",
        body: "If you are a seller in Kenya and you are not creating short videos of your products, you are invisible to the largest and fastest-growing segment of buyers. Social discovery does not reward the biggest catalogue — it rewards authenticity, consistency, and local relevance. A seller posting three genuine videos a week will out-earn a competitor with a polished website and zero social presence.\n\nThe barrier to entry has never been lower. A smartphone, good light, and a real product are all you need to start.",
      },
    ],
    faq: [
      {
        q: "What is social discovery in e-commerce?",
        a: "Social discovery is the process of finding products through social feeds, videos, and peer recommendations rather than through active search. Platforms like Shopi are built around this model — surfacing relevant products to buyers before they know they want them.",
      },
      {
        q: "How does Shopi use social discovery?",
        a: "Shopi's feed algorithm surfaces video posts from local sellers based on a buyer's location, interests, and following activity. Buyers scroll, discover, and message sellers directly — no search required.",
      },
      {
        q: "Is social commerce big in Kenya?",
        a: "Yes. Kenya's high mobile internet penetration, widespread M-PESA adoption, and vibrant informal retail sector make it one of Africa's fastest-growing social commerce markets.",
      },
      {
        q: "Can small sellers in Kenya benefit from social discovery?",
        a: "Absolutely. Social discovery levels the playing field — a consistent, authentic video presence can outperform a large catalogue. Shopi is specifically designed for Kenya's local, informal sellers.",
      },
    ],
    relatedLinks: [
      {
        label: "Explore Shopi listings",
        url: "/explore",
        description:
          "See social discovery in practice: browse products from local sellers across Kenya by category and location.",
      },
      {
        label: "Video commerce vs traditional e-commerce",
        url: "/blog/video-commerce-vs-traditional-e-commerce-which-wins-in-africa",
        description:
          "Why short product videos build the trust that catalogue listings struggle to, and where catalogues still win.",
      },
      {
        label: "TikTok — Short-form video discovery",
        url: "https://www.tiktok.com",
        description: "The platform that proved video-first discovery works at scale. Shopi brings the same scroll-to-discover experience to local commerce in Kenya.",
      },
      {
        label: "Jiji Kenya — Classifieds marketplace",
        url: "https://jiji.co.ke",
        description: "Kenya's leading classifieds platform for buying and selling. Shopi complements the intent-driven classifieds model with video discovery and direct seller messaging.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: "how-to-sell-on-shopi-complete-guide-for-kenyan-sellers",
    title: "How to Sell on Shopi: The Complete Guide for Kenyan Sellers",
    primaryKeyword: "how to sell on Shopi",
    description:
      "How to sell on Shopi, step by step: build a trusted profile, let Shopi Agent draft your listing, film videos that sell and close deals safely in Kenya.",
    excerpt:
      "Here is how to sell on Shopi, from your first post to your first sale — a practical, no-fluff guide for Kenyan sellers ready to take their business online.",
    category: "Seller Guide",
    readTime: "11 min read",
    publishedAt: "2026-05-14",
    updatedAt: "2026-09-15",
    author: { name: "Shopi Team", role: "Seller Guides", initials: "S", color: "#10b981" },
    keywords: [
      "how to sell on Shopi",
      "sell online Kenya",
      "Kenyan seller guide",
      "start selling online Nairobi",
      "social commerce seller tips",
      "video selling Kenya",
      "M-PESA seller payments",
      "informal market digital Kenya",
    ],
    sections: [
      {
        heading: "Step 1 — Set up a seller profile that builds trust",
        body: "Your profile is your storefront. Buyers scan it in under three seconds before deciding whether to message you. A strong seller profile on Shopi includes a clear face photo (not a logo — people buy from people), your real location, and a one-line description of what you sell.\n\nLearning how to sell on Shopi starts here, and it takes minutes: create your account, tag your location so the feed can surface you to buyers nearby, and post your first product. There is no fee to join and nothing to pay to start selling.",
        list: [
          "Use a real face photo — not a logo or stock image",
          "Add your exact neighbourhood (e.g. 'Gikomba, Nairobi')",
          "Tag your location so nearby buyers discover you first",
          "Write your bio in both English and Kiswahili to maximise reach",
        ],
      },
      {
        heading: "Step 2 — Choose how to create your listing",
        body: "When you tap create, Shopi gives you more than one way to get a product in front of buyers, and the right one depends on what you already have.\n\nIf you have a product in front of you and no time to write, use Shopi Agent. Take or upload a photo and the guided setup drafts the title, description, category and specifications for you. Nothing is published until you have checked it, so treat the draft as a strong first version: correct anything the photo cannot prove, such as condition, storage size or what is included in the box.\n\nIf you prefer full control, create the listing manually and fill in each field yourself. And if you already sell on TikTok, you do not need to film everything again — import your existing TikTok videos and turn them into Shopi posts that local buyers can message you about.",
        list: [
          "Shopi Agent — upload a photo and review the listing it drafts",
          "Manual — full control over every field from the start",
          "Import from TikTok — reuse videos you have already made",
          "Photos, a short clip or a text post — pick the format that shows the item best",
        ],
      },
      {
        heading: "Step 3 — Write a title and details buyers can find",
        body: "Buyers on Shopi search with the words they would say out loud to a shopkeeper: 'Samsung A15 used', 'three-seater sofa Ruiru', 'Toyota Vitz 2014'. Your title should contain those words. Lead with the item, then the brand and model, then the detail that decides the sale — size, capacity, year or condition. Clever or vague titles such as 'Amazing deal!!' tell a buyer nothing and never match a search.\n\nThen complete the rest of the listing properly. Pick the most specific category and subcategory, because buyers browsing a category never see a listing filed in the wrong place. Add specifications where Shopi offers them. Enter the price in KES and switch on 'negotiable' only if you genuinely are, so buyers know where they stand before the first message. Set your location accurately, and check that the post's audience is set to Everyone — a post limited to friends or to yourself will not reach new buyers.",
        list: [
          "Title: item, brand and model, then the detail that decides the sale",
          "The most specific category and subcategory available",
          "Specifications buyers compare on — size, storage, year, condition",
          "Price in KES, marked negotiable only if it really is",
          "Accurate location, and the audience set to Everyone",
        ],
      },
      {
        heading: "Step 4 — Create video posts that actually sell",
        body: "The best-performing videos on Shopi follow a simple formula: show the product in use in the first two seconds, reveal the price before the five-second mark, and end with a direct call to action ('DM me to order'). You do not need a ring light or a studio. Natural light from a window, a clean background, and steady hands are enough.\n\nFilm in portrait mode. Keep videos between 15 and 45 seconds. Post at peak hours: 7–9 AM, 12–1 PM, and 7–9 PM East Africa Time.",
        list: [
          "Show the product in use within the first 2 seconds",
          "Display price clearly — Kenyan buyers respond to transparent pricing",
          "Speak naturally — scripted videos underperform authentic ones",
          "Add location and category tags for maximum discoverability",
        ],
      },
      {
        heading: "Step 5 — Price and communicate clearly",
        body: "Ambiguous pricing kills sales. State your price in the video and in the caption. Offer clear delivery or pickup options so buyers know what to expect. On Shopi you and the buyer agree everything between yourselves — Shopi does not handle payment, take a commission, or hold your money.\n\nWhen a buyer messages you, reply quickly. Response speed is one of the strongest predictors of whether a chat turns into a sale. Treating every message like a real customer standing in front of you is the simplest way to win deals.",
      },
      {
        heading: "Step 6 — Close the deal safely",
        body: "Because Shopi does not sit in the middle of the transaction, the last step is yours to manage, and a few habits protect you on every sale. Agree the price, the payment method and the handover in chat before anyone travels, so there are no surprises on the day and you have a written record of what was agreed.\n\nFor collection in person, meet somewhere public and busy during daylight. For delivery, agree who pays the courier or boda and when. Whatever the method, confirm the money has actually arrived in your M-PESA or bank account before the item leaves your hands. A screenshot or a forwarded SMS is not payment — check your own balance or statement. Be cautious of buyers who offer more than your asking price, insist on a courier you did not choose, or rush to move the conversation away from Shopi before you have agreed anything.",
        list: [
          "Agree price, payment and handover in writing before meeting",
          "Meet in a public, busy place during daylight",
          "Check your own M-PESA or bank balance — never trust a screenshot",
          "Walk away from overpayments and unusual courier requests",
        ],
      },
      {
        heading: "Step 7 — Build repeat customers, not just transactions",
        body: "One-time buyers are expensive to acquire. Repeat customers cost nothing extra. After every successful sale, send the buyer a follow-up message a day later asking if they are happy with the product. This simple step generates more referrals and more repeat business than any ad spend.\n\nKeep posting consistently so your followers see your new stock in their feed. The buyers who already trust you are your easiest next sale.",
      },
      {
        heading: "Common mistakes new Shopi sellers make",
        body: "The most common reasons new sellers stall are: posting infrequently (less than three times a week), using only product photos instead of video, writing captions without prices, and being slow to respond to messages. Fix these four things and your first deals will follow.\n\nOne more mistake is worth calling out because it is invisible to the seller: publishing a Shopi Agent draft without reading it. The draft is usually a good start, but only you know the real condition of the item, what is included, and whether the price is firm. A listing that promises something the product cannot deliver wins a message and loses the sale.",
        list: [
          "Posting fewer than 3 times per week — consistent sellers stay visible in the feed",
          "Hiding the price — always lead with the number",
          "Ignoring questions in chat — every reply is a chance to close a deal",
          "Not using location tags — local discovery is your biggest edge",
          "Publishing an AI draft unchecked — correct condition, extras and price first",
        ],
      },
    ],
    faq: [
      {
        q: "How do I start selling on Shopi?",
        a: "Create a free account, add your location, then tap create. Upload a photo and let Shopi Agent draft the listing, create it manually, or import a TikTok video. Check the title, price, category and location, then publish. Buyers message you directly.",
      },
      {
        q: "Can Shopi Agent write my listing for me?",
        a: "Yes. Upload a product photo and Shopi Agent drafts the title, description, category and specifications. You review and edit everything before it is published, so correct anything the photo cannot show, such as condition or accessories.",
      },
      {
        q: "Can I import my TikTok videos to Shopi?",
        a: "Yes. Shopi can import videos from your TikTok account so you can reuse content you have already made and reach local buyers without filming again.",
      },
      {
        q: "Is selling on Shopi free?",
        a: "Yes. Posting products and messaging buyers is completely free. Shopi does not charge a fee, take a commission on your sales, or hold your money.",
      },
      {
        q: "How do I receive payments from buyers?",
        a: "You arrange payment directly with the buyer in chat — for example M-PESA or pay-on-delivery. Shopi does not process payments or sit between you and your buyer; you keep full control of the deal.",
      },
      {
        q: "How many posts should I make per week?",
        a: "We recommend at least 3–5 video posts per week for new sellers. Consistent posting signals an active store to the algorithm and to buyers.",
      },
      {
        q: "Can I sell from outside Nairobi?",
        a: "Yes. Shopi is available across Kenya. Sellers outside Nairobi benefit from location-based discovery — buyers in your city will see your posts first.",
      },
    ],
    relatedLinks: [
      {
        label: "Shopi Agent",
        url: "/shopi-agent",
        description:
          "How the AI assistant turns one product photo into a listing draft you can check and publish.",
      },
      {
        label: "How Nairobi's local sellers can win online with short videos",
        url: "/blog/how-nairobi-local-sellers-are-winning-online-with-short-videos",
        description:
          "A deeper playbook for the video step: what to film, how to show condition honestly, and the habits that compound.",
      },
      {
        label: "Safety Centre",
        url: "/safety-centre",
        description:
          "Practical guidance on meeting buyers, confirming payment and spotting common scams.",
      },
      {
        label: "Jiji Kenya — See how classifieds work",
        url: "https://jiji.co.ke",
        description: "Jiji is a great reference point for text-and-image listings. Shopi builds on that foundation by adding video posts, follower feeds, and direct messaging in one place.",
      },
      {
        label: "TikTok for Business",
        url: "https://www.tiktok.com/business",
        description: "TikTok's creator tools are a useful benchmark for video content strategy. Shopi sellers can import existing TikTok videos directly to reach local buyers.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: "video-commerce-vs-traditional-e-commerce-which-wins-in-africa",
    title: "Video Commerce vs Traditional E-Commerce: Which Wins in Africa?",
    primaryKeyword: "video commerce",
    description:
      "A head-to-head comparison of video commerce and traditional e-commerce for African markets — covering trust, conversion, cost, and mobile-first behaviour.",
    excerpt:
      "Traditional e-commerce promised to transform African retail. Video commerce is actually doing it. Here's why the difference matters for every seller on the continent.",
    category: "Industry",
    readTime: "7 min read",
    publishedAt: "2026-05-18",
    author: { name: "Shopi Team", role: "Editorial", initials: "S", color: "#8b5cf6" },
    keywords: [
      "video commerce Africa",
      "e-commerce vs social commerce",
      "Africa online shopping",
      "mobile commerce Kenya",
      "TikTok shop Africa",
      "social selling Africa",
      "African e-commerce trends 2026",
      "live commerce Africa",
    ],
    sections: [
      {
        heading: "The promise vs the reality of traditional e-commerce in Africa",
        body: "Traditional e-commerce arrived in Africa with enormous ambition. Jumia, Kilimall, and dozens of clones promised to bring the Amazon model to the continent. The results were mixed. Logistics costs remained punishing. Catalogue trust was low — buyers couldn't verify product quality. Card penetration was limited. And the model assumed a desktop-first internet user that Africa largely never had.\n\nMeanwhile, informal social selling on WhatsApp and Instagram quietly thrived across sub-Saharan Africa — not because anyone built it a platform, but because it matched how people already buy and sell.",
      },
      {
        heading: "What video commerce does differently",
        body: "Video commerce does not ask buyers to trust a catalogue listing. It asks them to trust a person. When a seller in Nairobi films themselves demonstrating a dress — showing the fabric, the fit, the colour in natural light — they are providing information no product image can match.\n\nThis matters enormously in markets where returns are expensive, delivery is uncertain, and trust in anonymous online sellers is low. Video reduces perceived risk. It builds the kind of seller credibility that traditional platforms spend millions trying to manufacture with star ratings and review systems.",
      },
      {
        heading: "Why video-first selling converts",
        body: "Southeast Asia's social commerce boom — the closest analogue to East Africa's mobile-first, informal-sector-dominant economy — points to a consistent pattern: buyers act faster and with more confidence when a real person shows them a real product. The reasons are structural, not magic:",
        list: [
          "A video answers the questions a static listing leaves open — condition, size, colour, feel",
          "Seeing the seller on camera builds the personal trust that informal commerce runs on",
          "Accurate expectations mean fewer disputes and disappointed buyers after the deal",
          "A camera and good light are all a new seller needs to start — no catalogue, no studio",
        ],
      },
      {
        heading: "The mobile advantage",
        body: "Nearly all social commerce activity in Kenya happens on a smartphone. This is not a limitation — it is a structural advantage for video commerce. Phones are cameras. Every seller already owns their studio. The cost of content creation, which gatekept catalogue e-commerce to well-funded businesses, falls to near zero when your product page is a 30-second clip shot in your shop doorway.",
      },
      {
        heading: "Where traditional e-commerce still wins",
        body: "Traditional e-commerce retains advantages for high-consideration, commodity, or specification-heavy purchases. If you are buying a specific laptop model, a search-and-compare experience is more efficient than scrolling a social feed. For commodity goods with no differentiation — bulk groceries, industrial supplies, standardised electronics — catalogues and price comparison still win.\n\nBut these categories represent a small fraction of African informal retail. Fashion, beauty, homewares, food, and services — the categories that dominate Kenya's informal economy — are exactly where video commerce excels.",
      },
      {
        heading: "The verdict",
        body: "Video commerce is not a feature — it is a fundamentally different model that aligns with how African consumers actually behave. Trust is personal, discovery is social, and payment is mobile. Platforms that understand this are growing. Those that do not are struggling.",
      },
    ],
    faq: [
      {
        q: "What is video commerce?",
        a: "Video commerce is the practice of selling products through short-form or live video content, where buyers discover and purchase directly from the video experience rather than through a traditional product catalogue.",
      },
      {
        q: "Why is video commerce growing faster in Africa?",
        a: "Africa's mobile-first internet users, high social media engagement, and culture of personal trust in commerce make video-based selling a natural fit. It mirrors how informal market commerce already works — face-to-face, trust-based, conversational.",
      },
      {
        q: "How does video reduce e-commerce returns?",
        a: "Video accurately communicates product quality, size, colour, and texture in ways that static images cannot. Buyers who purchase after watching a video have accurate expectations, leading to significantly fewer returns.",
      },
      {
        q: "Can video commerce work for small sellers in Africa?",
        a: "Yes — it is arguably best-suited to small sellers. The content creation cost is low (a smartphone and natural light), the audience is local (reducing logistics complexity), and the trust advantage is immediate.",
      },
    ],
    relatedLinks: [
      {
        label: "Why social discovery is the future of shopping in Kenya",
        url: "/blog/why-social-discovery-is-the-future-of-shopping-in-kenya",
        description:
          "The buyer side of the same shift: why Kenyans increasingly find products by scrolling rather than searching.",
      },
      {
        label: "Online marketplaces in Kenya compared",
        url: "/marketplace-alternatives-kenya",
        description:
          "How classifieds, social media, WhatsApp groups and Shopi differ for the people actually buying and selling.",
      },
      {
        label: "TikTok — The benchmark for video discovery",
        url: "https://www.tiktok.com",
        description: "TikTok pioneered scroll-based video discovery at a global scale. Shopi applies the same model specifically to product discovery and local commerce in East Africa.",
      },
      {
        label: "Jiji Kenya — Kenya's classifieds leader",
        url: "https://jiji.co.ke",
        description: "Jiji's catalogue-based model works well for intent-driven search. Shopi's video feed complements it by surfacing products buyers didn't know to search for yet.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: "how-nairobi-local-sellers-are-winning-online-with-short-videos",
    title: "How Nairobi Sellers Can Win Online With Short Videos",
    primaryKeyword: "Nairobi sellers",
    description:
      "A practical playbook for Nairobi sellers — from Gikomba fashion to Luthuli Avenue electronics — on using 30-second videos to find buyers and build trust.",
    excerpt:
      "From Gikomba fabric traders to Luthuli Avenue electronics dealers — a practical playbook for Nairobi sellers taking a stall online, one short video at a time.",
    category: "Seller Guide",
    readTime: "5 min read",
    publishedAt: "2026-05-21",
    author: { name: "Shopi Team", role: "Seller Guides", initials: "S", color: "#ef4444" },
    keywords: [
      "Nairobi online sellers",
      "Gikomba fashion online",
      "Kenya small business social media",
      "Nairobi market sellers",
      "sell clothes online Kenya",
      "Nairobi informal market digital",
      "short video selling Kenya",
      "local business Nairobi growth",
    ],
    sections: [
      {
        heading: "Your stall already has everything a video needs",
        body: "A Gikomba fashion trader flipping through today's sourcing, a Luthuli Avenue dealer booting up a phone to show it works, a South B home cook lifting the lid off a sufuria — these are the videos local buyers actually want to watch. Nothing about them requires a studio.\n\nThe Nairobi sellers best placed to win online are the ones already doing the physical version of the pitch every day. A short video is the same pitch, recorded once, shown to every buyer who scrolls past.",
      },
      {
        heading: "What makes a selling video work",
        body: "Polish is not the goal — specificity is. Show exactly what you have, at exactly what price, for exactly the kind of buyer you want. Hold the jacket up to window light so the colour is honest. Show the stitching. Say the price early.\n\nA useful rule: treat the camera like a customer standing in front of you. Show them what you would show a person who walked into your stall.",
        list: [
          "Show real imperfections — buyers trust sellers who are honest about wear and tear",
          "Name the price early — every time, without exception",
          "Use Kiswahili and English in the same video to reach the widest audience",
          "Film in daylight — natural light shows true colour better than any filter",
        ],
      },
      {
        heading: "For electronics: prove it works on camera",
        body: "Used electronics live or die on trust. A video can carry proof a photo never could: the phone booting up, the battery percentage, the charging port doing its job. A buyer who has watched a device work for thirty seconds has far fewer reasons to hesitate.\n\nThat proof travels, too. A trader on Luthuli Avenue is no longer limited to foot traffic and a WhatsApp group — a clear, honest video can reach buyers well beyond the CBD, and the deal continues in chat.",
      },
      {
        heading: "Reaching buyers beyond your neighbourhood",
        body: "Shopi surfaces nearby posts first, so your first audience is the one that can reach you fastest — your estate, your side of town. But nothing stops a deal from travelling. Buyers and sellers agree delivery directly in chat, and Kenya already has the rails for it: boda couriers within the city, matatu and courier parcel services between towns.\n\nStart local, deliver further as trust and repeat buyers build up. You set the terms — Shopi stays out of the transaction.",
      },
      {
        heading: "The habits that compound",
        body: "There is no secret formula beyond showing up, being real, and being responsive. The playbook is short:",
        list: [
          "Post consistently — a steady rhythm beats a one-off viral clip",
          "Respond to messages quickly — speed is what turns a question into a deal",
          "Show real product and honest pricing in every post",
          "Repost your best videos to TikTok and WhatsApp status — meet buyers where they already scroll",
        ],
      },
    ],
    faq: [
      {
        q: "What kinds of products suit short-video selling in Nairobi?",
        a: "Fashion and clothing, used electronics, home décor, food and catering, and beauty products benefit most from video — these are categories where buyers need to see condition, colour, and quality before they commit.",
      },
      {
        q: "Do I need professional equipment to make videos for Shopi?",
        a: "No. A smartphone and natural window light are enough. Authentic, specific videos consistently do the job better than polished, generic ones.",
      },
      {
        q: "How do I start selling on Shopi from Nairobi?",
        a: "Create an account, add your location, and post a short video of something you are selling with a clear price. Posting is free, and buyers message you directly — see our complete seller guide for a step-by-step walkthrough.",
      },
      {
        q: "Can I sell from Nairobi to buyers in other Kenyan cities?",
        a: "Yes. Sellers and buyers agree delivery directly in chat — many use couriers and matatu parcel services to reach Mombasa, Kisumu, Nakuru, and beyond. Shopi connects you; you arrange the rest on your own terms.",
      },
    ],
    relatedLinks: [
      {
        label: "How to sell on Shopi: the complete guide",
        url: "/blog/how-to-sell-on-shopi-complete-guide-for-kenyan-sellers",
        description:
          "Every step from profile to first sale — creating the listing, pricing, and closing the deal safely.",
      },
      {
        label: "Buy and sell in Nairobi",
        url: "/marketplace/nairobi",
        description:
          "The latest listings from sellers across Nairobi County, from Westlands to Embakasi.",
      },
      {
        label: "Phones and electronics in Kenya",
        url: "/phones-electronics-kenya",
        description:
          "Where buyers look for Samsung, iPhone, TVs and laptops — and what sellers should include in the listing.",
      },
      {
        label: "TikTok video downloader",
        url: "/tiktok-downloader",
        description:
          "Save a clean, watermark-free copy of your own TikTok product video to repost on WhatsApp status or a Shopi listing.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: "where-to-sell-used-items-in-kenya",
    title: "Where to Sell Used Items in Kenya: A Practical Guide",
    primaryKeyword: "sell used items in Kenya",
    description:
      "Where to sell used items in Kenya: marketplaces, WhatsApp, social media or dealers? What each channel costs you and when each one actually makes sense.",
    excerpt:
      "Not every selling channel suits every item. Here's an honest comparison of where to sell used items in Kenya, what each option costs you, and how to pick.",
    category: "Seller Guide",
    readTime: "11 min read",
    publishedAt: "2026-08-27",
    updatedAt: "2026-09-15",
    author: {
      name: "Shopi Team",
      role: "Seller Guides",
      initials: "S",
      color: "#3b82f6",
    },
    keywords: [
      "where to sell used items",
      "where to sell used items in Kenya",
      "sell second hand items Kenya",
      "where can I sell online",
      "sell used phones Kenya",
      "sell online Kenya",
      "buy and sell online in Kenya",
    ],
    sections: [
      {
        heading: "First, be honest about what you are selling",
        body: "The right channel depends far more on the item than on the platform's marketing. A used iPhone, a three-seater sofa and a 2013 Toyota Premio are three completely different sales, and treating them the same is why so many listings sit untouched for weeks.\n\nThree questions decide almost everything: how much is it worth, how far will a buyer travel for it, and how urgently do you need the money? A KES 3,000 kettle is not worth a cross-town trip for anyone. A KES 800,000 car is worth a buyer driving from Nakuru to Nairobi. Match the channel to the answer.",
        list: [
          "Low value, bulky — sell locally, to someone who can collect the same day",
          "High value, portable — widen the audience, because buyers will travel",
          "Urgent sale — price below the market range and say so plainly",
          "Niche or enthusiast item — go where that specific community already is",
        ],
      },
      {
        heading: "Online marketplaces",
        body: "Marketplaces are the default for a reason: buyers arrive already intending to buy, and search brings your listing to people you would never otherwise reach. This is where most second-hand items in Kenya should start.\n\nThe trade-off differs by platform. Some charge listing or promotion fees, some take a commission, and some insert themselves between you and the buyer. Before you list anywhere, check three things — what it costs you, whether you speak to the buyer directly, and who sets the final price. On Shopi, listing is free, there is no commission, and buyers message you directly, because a marketplace that takes a cut of a second-hand sofa sale is taking it from a margin that barely exists.",
      },
      {
        heading: "WhatsApp groups and status",
        body: "For low-value, fast-moving items, your WhatsApp contacts are genuinely one of the strongest channels in Kenya. Trust is already established, the buyer is usually nearby, and the sale can close in an afternoon.\n\nThe ceiling is low, though. Your reach is your contact list, status updates vanish in 24 hours, and there is no way for someone searching for exactly what you are selling to find you. Use it as a first pass for cheap items, not as your only plan for anything valuable.",
      },
      {
        heading: "Facebook and Instagram",
        body: "Social platforms work well when the item photographs well and the audience is browsing rather than searching — furniture, fashion, décor and beauty products do well here.\n\nThe weakness is intent. People on social feeds are not looking to buy, so you are interrupting rather than answering a need. Expect a lot of \"is this still available?\" messages that go nowhere, and expect to repost repeatedly as your listing sinks down the feed.",
      },
      {
        heading: "Physical dealers and second-hand shops",
        body: "Dealers give you speed and certainty. You walk in, you walk out with money, and the item is gone. For anyone who needs cash this week, that is worth something real.\n\nWhat it costs is the margin. A dealer has to resell at a profit, so expect meaningfully less than a private buyer would pay. This is a fair trade when you genuinely need speed, and a poor one when you have a few weeks to wait.",
      },
      {
        heading: "What to sell where: a quick guide by item type",
        body: "The best way to sell used items in Kenya changes with the category, because buyers for a phone, a fridge and a baby stroller behave completely differently.\n\nPhones, laptops and tablets are high value and easy to carry, so buyers will travel and will compare several listings before messaging. Use a marketplace where they can search by model. State the storage, battery health, whether the device is locked to a network or account, and what comes with it — charger, box, receipt. A short video of the phone switching on and the screen responding removes most of the doubt. Before the handover, back up the device, sign out of your Google or Apple account and factory reset it: a phone still linked to your account can lock the buyer out, and it leaves your photos, messages and M-PESA history on a stranger's device.\n\nFurniture and large appliances are the opposite: low value per kilo and painful to move. Your buyer is almost always someone nearby who can collect, so your location matters more than your reach. Give measurements in the listing, say whether you can help with transport, and for fridges, cookers and washing machines show them running.\n\nClothes, shoes and baby items move fastest through people who already know you, which is where WhatsApp status and social feeds do well. Bundle small items together, give sizes clearly, and for baby gear such as car seats and strollers be upfront about age and wear, because parents ask. Cars, land and other high-value assets are a different kind of sale altogether, where the paperwork decides the deal as much as the price.",
        list: [
          "Phones and laptops — marketplace search, model details, proof it works",
          "Furniture and appliances — sell locally, give measurements, show it running",
          "Clothes and baby items — WhatsApp and social feeds, bundles, clear sizes",
          "Cars and land — documentation first; see the dedicated guides linked below",
        ],
      },
      {
        heading: "How to price a second-hand item in Kenya",
        body: "Do not start from what you paid. Start from what comparable items are being advertised for right now — same model, same age, roughly the same condition — and position yourself inside that range.\n\nIf you want a fast sale, price a little under the middle of the range and say the price is firm. If you can wait, price near the top and expect negotiation. What kills sales is pricing above the range with no explanation, because a buyer comparing five listings will simply skip yours.",
        list: [
          "Search current listings for the same item before you set a price",
          "Discount honestly for wear, missing accessories or repairs",
          "State clearly whether the price is negotiable",
          "Include the price — listings without one get far fewer genuine enquiries",
        ],
      },
      {
        heading: "The listing itself decides more than the channel",
        body: "Two identical items on the same platform sell at very different speeds, and the difference is almost always presentation. Good light, several angles, honest photos of any damage, and a description that answers the obvious questions before they are asked.\n\nA short video does more than any of these. It shows the item working, proves it exists, and removes the doubt that keeps a buyer from sending the first message. Sellers who post video consistently get more enquiries than sellers who post a single dim photograph — on any platform.",
      },
      {
        heading: "Staying safe",
        body: "Second-hand selling in Kenya works well, but the basics matter. Meet in a public place during daylight, ideally somewhere with people around. Confirm that payment has actually cleared into your account before the item leaves your hands — a screenshot is not payment. Be wary of anyone who wants to pay above your asking price, arrange a courier you did not choose, or move the conversation off-platform immediately.\n\nIf a deal feels wrong, it is fine to walk away. Another buyer will come.",
      },
    ],
    faq: [
      {
        q: "Where can I sell used items in Kenya?",
        a: "The main options are online marketplaces like Shopi, WhatsApp groups and status, Facebook and Instagram, and physical second-hand dealers. Marketplaces reach buyers who are actively searching, WhatsApp is fastest for cheap local items, social media suits visual products, and dealers offer speed in exchange for a lower price.",
      },
      {
        q: "What is the best place to sell second-hand items online in Kenya?",
        a: "For most items, an online marketplace where buyers search by category and location. Look for one that is free to list, takes no commission, and lets you message the buyer directly — on a second-hand sale, a commission comes straight out of a thin margin.",
      },
      {
        q: "How do I price a used item in Kenya?",
        a: "Search what comparable items are currently advertised for, then price inside that range. Go slightly below the middle for a fast sale, near the top if you can wait for the right buyer. Always include a price and say whether it is negotiable.",
      },
      {
        q: "Is it free to sell used items on Shopi?",
        a: "Yes. Listing on Shopi is free and Shopi takes no commission on sales. Shopi does not process payments or hold money, so whatever the buyer pays you is yours in full.",
      },
      {
        q: "How do I avoid scams when selling second-hand in Kenya?",
        a: "Meet in a public place in daylight, confirm payment has cleared in your account before handing over the item, and be cautious of buyers offering more than you asked or pushing for an unusual delivery arrangement. Keep the conversation on-platform until you are confident.",
      },
      {
        q: "What sells fastest second-hand in Kenya?",
        a: "Items that are useful, easy to verify and fairly priced — phones, small electronics, furniture and household appliances usually move quickly when the listing shows the item working and states the price. Bulky items sell fastest to buyers nearby who can collect the same day.",
      },
    ],
    relatedLinks: [
      {
        label: "Sell online in Kenya",
        url: "/sell-in-kenya",
        description:
          "List cars, phones, furniture, fashion or farm produce free on Shopi and message buyers directly.",
      },
      {
        label: "How to sell on Shopi: the complete guide",
        url: "/blog/how-to-sell-on-shopi-complete-guide-for-kenyan-sellers",
        description:
          "Step by step from your first listing to your first sale, including how to close the deal safely.",
      },
      {
        label: "How to sell your car in Kenya without a broker",
        url: "/blog/how-to-sell-your-car-in-kenya-without-a-broker",
        description:
          "For the biggest used item most people ever sell: pricing, viewings and the NTSA transfer on eCitizen.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: "how-to-sell-your-car-in-kenya-without-a-broker",
    title: "How to Sell Your Car in Kenya Without a Broker",
    primaryKeyword: "sell your car in Kenya",
    description:
      "How to sell your car in Kenya without a broker: price it right, write a listing that filters time-wasters, show it safely and do the NTSA transfer.",
    excerpt:
      "Brokers take a cut and control the conversation. Here's how to sell your car in Kenya yourself — price, list, show and transfer it — and what the trade-offs really are.",
    category: "Seller Guide",
    readTime: "12 min read",
    publishedAt: "2026-08-27",
    updatedAt: "2026-10-21",
    author: {
      name: "Shopi Team",
      role: "Seller Guides",
      initials: "S",
      color: "#ef4444",
    },
    keywords: [
      "sell my car Kenya",
      "sell car without broker Kenya",
      "how to sell a car in Kenya",
      "car logbook transfer Kenya",
      "NTSA transfer on eCitizen",
      "how much is my car worth Kenya",
      "sell car online Kenya",
    ],
    sections: [
      {
        heading: "What a broker actually does — and what it costs you",
        body: "A car broker finds you a buyer, handles the viewings, and often manages the paperwork. For someone with no time and no patience for tyre-kickers, that is a real service.\n\nWhat it costs is control and margin. The broker takes a commission or quietly adds a markup, so the money leaves your side of the deal. More subtly, the broker owns the conversation — you hear the buyer's objections second-hand, you do not know what was said about your car, and if the broker earns more on a different vehicle, yours is not the one being pushed. Selling privately means doing the work yourself and keeping the difference.",
      },
      {
        heading: "Step 1 — Work out what your car is actually worth",
        body: "Almost every private sale that stalls stalls on price. Owners anchor to what they paid, or to what they need, rather than to what the market is currently offering.\n\nThe honest method is comparison. Search current listings for your make, model, year and grade, and note the range. Then place yourself in it honestly: a car with a clean logbook in your name, full service history and no accident record sits near the top; one with a pending transfer, unclear history or visible damage sits near the bottom. Remember you are comparing against asking prices, and final prices are usually somewhat lower.",
        list: [
          "Compare same make, model, year and grade — not just the model name",
          "Adjust down for accident history, respray work or missing service records",
          "Adjust up for a clean logbook already in your name",
          "Decide before you advertise what your true walk-away figure is",
        ],
      },
      {
        heading: "Step 2 — Get the paperwork ready before you advertise",
        body: "Serious buyers ask about the logbook in the first or second message. If your answer is vague, they move on, because unclear ownership is the single biggest risk in a private car sale in Kenya.\n\nBefore you list, confirm the logbook is in your name with no outstanding financing, that you have your national ID and KRA PIN, and that your eCitizen account is active. Ownership transfer happens on the NTSA service portal in eCitizen and both parties need working accounts, so a dormant account discovered on sale day will cost you the deal. Since June 2026 NTSA issues a digital e-Logbook in eCitizen instead of a paper one, and buyers can check it by its QR code, so expect to be asked for it. Requirements and fees change, so check the current process on the NTSA service portal in eCitizen rather than relying on what was true last year.",
      },
      {
        heading: "Step 3 — Write a listing that filters out time-wasters",
        body: "The goal of a car listing is not maximum enquiries. It is maximum enquiries from people who might actually buy. Vagueness attracts messages from everyone and buyers from no one.\n\nPut the year and grade in the title, not just the model. State the mileage, the price in KES, whether it is negotiable, and your location. Say plainly whether the logbook is ready. Then answer the obvious questions in the description — accident history, service records, why you are selling — because a buyer who has to ask five questions before learning anything usually does not ask any.",
        list: [
          "Title: make, model, year and grade",
          "Photos: exterior from all four corners, interior, dashboard with engine on, tyres, engine bay",
          "A short walkaround video, which converts better than photos alone",
          "Honest photos of any dents, scratches or interior wear",
          "Price, location, mileage, and logbook status stated up front",
        ],
      },
      {
        heading: "Step 4 — Handle viewings and test drives safely",
        body: "Meet in a public, busy place during daylight. Bring someone with you if you can. Ask to see the buyer's ID and driving licence before any test drive, and go along for the drive — never hand the keys to a stranger and wait.\n\nExpect and welcome an independent mechanic's inspection. A buyer who wants their own mechanic to look at the car is a serious buyer, and refusing reads as though you are hiding something. If your car is sound, an inspection closes the sale rather than threatening it.",
      },
      {
        heading: "Step 5 — Negotiate without giving away your position",
        body: "Almost every Kenyan car buyer will negotiate, so price with a little room and decide your walk-away figure in advance. The mistake is negotiating against yourself — dropping the price again before the buyer has responded to your last number.\n\nIf a buyer's offer is too low, say what you will accept and let it sit. Silence is a normal part of the process. And be cautious of anyone who agrees to your full asking price instantly without seeing the car, then asks for an unusual payment or shipping arrangement.",
      },
      {
        heading: "Step 6 — Take payment and transfer ownership",
        body: "Do not release the car until payment has actually cleared in your account. A screenshot, an SMS or a pending transfer notification is not payment. For a sum of this size, arrange to complete the transaction at a bank where the payment can be confirmed on the spot.\n\nSign a simple sale agreement recording both parties' details, the vehicle registration, the price and the date, and keep a copy. Then complete the transfer on the NTSA portal in eCitizen. Until the transfer is done, the car is still legally yours — which means any offence committed in it is still your problem. Do not let this step drift.",
      },
      {
        heading: "Step 7 — Tie up the loose ends after the sale",
        body: "Most guides stop at the handover, but a private sale is not finished when the buyer drives away. A few small tasks in the following days protect you from problems that can surface weeks later.\n\nFirst, confirm the transfer has actually completed on eCitizen rather than assuming the buyer accepted it. Keep your copy of the sale agreement, the payment confirmation and the transfer record together, because if the car is later involved in an accident or a traffic offence, those documents are how you show it was no longer yours. Then speak to your insurer about cancelling or adjusting your cover; a policy on a car you no longer own protects nobody, and you may be due a partial refund.\n\nBefore handover, remove everything personal: documents in the glovebox, parking cards, and any phone paired with the car's Bluetooth or infotainment system. Hand over the spare key and the service records you advertised, since both were part of what the buyer paid for. Finally, mark your listing as sold or remove it, so you are not fielding messages about a car that is gone.\n\nIt is a short list, but when you sell your car in Kenya without a broker there is nobody else to do it for you.",
        list: [
          "Confirm the NTSA transfer on eCitizen shows as complete",
          "Keep the sale agreement, payment proof and transfer record together",
          "Contact your insurer to cancel or adjust cover",
          "Clear personal documents, cards and paired phones from the car",
          "Hand over spare keys and service records, then take the listing down",
        ],
      },
      {
        heading: "When a broker is still the right call",
        body: "Selling privately is not free — it costs you time, several evenings of viewings, and the patience to deal with people who never intended to buy. If you are relocating in two weeks, or you simply do not want the process, a broker or a dealer buying outright is a legitimate choice.\n\nThe point is to make it a decision rather than a default. Know roughly what your car is worth privately, then decide whether the convenience is worth the difference. For many sellers it is not, and the gap is a significant amount of money for a few weekends of effort.",
      },
    ],
    faq: [
      {
        q: "Can I sell my car in Kenya without a broker?",
        a: "Yes. You can list the car yourself, deal with buyers directly and complete the ownership transfer on the NTSA portal in eCitizen. You keep the commission a broker would have taken, in exchange for handling viewings and paperwork yourself.",
      },
      {
        q: "How much is my car worth in Kenya?",
        a: "Compare current listings for the same make, model, year and grade, and place your car inside that range based on condition, accident history, service records and logbook status. Remember those are asking prices — final prices are usually somewhat lower.",
      },
      {
        q: "What documents do I need to sell a car in Kenya?",
        a: "The logbook in your name with no outstanding financing, your national ID and KRA PIN, an active eCitizen account, and a signed sale agreement. At transfer you also need copies of the buyer's ID and KRA PIN. Confirm the current requirements on the NTSA service portal in eCitizen.",
      },
      {
        q: "How do I transfer car ownership in Kenya?",
        a: "Ownership transfer is done on the NTSA service portal in eCitizen. Both buyer and seller need active eCitizen accounts. The seller starts the transfer and the buyer accepts it, and the buyer then gets a digital e-Logbook. Until the transfer completes, the vehicle remains legally yours. The full process is in our guide to logbook transfer in Kenya.",
      },
      {
        q: "How do I avoid being scammed when selling my car?",
        a: "Confirm payment has cleared in your account before handing over the car or keys, ideally completing the transaction at a bank. Meet in public during daylight, verify the buyer's ID before a test drive, and be wary of anyone offering full asking price sight-unseen or pushing an unusual payment arrangement.",
      },
      {
        q: "Is it free to list my car on Shopi?",
        a: "Yes. Listing a car on Shopi is free and Shopi takes no commission. Buyers message you directly, and you agree price, inspection, payment and transfer between yourselves.",
      },
      {
        q: "What should I do after selling my car in Kenya?",
        a: "Confirm the NTSA transfer on eCitizen has completed, keep the sale agreement and payment proof, contact your insurer about cancelling your cover, and remove your listing. Until the transfer completes, the car is still legally yours.",
      },
    ],
    relatedLinks: [
      {
        label: "NTSA — National Transport and Safety Authority",
        url: "https://www.ntsa.go.ke",
        description:
          "The official source for vehicle ownership transfer, eCitizen accounts and current fees in Kenya. Always confirm the process here before transferring.",
      },
      {
        label: "Logbook transfer in Kenya",
        url: "/blog/logbook-transfer-in-kenya",
        description:
          "Step 6 in detail: what the seller and buyer each do on eCitizen, the e-Logbook, fees, and cars with a logbook loan.",
      },
      {
        label: "Car sale agreement in Kenya",
        url: "/blog/car-sale-agreement-in-kenya",
        description:
          "What to put in the agreement you sign with the buyer, with a template you can copy.",
      },
      {
        label: "How much is my car worth in Kenya?",
        url: "/blog/how-much-is-my-car-worth-in-kenya",
        description:
          "The pricing half of the job: how to work out a realistic asking price before you advertise, and what actually moves the number.",
      },
      {
        label: "Sell a car in Kenya",
        url: "/sell-car-kenya",
        description:
          "The main guide to selling a car on Shopi — free listing, no broker, and the NTSA transfer explained.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: "how-much-is-my-car-worth-in-kenya",
    title: "How Much Is My Car Worth in Kenya? A Seller's Pricing Guide",
    primaryKeyword: "how much is my car worth in Kenya",
    description:
      "How much is my car worth in Kenya? Price it before you advertise: what moves the number, how to read comparable listings and the mistakes to avoid.",
    excerpt:
      "Almost every car that sits unsold for months is priced wrong, not marketed wrong. Here is how to answer \"how much is my car worth in Kenya?\" honestly, before you advertise.",
    category: "Seller Guide",
    readTime: "10 min read",
    publishedAt: "2026-09-11",
    author: {
      name: "Shopi Team",
      role: "Seller Guides",
      initials: "S",
      color: "#ef4444",
    },
    keywords: [
      "how much is my car worth in Kenya",
      "car valuation Kenya",
      "used car prices Kenya",
      "sell my car Kenya",
      "car resale value Kenya",
      "price my car Kenya",
      "second hand car prices Kenya",
    ],
    sections: [
      {
        heading: "Why this is the only question that matters first",
        body: "A car that is priced correctly sells. A car that is priced wrong does not sell no matter how good the photographs are, how many platforms it is listed on, or how quickly the owner replies to messages. Everything else in a private sale is secondary to this one number, so the first question to answer is simply: how much is my car worth in Kenya right now, to a buyer comparing it with other listings?\n\nThe difficulty is that most owners do not price from the market. They price from what they paid, from what they still owe, or from what they need for the next car. None of those figures has any bearing on what a buyer will pay, and a buyer comparing five listings will simply skip the one that sits above the others without explaining why.",
      },
      {
        heading: "Start from comparable listings, not from what you paid",
        body: "The honest method is comparison, and it takes about thirty minutes. Search current listings for your exact make, model, year and grade. Not the model name alone — a 2015 Premio F and a 2015 Premio G-Package are different cars to a buyer, and pricing them the same is how sellers lose money in both directions.\n\nCollect a range rather than a single figure. Note the highest and lowest asking prices for cars genuinely comparable to yours, then place your car inside that range based on its condition and paperwork rather than on hope. One thing to keep in mind throughout: these are asking prices, not sale prices. Final agreed prices in Kenya are usually somewhat below the advertised figure, so the range you are looking at is already optimistic.",
        list: [
          "Match make, model, year and grade — not just the model name",
          "Collect at least five comparable listings before deciding anything",
          "Note the range, not a single number",
          "Remember you are reading asking prices, which sit above final prices",
        ],
      },
      {
        heading: "What actually moves the number",
        body: "Owners tend to over-weight mileage and under-weight paperwork. In the Kenyan market it is usually the other way round. A clean logbook already in your name removes the single biggest risk a private buyer faces, and buyers pay for that certainty. A pending transfer, an unclear ownership history or outstanding financing pulls the price down sharply, and in many cases stops the sale entirely.\n\nAccident history matters more than age. Structural repair work is visible to any competent mechanic, and a buyer who discovers it after being told the car was clean will walk away from the whole deal rather than negotiate. Service records work in the opposite direction: documented maintenance is one of the few things that reliably pulls a price towards the top of its range.",
        list: [
          "Logbook clean and in your name — the largest single factor",
          "Accident and structural repair history",
          "Documented service records, which support a higher asking price",
          "Genuine mileage, evidenced rather than simply stated",
          "Grade and trim within the same model year",
          "Body and interior condition, especially rust at the coast",
        ],
      },
      {
        heading: "Location changes the number more than sellers expect",
        body: "The same car is not worth the same amount in every Kenyan town, because the buyers are different. A high-clearance vehicle or a pickup is worth more in Nakuru, Eldoret or Meru, where buyers are running it on farm roads and buying it as a working asset. A small economical hatchback is easiest to sell in Nairobi, Kisumu or Mombasa, where the buyer is thinking about daily fuel costs in traffic.\n\nThis cuts both ways. If you own a double cab in Nairobi, you may find a stronger price from a buyer in the North Rift than from the city market. If you own a Vitz upcountry, the deepest pool of buyers is in the cities. It is worth checking what comparable cars are being asked for in your own county rather than nationally, because that is the market your buyers are actually comparing against.",
      },
      {
        heading: "Decide what you are optimising for before you advertise",
        body: "There is a real trade-off between price and speed, and pretending otherwise is why so many private sales drag on. Price slightly below the middle of the range and say the price is firm, and you will usually sell quickly to a buyer who recognises a fair deal. Price near the top of the range and you will wait longer, field more negotiation, and need the condition and paperwork to justify it.\n\nBoth are legitimate. What does not work is pricing at the top of the range while needing to sell this month, because the market corrects that position slowly and painfully, usually through a series of reductions that signal desperation to everyone watching.",
        list: [
          "For a fast sale, price just under mid-range and state that the price is firm",
          "To maximise the price, price near the top and be prepared to wait",
          "Decide your walk-away figure before the first buyer calls",
          "Avoid repeated small reductions — they tell buyers to wait for the next one",
        ],
      },
      {
        heading: "Be careful with online valuation tools",
        body: "Automated valuation figures should be treated as a rough sanity check, not as evidence. Most are built on limited local data, few account properly for grade, import history or logbook status, and none of them has seen your car. A number from a tool will not persuade a buyer who is looking at five real listings.\n\nWhat does persuade a buyer is a price that sits sensibly among comparable cars, and a listing that explains why yours is where it is in that range. \"Priced slightly above similar 2015 models because it has full service history and the logbook is ready\" is a far stronger argument than any valuation figure.",
      },
      {
        heading: "Common pricing mistakes",
        body: "The patterns repeat across almost every stalled private sale in Kenya, and they are all avoidable.",
        list: [
          "Pricing from the purchase price rather than the current market",
          "Adding the cost of recent repairs on top of market value — buyers expect a working car, and do not pay twice for maintenance",
          "Advertising with no price at all, which drastically reduces genuine enquiries",
          "Ignoring grade, so the car is compared against a better-specified version of itself",
          "Setting a high price to 'leave room for negotiation' so wide that serious buyers never make contact",
          "Refusing an independent mechanic's inspection, which reads as concealment and costs you the buyer",
        ],
      },
      {
        heading: "Put the number in the listing",
        body: "Listings without a price get far fewer genuine enquiries. \"Price on request\" filters out exactly the buyers you want — people who are actively comparing and ready to move — and attracts people who are browsing without intent.\n\nState the figure in Kenyan Shillings, say plainly whether it is negotiable, and give your town. Those three facts, along with the year and grade, do most of the work of a listing. Once the price is right, the rest of the sale is presentation: honest photographs including any damage, a short walkaround video, and quick replies to the people who message.",
      },
    ],
    faq: [
      {
        q: "How much is my car worth in Kenya?",
        a: "The most reliable guide is what comparable cars are being advertised for right now — the same make, model, year and grade as yours. Collect at least five comparable listings, note the range, and place your car inside it based on condition, accident history, service records and logbook status. Remember those are asking prices, and final agreed prices are usually somewhat lower.",
      },
      {
        q: "Does mileage or condition matter more when pricing a used car in Kenya?",
        a: "Condition and paperwork usually matter more. A clean logbook already in your name, no accident history and documented servicing will support a higher price than low mileage alone, because buyers treat an unverified odometer reading with caution.",
      },
      {
        q: "Is my car worth more in Nairobi or upcountry?",
        a: "It depends on the vehicle. Pickups, double cabs and high-clearance vehicles often fetch more in farming areas such as Nakuru, Eldoret and Meru, where they are bought as working assets. Small economical cars are easiest to sell in Nairobi, Kisumu and Mombasa. Compare against listings in your own county rather than national ones.",
      },
      {
        q: "Should I use an online car valuation tool in Kenya?",
        a: "Use it only as a rough sanity check. Most valuation tools are built on limited local data and do not account for grade, import history or logbook status, and none of them has inspected your car. Comparable live listings are a better guide, and a more persuasive argument to a buyer.",
      },
      {
        q: "Should I add the cost of recent repairs to my asking price?",
        a: "No. Buyers expect a car to be in working order and will not pay separately for maintenance you have already carried out. Recent work supports your position within the market range and makes the car easier to sell, but it does not add its cost on top of market value.",
      },
      {
        q: "Should I put the price in my car listing?",
        a: "Yes, always. Listings without a price receive far fewer genuine enquiries, because buyers who are actively comparing skip them. State the figure in KES, say whether it is negotiable, and include your town.",
      },
      {
        q: "Is it free to list my car on Shopi?",
        a: "Yes. Listing a car on Shopi is free and Shopi takes no commission. Buyers message you directly, and you agree price, inspection, payment and NTSA transfer between yourselves.",
      },
    ],
    relatedLinks: [
      {
        label: "How to sell your car in Kenya without a broker",
        url: "/blog/how-to-sell-your-car-in-kenya-without-a-broker",
        description:
          "Once the price is right, this covers the rest — the listing, viewings, negotiation and the NTSA transfer on eCitizen.",
      },
      {
        label: "Sell a car in Kenya",
        url: "/sell-car-kenya",
        description:
          "Free listing, no broker, and model-by-model guides covering what moves the price on each car.",
      },
      {
        label: "NTSA — National Transport and Safety Authority",
        url: "https://www.ntsa.go.ke",
        description:
          "The official source for ownership transfer, eCitizen accounts and current fees. Confirm the process here before transferring.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: "where-to-sell-your-car-in-kenya-city-by-city",
    title: "Where to Sell Your Car in Kenya: A City-by-City Guide",
    primaryKeyword: "where to sell your car in Kenya",
    description:
      "Where to sell your car in Kenya, town by town: who buys in Nairobi, Mombasa, Nakuru, Eldoret, Kisumu and beyond, what sells, and where to meet safely.",
    excerpt:
      "A Probox sells differently in Eldoret than in Nairobi, and a Vitz differently in Kisumu than in Nyeri. Deciding where to sell your car in Kenya changes who turns up and what they pay.",
    category: "Seller Guide",
    readTime: "12 min read",
    publishedAt: "2026-09-11",
    updatedAt: "2026-10-21",
    author: {
      name: "Shopi Team",
      role: "Seller Guides",
      initials: "S",
      color: "#3b82f6",
    },
    keywords: [
      "where to sell my car in Kenya",
      "sell my car in Nairobi",
      "sell car Mombasa",
      "sell car Nakuru",
      "sell car Eldoret",
      "sell car Kisumu",
      "car buyers Kenya",
      "sell car without broker Kenya",
    ],
    sections: [
      {
        heading: "Cars are the most location-bound thing you can sell",
        body: "Most second-hand items travel. Someone will courier a phone from Nairobi to Kisumu without much thought. A car is different: a buyer has to come and see it, drive it, and usually bring a mechanic. That physical constraint is what makes the town you are selling from matter more for a car than for anything else.\n\nIt also means the local buyer pool is your real market, not the national one. A buyer will cross a county to inspect the right car, and sometimes further for something unusual or high-value, but the great majority of private car sales in Kenya happen within a couple of hours' drive. Understanding who is in that radius is most of the work of deciding where to sell your car in Kenya.",
      },
      {
        heading: "Nairobi — deepest market, most competition",
        body: "More cars change hands in Nairobi than anywhere else in Kenya, which is both the opportunity and the problem. Buyers are plentiful and many can view the same week. They are also comparing your car against dozens of similar listings before messaging anyone, so an optimistic price is immediately visible.\n\nNairobi buyers inspect more thoroughly than anywhere else in the country. Expect an independent mechanic, expect questions about the logbook before the first viewing, and expect to lose buyers over a vague answer on accident history. Practical advice: say which side of town you are on, because a buyer in Rongai will not cross to Kasarani on a weekday evening, and offer weekend viewing slots, because traffic destroys weekday appointments.",
        list: [
          "Strongest demand: Premio, Axio, Fielder, Vitz, Demio, Harrier, X-Trail, Probox",
          "Say which side of town you are on — it decides whether buyers travel",
          "Offer weekend viewings; weekday no-shows are common after 5pm",
          "Welcome independent mechanics. Resisting one costs you the buyer",
        ],
      },
      {
        heading: "Mombasa and the coast — rust is the first question",
        body: "Coastal salt air does real damage, and experienced Mombasa buyers check the underbody, sills and door bottoms before almost anything else. If your car has spent its life upcountry, say so — it is a genuine selling point on the coast and worth stating plainly in the listing.\n\nProximity to the port also means coastal buyers are unusually familiar with import paperwork, so import dates, duty and registration history come up early. Answer those in the description rather than waiting to be asked. One local detail worth remembering: state which side of the Likoni ferry you are on, because crossing times decide whether a buyer bothers at all.",
        list: [
          "Photograph the underbody, sills and door bottoms before you are asked",
          "Say whether the car has lived at the coast or upcountry",
          "Put import and registration dates in the description",
          "State which side of the ferry you are on",
        ],
      },
      {
        heading: "Nakuru and Eldoret — the working-vehicle markets",
        body: "Both towns sit at the centre of large farming economies, and the vehicles that hold value are the ones that support that work. Ground clearance, suspension condition and load capacity matter far more here than specification or styling. A saloon that has only ever driven on tarmac is worth saying so about, because it is a real advantage to some buyers and a real limitation to others.\n\nEldoret in particular is pickup and double-cab country, serving a wide North Rift catchment where buyers travel in from Kitale, Iten and Kapsabet. Nakuru draws from Naivasha, Gilgil, Molo and Njoro. In both markets buyers ask direct questions about what the vehicle has been used for and how hard, and they respect a straight answer far more than a flattering one.",
        list: [
          "Strongest demand: pickups, double cabs, Probox, Succeed, Forester, Land Cruiser, Fielder",
          "Lead with mechanical condition and service history, not appearance",
          "Say plainly what the vehicle has been used for",
          "Name the surrounding towns you will meet in — it widens your audience",
        ],
      },
      {
        heading: "Kisumu and the lake region — running costs decide it",
        body: "Kisumu is the commercial centre for a wide western catchment, with buyers travelling in from Kakamega, Siaya, Homa Bay and Bondo. That makes the audience larger than the town's size suggests, but it also means a first viewing has to be worth a journey.\n\nThe conversation here starts with running costs. Buyers ask about fuel consumption and the price of common repairs before they ask about extras, so a documented service history and an economical engine are the strongest cards you can hold. A walkaround video converts noticeably better than photographs alone, because it saves a buyer from driving an hour to find out the car is not what they expected.",
        list: [
          "Put fuel consumption in the description — it is the first question",
          "Post a walkaround video; your buyers are often travelling in",
          "Strongest demand: Vitz, Passo, Demio, Probox, Premio, Axio, Fielder",
          "Name the surrounding towns you will deal with",
        ],
      },
      {
        heading: "Thika, Kiambu and Machakos — Nairobi buyers, easier logistics",
        body: "Kiambu County and the Mombasa Road corridor through Machakos are functionally part of the Nairobi market. Buyers are largely Nairobi commuters, demand looks like Nairobi demand, and prices should be set against Nairobi listings rather than against a smaller upcountry market.\n\nThe practical advantage is that viewings are much easier to arrange than inside the city. The disadvantage is that some Nairobi buyers will not travel out at all, which is why the single most useful line in a listing from these areas is an offer to meet along the main road — Thika Superhighway for Kiambu, Mombasa Road for Machakos, Athi River and Mlolongo. That one sentence converts buyers who would otherwise skip an out-of-town listing.",
        list: [
          "Offer to meet along Thika Road or Mombasa Road — it widens your reach considerably",
          "Price against Nairobi listings, because that is what buyers compare with",
          "Name your specific town; Ruiru, Juja, Thika and Limuru are different journeys",
          "Machakos and Athi River see strong demand for vans and light commercial vehicles",
        ],
      },
      {
        heading: "Nyeri, Meru and central Kenya — documentation wins",
        body: "Central Kenya buyers have a reputation for thorough due diligence, and it is earned. Cars are bought to be kept, so buyers ask about service records, previous ownership and repair history in far more detail than in most markets, and they are entirely comfortable walking away from a car whose history is unclear.\n\nThe compensation is that a well-documented car with a clean logbook sells at a strong price without much haggling. Expect fewer enquiries than you would get in Nairobi, and treat each one properly, because these buyers are mostly serious. Meru adds a distinct commercial layer — Probox-class vehicles and pickups bought for the produce and miraa trade, judged purely on whether they will earn from day one.",
        list: [
          "Photograph your service records — documentation is the strongest asset here",
          "Be precise about previous ownership and accident history",
          "Expect fewer but more serious enquiries; answer each one properly",
          "Ground clearance matters across both counties",
        ],
      },
      {
        heading: "What stays the same everywhere",
        body: "Local differences change emphasis, not fundamentals. Wherever you are selling in Kenya, the same things decide whether a private sale goes well.\n\nPrice against comparable local listings rather than what you paid. Put the figure in the listing. Photograph honestly, including any damage, and add a walkaround video. Have the logbook ready in your name before you advertise, because serious buyers ask in the first or second message. Meet in a public place during daylight, verify the buyer's ID and licence before any test drive, and go along for the drive. Do not release the car until payment has genuinely cleared in your account — a screenshot is not payment. Then complete the transfer on the NTSA portal in eCitizen promptly, because until it is done the car is still legally yours, and so is anything that happens in it.",
        list: [
          "Price against local comparable listings, and state the price",
          "Honest photos plus a walkaround video",
          "Logbook ready in your name before you advertise",
          "Public meeting place, daylight, ID checked before any test drive",
          "Payment cleared in your account before the keys change hands",
          "Complete the NTSA transfer on eCitizen without delay",
        ],
      },
    ],
    faq: [
      {
        q: "Where is the best place to sell a car in Kenya?",
        a: "For most cars, the deepest buyer pool is where you already are, because buyers need to inspect the vehicle in person. Nairobi has the most buyers and the most competition. Farming areas such as Nakuru, Eldoret and Meru pay better for pickups, double cabs and high-clearance vehicles. Cities pay better for small economical cars. List locally first and price against listings in your own county.",
      },
      {
        q: "Do cars sell for different prices in different Kenyan towns?",
        a: "Yes. The same vehicle can be worth noticeably more in one market than another because the buyers differ. Working vehicles do better in farming regions, small economical cars do better in cities, and coastal buyers discount for rust while valuing upcountry cars. Compare against listings in your own county rather than national ones.",
      },
      {
        q: "How do I sell my car in Nairobi quickly?",
        a: "Price it honestly against the many comparable Nairobi listings, say which side of town you are on, offer weekend viewing slots, and welcome an independent mechanic's inspection. Nairobi buyers compare more listings and inspect more thoroughly than anywhere else in Kenya, so an accurate price and a complete, honest listing matter more than anywhere else.",
      },
      {
        q: "Is it better to sell my car privately or to a broker in Kenya?",
        a: "Selling privately keeps the commission or markup that a broker would take, and you deal with buyers directly. The trade-off is that you handle the viewings, the negotiation and the NTSA transfer yourself. A broker is a reasonable choice if you are short of time; otherwise the difference is usually a significant amount of money for a few weekends of effort.",
      },
      {
        q: "Where should I meet a car buyer safely in Kenya?",
        a: "Meet in a public, busy place during daylight — petrol station forecourts and mall car parks work well in most towns. Bring someone with you, ask to see the buyer's ID and driving licence before any test drive, and go along for the drive rather than handing over the keys. Never release the car until payment has cleared in your account.",
      },
      {
        q: "Can I sell my car to a buyer in another county?",
        a: "Yes, and it happens regularly for high-value or unusual vehicles. Buyers will travel for the right car, but they need a reason to set off, so a walkaround video and a complete description do most of that persuading. Ownership transfer on the NTSA portal in eCitizen is done online, so the two of you do not need to be in the same town for that step.",
      },
      {
        q: "Does Shopi charge commission when I sell my car?",
        a: "No. Listing is free and Shopi takes no commission. Shopi does not process payment, hold money or provide escrow — you and the buyer agree price, inspection, payment and the NTSA transfer directly between yourselves.",
      },
    ],
    relatedLinks: [
      {
        label: "Sell a car in Kenya",
        url: "/sell-car-kenya",
        description:
          "The main guide, with town-by-town pages covering the local market, where to meet buyers, and what sellers in each county are currently asking.",
      },
      {
        label: "How much is my car worth in Kenya?",
        url: "/blog/how-much-is-my-car-worth-in-kenya",
        description:
          "How to set a realistic asking price before you advertise, and the pricing mistakes that leave cars unsold for months.",
      },
      {
        label: "How to sell your car in Kenya without a broker",
        url: "/blog/how-to-sell-your-car-in-kenya-without-a-broker",
        description:
          "The full private-sale process, from writing the listing to completing the NTSA transfer on eCitizen.",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

/**
 * Posts most related to `post`, for the "More from Shopi" sidebar. Ranked by
 * shared category, then shared keywords, then recency — so a car-selling guide
 * points at the other car guides rather than at whichever posts happen to be
 * first in the array. Posts already linked from `relatedLinks` are skipped to
 * spread links across more of the blog.
 */
export function getRelatedPosts(post: BlogPost, count: number): BlogPost[] {
  const linked = new Set(post.relatedLinks?.map((link) => link.url));
  const keywords = new Set(post.keywords.map((k) => k.toLowerCase()));

  return blogPosts
    .filter((p) => p.slug !== post.slug && !linked.has(`/blog/${p.slug}`))
    .map((p) => ({
      p,
      score:
        (p.category === post.category ? 10 : 0) +
        p.keywords.filter((k) => keywords.has(k.toLowerCase())).length,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.p.updatedAt ?? b.p.publishedAt).localeCompare(
          a.p.updatedAt ?? a.p.publishedAt,
        ),
    )
    .slice(0, count)
    .map(({ p }) => p);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}
