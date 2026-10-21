import { siteConfig } from "@/config/site";
import type { VehicleSpecs } from "@/lib/seo/vehicle";

/**
 * JSON-LD structured data helpers.
 *
 * These power rich results in Google and answer/generative engines (AEO/GEO):
 * - Organization: who Shopi is (knowledge panel, brand entity).
 * - WebSite + SearchAction: describes Shopi's own search entry point.
 * - FAQPage: makes visible Q&A machine-readable for search and answer engines.
 */

const { url, name, supportEmail } = siteConfig;
const marketplaceTopics = [
  "Kenya classifieds",
  "social commerce in Kenya",
  "local marketplace Kenya",
  "buy and sell locally",
  "AI shopping assistant",
  "AI listing assistant",
  "photo and video product discovery",
  "cars for sale Kenya",
  "phones for sale Kenya",
  "beauty products Kenya",
  "property for sale Kenya",
];

/**
 * Shopi's founder as a distinct entity.
 *
 * Answer engines weigh who is behind a product heavily when judging whether a
 * young marketplace is trustworthy — "who founded Shopi?" previously had no
 * answer anywhere on the site, and an unanswerable question reads as a red flag.
 * Giving the person a real @id, a LinkedIn `sameAs` and a work history lets
 * engines resolve him to a verifiable identity rather than guessing.
 *
 * Deliberately no `alumniOf`: schema.org treats it as a completed affiliation,
 * and the degree was not completed, so claiming it here would be a false
 * machine-readable credential.
 *
 * This node used to be an answer-engine-only surface, with the bio rendered
 * nowhere on the site. That was the reason "who founded Shopi?" kept being
 * answered with the wrong name: crawlers behind generative answers ground on
 * rendered text, and a claim that exists only in JSON-LD has nothing to ground
 * on. Faced with a question it cannot source, a model falls back to the most
 * prominent entity sharing the name — one of the other companies called Shopi.
 * The bio is now rendered on /about and answered in the visible FAQ, which both
 * fixes the grounding and brings this node into line with Google's rule that
 * structured data reflect visible page content.
 */
export const founderSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${url}/#founder`,
  name: "Mwangi Maina",
  jobTitle: "Founder, Shopi · Senior Software Engineer, Ooodles",
  description:
    "Kenyan software engineer and founder of Shopi. Studied computer science at Maseno University before moving into industry in 2021, working with the US startup Playback, then Bettercoach in Germany, and now Ooodles, where he was one of the pioneer engineers who built the platform from scratch.",
  // Names the specific Shopi this person founded. Without it, "founder of
  // Shopi" is an ambiguous claim that resolves to whichever Shopi an engine
  // already knows about.
  disambiguatingDescription:
    "Founder of Shopi, the Kenyan social marketplace at www.shopi.co.ke. Not connected to any other company trading under the name Shopi.",
  // The page a reader can verify this on. Engines weight a Person node far more
  // when it points at a page that visibly states the same facts.
  mainEntityOfPage: `${url}/en/about`,
  nationality: { "@type": "Country", name: "Kenya" },
  // City-level only, deliberately. It answers "is Shopi actually run from
  // Kenya?" — the question that matters for a local marketplace — without
  // publishing anything more precise about a private individual.
  homeLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Nairobi",
      addressCountry: "KE",
    },
  },
  // Both directions of the founder relationship are stated: the Organization
  // names him as `founder`, and he names Shopi back here. A one-way edge is
  // easy for an engine to drop; a reciprocal one is what binds the two nodes
  // into a single entity an answer can be drawn from.
  worksFor: [
    { "@id": `${url}/#organization` },
    {
      "@type": "Organization",
      name: "Ooodles",
      url: "https://www.ooodles.com",
    },
  ],
  knowsAbout: [
    "software engineering",
    "social commerce",
    "marketplace platforms",
    "Kenyan e-commerce",
  ],
  sameAs: [
    "https://www.linkedin.com/in/mwangi-maina-6463281ab/",
    "https://www.ooodles.com",
  ],
};

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "OnlineBusiness",
  "@id": `${url}/#organization`,
  name,
  alternateName: ["Shopi Kenya", "Shopi Marketplace", "Shopi Agent"],
  url,
  logo: `${url}/assets/shopi-logo.png`,
  description: siteConfig.description,
  // "Shopi" is not a unique company name — several unrelated businesses trade
  // under it. An engine asked about "Shopi" with nothing to separate them will
  // answer about whichever one it knows best, which is how questions about this
  // company end up returning another company's founder and facts. This states
  // the boundary explicitly rather than hoping the domain is enough.
  disambiguatingDescription:
    "Shopi is a Kenyan social commerce marketplace founded in Nairobi in 2025 and operating only at www.shopi.co.ke. It is unrelated to other businesses trading under the name Shopi in other countries, and it is not affiliated with Shopify.",
  slogan: siteConfig.tagline,
  keywords: siteConfig.keywords.join(", "),
  knowsAbout: marketplaceTopics,
  foundingDate: "2025",
  foundingLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Nairobi",
      addressCountry: "KE",
    },
  },
  // City-level, no street address: Shopi is remote-run and has no public
  // walk-in office, and inventing a postal address to fill the field would be
  // worse than leaving it at the city.
  address: {
    "@type": "PostalAddress",
    addressLocality: "Nairobi",
    addressCountry: "KE",
  },
  // Linked by @id rather than inlined, so the Person entity is defined once and
  // both the Organization and the /about page reference the same node.
  founder: { "@id": `${url}/#founder` },
  areaServed: {
    "@type": "Country",
    name: "Kenya",
  },
  sameAs: [
    "https://www.tiktok.com/@shopiapp",
    "https://twitter.com/shopiapp",
    "https://www.instagram.com/shopiapp",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: supportEmail,
    url: `${url}/en/contact`,
    areaServed: "KE",
    availableLanguage: ["English", "Kiswahili"],
  },
};

/**
 * ContactPage schema for /[lang]/contact. Lets answer engines quote a real
 * address when asked "how do I contact Shopi?" instead of guessing one.
 */
export function contactPageSchema(lang: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${url}/${lang}/contact#page`,
    url: `${url}/${lang}/contact`,
    name: `Contact ${name}`,
    description: `Reach ${name} for support, business, legal, privacy, copyright, and abuse-report enquiries in Kenya.`,
    inLanguage: lang === "sw" ? "sw-KE" : "en-KE",
    isPartOf: { "@id": `${url}/#website` },
    about: { "@id": `${url}/#organization` },
    mainEntity: {
      "@type": "Organization",
      "@id": `${url}/#organization`,
      name,
      email: supportEmail,
      url,
      areaServed: { "@type": "Country", name: "Kenya" },
    },
  };
}

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${url}/#website`,
  name,
  alternateName: ["Shopi Kenya marketplace", "Shopi social marketplace"],
  url,
  description: siteConfig.description,
  inLanguage: ["en-KE", "sw-KE"],
  keywords: siteConfig.keywords.join(", "),
  about: marketplaceTopics.map((topic) => ({
    "@type": "Thing",
    name: topic,
  })),
  publisher: { "@id": `${url}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${url}/en/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

/**
 * The marketplace as a service/application — communicates to engines that Shopi
 * is a place to buy and sell, free of charge, across Kenya.
 */
export const marketplaceSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": `${url}/#app`,
  name,
  url,
  applicationCategory: "ShoppingApplication",
  operatingSystem: "Any",
  description: siteConfig.description,
  keywords: siteConfig.keywords.join(", "),
  featureList: [
    "Free product listing creation",
    "Photo and video marketplace posts",
    "Built-in buyer and seller messaging",
    "AI-assisted listing creation",
    "Bulk listing upload from Excel (up to 500 listings at once)",
    "AI-assisted product discovery",
    "Local discovery across Kenya",
  ],
  areaServed: {
    "@type": "Country",
    name: "Kenya",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KES",
    description: "Free to use. No commission, no listing fees.",
  },
  publisher: { "@id": `${url}/#organization` },
};

/**
 * The AI assistant as its own application, so engines can surface Shopi Agent
 * separately from the marketplace it sits inside.
 */
export const agentSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${url}/#agent`,
  name: "Shopi Agent",
  url,
  applicationCategory: "ArtificialIntelligenceApplication",
  operatingSystem: "Any",
  description:
    "AI assistant that helps users buy and sell on Shopi by generating listings and finding products.",
  featureList: [
    "Turns product photos into listing drafts",
    "Suggests titles, descriptions, categories and specifications",
    "Auto-categorises bulk-uploaded Excel listings and fills in their specifications from photos and videos",
    "Helps buyers find products from plain-language requests",
    "Uses product photos to understand buyer searches",
  ],
  keywords:
    "Shopi Agent, AI marketplace Kenya, AI shopping assistant, AI listing assistant, photo to listing AI",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KES",
  },
  isPartOf: { "@id": `${url}/#app` },
  publisher: { "@id": `${url}/#organization` },
};

export function faqSchema(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function productSchema(input: {
  id: string;
  url: string;
  title: string;
  description?: string | null;
  images: string[];
  price?: number | null;
  currency?: string | null;
  negotiable?: boolean | null;
  sellerName?: string | null;
  /** Seller's public profile URL, so the Offer links to a real entity. */
  sellerUrl?: string | null;
  locationName?: string | null;
  category?: string | null;
  specs?: { key?: string | null; value?: string | null }[];
  /** Set for car listings (see lib/seo/vehicle.ts); adds the Car type. */
  vehicle?: VehicleSpecs | null;
}) {
  // Only a stated price is an offer. An amount of 0 means the seller left the
  // price blank, not that the item is free (see listingPriceText in
  // lib/format.ts), and `price: 0` told engines every such listing — used
  // phones, paid services — was being given away. Without an Offer, Search
  // Console lists these few listings as ineligible for product snippets; that
  // is the honest outcome, so don't "fix" it by putting a price back.
  const hasPrice = typeof input.price === "number" && input.price > 0;

  const normalizedSpecs = new Map(
    (input.specs ?? [])
      .filter((spec) => spec.key?.trim() && spec.value?.trim())
      .map((spec) => [spec.key!.trim().toLowerCase(), spec.value!.trim()]),
  );
  const spec = (...keys: string[]) => {
    for (const key of keys) {
      const value = normalizedSpecs.get(key.toLowerCase());
      if (value) return value;
    }
    return undefined;
  };
  const conditionLabel = spec("condition", "item condition");
  const normalizedCondition = conditionLabel?.toLowerCase() ?? "";
  const condition = normalizedCondition
    ? normalizedCondition.includes("refurb") ||
      normalizedCondition.includes("recondition")
      ? "https://schema.org/RefurbishedCondition"
      : normalizedCondition.includes("damag") ||
          normalizedCondition.includes("for parts")
        ? "https://schema.org/DamagedCondition"
        : normalizedCondition.includes("used") ||
            normalizedCondition.includes("pre-owned") ||
            normalizedCondition.includes("second hand")
          ? "https://schema.org/UsedCondition"
          : normalizedCondition.includes("new") ||
              normalizedCondition.includes("sealed")
            ? "https://schema.org/NewCondition"
            : undefined
    : undefined;

  const offer: Record<string, unknown> | null = hasPrice
    ? {
        "@type": "Offer",
        url: input.url,
        priceCurrency: input.currency || "KES",
        price: input.price,
        availability: "https://schema.org/InStock",
        ...(condition ? { itemCondition: condition } : {}),
        ...(input.sellerName
          ? {
              seller: {
                "@type": "Person",
                name: input.sellerName,
                // Links the offer to the seller's ProfilePage entity, which is
                // what lets engines answer "who sells X near me" with a name.
                ...(input.sellerUrl
                  ? {
                      url: input.sellerUrl,
                      "@id": `${input.sellerUrl}#profile`,
                    }
                  : {}),
              },
            }
          : {}),
        ...(input.locationName
          ? {
              areaServed: { "@type": "Place", name: input.locationName },
              availableAtOrFrom: {
                "@type": "Place",
                name: input.locationName,
                address: {
                  "@type": "PostalAddress",
                  addressCountry: "KE",
                },
              },
            }
          : {}),
        ...(input.negotiable
          ? {
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: input.price,
                priceCurrency: input.currency || "KES",
                description:
                  "Seller states that the asking price is negotiable.",
              },
            }
          : {}),
      }
    : null;

  const vehicle = input.vehicle;
  const brandName = vehicle?.make ?? spec("brand", "make", "manufacturer");
  const modelName = vehicle ? vehicle.model : spec("model");
  const colour = vehicle?.colour ?? spec("colour", "color");

  return {
    "@context": "https://schema.org",
    // Car is a Product subtype; listing both keeps Product snippet
    // eligibility while telling engines the year, mileage and gearbox are
    // vehicle facts, which is what "2018 Prado diesel" queries match on.
    "@type": vehicle ? ["Product", "Car"] : "Product",
    "@id": `${input.url}#product`,
    name: input.title,
    sku: input.id,
    url: input.url,
    mainEntityOfPage: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.images.length ? { image: input.images } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    ...(modelName ? { model: modelName } : {}),
    ...(colour ? { color: colour } : {}),
    ...(vehicle ? vehicleProperties(vehicle) : {}),
    ...(spec("material") ? { material: spec("material") } : {}),
    ...(spec("size", "dimensions") ? { size: spec("size", "dimensions") } : {}),
    ...(spec("mpn") ? { mpn: spec("mpn") } : {}),
    ...(spec("gtin", "barcode") ? { gtin: spec("gtin", "barcode") } : {}),
    keywords: [
      input.title,
      input.category,
      input.locationName,
      "for sale in Kenya",
      "Shopi Kenya",
    ]
      .filter(Boolean)
      .join(", "),
    ...(input.specs?.length
      ? {
          additionalProperty: input.specs
            .filter((spec) => spec.key?.trim() && spec.value?.trim())
            .slice(0, 20)
            .map((spec) => ({
              "@type": "PropertyValue",
              name: spec.key!.trim(),
              value: spec.value!.trim(),
            })),
        }
      : {}),
    ...(offer ? { offers: offer } : {}),
    isRelatedTo: { "@id": `${url}/#app` },
  };
}

/** schema.org Car properties from a listing's specs, as the seller gave them. */
function vehicleProperties(vehicle: VehicleSpecs) {
  const steering = vehicle.steering?.toLowerCase() ?? "";
  return {
    ...(vehicle.year ? { vehicleModelDate: vehicle.year } : {}),
    ...(vehicle.mileageKm
      ? {
          mileageFromOdometer: {
            "@type": "QuantitativeValue",
            value: vehicle.mileageKm,
            unitCode: "KMT",
          },
        }
      : {}),
    ...(vehicle.fuelType ? { fuelType: vehicle.fuelType } : {}),
    ...(vehicle.transmission
      ? { vehicleTransmission: vehicle.transmission }
      : {}),
    ...(vehicle.bodyType ? { bodyType: vehicle.bodyType } : {}),
    ...(vehicle.engineSize
      ? {
          vehicleEngine: {
            "@type": "EngineSpecification",
            name: vehicle.engineSize,
          },
        }
      : {}),
    ...(vehicle.drive ? { driveWheelConfiguration: vehicle.drive } : {}),
    ...(steering.includes("right")
      ? { steeringPosition: "https://schema.org/RightHandDriving" }
      : steering.includes("left")
        ? { steeringPosition: "https://schema.org/LeftHandDriving" }
        : {}),
  };
}

export function productWebPageSchema(input: {
  url: string;
  name: string;
  description: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    "@id": `${input.url}#webpage`,
    url: input.url,
    name: input.name,
    description: input.description,
    inLanguage: "en-KE",
    isPartOf: { "@id": `${url}/#website` },
    mainEntity: { "@id": `${input.url}#product` },
    publisher: { "@id": `${url}/#organization` },
    ...(input.createdAt ? { datePublished: input.createdAt } : {}),
    ...(input.updatedAt ? { dateModified: input.updatedAt } : {}),
  };
}

function isoDuration(seconds?: number | null): string | undefined {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }

  const whole = Math.round(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remaining = whole % 60;
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${remaining || (!hours && !minutes) ? `${remaining}S` : ""}`;
}

/**
 * Video markup for a video listing's watch page, /video/{slug}.
 *
 * Google indexes a video only on a page whose main content is that video. The
 * product page (/content/{slug}) leads with price, photos and details, so
 * markup there was reported as "Video isn't on a watch page" for every video
 * and none were indexed. The immersive viewer is the watch page; `productUrl`
 * ties the video back to the listing's Product on the product page.
 *
 * Required fields follow Google's VideoObject eligibility rules; optional
 * values are emitted only when the API supplies real data.
 */
export function videoObjectSchema(input: {
  /** The watch page's canonical URL. */
  url: string;
  /** The listing's canonical product page, whose Product this video is about. */
  productUrl?: string | null;
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  /** The video file itself (the Mux HLS stream), for engines to fetch. */
  contentUrl?: string | null;
  durationSeconds?: number | null;
  creatorName?: string | null;
  creatorUrl?: string | null;
  viewCount?: number | null;
}) {
  const duration = isoDuration(input.durationSeconds);
  const hasViews =
    typeof input.viewCount === "number" &&
    Number.isFinite(input.viewCount) &&
    input.viewCount >= 0;

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": `${input.url}#video`,
    name: input.name,
    description: input.description,
    thumbnailUrl: [input.thumbnailUrl],
    uploadDate: input.uploadDate,
    // contentUrl, not embedUrl: embedUrl means a bare player (an iframe src),
    // and pointing it at the listing page itself described the watch page as
    // its own player. The stream is the file engines can actually fetch.
    ...(input.contentUrl ? { contentUrl: input.contentUrl } : {}),
    mainEntityOfPage: input.url,
    ...(input.productUrl ? { about: { "@id": `${input.productUrl}#product` } } : {}),
    publisher: { "@id": `${url}/#organization` },
    ...(duration ? { duration } : {}),
    ...(input.creatorName
      ? {
          creator: {
            "@type": "Person",
            name: input.creatorName,
            ...(input.creatorUrl ? { url: input.creatorUrl } : {}),
          },
        }
      : {}),
    ...(hasViews
      ? {
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: { "@type": "WatchAction" },
            userInteractionCount: input.viewCount,
          },
        }
      : {}),
  };
}

export function marketplaceWebPageSchema(input: {
  url: string;
  name: string;
  description: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${input.url}#webpage`,
    url: input.url,
    name: input.name,
    description: input.description,
    inLanguage: "en-KE",
    isPartOf: { "@id": `${url}/#website` },
    about: [
      { "@id": `${url}/#app` },
      ...(input.keywords ?? []).map((keyword) => ({
        "@type": "Thing",
        name: keyword,
      })),
    ],
    publisher: { "@id": `${url}/#organization` },
  };
}

/**
 * An ItemList of listings for a browse surface.
 *
 * Gives engines a machine-readable inventory snapshot of a hub page and is the
 * input Google uses for merchant-style carousels. Only emit it on pages that
 * actually render these items — schema describing content a page doesn't show
 * is a structured-data violation.
 */
export function listingItemListSchema(input: {
  id: string;
  name: string;
  items: { name: string; url: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": input.id,
    name: input.name,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

/**
 * A blog article as a BlogPosting.
 *
 * The author and publisher are written out in full rather than referenced by
 * @id alone: the Organization node is only defined on the homepage, and an @id
 * that doesn't resolve on the page itself leaves engines without a name.
 */
export function articleSchema(input: {
  url: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  section: string;
  keywords?: string[];
  image?: string;
  wordCount?: number;
  author: { name: string; kind: "Organization" | "Person"; url?: string };
  blogUrl: string;
}) {
  const organization = {
    "@type": "Organization",
    "@id": `${url}/#organization`,
    name,
    url,
    logo: { "@type": "ImageObject", url: `${url}/assets/shopi-logo.png` },
  };
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${input.url}#article`,
    headline: input.headline,
    description: input.description,
    url: input.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    inLanguage: "en-KE",
    articleSection: input.section,
    ...(input.keywords?.length ? { keywords: input.keywords.join(", ") } : {}),
    ...(input.wordCount ? { wordCount: input.wordCount } : {}),
    ...(input.image ? { image: [input.image] } : {}),
    author:
      input.author.kind === "Organization"
        ? organization
        : {
            "@type": "Person",
            name: input.author.name,
            ...(input.author.url ? { url: input.author.url } : {}),
          },
    publisher: organization,
    isPartOf: { "@type": "Blog", "@id": `${input.blogUrl}#blog`, name: `${name} Blog` },
  };
}

/**
 * A page that lists other pages — the blog index and its category hubs. The
 * ItemList mirrors the article cards the page renders, nothing more.
 */
export function collectionPageSchema(input: {
  url: string;
  name: string;
  description: string;
  items: { name: string; url: string }[];
  blog?: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": input.blog ? ["CollectionPage", "Blog"] : "CollectionPage",
    "@id": input.blog ? `${input.url}#blog` : `${input.url}#collection`,
    url: input.url,
    name: input.name,
    description: input.description,
    inLanguage: "en-KE",
    isPartOf: { "@id": `${url}/#website` },
    publisher: { "@type": "Organization", "@id": `${url}/#organization`, name, url },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        url: item.url,
      })),
    },
  };
}

/**
 * A county landing page as a CollectionPage about a real Place.
 *
 * Gives engines an explicit place entity to bind local-intent queries to
 * ("furniture for sale in Nakuru") instead of inferring location from prose,
 * and connects the page back to the marketplace and organisation entities.
 */
export function countyPageSchema(input: {
  url: string;
  countyName: string;
  description: string;
  towns: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${input.url}#collection`,
    url: input.url,
    name: `Buy and sell in ${input.countyName}, Kenya`,
    description: input.description,
    isPartOf: { "@id": `${url}/#website` },
    about: {
      "@type": "Place",
      "@id": `${input.url}#place`,
      name: input.countyName,
      address: {
        "@type": "PostalAddress",
        addressRegion: input.countyName,
        addressCountry: "KE",
      },
      ...(input.towns.length
        ? {
            containsPlace: input.towns.map((town) => ({
              "@type": "Place",
              name: town,
            })),
          }
        : {}),
    },
    provider: { "@id": `${url}/#organization` },
  };
}

/**
 * A page offering a service bound to one town.
 *
 * Used by the car-selling location pages. A WebPage alone tells an engine what
 * the page says but not where it applies, so local-intent queries ("sell my car
 * in Nakuru") have to be matched from prose. Declaring a `Service` whose
 * `areaServed` is a real Place gives the location as a resolvable entity, which
 * is what binds the query to the page. `provider` links it back to Shopi so the
 * service is attributed rather than floating free.
 */
export function jsonLdPlaceService(input: {
  url: string;
  name: string;
  description: string;
  /** Town the page is about, e.g. "Nakuru". */
  placeName: string;
  /** County the town sits in, e.g. "Nakuru". */
  region: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${input.url}#webpage`,
    url: input.url,
    name: input.name,
    description: input.description,
    inLanguage: "en-KE",
    isPartOf: { "@id": `${url}/#website` },
    publisher: { "@id": `${url}/#organization` },
    about: [
      { "@id": `${url}/#app` },
      ...(input.keywords ?? []).map((keyword) => ({
        "@type": "Thing",
        name: keyword,
      })),
    ],
    mainEntity: {
      "@type": "Service",
      "@id": `${input.url}#service`,
      name: input.name,
      description: input.description,
      serviceType: "Private vehicle sales listing",
      provider: { "@id": `${url}/#organization` },
      areaServed: {
        "@type": "Place",
        "@id": `${input.url}#place`,
        name: input.placeName,
        address: {
          "@type": "PostalAddress",
          addressLocality: input.placeName,
          addressRegion: input.region,
          addressCountry: "KE",
        },
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KES",
        description:
          "Free to list. No commission, no listing fees, and no broker between seller and buyer.",
      },
    },
  };
}

/**
 * A creator/seller profile as a schema.org ProfilePage wrapping a Person. Helps
 * search + answer engines (AEO/GEO) understand who the seller is and surface
 * their entity (name, handle, follower/post counts) in results and AI answers.
 */
export function profilePageSchema(input: {
  url: string;
  displayName: string;
  username?: string | null;
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
  followerCount?: number | null;
  postCount?: number | null;
}) {
  const sameAs = [input.website].filter(Boolean) as string[];

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${input.url}#profile`,
    url: input.url,
    mainEntity: {
      "@type": "Person",
      name: input.displayName,
      ...(input.username ? { alternateName: `@${input.username}` } : {}),
      ...(input.bio ? { description: input.bio } : {}),
      ...(input.avatar ? { image: input.avatar } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      url: input.url,
      ...(typeof input.followerCount === "number" ||
      typeof input.postCount === "number"
        ? {
            interactionStatistic: [
              ...(typeof input.followerCount === "number"
                ? [
                    {
                      "@type": "InteractionCounter",
                      interactionType: "https://schema.org/FollowAction",
                      userInteractionCount: input.followerCount,
                    },
                  ]
                : []),
              ...(typeof input.postCount === "number"
                ? [
                    {
                      "@type": "InteractionCounter",
                      interactionType: "https://schema.org/WriteAction",
                      userInteractionCount: input.postCount,
                    },
                  ]
                : []),
            ],
          }
        : {}),
    },
  };
}

/** Renders one or more schema objects as a single JSON-LD script payload. */
export function jsonLd(...schemas: object[]): string {
  return JSON.stringify(schemas.length === 1 ? schemas[0] : schemas).replace(
    /</g,
    "\\u003c",
  );
}
