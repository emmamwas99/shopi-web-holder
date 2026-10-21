import type { ArticleCategory } from "./types.ts";

/**
 * Blog categories — the content clusters. Each gets a hub at
 * /blog/category/<slug> that lists its articles and sends readers to the
 * matching marketplace pages.
 */
export const CATEGORIES: ArticleCategory[] = [
  {
    slug: "cars",
    name: "Cars",
    title: "Car Prices and Buying Guides in Kenya",
    description:
      "What cars cost in Kenya from real Shopi listings, how to buy a used car safely, and the paperwork: logbook transfer and the car sale agreement.",
    intro:
      "What cars are listed for on Shopi right now, what to check before you pay, and how the logbook transfer and sale agreement work.",
    marketplace: [
      { kind: "forSale", slug: "cars" },
      { kind: "county", slug: "nairobi" },
      { kind: "hub", path: "/sell-car-kenya" },
    ],
    order: 1,
  },
  {
    slug: "phones",
    name: "Phones",
    title: "Phone Prices in Kenya",
    description:
      "iPhone, Samsung, Tecno and Infinix prices in Kenya from real Shopi listings, and how to check a phone before you pay.",
    intro:
      "What phones are listed for right now, which version to buy, and how to check a phone before you pay.",
    marketplace: [
      { kind: "forSale", slug: "phones" },
      { kind: "forSale", slug: "iphone" },
      { kind: "forSale", slug: "samsung" },
      { kind: "hub", path: "/phones-electronics-kenya" },
    ],
    order: 2,
  },
  {
    slug: "property",
    name: "Property",
    title: "Houses for Rent and Property Guides in Kenya",
    description:
      "Bedsitters, apartments and houses for rent in Nairobi and across Kenya, with live listings and what to check before you pay a deposit.",
    intro:
      "Where to look, what drives the rent, and what to check before you pay a deposit.",
    marketplace: [
      { kind: "forSale", slug: "houses-for-rent" },
      { kind: "forSale", slug: "land" },
      { kind: "hub", path: "/property-for-sale-kenya" },
    ],
    order: 3,
  },
  {
    slug: "electronics",
    name: "Electronics",
    title: "Electronics Prices in Kenya",
    description:
      "PS5, TV, laptop and appliance prices in Kenya from real Shopi listings, plus what to check before you buy new or used.",
    intro:
      "Consoles, TVs, laptops and home appliances: which version to buy and what to check before you pay.",
    marketplace: [
      { kind: "forSale", slug: "laptops" },
      { kind: "forSale", slug: "tvs" },
      { kind: "hub", path: "/phones-electronics-kenya" },
    ],
    order: 4,
  },
  {
    slug: "home",
    name: "Home & fashion",
    title: "Furniture, Home and Fashion Prices in Kenya",
    description:
      "Sofa, bed and furniture prices in Kenya from real Shopi listings, plus what to check before you buy new or second hand.",
    intro:
      "Furniture, home and fashion: what sets the price and what to check before you buy.",
    marketplace: [
      { kind: "forSale", slug: "furniture" },
      { kind: "forSale", slug: "sofas" },
      { kind: "forSale", slug: "beds" },
    ],
    order: 5,
  },
  {
    slug: "selling",
    name: "Selling guides",
    title: "Selling Guides for Kenya",
    description:
      "How to sell online in Kenya: pricing, photos, safe meet-ups and selling your car without a broker.",
    intro: "How to price, post and sell safely, whatever you are selling.",
    marketplace: [
      { kind: "hub", path: "/sell-in-kenya" },
      { kind: "hub", path: "/sell-car-kenya" },
    ],
    order: 6,
  },
  {
    slug: "earn",
    name: "Earn online",
    title: "Make Money Online in Kenya",
    description:
      "Honest ways to make money online in Kenya without investment: selling, reselling, freelancing and referral rewards paid on M-Pesa.",
    intro:
      "Practical ways to earn from your phone in Kenya, what each one really pays, and the scams to walk away from.",
    marketplace: [
      { kind: "hub", path: "/sell-in-kenya" },
      { kind: "page", path: "/online-selling-jobs-kenya", label: "Online selling jobs in Kenya" },
    ],
    order: 7,
  },
  {
    slug: "shopi",
    name: "Inside Shopi",
    title: "Inside Shopi: News and Insights",
    description:
      "How Shopi works, what Shopi Agent does, and how social discovery is changing buying and selling in Kenya.",
    intro: "How Shopi works and where local buying and selling is heading.",
    marketplace: [
      { kind: "page", path: "/shopi-agent", label: "Shopi Agent" },
      { kind: "hub", path: "/buy-and-sell-in-kenya" },
    ],
    order: 8,
  },
];

export function getCategory(slug: string): ArticleCategory | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
