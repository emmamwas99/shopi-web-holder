import type { Article } from "../types.ts";

/**
 * The buying process end to end. Inspection detail lives in
 * how-to-check-a-used-car-before-buying-in-kenya and transfer detail in
 * logbook-transfer-in-kenya; this article links to both rather than repeating
 * them, so the three don't compete for the same queries.
 */
export const article: Article = {
  slug: "how-to-buy-a-used-car-in-kenya",
  status: "published",
  intent: "buying-guide",
  title: "How to Buy a Used Car in Kenya, Step by Step",
  seoTitle: "How to Buy a Used Car in Kenya: Steps, Checks and Scams",
  seoDescription:
    "How to buy a used car in Kenya: set the full budget, foreign used vs Kenyan used, where to find cars, the checks, avoiding cons and the NTSA transfer.",
  excerpt:
    "To buy a used car in Kenya: set your full budget, decide between foreign used and Kenyan used, find cars from owners or dealers, check the logbook and the car, sign a sale agreement, pay by bank and accept the NTSA transfer on eCitizen. Each step below includes the checks that keep you from being conned.",
  primaryKeyword: "buy a used car in Kenya",
  keywords: [
    "process of buying a used car in Kenya",
    "steps to buying a car in Kenya",
    "requirements for buying a car in Kenya",
    "buying a second hand car in Kenya",
    "foreign used vs Kenyan used",
    "how to avoid being conned when buying a car in Kenya",
    "used cars sold by owners in Kenya",
  ],
  category: "cars",
  tags: ["used-cars", "buying-tips", "ntsa", "logbook"],
  author: "shopi-team",
  publishedAt: "2026-10-21",
  listings: {
    label: "used car",
    sources: [{ subcategory: "Cars" }],
    minPrice: 100_000,
    show: 6,
  },
  sections: [
    {
      id: "budget",
      heading: "1. Set the whole budget, not just the price",
      blocks: [
        {
          type: "p",
          text: "The asking price is only part of what it costs to buy a used car in Kenya. Before you start looking, add up the rest:",
        },
        {
          type: "list",
          items: [
            "**Insurance** in your name before you drive away. Third-party cover is the legal minimum; comprehensive costs more but covers your own car.",
            "**The NTSA transfer fee**, which depends on engine capacity. Agree in the sale agreement who pays it.",
            "**A mechanic's inspection** before you pay.",
            "**A first service**: oil, filters and anything the inspection found, such as tyres or brake pads.",
          ],
        },
        {
          type: "p",
          text: "If you're borrowing, banks and SACCOs offer car loans and asset finance, and some dealers sell on hire purchase. With all of these the lender is registered on the car's logbook until you've paid. A logbook loan is different: it's a loan against a car you already own, and it's an expensive way to fund the purchase of another.",
        },
      ],
    },
    {
      id: "foreign-or-kenyan-used",
      heading: "2. Foreign used or Kenyan used?",
      blocks: [
        {
          type: "table",
          caption: "The two kinds of used car you'll see advertised in Kenya",
          head: ["", "Foreign used", "Kenyan used (locally used)"],
          rows: [
            [
              "What it means",
              "Imported second hand, most often from Japan, and registered in Kenya on arrival",
              "Already registered and driven in Kenya, often by more than one owner",
            ],
            [
              "Price",
              "Usually higher for the same model and year",
              "Usually lower",
            ],
            [
              "Age",
              "Kenya only allows used cars up to eight years old, counted from first registration, to be imported",
              "Any age",
            ],
            [
              "What to check",
              "Import and registration dates, and that duty was paid",
              "Kenyan service history, previous owners and accident repairs",
            ],
          ],
        },
        {
          type: "p",
          text: "Neither is automatically better. A well-kept Kenyan used car with service records can be a safer buy than a foreign used one with an unknown past. Many car listings on Shopi say which it is under the car's condition.",
        },
      ],
    },
    {
      id: "where-to-find",
      heading: "3. Where to find one",
      blocks: [
        {
          type: "list",
          items: [
            "**Private owners**, through online listings and personal networks. Often the best price, and the owner can tell you the car's history, but you do every check yourself.",
            "**Car yards and dealers.** More choice in one place and sometimes a short warranty, at a higher price.",
            "**Importers**, for foreign used cars ordered to your specification. Allow time for shipping and clearing.",
            "**Bank and auctioneer sales** of repossessed cars. They can be cheap, but you'll need an [NTSA alternative transfer](/blog/logbook-transfer-in-kenya) afterwards.",
          ],
        },
        {
          type: "p",
          text: "On Shopi you message the owner or seller directly and agree the viewing between you, with no broker in between. Compare a few [used cars for sale](/for-sale/cars) of the same model and year before you judge any one price.",
        },
      ],
    },
    {
      id: "checks",
      heading: "4. Check the paperwork, then the car",
      blocks: [
        {
          type: "checklist",
          items: [
            "The seller's name on the logbook matches their national ID. Scan the e-Logbook's QR code, or run a search on eCitizen, yourself.",
            "No bank, SACCO or logbook lender is on the record, and there's no caveat on the car.",
            "The chassis number on the car matches the logbook.",
            "A mechanic you trust has inspected it.",
            "A test drive of at least 15 minutes, including a rough road, shows no gearbox, brake or suspension problems.",
          ],
        },
        {
          type: "p",
          text: "The full checklist, from paint and panel gaps to warning lights, is in [how to check a used car before buying](/blog/how-to-check-a-used-car-before-buying-in-kenya).",
        },
      ],
    },
    {
      id: "avoid-being-conned",
      heading: "How to avoid being conned",
      blocks: [
        {
          type: "list",
          items: [
            "**A deposit to \"hold\" a car you haven't seen.** It's one of the oldest car scams there is. Pay nothing until you've seen the car and its logbook.",
            "**A price far below similar cars**, with a story about an urgent move or a family emergency.",
            "**\"The owner is upcountry.\"** You're dealing with someone who can't produce the owner or the logbook.",
            "**A logbook that's \"being processed\"**, or in another person's name.",
            "**A screenshot of an e-Logbook.** Check it yourself through its QR code or eCitizen; a screenshot proves nothing.",
            "**A \"transfer fee\" to a personal number.** NTSA fees are paid through eCitizen only.",
            "**Refusing a mechanic**, or showing the car only at night or in the rain.",
          ],
        },
        {
          type: "p",
          text: "The [Shopi safety centre](/safety-centre) has more on meeting sellers and paying safely.",
        },
      ],
    },
    {
      id: "sign-pay-transfer",
      heading: "5. Sign, pay and transfer",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            "Agree the price, using what the inspection found to negotiate.",
            "Sign a [car sale agreement](/blog/car-sale-agreement-in-kenya) with both parties' ID numbers and KRA PINs, the car's registration, chassis and engine numbers, the price and the handover time.",
            "Pay by bank transfer, ideally together at the bank so the seller can confirm it's arrived.",
            "The seller starts the transfer on the NTSA service portal in eCitizen; you accept it from your notifications.",
            "Insure the car in your name before you drive it away.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          text: "You need three things of your own to buy a car in Kenya: your national ID (or passport), your KRA PIN and an active eCitizen account to accept the transfer.",
        },
      ],
    },
    {
      id: "used-cars",
      heading: "Used cars on Shopi now",
      blocks: [
        { type: "listings" },
        {
          type: "p",
          text: "Have a model in mind? The [Toyota Vitz price guide](/blog/toyota-vitz-price-in-kenya) shows what moves one model's price, and [Toyota Axio](/for-sale/toyota-axio) and [Toyota Fielder](/for-sale/toyota-fielder) listings are good places to compare.",
        },
      ],
    },
  ],
  faq: [
    {
      q: "What is the process of buying a second hand car in Kenya?",
      a: "Set your full budget, find a car, check the logbook and have a mechanic inspect the car, test-drive it, sign a sale agreement, pay by bank, then accept the NTSA transfer the seller starts on eCitizen. Insure it in your name before driving away.",
    },
    {
      q: "What do I need to buy a car in Kenya?",
      a: "Your national ID or passport, your KRA PIN and an active eCitizen account, which you use to accept the transfer. If you're borrowing, the lender will ask for its own documents, such as payslips or bank statements.",
    },
    {
      q: "Is foreign used better than Kenyan used?",
      a: "Not automatically. Foreign used cars are usually newer and cost more, since Kenya only allows used imports up to eight years old. A Kenyan used car with full service records can be the better buy.",
    },
    {
      q: "How do I know a car isn't stolen or still on a loan?",
      a: "Scan the e-Logbook's QR code or run a search on eCitizen yourself, and check that the seller's name matches their ID, no lender is on the record and the chassis number matches the car. Walk away from anyone who can't show the logbook.",
    },
  ],
  marketplaceLinks: [
    { kind: "forSale", slug: "cars" },
    { kind: "forSale", slug: "toyota-axio" },
    { kind: "forSale", slug: "probox" },
    { kind: "county", slug: "nairobi" },
  ],
  related: [
    "how-to-check-a-used-car-before-buying-in-kenya",
    "logbook-transfer-in-kenya",
    "car-sale-agreement-in-kenya",
  ],
  cta: {
    label: "Browse used cars",
    to: { kind: "forSale", slug: "cars" },
    text: "Compare asking prices, then message the owner or seller directly.",
  },
};
