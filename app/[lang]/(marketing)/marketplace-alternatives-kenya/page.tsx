import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale } from "@/i18n/config";
import { canonicalUrl, publicPageMetadata } from "@/lib/metadata";
import {
  OLX_KENYA,
  getPlatform,
  marketplacePlatforms,
} from "@/lib/seo/marketplace-platforms";
import { whereToSellPages, whereToSellPath } from "@/lib/seo/where-to-sell";
import {
  breadcrumbSchema,
  faqSchema,
  jsonLd,
  marketplaceSchema,
} from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string }> };

const PATH = "/marketplace-alternatives-kenya";
// The URL predates this page's current job. It's kept because links, the
// sitemap and any ranking it has point here; the title and H1 carry the
// queries. Bump UPDATED when the facts are re-checked.
const UPDATED = "2026-11-04";

// "best online marketplace in kenya" is the biggest single query; "best online
// selling sites / platforms / websites / apps in kenya" together are broader
// (Google autocomplete, gl=ke, 4 Nov 2026 — docs/seo-audit/keyword-map.md).
const TITLE = "Best Online Selling Sites & Marketplaces in Kenya (2026)";
const DESCRIPTION =
  "Best online selling sites in Kenya compared: Jiji, PigiaMe, Facebook Marketplace, Jumia, Kilimall and Shopi. Free ads, fees, payment and who each suits.";

const QUICK_PICKS = [
  {
    need: "Free, with no commission, selling to people nearby with photos or video",
    pick: "Shopi",
  },
  {
    need: "A long-established classifieds site, especially for cars, property and jobs",
    pick: "Jiji",
  },
  { need: "Classic classifieds with a free ad and optional upgrades", pick: "PigiaMe" },
  { need: "Selling to people in your area or your Facebook network", pick: "Facebook Marketplace" },
  { need: "New stock in volume, with delivery and payment handled for you", pick: "Jumia or Kilimall" },
  { need: "Cheap items to people who already know you", pick: "WhatsApp groups and Status" },
];

const FAQ = [
  {
    q: "What is the best online marketplace in Kenya?",
    a: "There isn't one best site for everything. Jiji is one of Kenya's best-known classifieds sites; Facebook Marketplace reaches people around you; Jumia and Kilimall handle delivery for new stock but charge sellers; and Shopi is free with no commission, built around a local feed of photo and video posts. Many sellers list on two or three at once.",
  },
  {
    q: "What are the best online selling sites in Kenya?",
    a: "For second-hand and everyday items: Shopi, Jiji, PigiaMe and Facebook Marketplace, which all let you post free and take no cut of a deal you arrange directly. For new products with delivery handled for you: Jumia and Kilimall.",
  },
  {
    q: "What is the best app to sell things in Kenya?",
    a: "Jiji, PigiaMe, Facebook (Marketplace), Jumia and Kilimall all have apps. Shopi runs in your phone's browser at shopi.co.ke, so there's nothing to download, and it's free to post with no commission.",
  },
  {
    q: "Which sites let me post free ads in Kenya?",
    a: "Shopi, PigiaMe and Facebook Marketplace let you post free. Jiji is free up to a limit of ads in each category, after which you need a paid package. WhatsApp groups and Status are free but only reach your contacts.",
  },
  {
    q: "Which online marketplace in Kenya has no commission?",
    a: "Shopi, Jiji, PigiaMe and Facebook Marketplace don't take a cut of a sale you arrange directly with the buyer. Shopi also has no listing fees or paid tier today. Online stores such as Jumia charge sellers a commission on each sale.",
  },
  {
    q: "Is Jiji free to sell on?",
    a: "Yes, up to a point. Jiji lets you post a number of free ads in each category; once you reach that limit, you need a Premium Package to post more. Paid TOP and Boost packages also lift ads higher in search results.",
  },
  {
    q: "Is Facebook Marketplace available in Kenya?",
    a: "Yes. Meta began rolling Facebook Marketplace out in Kenya in 2020, and it has local pages for places such as Nairobi. Local listings are free to post, and buyer and seller arrange payment and pickup between themselves.",
  },
  {
    q: "What happened to OLX Kenya?",
    a: "OLX closed its Kenya office in 2018, and in 2019 its owner Naspers agreed to sell OLX's Kenyan classifieds business to Jiji. Today olx.co.ke redirects to OLX's global site. To buy and sell second-hand in Kenya now, use Jiji, PigiaMe, Facebook Marketplace or Shopi.",
  },
  {
    q: "Can I sell on more than one site at the same time?",
    a: "Yes, and it's the most reliable way to reach more buyers. Post the same item on two or three sites, and take it down everywhere as soon as it sells.",
  },
  {
    q: "Do I need a business to sell online in Kenya?",
    a: "Not for classifieds. Shopi, Jiji, PigiaMe and Facebook Marketplace only need an account. Jumia's seller registration asks for KYC documents (a National ID, or business registration for companies) and bank details.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    ...publicPageMetadata({ lang, path: PATH, title: TITLE, description: DESCRIPTION }),
    keywords: [
      "best online marketplace in Kenya",
      "best online selling sites in Kenya",
      "best selling platform in Kenya",
      "best selling apps in Kenya",
      "free ads sites in Kenya",
      "free classifieds Kenya",
      "apps like Jiji",
      "apps like Jumia in Kenya",
      "is Facebook Marketplace available in Kenya",
      "OLX Kenya",
    ],
  };
}

function SourceLine({ sources, checkedOn }: { sources: { label: string; url: string }[]; checkedOn: string }) {
  if (sources.length === 0) return null;
  const checked = new Date(checkedOn).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <p className="mt-3 text-xs leading-normal text-muted">
      Checked <time dateTime={checkedOn}>{checked}</time>:{" "}
      {sources.map((source, i) => (
        <span key={source.url}>
          {i > 0 && " · "}
          <a href={source.url} target="_blank" rel="nofollow noopener noreferrer" className="underline">
            {source.label}
          </a>
        </span>
      ))}
    </p>
  );
}

const H2 =
  "mb-4 font-display text-[1.35rem] font-bold leading-tight text-foreground md:text-[1.6rem]";
const BODY = "text-[0.95rem] leading-[1.7] text-muted md:text-[0.98rem]";

export default async function BestSellingSitesPage({ params }: Props) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const canonical = canonicalUrl(lang, PATH);
  const updatedLabel = new Date(UPDATED).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const jiji = getPlatform("jiji");

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "en-KE",
    dateModified: UPDATED,
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    about: { "@id": `${canonical}#platforms` },
  };

  // Unordered on purpose: the page compares, it doesn't rank. Named as
  // distinct organisations so engines don't blend the brands together.
  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${canonical}#platforms`,
    name: "Online selling sites and marketplaces in Kenya",
    itemListOrder: "https://schema.org/ItemListUnordered",
    numberOfItems: marketplacePlatforms.filter((p) => p.url).length,
    itemListElement: marketplacePlatforms
      .filter((platform) => platform.url)
      .map((platform, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Organization",
          name: platform.name,
          url: platform.url,
          description: platform.summary,
        },
      })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            webPageSchema,
            listSchema,
            marketplaceSchema,
            breadcrumbSchema([
              { name: "Home", url: canonicalUrl(lang, "") },
              { name: "Best online selling sites in Kenya", url: canonical },
            ]),
            faqSchema(FAQ),
          ),
        }}
      />

      <LegalNav lang={lang} />

      <main className="px-4 pt-20 pb-16 md:px-5">
        <div className="mx-auto max-w-190">
          <p className="mb-3 text-[0.78rem] font-bold tracking-widest text-primary uppercase">
            Where to sell online in Kenya
          </p>
          <h1 className="mb-4 font-display text-[clamp(1.85rem,5vw,3rem)] leading-[1.1] font-bold tracking-[-0.03em] text-foreground">
            The best online selling sites and marketplaces in Kenya, compared
          </h1>
          {/* Answer-first: the paragraph an answer engine can quote whole. */}
          <p className="mb-4 max-w-176 text-[1rem] leading-[1.7] text-muted md:text-[1.1rem]">
            The best place to sell online in Kenya depends on what you&apos;re selling. For
            second-hand and everyday items, the main options are Jiji, PigiaMe, Facebook
            Marketplace and Shopi: all let you post free, and none takes a cut of a sale you
            arrange directly with the buyer. For new stock you want delivered for you, Jumia and
            Kilimall run online stores with their own checkout and seller terms, and Jumia charges
            a commission on each sale.
          </p>
          <p className="mb-8 max-w-176 text-xs leading-normal text-muted">
            Updated <time dateTime={UPDATED}>{updatedLabel}</time>. Shopi publishes this page.
            Everything about the other sites comes from their own pages, linked under each entry,
            and we say where another site suits you better.
          </p>

          {/* ── Quick answer ───────────────────────────────────────── */}
          <section id="quick-answer" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Which site for what: the quick answer</h2>
            <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {QUICK_PICKS.map(({ need, pick }) => (
                <div key={pick} className="flex flex-col gap-0.5 bg-elevated px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="text-[0.92rem] leading-snug text-muted sm:flex-1">{need}</dt>
                  <dd className="text-[0.98rem] font-semibold text-foreground sm:w-48 sm:shrink-0 sm:text-right">
                    {pick}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ── The table answer engines and skimmers both want ──────── */}
          <section id="comparison" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Online selling sites in Kenya side by side</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-180 border-collapse text-left text-[0.88rem]">
                <caption className="sr-only">
                  Comparison of online selling sites in Kenya: cost to post, commission, payment
                  and what each suits
                </caption>
                <thead className="bg-elevated">
                  <tr>
                    {["Site", "Free to post?", "Takes a cut of sales?", "Payment", "Best for"].map(
                      (cell) => (
                        <th key={cell} scope="col" className="border-b border-border px-3 py-2.5 font-semibold text-foreground">
                          {cell}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {marketplacePlatforms.map((platform) => (
                    <tr key={platform.id} className="border-b border-border align-top last:border-b-0">
                      <th scope="row" className="px-3 py-2.5 font-semibold text-foreground">
                        <a href={`#${platform.id}`} className="no-underline">
                          {platform.name}
                        </a>
                      </th>
                      <td className="px-3 py-2.5 text-muted">{platform.freeToPost}</td>
                      <td className="px-3 py-2.5 text-muted">{platform.takesCut}</td>
                      <td className="px-3 py-2.5 text-muted">{platform.payment}</td>
                      <td className="px-3 py-2.5 text-muted">{platform.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Each platform, with sources ─────────────────────────── */}
          <section id="platforms" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Each site in detail</h2>
            <div className="flex flex-col gap-4">
              {marketplacePlatforms.map((platform) => (
                <article
                  key={platform.id}
                  id={platform.id}
                  className="scroll-mt-24 rounded-2xl border border-border bg-elevated p-5"
                >
                  <h3 className="font-display text-[1.15rem] font-bold text-foreground">
                    {platform.name}
                  </h3>
                  <p className="mb-3 text-xs font-semibold tracking-wide text-primary uppercase">
                    {platform.type}
                  </p>
                  <p className={`mb-4 ${BODY}`}>{platform.summary}</p>
                  <dl className="grid gap-x-6 gap-y-3 text-[0.92rem] sm:grid-cols-2">
                    {[
                      ["Free to post", platform.freeToPost],
                      ["Takes a cut", platform.takesCut],
                      ["Payment", platform.payment],
                      ["Delivery", platform.delivery],
                      ["What you need", platform.sellerNeeds],
                      ["Best for", platform.bestFor],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="font-semibold text-foreground">{label}</dt>
                        <dd className="leading-[1.6] text-muted">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-[0.92rem] leading-[1.6] text-muted">
                    <span className="font-semibold text-foreground">Watch out: </span>
                    {platform.watchOut}
                  </p>
                  {platform.id === "jiji" ? (
                    <p className="mt-3 text-[0.92rem]">
                      <Link href={`/${lang}/blog/how-to-sell-on-jiji-kenya`} className="text-primary underline">
                        How to sell on Jiji, step by step
                      </Link>
                    </p>
                  ) : null}
                  <SourceLine sources={platform.sources} checkedOn={platform.checkedOn} />
                </article>
              ))}
            </div>
          </section>

          {/* ── "free ads sites in kenya" ───────────────────────────── */}
          <section id="free-ads" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Free classified ads sites in Kenya</h2>
            <p className={`mb-4 ${BODY}`}>
              If you want to post an ad without paying anything, these are your options:
            </p>
            <ul className={`flex flex-col gap-2.5 pl-5 ${BODY} [&>li]:list-disc`}>
              <li>
                <strong className="text-foreground">Shopi</strong>: free listings with no cap per
                category, no paid tier and no commission.
              </li>
              <li>
                <strong className="text-foreground">PigiaMe</strong>: free ads, with paid Premium
                Ads and a Gold upgrade if you want more visibility.
              </li>
              <li>
                <strong className="text-foreground">Facebook Marketplace</strong>: free local
                listings for anyone with a Facebook account.
              </li>
              <li>
                <strong className="text-foreground">Jiji</strong>: free up to a limit of ads in
                each category, then a paid package to post more.
              </li>
              <li>
                <strong className="text-foreground">WhatsApp groups and Status</strong>: free, but
                only your contacts and group members see it.
              </li>
            </ul>
          </section>

          {/* ── "apps like jiji" / "apps like jumia" ────────────────── */}
          <section id="apps-like-jiji" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Apps and sites like Jiji in Kenya</h2>
            <p className={`mb-4 ${BODY}`}>
              The closest alternatives to Jiji for buying and selling second-hand are PigiaMe (a
              classifieds site with free ads), Facebook Marketplace (local listings inside
              Facebook) and Shopi (a free local marketplace with photo and video posts and no
              commission). Plenty of sellers keep their Jiji ads and post on one of these too.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/${lang}/jiji-alternative-kenya`} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground no-underline">
                Jiji alternative in Kenya
              </Link>
              <Link href={`/${lang}/pigiame-alternative-kenya`} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground no-underline">
                PigiaMe alternative in Kenya
              </Link>
            </div>
          </section>

          <section id="apps-like-jumia" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Apps and sites like Jumia in Kenya</h2>
            <p className={BODY}>
              Kilimall is the closest match to Jumia: an online store with its own checkout and
              delivery, selling new products from many sellers. If you&apos;d rather buy from
              people near you, often second-hand and at a price you can negotiate, the classifieds
              sites (Jiji, PigiaMe, Facebook Marketplace and Shopi) work differently: you message
              the seller, inspect the item and pay them directly.
            </p>
          </section>

          {/* ── "is facebook marketplace available in kenya" ─────────── */}
          <section id="facebook-marketplace-kenya" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Is Facebook Marketplace available in Kenya?</h2>
            <p className={BODY}>
              Yes. Meta began rolling Facebook Marketplace out in Kenya in 2020, and today it has
              local pages for places such as Nairobi. Anyone with a Facebook account can post a
              local listing free; buyers message you on Messenger, and you agree payment and
              pickup between you. It works best for furniture and household items sold to people
              nearby.
            </p>
            <SourceLine
              sources={getPlatform("facebook-marketplace").sources}
              checkedOn={getPlatform("facebook-marketplace").checkedOn}
            />
          </section>

          {/* ── "olx kenya" ─────────────────────────────────────────── */}
          <section id="olx-kenya" className="mb-12 scroll-mt-24">
            <h2 className={H2}>What happened to OLX Kenya?</h2>
            <ul className={`mb-4 flex flex-col gap-2.5 pl-5 ${BODY} [&>li]:list-disc`}>
              {OLX_KENYA.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
            <p className={BODY}>
              <Link href={`/${lang}/olx-kenya-alternative`} className="text-primary underline">
                Where to buy and sell now that OLX Kenya is gone
              </Link>
            </p>
            <SourceLine sources={OLX_KENYA.sources} checkedOn={OLX_KENYA.checkedOn} />
          </section>

          {/* ── How to choose ───────────────────────────────────────── */}
          <section id="how-to-choose" className="mb-12 scroll-mt-24">
            <h2 className={H2}>How to choose where to sell</h2>
            <ol className={`flex flex-col gap-2.5 pl-5 ${BODY} [&>li]:list-decimal`}>
              <li>
                <strong className="text-foreground">What does it cost you?</strong> Count listing
                fees, paid promotion and commission. On a second-hand sale a commission comes
                straight out of a thin margin.
              </li>
              <li>
                <strong className="text-foreground">How far will your buyer travel?</strong> A
                sofa sells to someone nearby; a phone or a car is worth a buyer crossing town for,
                so it can go wider.
              </li>
              <li>
                <strong className="text-foreground">Who holds the money?</strong> On classifieds
                sites you&apos;re paid directly, so confirm the payment has really arrived. Online
                stores and Jiji&apos;s Safe Deal collect payment for you, for a fee and under their
                rules.
              </li>
              <li>
                <strong className="text-foreground">Will buyers find it?</strong> Search-led sites
                suit items people look for by name. A feed suits items people buy when they see
                them.
              </li>
            </ol>
          </section>

          {/* ── Where to sell, by item ──────────────────────────────── */}
          <section id="by-item" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Where to sell, item by item</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {whereToSellPages.map((item) => (
                <Link
                  key={item.slug}
                  href={`/${lang}${whereToSellPath(item.slug)}`}
                  className="rounded-lg border border-border bg-elevated p-4 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
                >
                  <span className="block font-semibold text-foreground">{item.h1}</span>
                  <span className="mt-1 block text-[0.88rem] leading-[1.6] text-muted">
                    {item.cardLine}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* ── FAQ ─────────────────────────────────────────────────── */}
          <section id="faq" className="mb-12 scroll-mt-24">
            <h2 className={H2}>Common questions</h2>
            <div className="flex flex-col gap-6">
              {FAQ.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="mb-1.5 font-semibold text-foreground">{q}</h3>
                  <p className={BODY}>{a}</p>
                </div>
              ))}
            </div>
            <SourceLine sources={jiji.sources.slice(0, 2)} checkedOn={jiji.checkedOn} />
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${lang}/upload`}
              className="rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-white no-underline"
            >
              Post an item on Shopi, free
            </Link>
            <Link
              href={`/${lang}/explore`}
              className="rounded-full border border-border px-6 py-3 text-center text-sm font-semibold text-foreground no-underline"
            >
              See what&apos;s for sale near you
            </Link>
          </div>
        </div>

        <CategoryCrossLinks lang={lang} currentPath={PATH} />
      </main>

      <LandingFooter dict={dict} lang={lang} />
    </>
  );
}
