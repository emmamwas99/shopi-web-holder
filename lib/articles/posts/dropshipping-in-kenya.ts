import type { Article } from "../types.ts";

/**
 * "Dropshipping in Kenya" — the local reselling loop: photograph a supplier's
 * real stock, post it on Shopi, collect only once a buyer is ready, keep the
 * margin. The homepage curiosity section links here, so the article has to
 * deliver the method it teases and end on opening a shop.
 *
 * Two lines it must not cross:
 *   - Community guidelines forbid photos of items the seller can't get, so
 *     the method is always "the supplier's real stock, photographed by you",
 *     never pictures from the internet.
 *   - The KSh 100,000 table is arithmetic (margin × sales), labelled as an
 *     illustration. Never present it, or any figure, as typical earnings.
 */
export const article: Article = {
  slug: "dropshipping-in-kenya",
  status: "published",
  intent: "selling-guide",
  title: "Dropshipping in Kenya: How to Resell Without Stock in 2026",
  seoTitle: "Dropshipping in Kenya: Resell Without Stock (2026 Guide)",
  seoDescription:
    "Dropshipping in Kenya, the local way: post a supplier's real stock on Shopi, sell to buyers who message you, keep the margin. Steps, suppliers, the math.",
  excerpt:
    "Dropshipping in Kenya usually means selling a supplier's stock before you buy it. You photograph their goods with permission, post them on Shopi at your price, and collect the item only when a buyer is ready to pay. The difference is your profit — and you need no shop, no stock and almost no capital to start.",
  primaryKeyword: "dropshipping in Kenya",
  keywords: [
    "how to start dropshipping in Kenya",
    "reselling business in Kenya",
    "how to resell products in Kenya",
    "business without capital in Kenya",
    "online business ideas in Kenya 2026",
    "sell products without stock in Kenya",
  ],
  category: "earn",
  tags: ["earn-online", "side-hustle", "selling", "reselling"],
  author: "shopi-team",
  publishedAt: "2026-10-18",
  sections: [
    {
      id: "how-it-works",
      heading: "How dropshipping in Kenya works",
      blocks: [
        {
          type: "p",
          text: "Classic dropshipping is a website where a supplier ships straight to your customer. Dropshipping in Kenya is usually simpler and more local: you become the shop window for someone else's stock. A phone dealer in town, a shoe wholesaler in Eastleigh or a carpenter in Gikomba has the goods. You have the buyers. Here is the loop most resellers run:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Find a supplier** who will give you a reseller price and let you photograph their stock.",
            "**Photograph the real items** in good light — front, back, labels and any flaws.",
            "**Post them on Shopi** at your own price, with honest details and your area.",
            "**A buyer messages you.** Call the supplier and confirm the item is still there before you promise anything.",
            "**Collect it at your agreed price** and deliver it, or meet the buyer near the supplier.",
            "**Get paid and keep the difference.** That margin is your profit.",
          ],
        },
        {
          type: "p",
          text: "You never rent a shop and you never sit on stock that doesn't sell. Your job is the part most traders are too busy for: good photos, fast replies and finding buyers online. That is why suppliers are usually happy to work with resellers — you bring them sales they would not have made.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "Why it compounds",
          text: "Every buyer you serve well can follow your shop and come back for the next item. Resellers who last are the ones whose buyers return, not the ones with the lowest price.",
        },
      ],
    },
    {
      id: "suppliers",
      heading: "Where to find suppliers",
      blocks: [
        {
          type: "p",
          text: "A good supplier is close to you, keeps stock reliably and gives you a price low enough to leave room for your margin. Start where wholesale already happens:",
        },
        {
          type: "list",
          items: [
            "**Phones and accessories:** phone shops and dealers in Nairobi CBD, especially around Luthuli Avenue, and the electronics stalls in your own town.",
            "**Clothes and shoes:** wholesalers in Eastleigh, and first-grade mitumba from Gikomba for one-off pieces.",
            "**Furniture:** carpenters and upholsterers in Gikomba and along Ngong Road who make sofas, beds and tables to order.",
            "**Household goods and hardware:** traders in Kamukunji and along River Road.",
            "**Outside Nairobi:** your town's main market or wholesale street, plus local artisans, tailors and farmers.",
          ],
        },
        {
          type: "p",
          text: "Go in person. Ask three questions: what is your best price if I bring you buyers, will you hold an item for a few hours while my buyer pays, and can I photograph your stock? A supplier who says yes to all three is worth keeping. Save their number, note their prices, and visit often — new stock is new listings.",
        },
        {
          type: "callout",
          tone: "warning",
          text: "Never send a deposit to a \"supplier\" you have only met online for stock you haven't seen. Many reseller scams start with a social media \"wholesaler\" asking for money first.",
        },
      ],
    },
    {
      id: "what-to-sell",
      heading: "What sells best for resellers",
      blocks: [
        {
          type: "p",
          text: "Pick items that people search for every week, that are easy to describe, and that you can deliver within a day or two. These categories move steadily on Shopi:",
        },
        {
          type: "list",
          items: [
            "**Phones and accessories.** Always in demand, easy to price. See what [phones are listed for](/for-sale/phones) right now before you set yours.",
            "**Furniture made to order.** Sofas and beds have bigger margins, and buyers expect to wait a few days. Browse [sofas for sale](/for-sale/sofas) to see the going prices.",
            "**Home appliances.** Fridges, cookers and blenders from shops that don't sell online. Start with [home appliances](/for-sale/home-appliances).",
            "**Beauty, wigs and fashion.** Small, light and quick to deliver. See [beauty and cosmetics in Kenya](/beauty-cosmetics-kenya).",
          ],
        },
        {
          type: "p",
          text: "Start with one category you understand. If you know phones, you can spot a fake or a locked device; if you know furniture, you can tell good wood from cheap board. That knowledge is what makes buyers trust you over the next seller. Some items can't be sold at all — read the [prohibited items list](/prohibited-items) before you post anything.",
        },
      ],
    },
    {
      id: "the-math",
      heading: "The math: what does KSh 100,000 a month take?",
      blocks: [
        {
          type: "p",
          text: "Profit from reselling is simple arithmetic: your margin on each item, times the number of items you sell. The table shows how many sales it takes to reach KSh 100,000 in profit a month at different margins. It is an illustration, not a promise — your margin depends on what you sell and how well you negotiate with suppliers.",
        },
        {
          type: "table",
          caption: "Illustration only — not typical earnings",
          head: ["Your profit per sale", "Sales for KSh 100,000 a month", "Roughly"],
          rows: [
            ["KSh 500", "200 sales", "7 a day"],
            ["KSh 1,000", "100 sales", "3 to 4 a day"],
            ["KSh 2,000", "50 sales", "2 a day"],
            ["KSh 5,000", "20 sales", "1 every day or two"],
          ],
        },
        {
          type: "p",
          text: "Most people start far below this. The resellers who grow do three things: they post a lot of stock, they reply within minutes, and they turn buyers into followers who come back. Going from two sales a week to two a day is mostly about volume — the more listings you have, the more buyers find you.",
        },
        {
          type: "p",
          text: "Remember the costs between you and your margin: transport to collect, delivery to the buyer, data and airtime. Price with those in mind, and track every sale in a notebook or a spreadsheet so you know which items actually pay.",
        },
      ],
    },
    {
      id: "honest-reselling",
      heading: "Rules that keep buyers coming back",
      blocks: [
        {
          type: "p",
          text: "Reselling only works when buyers trust you. Shopi's [community guidelines](/community-guidelines) require real photos of the actual item, and the rules below keep you on the right side of them:",
        },
        {
          type: "checklist",
          items: [
            "Photograph the supplier's real stock yourself. Never use pictures from the internet or another seller's post.",
            "Say how it works in the description: \"In stock, delivery within 24 hours\" or \"Made to order, ready in 5 days\".",
            "Confirm stock with your supplier before you confirm with the buyer.",
            "Agree payment the buyer is comfortable with. Paying on delivery or after seeing the item builds trust fastest.",
            "Mark items as sold, or remove them, as soon as the supplier runs out.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          text: "Price fairly. A sensible markup sells today; a greedy one sits for weeks while the buyer finds the supplier on their own.",
        },
      ],
    },
    {
      id: "set-up-shop",
      heading: "Set up your reselling shop on Shopi",
      blocks: [
        {
          type: "p",
          text: "Shopi suits dropshipping in Kenya because posting is free, there is no commission and buyers message you directly — so every shilling of your margin stays with you. Setting up takes an afternoon:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Create your shop.** Sign up free, add a clear profile photo and a shop name buyers will remember.",
            "**Post at least 10 items.** A shop with many listings looks established and gets found more. [Shopi Agent](/shopi-agent) drafts the title, category and details from one photo.",
            "**Got a whole supplier's catalogue?** On a computer, bulk upload up to 500 items from an Excel sheet and add photos once.",
            "**Share your shop link** on your WhatsApp status and in your groups. Post new stock daily so there's always something fresh.",
            "**Get verified once you register your business.** Shops with a county business permit can apply for the blue tick from their [profile](/profile/verification). It's free for now.",
          ],
        },
        {
          type: "p",
          text: "Want help on the side? Our guide to [online selling jobs in Kenya](/online-selling-jobs-kenya) covers other ways to earn from your phone, and [Invite & earn](/blog/refer-and-earn-in-kenya) pays KSh 200 on M-Pesa for every seller you bring who posts 5 listings — your suppliers count.",
        },
      ],
    },
    {
      id: "mistakes",
      heading: "Mistakes that cost new resellers",
      blocks: [
        {
          type: "list",
          items: [
            "**Promising stock you haven't confirmed.** One cancelled order can lose a buyer for good.",
            "**Paying a supplier you've never met.** See the stock, then pay.",
            "**Posting three items and waiting.** Buyers find shops with many listings; post your supplier's whole range.",
            "**Slow replies.** The first seller to answer usually gets the sale. Turn on notifications.",
            "**Competing on price alone.** Fast delivery, honest photos and good answers win buyers too.",
            "**Mixing money.** Keep supplier money separate from profit, or you'll never know what you earned.",
          ],
        },
        {
          type: "p",
          text: "Start small, learn what people near you buy, and grow from profit — never from a loan. Before you meet any buyer, read the [safety centre](/safety-centre) for safe meet-ups and how to spot fake payment messages.",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Is dropshipping legal in Kenya?",
      a: "Yes. Reselling goods is legal as long as they are genuine and not prohibited. Once you trade regularly, register your business and get a county single business permit, like any other trader.",
    },
    {
      q: "How much money do I need to start dropshipping in Kenya?",
      a: "Very little. Because you collect from your supplier only when a buyer is ready, you mainly need data, fare and a phone that takes clear photos. Some suppliers release an item only after you pay, so keep a small float.",
    },
    {
      q: "Can I post items I don't have yet?",
      a: "Only if you can actually get them and the photos show the real item — for example, a supplier's stock you photographed yourself. Photos copied from the internet break Shopi's community guidelines and can get your listings removed.",
    },
    {
      q: "How much can I make from reselling?",
      a: "It depends on your margin and how many items you sell. At KSh 1,000 profit a sale, 100 sales a month is KSh 100,000 — but most people start well below that and grow as their shop gets repeat buyers.",
    },
    {
      q: "Does Shopi charge resellers?",
      a: "No. Posting on Shopi is free and Shopi takes no commission, so your whole margin is yours.",
    },
  ],
  marketplaceLinks: [
    { kind: "hub", path: "/sell-in-kenya" },
    { kind: "page", path: "/online-selling-jobs-kenya", label: "Online selling jobs in Kenya" },
    { kind: "forSale", slug: "phones" },
    { kind: "forSale", slug: "furniture" },
  ],
  related: [
    "how-to-make-money-online-in-kenya-without-investment",
    "refer-and-earn-in-kenya",
    "how-to-sell-on-shopi-complete-guide-for-kenyan-sellers",
  ],
  cta: {
    label: "Open your shop free",
    to: { kind: "page", path: "/upload", label: "Post your first item" },
    text: "Post your supplier's first item in minutes. Free to post, no commission.",
  },
};
