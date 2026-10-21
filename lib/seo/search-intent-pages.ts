export type SearchIntentPage = {
  slug: string;
  query: string;
  label: string;
  pluralLabel: string;
  category: string;
  intro: string;
  buyerTips: string[];
  sellerTips: string[];
  keywords: string[];
  related: string[];
  /**
   * Narrows the live listings when a text search on `query` matches too
   * much. Overrides are spread over `{ query }`, so `query: undefined` drops
   * the text search entirely. See searchIntentListingFilter.
   */
  listings?: { query?: string; subcategory?: string; minPrice?: number };
};

/**
 * Lowest asking price a vehicle listing can have. Search matches captions and
 * specs, so "Toyota Premio" also finds Premio headlights and "car" finds car
 * chargers; nothing that is actually a car is listed below this, and no
 * accessory is listed above it. Used as a relevance filter, never shown.
 */
export const CAR_PRICE_FLOOR = 100_000;

/** The classifier's level-2 name for passenger vehicles. */
export const CAR_SUBCATEGORY = "Cars";

const modelListings = { minPrice: CAR_PRICE_FLOOR };

export const searchIntentPages = [
  // The generic car-buyer page, listed first so it is part of the site-wide
  // "Popular product searches" links. "Second hand cars in Kenya" and "cars for
  // sale in Kenya" are the largest non-brand queries Kenya's classifieds sites
  // rank for, and the model pages below each only cover one car.
  {
    slug: "cars",
    query: "car",
    label: "Cars",
    pluralLabel: "used cars",
    category: "Cars",
    intro:
      "Find used and second hand cars for sale in Kenya from owners and local sellers — Toyota, Mazda, Subaru, Nissan, Mercedes-Benz and more, foreign used and Kenyan used. Compare price, year, mileage and location, then message the seller directly on Shopi, with no broker in between.",
    buyerTips: [
      "Compare the same make, model, year and grade — not just the model name — before judging a price.",
      "Ask whether the logbook is in the seller's name with no lender on it, and for service records.",
      "Inspect in daylight with a mechanic you trust, and pay only once the NTSA transfer on eCitizen is ready to complete.",
    ],
    sellerTips: [
      "Put the make, model, year and grade in the title, and the mileage, price and location in the listing.",
      "Add clear photos of all four corners, the interior, dashboard, tyres and engine bay, or a walkaround video.",
      "Say whether the logbook is ready and whether the price is negotiable.",
    ],
    keywords: [
      "cars for sale in Kenya",
      "used cars for sale in Kenya",
      "second hand cars in Kenya",
      "second hand cars for sale in Kenya",
      "cheap cars for sale in Kenya",
      "used cars for sale in Kenya by owner",
      "second hand cars sold by owners in Kenya",
      "personal cars for sale in Kenya",
      "foreign used cars Kenya",
      "car prices in Kenya",
    ],
    related: ["toyota-premio", "mazda-atenza", "toyota-vitz", "probox", "car-parts"],
    // Every listing the classifier filed under Cars. A text search for "car"
    // returned car chargers, phone holders and a vacuum cleaner here.
    listings: {
      query: undefined,
      subcategory: CAR_SUBCATEGORY,
      minPrice: CAR_PRICE_FLOOR,
    },
  },
  {
    slug: "mazda-atenza",
    query: "Mazda Atenza",
    label: "Mazda Atenza",
    pluralLabel: "Mazda Atenza cars",
    category: "Cars",
    intro:
      "Find Mazda Atenza cars for sale in Kenya from local sellers. Compare price, location, photos, mileage and condition, then message the seller directly on Shopi.",
    buyerTips: [
      "Compare year, mileage, engine size, transmission and condition before messaging.",
      "Ask for logbook status, service history and whether the price is negotiable.",
      "Arrange inspection before payment and verify ownership documents carefully.",
    ],
    sellerTips: [
      "Mention Mazda Atenza, year, mileage, trim, engine size and location in the title or description.",
      "Upload clear interior, exterior, dashboard and engine-bay photos or video.",
      "Add the price in KES and say whether the car is negotiable.",
    ],
    keywords: [
      "mazda atenza for sale",
      "mazda atenza for sale in Kenya",
      "used mazda atenza Kenya",
      "mazda atenza price Kenya",
      "mazda cars for sale Kenya",
    ],
    related: ["toyota-premio", "toyota-harrier", "probox", "land"],
    listings: modelListings,
  },
  {
    slug: "toyota-premio",
    query: "Toyota Premio",
    label: "Toyota Premio",
    pluralLabel: "Toyota Premio cars",
    category: "Cars",
    intro:
      "Browse Toyota Premio cars for sale in Kenya and contact sellers directly. Shop by location, price, year, mileage and condition on Shopi.",
    buyerTips: [
      "Check year, mileage, grade, accident history and import documents.",
      "Compare similar Premio listings before negotiating.",
      "Inspect the vehicle and documents before sending money.",
    ],
    sellerTips: [
      "Include Toyota Premio, year, mileage, grade and location in your listing.",
      "Show photos of the exterior, interior, tyres and dashboard.",
      "State your asking price and whether it is negotiable.",
    ],
    keywords: [
      "toyota premio for sale",
      "toyota premio for sale in Kenya",
      "used toyota premio Kenya",
      "premio price Kenya",
    ],
    related: ["mazda-atenza", "toyota-harrier", "probox", "phones"],
    listings: modelListings,
  },
  {
    slug: "toyota-harrier",
    query: "Toyota Harrier",
    label: "Toyota Harrier",
    pluralLabel: "Toyota Harrier SUVs",
    category: "Cars",
    intro:
      "Search Toyota Harrier SUVs for sale in Kenya, compare seller listings and message directly to ask about price, mileage, condition and location.",
    buyerTips: [
      "Compare model year, engine, trim, mileage and condition.",
      "Ask for service history and ownership documents.",
      "View and inspect the car before payment.",
    ],
    sellerTips: [
      "Use a clear title with Toyota Harrier, year, trim and location.",
      "Add enough photos or video for buyers to judge condition.",
      "Include mileage, price, fuel type and negotiability.",
    ],
    keywords: [
      "toyota harrier for sale",
      "toyota harrier for sale in Kenya",
      "used toyota harrier Kenya",
      "harrier price Kenya",
    ],
    related: ["mazda-atenza", "toyota-premio", "probox", "land"],
    listings: modelListings,
  },
  {
    slug: "probox",
    query: "Probox",
    label: "Toyota Probox",
    pluralLabel: "Toyota Probox cars",
    category: "Cars",
    intro:
      "Find Toyota Probox cars for sale in Kenya from local sellers. Compare price, condition, year, mileage and location before messaging.",
    buyerTips: [
      "Check mileage, engine condition, use history and body condition.",
      "Ask whether it was private, business or taxi use.",
      "Verify documents and inspect before payment.",
    ],
    sellerTips: [
      "Mention Toyota Probox, year, mileage and location clearly.",
      "Show photos of the body, boot, dashboard and engine.",
      "Include price, negotiability and condition notes.",
    ],
    keywords: [
      "probox for sale",
      "toyota probox for sale in Kenya",
      "used probox Kenya",
      "probox price Kenya",
    ],
    related: ["mazda-atenza", "toyota-premio", "toyota-harrier", "farm-produce"],
    listings: modelListings,
  },
  {
    slug: "land",
    query: "land",
    label: "Land",
    pluralLabel: "land listings",
    category: "Property",
    intro:
      "Find land for sale in Kenya, including plots, farms and property listings from sellers you can message directly on Shopi.",
    buyerTips: [
      "Check location, size, access road, title status and nearby landmarks.",
      "Ask for viewing details and verify documents with the relevant authorities.",
      "Use proper legal advice before deposit or payment.",
    ],
    sellerTips: [
      "Mention land size, location, title status, price and nearby landmarks.",
      "Upload photos or video showing access road and the actual plot.",
      "Be clear about negotiability, viewing times and ownership documents.",
    ],
    keywords: [
      "land for sale",
      "land for sale in Kenya",
      "plots for sale Kenya",
      "property for sale Kenya",
      "farms for sale Kenya",
    ],
    related: ["plots", "houses-for-rent", "mazda-atenza", "farm-produce"],
  },
  {
    slug: "plots",
    query: "plots",
    label: "Plots",
    pluralLabel: "plots",
    category: "Property",
    intro:
      "Browse plots for sale in Kenya and contact sellers directly. Shopi helps buyers compare location, price, size and property details.",
    buyerTips: [
      "Confirm exact location, size, access road and title status.",
      "Ask for landmarks, map pin and viewing arrangements.",
      "Verify ownership before paying a deposit.",
    ],
    sellerTips: [
      "Include plot size, town, estate, price and title status.",
      "Add clear photos or video of the plot and access route.",
      "Mention nearby schools, roads, markets or services.",
    ],
    keywords: [
      "plots for sale",
      "plots for sale in Kenya",
      "cheap plots for sale Kenya",
      "land plots Kenya",
    ],
    related: ["land", "houses-for-rent", "farm-produce", "livestock"],
  },
  {
    slug: "houses-for-rent",
    query: "houses for rent",
    label: "Houses for rent",
    pluralLabel: "rental houses",
    category: "Property",
    intro:
      "Search houses for rent in Kenya on Shopi, compare location and price, then message landlords or agents directly.",
    buyerTips: [
      "Check rent, deposit, location, amenities and viewing availability.",
      "Ask whether utilities, parking and security are included.",
      "Visit the property before paying rent or deposit.",
    ],
    sellerTips: [
      "Mention rent, deposit, location, bedrooms and amenities.",
      "Upload clear photos or video of rooms, compound and access.",
      "State viewing times and move-in availability.",
    ],
    keywords: [
      "houses for rent",
      "houses for rent in Kenya",
      "rental houses Kenya",
      "apartments for rent Kenya",
    ],
    related: ["land", "plots", "furniture", "beds"],
  },
  {
    slug: "phones",
    query: "phones",
    label: "Phones",
    pluralLabel: "phones",
    category: "Phones and electronics",
    intro:
      "Find new and used phones for sale in Kenya from local sellers. Compare price, model, storage, condition and location on Shopi.",
    buyerTips: [
      "Check storage, battery health, condition, accessories and warranty.",
      "Confirm whether the phone is original, unlocked and not account-locked.",
      "Inspect the phone before payment where possible.",
    ],
    sellerTips: [
      "Mention brand, model, storage, RAM, condition and location.",
      "Upload clear photos of the screen, back, ports and accessories.",
      "State price, warranty status and whether the price is negotiable.",
    ],
    keywords: [
      "phones for sale",
      "phones for sale in Kenya",
      "used phones Kenya",
      "smartphones Kenya",
    ],
    related: ["iphone", "samsung", "tecno", "infinix", "oppo", "laptops"],
  },
  {
    slug: "iphone",
    query: "iPhone",
    label: "iPhone",
    pluralLabel: "iPhones",
    category: "Phones and electronics",
    intro:
      "Browse iPhones for sale in Kenya and message sellers directly. Compare model, storage, battery health, condition and location.",
    buyerTips: [
      "Ask for model, storage, battery health, Face ID status and warranty.",
      "Check iCloud status and inspect the phone before payment.",
      "Compare prices across similar iPhone listings.",
    ],
    sellerTips: [
      "Include iPhone model, storage, battery health, condition and location.",
      "Show the phone clearly from front, back and sides.",
      "Mention accessories, warranty and negotiability.",
    ],
    keywords: [
      "iphone for sale",
      "iphone for sale in Kenya",
      "used iphone Kenya",
      "iphone price Kenya",
    ],
    related: ["phones", "samsung", "tecno", "infinix", "laptops"],
  },
  {
    slug: "samsung",
    query: "Samsung",
    label: "Samsung phones",
    pluralLabel: "Samsung phones",
    category: "Phones and electronics",
    intro:
      "Find Samsung phones for sale in Kenya, compare local seller listings and message directly for price, condition and pickup details.",
    buyerTips: [
      "Check model, storage, RAM, battery, screen and network status.",
      "Ask for receipt, warranty and original accessories if available.",
      "Inspect before payment and compare similar listings.",
    ],
    sellerTips: [
      "Mention Samsung model, storage, RAM, condition and location.",
      "Add clear photos of screen, back and accessories.",
      "Include price, warranty status and negotiability.",
    ],
    keywords: [
      "samsung phones for sale",
      "samsung for sale in Kenya",
      "used samsung phones Kenya",
      "samsung phone price Kenya",
    ],
    related: ["phones", "iphone", "tecno", "tvs"],
  },
  {
    slug: "tecno",
    query: "Tecno",
    label: "Tecno phones",
    pluralLabel: "Tecno phones",
    category: "Phones and electronics",
    intro:
      "Search Tecno phones for sale in Kenya from local sellers. Compare condition, model, storage, price and location on Shopi.",
    buyerTips: [
      "Check model, storage, RAM, battery and screen condition.",
      "Ask about warranty, receipt and accessories.",
      "Meet safely and inspect before paying.",
    ],
    sellerTips: [
      "Mention Tecno model, storage, condition and location.",
      "Show clear photos of the device and accessories.",
      "Add price and negotiability.",
    ],
    keywords: [
      "tecno phones for sale",
      "tecno phones Kenya",
      "used tecno phones Kenya",
      "tecno price Kenya",
    ],
    related: ["phones", "samsung", "iphone", "laptops"],
  },
  {
    slug: "infinix",
    query: "Infinix",
    label: "Infinix phones",
    pluralLabel: "Infinix phones",
    category: "Phones and electronics",
    intro:
      "Find new and used Infinix phones for sale in Kenya from local sellers. Compare model, storage, condition, price and location, then message the seller directly on Shopi.",
    buyerTips: [
      "Check the exact model, storage, RAM, battery and screen condition.",
      "Ask whether the phone is refurbished, repaired or still under warranty.",
      "Inspect the phone and confirm it is not account-locked before paying.",
    ],
    sellerTips: [
      "Include the Infinix model, storage, RAM, condition and location.",
      "Show the screen, back, ports and any included accessories in clear photos.",
      "State the price, warranty status and whether the price is negotiable.",
    ],
    keywords: [
      "Infinix phones Kenya",
      "used Infinix phones in Kenya",
      "Infinix smartphones for sale",
      "refurbished Infinix phones",
    ],
    related: ["phones", "tecno", "samsung", "oppo"],
  },
  {
    slug: "oppo",
    query: "Oppo",
    label: "Oppo phones",
    pluralLabel: "Oppo phones",
    category: "Phones and electronics",
    intro:
      "Browse new and used Oppo phones for sale in Kenya. Compare model, storage, condition and price from local sellers, then ask questions directly on Shopi.",
    buyerTips: [
      "Confirm the exact Oppo model, storage, RAM and battery condition.",
      "Ask about repairs, warranty and included charger or accessories.",
      "Inspect the phone and test its cameras, charging port and network before paying.",
    ],
    sellerTips: [
      "Name the Oppo model and include storage, condition and location.",
      "Add clear photos of the screen, back, sides and accessories.",
      "State your price and whether the phone is new, used or refurbished.",
    ],
    keywords: [
      "Oppo phones Kenya",
      "used Oppo phones in Kenya",
      "Oppo smartphones for sale",
      "refurbished Oppo phones",
    ],
    related: ["phones", "infinix", "tecno", "samsung"],
  },
  {
    slug: "laptops",
    query: "laptops",
    label: "Laptops",
    pluralLabel: "laptops",
    category: "Phones and electronics",
    intro:
      "Find laptops for sale in Kenya from local sellers. Compare brand, processor, RAM, storage, condition, price and location on Shopi.",
    buyerTips: [
      "Check processor, RAM, storage, battery health, charger and keyboard.",
      "Ask about warranty, receipt and repair history.",
      "Test before payment where possible.",
    ],
    sellerTips: [
      "Mention brand, model, CPU, RAM, storage, condition and location.",
      "Add photos of the screen, keyboard, ports and charger.",
      "State price, warranty and negotiability.",
    ],
    keywords: [
      "laptops for sale",
      "laptops for sale in Kenya",
      "used laptops in Kenya",
      "cheap laptops in Nairobi",
      "refurbished computers Kenya",
      "laptop price Kenya",
    ],
    related: ["phones", "iphone", "samsung", "tvs"],
  },
  {
    slug: "tvs",
    query: "TV",
    label: "TVs",
    pluralLabel: "TVs",
    category: "Phones and electronics",
    intro:
      "Browse TVs for sale in Kenya, compare local listings and message sellers directly about screen size, brand, condition and price.",
    buyerTips: [
      "Check brand, screen size, smart TV features, ports and condition.",
      "Ask whether remote, wall mount and receipt are included.",
      "Test display and sound before payment.",
    ],
    sellerTips: [
      "Mention brand, inches, smart features, condition and location.",
      "Upload clear photos or video showing the TV working.",
      "Include price and included accessories.",
    ],
    keywords: [
      "tv for sale",
      "tvs for sale in Kenya",
      "smart tv Kenya",
      "used tv Kenya",
    ],
    related: ["laptops", "phones", "samsung", "furniture"],
  },
  {
    slug: "body-lotion",
    query: "body lotion",
    label: "Body lotion",
    pluralLabel: "body lotions",
    category: "Beauty and cosmetics",
    intro:
      "Find body lotion for sale in Kenya from beauty sellers on Shopi. Compare brands, size, price, location and seller details.",
    buyerTips: [
      "Check brand, size, skin type, expiry date and packaging.",
      "Ask whether the product is sealed and original.",
      "Compare prices and pickup or delivery options with the seller.",
    ],
    sellerTips: [
      "Mention brand, size, skin type, condition and location.",
      "Upload clear photos of the front, back label and seal.",
      "Add price, stock quantity and delivery or pickup details.",
    ],
    keywords: [
      "body lotion for sale",
      "body lotion Kenya",
      "body lotion for sale in Kenya",
      "skincare Kenya",
    ],
    related: ["body-oils", "skincare", "wigs", "phones"],
  },
  {
    slug: "body-oils",
    query: "body oils",
    label: "Body oils",
    pluralLabel: "body oils",
    category: "Beauty and cosmetics",
    intro:
      "Search body oils for sale in Kenya from local beauty sellers. Compare price, ingredients, size, brand and seller location.",
    buyerTips: [
      "Check ingredients, size, scent, skin type and expiry date.",
      "Ask whether the oil is sealed, handmade or branded.",
      "Confirm pickup or delivery directly with the seller.",
    ],
    sellerTips: [
      "Mention oil type, size, scent, ingredients and location.",
      "Show clear photos of packaging, label and product texture if possible.",
      "Add price, stock and delivery details.",
    ],
    keywords: [
      "body oils for sale",
      "body oils Kenya",
      "skin care oils Kenya",
      "beauty products Kenya",
    ],
    related: ["body-lotion", "skincare", "wigs", "furniture"],
  },
  {
    slug: "skincare",
    query: "skincare",
    label: "Skincare",
    pluralLabel: "skincare products",
    category: "Beauty and cosmetics",
    intro:
      "Browse skincare products for sale in Kenya, from creams and lotions to oils and cleansers. Message beauty sellers directly on Shopi.",
    buyerTips: [
      "Check brand, skin type, expiry date, size and ingredients.",
      "Ask if the product is sealed and suitable for your skin concerns.",
      "Compare seller location, price and delivery options.",
    ],
    sellerTips: [
      "Mention product type, brand, size, skin type and expiry date.",
      "Upload clear label and packaging photos.",
      "State price, stock and pickup or delivery details.",
    ],
    keywords: [
      "skincare products Kenya",
      "skincare for sale Kenya",
      "beauty products Kenya",
      "cosmetics Kenya",
    ],
    related: ["body-lotion", "body-oils", "wigs", "phones"],
  },
  {
    slug: "wigs",
    query: "wigs",
    label: "Wigs",
    pluralLabel: "wigs",
    category: "Beauty and fashion",
    intro:
      "Find wigs for sale in Kenya from local sellers. Compare style, length, material, condition, price and location on Shopi.",
    buyerTips: [
      "Check length, material, density, lace type and condition.",
      "Ask for real photos or video before buying.",
      "Confirm pickup, delivery and return expectations with the seller.",
    ],
    sellerTips: [
      "Mention length, material, lace type, color, condition and location.",
      "Upload real photos or video in natural lighting.",
      "State price and whether styling is included.",
    ],
    keywords: [
      "wigs for sale",
      "wigs for sale in Kenya",
      "human hair wigs Kenya",
      "beauty products Kenya",
    ],
    related: ["skincare", "body-lotion", "body-oils", "furniture"],
  },
  {
    slug: "furniture",
    query: "furniture",
    label: "Furniture",
    pluralLabel: "furniture",
    category: "Home and living",
    intro:
      "Find used and second hand furniture for sale in Kenya, including sofas, beds, office desks, tables and home items from sellers in Nairobi, Mombasa and across the country.",
    buyerTips: [
      "Check dimensions, material, condition, transport needs and location.",
      "Ask for more photos if the item is used.",
      "Agree on pickup or delivery directly with the seller.",
    ],
    sellerTips: [
      "Mention dimensions, material, condition, price and location.",
      "Upload clear photos from multiple angles.",
      "Say whether delivery is available or buyer collects.",
    ],
    keywords: [
      "furniture for sale",
      "furniture for sale in Kenya",
      "used furniture Kenya",
      "second hand furniture in Nairobi",
      "used furniture in Mombasa",
      "home items Kenya",
    ],
    related: ["sofas", "beds", "tvs", "home-appliances", "houses-for-rent"],
  },
  {
    slug: "sofas",
    query: "sofa",
    label: "Sofas",
    pluralLabel: "sofas",
    category: "Home and living",
    intro:
      "Browse sofas for sale in Kenya from local sellers. Compare size, fabric, condition, price and pickup or delivery details.",
    buyerTips: [
      "Check size, fabric, cushion condition and dimensions.",
      "Ask for photos in daylight and confirm transport needs.",
      "Agree pickup or delivery before payment.",
    ],
    sellerTips: [
      "Mention sofa size, material, condition, price and location.",
      "Upload photos from front, side and close-up areas.",
      "State whether transport or delivery is available.",
    ],
    keywords: [
      "sofas for sale",
      "sofas for sale in Kenya",
      "used sofas Kenya",
      "furniture Kenya",
    ],
    related: ["furniture", "beds", "tvs", "houses-for-rent"],
  },
  {
    slug: "beds",
    query: "beds",
    label: "Beds",
    pluralLabel: "beds",
    category: "Home and living",
    intro:
      "Search beds for sale in Kenya, compare size, material, condition, price and seller location, then message directly on Shopi.",
    buyerTips: [
      "Check bed size, material, condition and whether mattress is included.",
      "Ask for dimensions and disassembly or transport needs.",
      "Inspect used beds before payment where possible.",
    ],
    sellerTips: [
      "Mention bed size, material, condition, price and location.",
      "Show clear photos of frame, headboard and any included mattress.",
      "State pickup or delivery options.",
    ],
    keywords: [
      "beds for sale",
      "beds for sale in Kenya",
      "used beds Kenya",
      "bed frames Kenya",
    ],
    related: ["furniture", "sofas", "houses-for-rent", "tvs"],
  },
  {
    slug: "home-appliances",
    query: "home appliances",
    label: "Home appliances",
    pluralLabel: "home appliances",
    category: "Home and living",
    intro:
      "Find affordable new and second hand home appliances in Kenya, including fridges, microwaves, electric kettles, cooking gas equipment and LPG cylinders. Compare condition, price and location, then contact sellers directly.",
    buyerTips: [
      "Ask the seller to demonstrate that an appliance works before you pay.",
      "Check dimensions, power requirements, condition and included accessories.",
      "Agree on collection or delivery and any transport costs directly with the seller.",
    ],
    sellerTips: [
      "Include the brand, model, size, condition and location in your listing.",
      "Show the appliance working and photograph any wear or damage clearly.",
      "State your price and whether pickup or delivery is available.",
    ],
    keywords: [
      "home appliances for sale in Kenya",
      "second hand home appliances Kenya",
      "microwaves for sale Kenya",
      "electric kettles Kenya",
      "cooking gas equipment Kenya",
      "LPG cylinders for sale Kenya",
    ],
    related: ["fridges", "tvs", "furniture", "sofas"],
  },
  {
    slug: "fridges",
    query: "fridge",
    label: "Fridges",
    pluralLabel: "fridges",
    category: "Home and living",
    intro:
      "Browse second hand and new fridges for sale in Kenya. Compare size, energy use, condition, price and seller location, and ask to see the fridge running before you buy.",
    buyerTips: [
      "Confirm the fridge cools properly and ask how long it has been used.",
      "Check capacity, dimensions, energy rating and any repair history.",
      "Plan transport and agree who pays for it before arranging collection.",
    ],
    sellerTips: [
      "Include the brand, capacity, condition and location in the listing.",
      "Add photos of the inside, outside, model label and any visible damage.",
      "State whether the buyer collects or you can arrange delivery.",
    ],
    keywords: [
      "second hand fridges in Kenya",
      "used fridges for sale Kenya",
      "fridges for sale in Nairobi",
      "affordable fridges Kenya",
    ],
    related: ["home-appliances", "tvs", "furniture", "beds"],
  },
  {
    slug: "car-parts",
    query: "car parts",
    label: "Car parts and spare parts",
    pluralLabel: "car parts and spare parts",
    category: "Cars and vehicles",
    intro:
      "Find car parts and spare parts for sale in Kenya, including parts for Toyota and Nissan vehicles. Check compatibility, condition and location with the seller before arranging inspection or collection.",
    buyerTips: [
      "Confirm the part number, vehicle model, year and engine compatibility before buying.",
      "Ask whether the part is new, used or refurbished and whether it has been tested.",
      "Inspect the part and agree on collection or delivery directly with the seller.",
    ],
    sellerTips: [
      "Name the part, make, model and compatible year or engine in the listing.",
      "Photograph part numbers, connectors and any wear or damage.",
      "State the price, condition and your location clearly.",
    ],
    keywords: [
      "car parts in Kenya",
      "spare parts for sale Kenya",
      "Toyota spare parts Kenya",
      "Nissan spare parts Kenya",
      "used car parts Kenya",
    ],
    related: ["cars", "toyota-premio", "nissan-note", "toyota-harrier"],
  },
  {
    slug: "home-services",
    query: "home services",
    label: "Home services",
    pluralLabel: "home services",
    category: "Services",
    intro:
      "Find local providers in Kenya, including plumbers, electricians, water suppliers and car washes. Browse building materials, hardware, paint and tools, or find alarm installation, marketing and logistics services. Contact providers directly to confirm availability and price.",
    buyerTips: [
      "Ask what the quoted service includes and whether materials or call-out fees cost extra.",
      "Confirm the provider serves your area and agree on a time before they travel.",
      "For installation or repair work, ask about experience and any relevant references.",
    ],
    sellerTips: [
      "Name the service, areas covered, availability and best contact method.",
      "Describe your experience, what is included and whether you supply materials.",
      "Add clear service photos where useful and state how customers can request a quote.",
    ],
    keywords: [
      "plumbers in Kenya",
      "electricians in Kenya",
      "water suppliers Kenya",
      "car wash near me Kenya",
      "building materials Kenya",
      "hardware stores Kenya",
      "alarm installation Kenya",
      "marketing agency Kenya",
      "logistics company Kenya",
    ],
    related: ["car-parts", "home-appliances", "furniture", "cars"],
  },
  {
    slug: "farm-produce",
    query: "farm produce",
    label: "Farm produce",
    pluralLabel: "farm produce",
    category: "Agriculture",
    intro:
      "Find farm produce for sale in Kenya from local farmers and sellers. Compare quantity, price, location and pickup or delivery details.",
    buyerTips: [
      "Check quantity, grade, freshness, packaging and location.",
      "Ask about bulk price, availability and transport.",
      "Confirm pickup or delivery before payment.",
    ],
    sellerTips: [
      "Mention produce type, quantity, grade, harvest date and location.",
      "Upload clear photos of the actual produce.",
      "State price per unit and delivery or pickup details.",
    ],
    keywords: [
      "farm produce for sale",
      "farm produce Kenya",
      "agricultural products Kenya",
      "fresh produce Kenya",
    ],
    related: ["livestock", "land", "plots", "probox"],
  },
  {
    slug: "livestock",
    query: "livestock",
    label: "Livestock",
    pluralLabel: "livestock",
    category: "Agriculture",
    intro:
      "Browse livestock for sale in Kenya, including animals from local sellers. Compare price, location, age, breed and condition.",
    buyerTips: [
      "Check breed, age, health, vaccination status and location.",
      "Ask for current photos or video before visiting.",
      "Inspect the animal and agree transport directly with the seller.",
    ],
    sellerTips: [
      "Mention animal type, breed, age, health status, price and location.",
      "Upload clear photos or video of the actual animal.",
      "State viewing times and transport arrangements.",
    ],
    keywords: [
      "livestock for sale",
      "livestock for sale in Kenya",
      "cows for sale Kenya",
      "goats for sale Kenya",
    ],
    related: ["farm-produce", "land", "plots", "probox"],
  },
  // ── Additional car models ──────────────────────────────────────────
  // Appended rather than grouped with the cars above on purpose:
  // topSearchIntentPages takes the first twelve entries for the browse hub and
  // cross-links, and moving these up would make that list entirely cars.
  {
    slug: "toyota-vitz",
    query: "Toyota Vitz",
    label: "Toyota Vitz",
    pluralLabel: "Toyota Vitz cars",
    category: "Cars",
    intro:
      "Browse Toyota Vitz cars for sale in Kenya from local sellers. Compare year, mileage, engine size, condition and price, then message the seller directly on Shopi.",
    buyerTips: [
      "Check the engine size — the 1.0 and 1.3 differ noticeably in power and fuel use.",
      "Ask about service history, accident repairs and whether the logbook is ready.",
      "Inspect the car and confirm ownership documents before paying anything.",
    ],
    sellerTips: [
      "Put Toyota Vitz, year, engine size and location in the title or description.",
      "Show the exterior, interior, dashboard with the engine running, and tyres.",
      "State your price in KES and whether it is negotiable.",
    ],
    keywords: [
      "toyota vitz for sale",
      "toyota vitz for sale in Kenya",
      "used toyota vitz Kenya",
      "toyota vitz price Kenya",
      "cheap cars for sale Kenya",
    ],
    related: ["toyota-axio", "nissan-note", "toyota-premio"],
    listings: modelListings,
  },
  {
    slug: "toyota-axio",
    query: "Toyota Axio",
    label: "Toyota Axio",
    pluralLabel: "Toyota Axio cars",
    category: "Cars",
    intro:
      "Find Toyota Axio cars for sale in Kenya. Compare year, grade, mileage, condition and price across local sellers, and contact the seller directly on Shopi.",
    buyerTips: [
      "Check the grade and whether it is a hybrid or petrol model.",
      "Ask for mileage backed by service records, not just the odometer.",
      "Confirm accident history and logbook status before you commit.",
    ],
    sellerTips: [
      "Include Toyota Axio, year, grade and whether it is hybrid in your listing.",
      "Photograph the interior honestly, including seat and trim wear.",
      "Add the price in KES, your location and the logbook status.",
    ],
    keywords: [
      "toyota axio for sale",
      "toyota axio for sale in Kenya",
      "used toyota axio Kenya",
      "toyota axio price Kenya",
      "toyota axio hybrid Kenya",
    ],
    related: ["toyota-fielder", "toyota-premio", "toyota-vitz"],
    listings: modelListings,
  },
  {
    slug: "toyota-fielder",
    query: "Toyota Fielder",
    label: "Toyota Fielder",
    pluralLabel: "Toyota Fielder cars",
    category: "Cars",
    intro:
      "Browse Toyota Fielder wagons for sale in Kenya. Compare year, grade, mileage, load space and price from local sellers, and message them directly on Shopi.",
    buyerTips: [
      "Check whether it is the petrol or hybrid, and 2WD or 4WD.",
      "Inspect the rear suspension if the car has been used to carry loads.",
      "Ask about service history, accident repairs and logbook readiness.",
    ],
    sellerTips: [
      "Say Toyota Fielder, year, grade and hybrid or petrol in the title.",
      "Photograph the load area — it is the reason most buyers choose this model.",
      "State price, mileage, location and whether the price is negotiable.",
    ],
    keywords: [
      "toyota fielder for sale",
      "toyota fielder for sale in Kenya",
      "used toyota fielder Kenya",
      "toyota fielder price Kenya",
      "station wagon for sale Kenya",
    ],
    related: ["toyota-axio", "probox", "toyota-premio"],
    listings: modelListings,
  },
  {
    slug: "nissan-note",
    query: "Nissan Note",
    label: "Nissan Note",
    pluralLabel: "Nissan Note cars",
    category: "Cars",
    intro:
      "Find Nissan Note cars for sale in Kenya from local sellers. Compare year, mileage, engine, condition and price, then contact the seller directly on Shopi.",
    buyerTips: [
      "Ask whether it is the standard or the supercharged DIG-S engine.",
      "Check the CVT gearbox behaviour on a test drive — it is the common concern.",
      "Confirm service history, accident repairs and logbook status.",
    ],
    sellerTips: [
      "Include Nissan Note, year, engine variant and location in your listing.",
      "Mention recent gearbox or CVT servicing if you have the records.",
      "Show the dashboard with the engine on, plus interior and tyre condition.",
    ],
    keywords: [
      "nissan note for sale",
      "nissan note for sale in Kenya",
      "used nissan note Kenya",
      "nissan note price Kenya",
      "affordable cars for sale Kenya",
    ],
    related: ["toyota-vitz", "toyota-axio", "toyota-premio"],
    listings: modelListings,
  },
  {
    slug: "subaru-forester",
    query: "Subaru Forester",
    label: "Subaru Forester",
    pluralLabel: "Subaru Forester cars",
    category: "Cars",
    intro:
      "Browse Subaru Forester cars for sale in Kenya. Compare year, engine, turbo or non-turbo, mileage and price from local sellers on Shopi.",
    buyerTips: [
      "Establish whether it is turbo or non-turbo — running costs differ sharply.",
      "Ask for evidence of regular servicing, especially oil change intervals.",
      "Check the all-wheel-drive system and suspension on a proper test drive.",
    ],
    sellerTips: [
      "Say Subaru Forester, year, and turbo or non-turbo in the title.",
      "Photograph your service receipts — documentation sells this model.",
      "Mention suspension and tyre condition, which Forester buyers check first.",
    ],
    keywords: [
      "subaru forester for sale",
      "subaru forester for sale in Kenya",
      "used subaru forester Kenya",
      "subaru forester price Kenya",
      "4wd cars for sale Kenya",
    ],
    related: ["toyota-harrier", "isuzu-d-max", "toyota-premio"],
    listings: modelListings,
  },
  {
    slug: "isuzu-d-max",
    query: "Isuzu D-Max",
    label: "Isuzu D-Max",
    pluralLabel: "Isuzu D-Max pickups",
    category: "Cars",
    intro:
      "Find Isuzu D-Max pickups and double cabs for sale in Kenya. Compare year, 2WD or 4WD, mileage, load capacity and price from local sellers on Shopi.",
    buyerTips: [
      "Confirm 2WD or 4WD and single or double cab before travelling to view.",
      "Inspect the chassis, load bed and suspension — this is a working vehicle.",
      "Ask what the pickup has been used for and how heavily it was loaded.",
    ],
    sellerTips: [
      "Put Isuzu D-Max, year, cab type and 2WD or 4WD in the title.",
      "Photograph the load bed, suspension, tyres and underside honestly.",
      "State what the vehicle was used for — business buyers respect a straight answer.",
    ],
    keywords: [
      "isuzu d-max for sale",
      "isuzu d max for sale in Kenya",
      "pickup for sale Kenya",
      "double cab for sale Kenya",
      "isuzu d-max price Kenya",
    ],
    related: ["toyota-hiace", "probox", "subaru-forester"],
    listings: modelListings,
  },
  {
    slug: "toyota-hiace",
    query: "Toyota Hiace",
    label: "Toyota Hiace",
    pluralLabel: "Toyota Hiace vans",
    category: "Cars",
    intro:
      "Browse Toyota Hiace vans and matatus for sale in Kenya. Compare year, seating, engine, mileage and price from local sellers, and message them directly on Shopi.",
    buyerTips: [
      "Confirm seating capacity and whether it is PSV-compliant if you plan to operate it.",
      "Check engine condition, gearbox and suspension — these vehicles work hard.",
      "Ask about the logbook, any financing, and current inspection status.",
    ],
    sellerTips: [
      "Include Toyota Hiace, year, engine, seating and PSV status in the listing.",
      "Photograph the interior seating, engine bay, tyres and body panels.",
      "Be clear about route history and mileage — commercial buyers will ask.",
    ],
    keywords: [
      "toyota hiace for sale",
      "toyota hiace for sale in Kenya",
      "matatu for sale Kenya",
      "van for sale Kenya",
      "toyota hiace price Kenya",
    ],
    related: ["isuzu-d-max", "probox", "toyota-fielder"],
    listings: modelListings,
  },
] as const satisfies SearchIntentPage[];

export const topSearchIntentPages = searchIntentPages.slice(0, 12);

export function getSearchIntentPage(slug: string) {
  return searchIntentPages.find((page) => page.slug === slug) ?? null;
}

export function searchIntentPath(slug: string) {
  return `/for-sale/${slug}` as const;
}

/** What a page's live listings are fetched with: its query, plus any narrowing. */
export function searchIntentListingFilter(
  page: Pick<SearchIntentPage, "query" | "listings">,
): NonNullable<SearchIntentPage["listings"]> {
  return { query: page.query, ...page.listings };
}

// Longest query first, so "Toyota Premio" wins over the generic "car".
const byQuerySpecificity = [...searchIntentPages].sort(
  (a, b) => b.query.length - a.query.length,
);

/**
 * The /for-sale page a listing belongs under, matched on its title — e.g.
 * "2014 Toyota Premio, clean" → /for-sale/toyota-premio. Listing pages link
 * to it so the hub pages collect authority from the inventory they describe.
 *
 * A page that sources its listings from a subcategory only claims listings
 * the classifier filed there (`subcategory` is the listing's level-2 name),
 * so a "Car Charger" doesn't link to "Cars for sale in Kenya".
 */
export function searchIntentPageForTitle(
  title: string,
  subcategory?: string | null,
) {
  const listingSubcategory = subcategory?.trim().toLowerCase();
  return (
    byQuerySpecificity.find((page) => {
      const required = (page as Pick<SearchIntentPage, "listings">).listings
        ?.subcategory;
      if (required && required.toLowerCase() !== listingSubcategory) {
        return false;
      }
      const query = page.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${query}s?\\b`, "i").test(title);
    }) ?? null
  );
}
