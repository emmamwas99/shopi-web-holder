/**
 * The category landing pages, as data.
 *
 * Each of these pages earns its own search traffic, so they cross-link (see
 * CategoryCrossLinks and BrowseHub) and blog articles link into them. Kept
 * import-free so the article link resolver — which the SEO audit loads
 * directly in Node — can validate links against it.
 */
export const categoryPages = [
  {
    path: "/buy-and-sell-in-kenya",
    title: "Buy and sell in Kenya",
    body: "A free local marketplace for finding items nearby, posting your own listings, and chatting directly.",
  },
  {
    path: "/phones-electronics-kenya",
    title: "Phones and electronics",
    body: "New, used and refurbished phones, including Samsung, Tecno, Infinix and Oppo, plus laptops, phone accessories and electronics from sellers across Kenya.",
  },
  {
    path: "/for-sale/home-appliances",
    title: "Home appliances",
    body: "New and second hand fridges, microwaves, electric kettles and cooking gas equipment from local sellers.",
  },
  {
    path: "/for-sale/car-parts",
    title: "Car parts and spare parts",
    body: "Search car parts and spare parts for Toyota, Nissan and other vehicles, and confirm fit and condition with sellers.",
  },
  {
    path: "/for-sale/home-services",
    title: "Home and local services",
    body: "Find plumbers, electricians, water suppliers, car washes and other local providers across Kenya.",
  },
  {
    path: "/property-for-sale-kenya",
    title: "Land, plots and property",
    body: "Land, plots, houses for sale and houses for rent, from Nairobi to Nyahururu and Nyandarua.",
  },
  {
    path: "/sell-car-kenya",
    title: "Cars for sale",
    body: "Used cars with photos or video, make, model, year, mileage, price and direct buyer chat.",
  },
  {
    path: "/beauty-cosmetics-kenya",
    title: "Beauty and cosmetics",
    body: "Skincare, makeup, perfumes, wigs and hair products from local beauty sellers.",
  },
  {
    path: "/sell-in-kenya",
    title: "Selling on Shopi",
    body: "How to post an item for free, what to include, and how buyers reach you.",
  },
] as const;

export type CategoryHubPath = (typeof categoryPages)[number]["path"];
