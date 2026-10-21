import type { Article } from "../types.ts";

/**
 * Clause list checked on 2026-10-21 against published Kenyan templates
 * (Garisea, Forms Legal) and the NTSA transfer process. The template is a
 * starting point, not legal advice, and says so on the page.
 */
export const article: Article = {
  slug: "car-sale-agreement-in-kenya",
  status: "published",
  intent: "buying-guide",
  title: "Car Sale Agreement in Kenya: What to Include, With a Free Template",
  seoTitle: "Car Sale Agreement in Kenya: Free Template and What to Include",
  seoDescription:
    "A car sale agreement in Kenya, explained: the clauses to include, a free template you can copy, and how it fits with payment and the NTSA transfer.",
  excerpt:
    "A car sale agreement in Kenya is a short signed document that records who is selling which car to whom, for how much, when it changes hands and in what condition. The law doesn't require one, but it's your proof if anything goes wrong before the NTSA transfer completes. Below: what to put in it, and a template you can copy.",
  primaryKeyword: "car sale agreement in Kenya",
  keywords: [
    "car sale agreement Kenya template",
    "car sale agreement Kenya pdf",
    "motor vehicle sale agreement Kenya",
    "vehicle sale agreement form Kenya",
    "simple car sale agreement Kenya",
    "car sale agreement sample Kenya",
  ],
  category: "cars",
  tags: ["sale-agreement", "ntsa", "used-cars", "selling-a-car"],
  author: "shopi-team",
  publishedAt: "2026-10-21",
  sections: [
    {
      id: "do-you-need-one",
      heading: "Do you need a car sale agreement?",
      blocks: [
        {
          type: "p",
          text: "No law says a private car sale needs a written agreement, and signing one doesn't transfer ownership: only the [NTSA transfer on eCitizen](/blog/logbook-transfer-in-kenya) does that. A car sale agreement in Kenya is still worth the ten minutes it takes, for both sides.",
        },
        {
          type: "list",
          items: [
            "**It records the handover time.** A fine, crash or crime involving the car after that moment is the buyer's responsibility, even if the transfer is still pending.",
            "**It records the price and payment.** That matters most when there's a deposit and a balance.",
            "**It records what the seller disclosed.** A buyer who signed that they inspected the car and accepted known defects can't claim later they weren't told.",
            "**It's evidence.** If a seller disappears after being paid, the agreement and proof of payment are what an advocate or NTSA will ask for.",
          ],
        },
      ],
    },
    {
      id: "what-to-include",
      heading: "What to include",
      blocks: [
        {
          type: "checklist",
          items: [
            "**The parties:** full names, ID or passport numbers, KRA PINs, phone numbers and addresses of the seller and the buyer.",
            "**The car:** make, model, year, colour, registration number, chassis number, engine number and the odometer reading on the day. Copy them from the logbook and check them on the car.",
            "**The price:** the total in Kenya shillings, in words and figures, and whether the seller has received it.",
            "**Deposit and balance:** how much, when each is due, how it's paid, and what happens to the deposit if the sale falls through.",
            "**Handover:** the date and exact time the car, keys and documents change hands.",
            "**The transfer:** that the seller starts the NTSA transfer, by when, and who pays the transfer fee.",
            "**Condition:** that the car is sold as seen after inspection, plus any defects the seller has disclosed.",
            "**The seller's promises:** they own the car, and there's no loan, hire purchase, caveat, court order or unpaid duty on it.",
            "**Signatures:** both parties and a witness for each, dated, in two copies, one for each side.",
          ],
        },
      ],
    },
    {
      id: "template",
      heading: "Car sale agreement template",
      blocks: [
        {
          type: "p",
          text: "Copy this, fill every blank, and strike out anything that doesn't apply. Leave nothing blank on the signed copy.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Parties.** This agreement is made on ________ (date) between ________ (full name), ID/passport No. ________, KRA PIN ________, phone ________, of ________ (address) (\"the Seller\"), and ________ (full name), ID/passport No. ________, KRA PIN ________, phone ________, of ________ (address) (\"the Buyer\").",
            "**The vehicle.** The Seller sells and the Buyer buys the motor vehicle: make ________, model ________, year ________, colour ________, registration No. ________, chassis No. ________, engine No. ________, odometer reading ________ km (\"the Vehicle\").",
            "**Price.** The purchase price is KES ________ (________ shillings).",
            "**Payment.** The Buyer pays: (a) a deposit of KES ________ on ________, by ________; and (b) the balance of KES ________ on or before ________, by ________. The Seller confirms receipt of each payment in writing. If the Buyer does not pay the balance by that date, the deposit is ________ (refunded / kept by the Seller).",
            "**Handover.** The Seller hands over the Vehicle, all keys and its documents on ________ at ________ (time), after the full price has cleared in the Seller's account. From that time the Buyer is responsible for the Vehicle, including its use, insurance, fines and any liability.",
            "**Transfer.** The Seller starts the transfer of ownership to the Buyer on the NTSA service portal on eCitizen within ________ days of handover, and the Buyer accepts it promptly. The transfer fee is paid by ________.",
            "**Condition.** The Buyer has inspected the Vehicle and buys it as seen. The Seller has disclosed these defects: ________.",
            "**Seller's warranty.** The Seller confirms that they are the registered owner, and that the Vehicle is free of any loan, hire purchase, logbook loan, caveat, court order or unpaid duty.",
            "**Signed.** Seller: ________ (signature, date). Witness: ________ (name, ID No., signature). Buyer: ________ (signature, date). Witness: ________ (name, ID No., signature).",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          text: "This template is a starting point, not legal advice. For a high-value car, a deposit with a long balance period, or anything unusual such as a car still on a loan, have an advocate review it before you sign.",
        },
      ],
    },
    {
      id: "payment",
      heading: "Payment and handover",
      blocks: [
        {
          type: "p",
          text: "Sign the agreement, then let payment clear, then hand over. For a sum this size, a bank transfer is safest, ideally done together at the bank so the seller can confirm it has arrived. An SMS, a screenshot or a \"pending\" notification is not payment.",
        },
        {
          type: "p",
          text: "Write the handover time into the agreement as it actually happens, and start the transfer the same day. Until it completes, the seller is still the registered owner. The [logbook transfer guide](/blog/logbook-transfer-in-kenya) walks through what each side clicks.",
        },
      ],
    },
    {
      id: "mistakes",
      heading: "Common mistakes",
      blocks: [
        {
          type: "list",
          items: [
            "Leaving the chassis and engine numbers out, so the agreement doesn't identify one specific car.",
            "No handover time, which makes it impossible to say who was responsible when something happened.",
            "\"Balance to be paid later\" with no date and nothing said about the deposit.",
            "Signing before seeing the logbook or checking the e-Logbook's QR code.",
            "The buyer driving away before the seller has started the transfer.",
            "Only one copy, kept by one side.",
          ],
        },
        {
          type: "p",
          text: "Buying? Do the checks in [how to check a used car before buying](/blog/how-to-check-a-used-car-before-buying-in-kenya) before you sign anything. Selling? The [guide to selling a car in Kenya](/sell-car-kenya) covers pricing and viewings, and [used cars on Shopi](/for-sale/cars) show what similar cars are listed for.",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Is a car sale agreement legally required in Kenya?",
      a: "No. A private sale is legal without one, and the agreement doesn't transfer ownership — the NTSA transfer on eCitizen does. It's still the best evidence of the price, the handover time and the car's disclosed condition.",
    },
    {
      q: "Does a car sale agreement need to be signed by a lawyer?",
      a: "No. Both parties sign, ideally with a witness each. For a high-value car or a deposit-and-balance deal, having an advocate review it is worth the cost.",
    },
    {
      q: "What should a car sale agreement include?",
      a: "Both parties' names, ID numbers and KRA PINs; the car's registration, chassis and engine numbers; the price, deposit and balance; the handover date and time; who starts the NTSA transfer and pays its fee; the car's condition; and signatures with witnesses.",
    },
    {
      q: "Who keeps the car sale agreement?",
      a: "Both. Sign two copies so the buyer and the seller each keep one, together with proof of payment.",
    },
  ],
  marketplaceLinks: [
    { kind: "forSale", slug: "cars" },
    { kind: "hub", path: "/sell-car-kenya" },
    { kind: "county", slug: "nairobi" },
  ],
  related: [
    "logbook-transfer-in-kenya",
    "how-to-check-a-used-car-before-buying-in-kenya",
    "how-to-sell-your-car-in-kenya-without-a-broker",
  ],
  cta: {
    label: "Browse used cars",
    to: { kind: "forSale", slug: "cars" },
    text: "Compare asking prices, then message the owner or seller directly.",
  },
};
