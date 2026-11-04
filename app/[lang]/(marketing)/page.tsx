import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Car,
  Check,
  Compass,
  FileSpreadsheet,
  Handshake,
  Lock,
  MessageCircle,
  Package,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { notFound } from "next/navigation";
import { isValidLocale, locales, type Locale } from "@/i18n/config";
import { siteConfig } from "@/config/site";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { HomepageSupportChat } from "@/components/landing/HomepageSupportChat";
import { HomeCategories } from "@/components/landing/HomeCategories";
import { HomeListings, type HomeListing } from "@/components/landing/HomeListings";
import { SellersIllustration } from "@/components/landing/SellersIllustration";
import { TrackedHomepageLink } from "@/components/analytics/TrackedHomepageLink";
import { fetchBrowseCards } from "@/features/discover/queries/browse.server";
import {
  countLabel,
  fetchMarketplaceCounts,
} from "@/features/social-proof/queries/marketplaceCounts";
import { VerifiedTick } from "@/components/verification/VerifiedTick";
import { VerifiedIdBadge } from "@/components/verification/VerifiedIdBadge";
import { contentPath } from "@/lib/content-url";
import { stableListingThumb } from "@/lib/listingImage";
import { CAR_PRICE_FLOOR } from "@/lib/seo/search-intent-pages";
import { isPlaceholderListingTitle } from "@/lib/seo/where-to-sell";
import {
  organizationSchema,
  websiteSchema,
  marketplaceSchema,
  faqSchema,
  jsonLd,
  listingItemListSchema,
} from "@/lib/structured-data";

/**
 * Homepage copy, English and Kiswahili (the homepage is one of the two
 * translated pages — TRANSLATED_PATHS in lib/metadata.ts).
 *
 * Written for people reading on a phone, often in their second language:
 * short sentences, everyday words, one idea per line. ~94% of visitors are on
 * phones, so every section is checked at 390px first.
 *
 * Search: the homepage owns the brand and the broad "online marketplace in
 * Kenya" / "free marketplace" searches; "buy and sell in Kenya" belongs to
 * /buy-and-sell-in-kenya and "sell online in Kenya" to /sell-in-kenya, so the
 * title leads with the brand rather than repeating their head terms
 * (docs/seo-audit/keyword-map.md). The H1 and the H2s carry the plain words
 * people search with: free, marketplace, Kenya, buy, sell, near you.
 */
const COPY = {
  en: {
    title: "Shopi — Kenya's Free Online Marketplace | Buy & Sell Near You",
    description:
      "Buy and sell near you on Shopi, Kenya's free online marketplace. Phones, cars, furniture, fashion and more. Free to post, no commission.",
    heroTitle: "Kenya's free marketplace. Buy and sell near you.",
    heroBody:
      "Find phones, cars, furniture and more from people near you, or sell yours free. No commission.",
    heroBrowse: "Browse For You",
    heroSell: "Sell an item",
    trust: ["Free to post", "No commission", "Chat directly"],
    categoriesTitle: "Browse by category",
    categories: {
      phones: "Phones",
      electronics: "Electronics",
      fashion: "Fashion",
      furniture: "Furniture",
      cars: "Cars",
      beauty: "Beauty",
      appliances: "Appliances",
      more: "See all",
    },
    listings: {
      // Short enough to sit on one line beside "See all" on a 360px phone.
      title: "See what's for sale",
      all: "See all",
      more: "See more on For You",
      priceOnRequest: "Price on request",
    },
    howTitle: "How Shopi works",
    howSteps: [
      {
        title: "Find it or post it",
        body: "Browse items near you, or post yours with one photo.",
      },
      {
        title: "Chat with the seller",
        body: "Ask questions and agree on a price, right in the app.",
      },
      {
        title: "Meet and pay directly",
        body: "Check the item, then pay the seller. Shopi takes no cut.",
      },
    ],
    howSafety: "Stay safe: meet in public and check the item before you pay.",
    howSafetyLink: "Safety tips",
    hookEyebrow: "Free guide · 3-minute read",
    hookTitle: "How Kenyans earn online in 2026, with zero stock.",
    hookBody: "No shop. No capital. Just your phone and one simple method.",
    hookLink: "See the method",
    hookCard: "The method",
    hookSteps: ["Post a product", "Keep the profit"],
    hookHidden: "Step 2 is in the guide",
    hookImageAlt: "A hand holding a smartphone",
    sellersTitle: "Kenyans already sell on Shopi.",
    sellersStat: "sellers",
    listingsStat: "live listings",
    sellersBody: "Phones, fashion, furniture, cars and more. Free to join.",
    sellersCta: "Join them free",
    sellersLink: "See their shops",
    pathsTitle: "How do you want to sell?",
    pathsBadge: "Recommended",
    paths: [
      {
        key: "own",
        title: "Sell what you own",
        body: "Old phone, sofa, clothes. Turn them into cash.",
        cta: "Sell an item",
      },
      {
        key: "resell",
        title: "Resell for profit",
        body: "Sell a supplier's stock. Keep the margin. No capital.",
        cta: "Open your shop free",
      },
      {
        key: "verified",
        title: "Run a verified shop",
        body: "Registered business? Get the blue tick.",
        cta: "Get verified",
      },
    ],
    carsEyebrow: "For car sellers",
    carsSectionTitle: "Selling a car? Reach buyers across Kenya.",
    carsTitle: "Sell your car in Kenya",
    carsBody:
      "Post your car free with clear photos, the year, mileage and price. Buyers contact you directly. No broker, no commission.",
    carsBrowse: "See cars for sale",
    carsSell: "Post your car free",
    carExamplesLabel: "Selling one of these?",
    agentTitle: "One photo. Shopi helps with the rest.",
    agentBody:
      "Snap a photo and Shopi Agent writes your listing and suggests a price. Buyers can simply describe what they want.",
    agentLink: "More about Shopi Agent",
    agentImageAlt: "A phone listed for sale on Shopi",
    bulkEyebrowDesktop: "New: AI bulk upload",
    bulkEyebrowMobile: "New: AI bulk upload",
    bulkTitle: "Bulk upload from Excel.",
    bulkBodyDesktop:
      "Type title and price. Shopi Agent adds category and specs from your photos. Check, then publish. Free.",
    bulkBodyMobile:
      "Type title and price. Shopi Agent adds the rest. Works on a computer.",
    bulkCta: "Open bulk upload",
    bulkPreview: "Bulk upload preview",
    verifiedEyebrow: "Verified shops",
    verifiedTitle: "The blue tick is free. For now.",
    verifiedBody: "Only registered businesses qualify. Buyers see it on every listing.",
    verifiedCta: "Get your blue tick",
    verifiedShop: "Your shop",
    verifiedHandle: "@yourshop",
    verifiedChecks: ["Business permit", "Shop photo", "Shop location"],
    faqTitle: "Questions about Shopi",
    faq: [
      {
        q: "What is Shopi?",
        a: "Shopi is a free online marketplace in Kenya. You buy and sell phones, cars, furniture, fashion and more with people near you, and chat with them directly.",
      },
      {
        q: "Is it free to sell on Shopi?",
        a: "Yes. Posting is free, and Shopi takes no commission when you sell.",
      },
      {
        q: "How do I buy something on Shopi?",
        a: "Find the item, message the seller on Shopi, then meet, check it and pay the seller directly. Shopi doesn't handle payments.",
      },
      {
        q: "How do I stay safe?",
        a: "Meet in a busy public place, check the item before you pay, and keep the chat on Shopi. Never send money for something you haven't seen.",
      },
      {
        q: "Do I need an account?",
        a: "Not to browse. To post or chat, sign in free with Google, Apple or email.",
      },
      {
        q: "Is Shopi like Jiji?",
        a: "Shopi is a free Kenyan marketplace like Jiji, built around photo and video posts from people near you. Posting is free with no commission, and you can list on both.",
      },
      {
        q: "Can I upload many listings at once?",
        a: "Yes. On a computer, add up to 500 items to our Excel template, upload it and add photos. Shopi Agent fills in the category and specs. You check, then publish.",
      },
    ],
    closingTitle: "Ready to start?",
    closingBody: "Find a good deal near you, or sell something today. It's free.",
  },
  sw: {
    title: "Shopi — Soko la Bure la Mtandaoni Kenya | Nunua na Uza",
    description:
      "Nunua na uza karibu nawe kwenye Shopi, soko la bure la mtandaoni Kenya. Simu, magari, fanicha, mavazi na zaidi. Weka tangazo bure, bila kamisheni.",
    heroTitle: "Soko la bure Kenya. Nunua na uza karibu nawe.",
    heroBody:
      "Pata simu, magari, fanicha na zaidi kutoka kwa watu wa karibu nawe, au uza zako bure. Hakuna kamisheni.",
    heroBrowse: "Angalia For You",
    heroSell: "Uza bidhaa",
    trust: ["Kuweka tangazo ni bure", "Hakuna kamisheni", "Ongea moja kwa moja"],
    categoriesTitle: "Vinjari kwa kategoria",
    categories: {
      phones: "Simu",
      electronics: "Elektroniki",
      fashion: "Mavazi",
      furniture: "Fanicha",
      cars: "Magari",
      beauty: "Urembo",
      appliances: "Vifaa vya nyumbani",
      more: "Ona zote",
    },
    listings: {
      title: "Ona vinavyouzwa",
      all: "Ona zote",
      more: "Ona zaidi kwenye For You",
      priceOnRequest: "Uliza bei",
    },
    howTitle: "Shopi inavyofanya kazi",
    howSteps: [
      {
        title: "Tafuta au weka tangazo",
        body: "Angalia bidhaa za karibu nawe, au weka yako kwa picha moja.",
      },
      {
        title: "Ongea na muuzaji",
        body: "Uliza maswali na mkubaliane bei, hapo hapo kwenye Shopi.",
      },
      {
        title: "Kutana na ulipe moja kwa moja",
        body: "Kagua bidhaa, kisha mlipe muuzaji. Shopi haichukui chochote.",
      },
    ],
    howSafety: "Kuwa salama: kutana mahali pa wazi na kagua bidhaa kabla ya kulipa.",
    howSafetyLink: "Vidokezo vya usalama",
    hookEyebrow: "Mwongozo wa bure · dakika 3",
    hookTitle: "Jinsi Wakenya wanavyopata pesa mtandaoni 2026, bila stoki.",
    hookBody: "Bila duka. Bila mtaji. Simu yako na mbinu moja rahisi tu.",
    hookLink: "Ona mbinu",
    hookCard: "Mbinu",
    hookSteps: ["Weka bidhaa", "Baki na faida"],
    hookHidden: "Hatua ya 2 iko kwenye mwongozo",
    hookImageAlt: "Mkono ulioshika simu janja",
    sellersTitle: "Wakenya tayari wanauza kwenye Shopi.",
    sellersStat: "wauzaji",
    listingsStat: "matangazo hai",
    sellersBody: "Simu, mavazi, fanicha, magari na zaidi. Kujiunga ni bure.",
    sellersCta: "Jiunge nao bure",
    sellersLink: "Ona maduka yao",
    pathsTitle: "Unataka kuuza vipi?",
    pathsBadge: "Inapendekezwa",
    paths: [
      {
        key: "own",
        title: "Uza vitu vyako",
        body: "Simu, sofa, nguo za zamani. Zigeuze kuwa pesa.",
        cta: "Uza bidhaa",
      },
      {
        key: "resell",
        title: "Uza upate faida",
        body: "Uza stoki ya msambazaji. Baki na faida. Bila mtaji.",
        cta: "Fungua duka lako bure",
      },
      {
        key: "verified",
        title: "Duka lililothibitishwa",
        body: "Una biashara iliyosajiliwa? Pata tiki ya bluu.",
        cta: "Thibitisha duka",
      },
    ],
    carsEyebrow: "Kwa wauzaji wa magari",
    carsSectionTitle: "Unauza gari? Wafikie wanunuzi kote Kenya.",
    carsTitle: "Uza gari lako Kenya",
    carsBody:
      "Tangaza gari lako bure kwa picha wazi, mwaka, kilomita na bei. Wanunuzi wanakufikia moja kwa moja. Bila dalali, bila kamisheni.",
    carsBrowse: "Angalia magari yanayouzwa",
    carsSell: "Tangaza gari lako bure",
    carExamplesLabel: "Unauza mojawapo ya haya?",
    agentTitle: "Picha moja. Shopi itakusaidia na mengine.",
    agentBody:
      "Piga picha na Shopi Agent itaandika tangazo lako na kupendekeza bei. Wanunuzi wanaweza kueleza tu wanachotaka.",
    agentLink: "Zaidi kuhusu Shopi Agent",
    agentImageAlt: "Simu inayouzwa kwenye Shopi",
    bulkEyebrowDesktop: "Mpya: upakiaji wa bidhaa nyingi kwa AI",
    bulkEyebrowMobile: "Mpya: upakiaji wa bidhaa nyingi kwa AI",
    bulkTitle: "Pakia bidhaa nyingi kutoka Excel.",
    bulkBodyDesktop:
      "Andika jina na bei. Shopi Agent itaongeza kategoria na sifa kutoka picha zako. Kagua, kisha chapisha. Bure.",
    bulkBodyMobile:
      "Andika jina na bei. Shopi Agent itamalizia. Inapatikana kwenye kompyuta.",
    bulkCta: "Fungua upakiaji wa matangazo mengi",
    bulkPreview: "Muonekano wa upakiaji wa bidhaa nyingi",
    verifiedEyebrow: "Maduka yaliyothibitishwa",
    verifiedTitle: "Tiki ya bluu ni bure. Kwa sasa.",
    verifiedBody:
      "Ni kwa biashara zilizosajiliwa tu. Wanunuzi huiona kwenye kila tangazo.",
    verifiedCta: "Pata tiki ya bluu",
    verifiedShop: "Duka lako",
    verifiedHandle: "@dukalako",
    verifiedChecks: ["Leseni ya biashara", "Picha ya duka", "Mahali duka lilipo"],
    faqTitle: "Maswali kuhusu Shopi",
    faq: [
      {
        q: "Shopi ni nini?",
        a: "Shopi ni soko la bure la mtandaoni Kenya. Unanunua na kuuza simu, magari, fanicha, mavazi na zaidi na watu wa karibu nawe, na mnaongea moja kwa moja.",
      },
      {
        q: "Je, kuuza kwenye Shopi ni bure?",
        a: "Ndiyo. Kuweka tangazo ni bure, na Shopi haichukui kamisheni ukiuza.",
      },
      {
        q: "Nanunuaje kitu kwenye Shopi?",
        a: "Tafuta bidhaa, mtumie muuzaji ujumbe kwenye Shopi, kisha kutana naye, kagua bidhaa na umlipe moja kwa moja. Shopi haishughulikii malipo.",
      },
      {
        q: "Nitakuwaje salama?",
        a: "Kutaneni mahali penye watu wengi, kagua bidhaa kabla ya kulipa, na ongeeni kupitia Shopi. Usitume pesa kwa kitu ambacho hujakiona.",
      },
      {
        q: "Je, ninahitaji akaunti?",
        a: "Si ili kuangalia bidhaa. Ili kuweka tangazo au kuongea na muuzaji, ingia bure kwa Google, Apple au barua pepe.",
      },
      {
        q: "Je, Shopi ni kama Jiji?",
        a: "Shopi ni soko la bure la Kenya kama Jiji, lakini bidhaa zinaonyeshwa kwa picha na video za watu wa karibu nawe. Kuweka tangazo ni bure, bila kamisheni, na unaweza kutangaza kwenye zote mbili.",
      },
      {
        q: "Je, naweza kupakia matangazo mengi kwa mara moja?",
        a: "Ndiyo. Kwenye kompyuta, weka hadi bidhaa 500 kwenye kiolezo cha Excel, kipakie na uongeze picha. Shopi Agent itajaza kategoria na sifa. Kagua, kisha chapisha.",
      },
    ],
    closingTitle: "Uko tayari kuanza?",
    closingBody: "Pata bei nzuri karibu nawe, au uza kitu leo. Ni bure.",
  },
} as const;

/** Car models with their own "sell my …" pages, linked from the car section. */
const CAR_MODELS = [
  { label: "Toyota Vitz", slug: "toyota-vitz" },
  { label: "Toyota Probox", slug: "probox" },
  { label: "Toyota Fielder", slug: "toyota-fielder" },
  { label: "Toyota Premio", slug: "toyota-premio" },
] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isValidLocale(lang) ? lang : "en";
  const { title, description } = COPY[locale];
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `${siteConfig.url}/${locale}`,
      languages: {
        ...Object.fromEntries(
          locales.map((value) => [value, `${siteConfig.url}/${value}`]),
        ),
        "x-default": `${siteConfig.url}/en`,
      },
    },
    openGraph: {
      type: "website",
      url: `${siteConfig.url}/${locale}`,
      siteName: siteConfig.name,
      title,
      description,
      locale: locale === "sw" ? "sw_KE" : "en_KE",
      images: [`/${locale}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/${locale}/opengraph-image`],
    },
  };
}

// Matches SOCIAL_PROOF_REVALIDATE_SECONDS and the API client's daily default,
// so the listings row and the counts refresh together, once a day.
export const revalidate = 86400;

/** Below these, a figure reads as weak proof rather than strong, so it's left out. */
const MIN_SELLERS_SHOWN = 50;
const MIN_LISTINGS_SHOWN = 100;
/** The listings row: enough to swipe through, few enough to stay light. */
const LISTINGS_SHOWN = 10;

const PATH_ICONS = { own: Package, resell: TrendingUp, verified: BadgeCheck };
const HOW_ICONS = [Search, MessageCircle, Handshake];

/** Car makes and models common in Kenya, for the price sanity check below. */
const CAR_TITLE =
  /\b(toyota|nissan|mazda|subaru|honda|mitsubishi|isuzu|bmw|mercedes|benz|audi|volkswagen|vw|land ?rover|range ?rover|lexus|suzuki|prado|probox|vitz|fielder|premio|harrier|axio|noah|voxy|hiace)\b/i;

/**
 * Listings for the homepage row: real photos only (a stable thumbnail, never
 * an expiring TikTok cover), no test posts or one-word titles, priced ones
 * first. The row is the first thing a new visitor judges Shopi by, so a car
 * "priced" under the car floor is left out: it's nearly always a typo (a BMW
 * X6 at KES 255 for 2.55 million) and reads as a broken site.
 */
function pickHomeListings(
  posts: Awaited<ReturnType<typeof fetchBrowseCards>>,
): HomeListing[] {
  const usable = posts.flatMap((post) => {
    const title = post.title?.trim() ?? "";
    const amount = post.price?.amount ?? 0;
    const thumb = stableListingThumb(post);
    const implausibleCar = CAR_TITLE.test(title) && amount > 0 && amount < CAR_PRICE_FLOOR;
    return thumb &&
      !isPlaceholderListingTitle(title) &&
      title.split(/\s+/).length >= 2 &&
      !implausibleCar
      ? [{ post, thumb }]
      : [];
  });
  const priced = usable.filter(({ post }) => (post.price?.amount ?? 0) > 0);
  const unpriced = usable.filter(({ post }) => !((post.price?.amount ?? 0) > 0));
  return [...priced, ...unpriced].slice(0, LISTINGS_SHOWN);
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const t = COPY[lang];
  const [counts, posts] = await Promise.all([
    fetchMarketplaceCounts(),
    // Best-effort: on failure the row is simply left out.
    fetchBrowseCards({}, 24),
  ]);
  const listings = pickHomeListings(posts);
  const stats = [
    { label: t.sellersStat, value: counts.sellers, min: MIN_SELLERS_SHOWN },
    { label: t.listingsStat, value: counts.listings, min: MIN_LISTINGS_SHOWN },
  ].flatMap(({ label, value, min }) =>
    value !== null && value >= min ? [{ label, value: countLabel(value) }] : [],
  );
  // The section stands on the seller count; listings only add to it.
  const showSocialProof = counts.sellers !== null && counts.sellers >= MIN_SELLERS_SHOWN;

  // Every path ends in an account: guests only see this page (signed-in
  // visitors are redirected by the proxy), and register returns to `from`.
  const pathHrefs = {
    own: `/${lang}/upload`,
    resell: `/${lang}/auth/register?from=${encodeURIComponent(`/${lang}/upload`)}`,
    verified: `/${lang}/profile/verification`,
  };
  const pathButtonIds = { own: "sell_item", resell: "open_shop", verified: "get_verified" };

  const pageUrl = `${siteConfig.url}/${lang}`;
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: t.title,
    description: t.description,
    inLanguage: lang === "sw" ? "sw-KE" : "en-KE",
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    about: { "@id": `${siteConfig.url}/#organization` },
    primaryImageOfPage: `${siteConfig.url}/${lang}/opengraph-image`,
  };

  return (
    <div id="top" className="bg-landing-page text-landing-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            organizationSchema,
            websiteSchema,
            marketplaceSchema,
            webPageSchema,
            // Only the listings the HTML actually shows.
            ...(listings.length
              ? [
                  listingItemListSchema({
                    id: `${pageUrl}#listings`,
                    name: t.listings.title,
                    items: listings.map(({ post }) => ({
                      name: post.title ?? "",
                      url: `${siteConfig.url}${contentPath("en", post)}`,
                    })),
                  }),
                ]
              : []),
            faqSchema([...t.faq]),
          ),
        }}
      />
      <LandingNav lang={lang} />
      <main>
        {/* ── Hero: both jobs, buy and sell, one tap each ───────────── */}
        <section
          id="hero"
          aria-labelledby="home-title"
          className="px-4 pb-4 md:px-8 md:pb-10"
        >
          <div className="relative mx-auto flex min-h-[min(640px,70vh)] max-w-[1500px] items-end overflow-hidden rounded-md bg-[#18282a] md:aspect-[2/1] md:min-h-0 md:items-center">
            <picture className="absolute inset-0 block h-full w-full overflow-hidden">
              <source
                media="(max-width: 767px)"
                type="image/webp"
                srcSet="/assets/hero/marketplace-banner-mobile.webp"
              />
              <Image
                src="/assets/hero/marketplace-banner.webp"
                alt="An illustration of a local seller and buyer reviewing a listing together"
                fill
                sizes="(max-width: 768px) 100vw, 1500px"
                priority
                fetchPriority="high"
                className="absolute h-full w-full object-cover object-[55%_center] md:object-contain"
              />
            </picture>
            {/* Darken the image beneath the text so white copy stays readable. */}
            <div
              className="absolute inset-0 bg-linear-to-t from-black/85 via-black/50 to-black/10 md:bg-linear-to-r md:from-black/45 md:via-black/10 md:to-transparent"
              aria-hidden
            />
            <div className="relative z-10 w-full max-w-7xl px-5 py-8 text-center text-white md:mx-auto md:px-12 md:py-5 md:text-left lg:py-12">
              <h1
                id="home-title"
                className="mx-auto max-w-3xl text-balance font-display text-[1.875rem] font-semibold leading-[1.12] md:mx-0 md:text-[clamp(2rem,4.5vw,4.25rem)]"
              >
                {t.heroTitle}
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-balance text-[0.9375rem] leading-snug text-white/90 md:mx-0 md:mt-4 md:text-base lg:mt-5 lg:text-lg">
                {t.heroBody}
              </p>
              {/* Phones: two full-width buttons, browse first — most people
                  arriving from search came to look. From md: one row. */}
              <div className="mx-auto mt-6 grid w-full max-w-sm gap-3 md:mx-0 md:mt-6 md:flex md:max-w-none md:flex-wrap lg:mt-8">
                <TrackedHomepageLink
                  href={`/${lang}/for-you`}
                  buttonId="browse_for_you"
                  placement="hero"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[0.9375rem] font-semibold text-white no-underline hover:opacity-90"
                >
                  <Compass size={18} aria-hidden />
                  {t.heroBrowse}
                </TrackedHomepageLink>
                <TrackedHomepageLink
                  href={`/${lang}/upload`}
                  buttonId="sell_item"
                  placement="hero"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[0.9375rem] font-semibold text-[#18282a] no-underline hover:bg-white/90"
                >
                  <Plus size={18} aria-hidden />
                  {t.heroSell}
                </TrackedHomepageLink>
              </div>
              <p className="mt-3 text-balance text-[0.8125rem] text-white/80">
                {t.trust.join(" · ")}
              </p>
            </div>
          </div>
        </section>

        {/* ── Straight into the marketplace ────────────────────────── */}
        <HomeCategories lang={lang} title={t.categoriesTitle} labels={t.categories} />
        <HomeListings lang={lang} listings={listings} t={t.listings} />

        {/* ── How it works: three steps, buyers and sellers alike ───── */}
        <section
          id="how-it-works"
          aria-labelledby="how-title"
          className="px-4 py-10 md:px-8 md:py-16"
        >
          <div className="mx-auto max-w-7xl">
            <h2
              id="how-title"
              className="font-display text-[1.75rem] font-semibold leading-tight md:text-[2.75rem]"
            >
              {t.howTitle}
            </h2>
            {/* #features: the footer's "Features" link lands here. */}
            <ol
              id="features"
              className="mt-6 grid list-none gap-3 p-0 md:mt-8 md:grid-cols-3 md:gap-5"
            >
              {t.howSteps.map((step, i) => {
                const Icon = HOW_ICONS[i];
                return (
                  <li
                    key={step.title}
                    className="flex gap-4 rounded-2xl border border-landing-line bg-landing-surface p-4 md:flex-col md:p-6"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-landing-card text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold leading-snug">
                        {i + 1}. {step.title}
                      </h3>
                      <p className="mt-1 text-[0.9375rem] leading-relaxed text-landing-body">
                        {step.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-landing-body">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                {t.howSafety}{" "}
                <Link
                  href={`/${lang}/safety-centre`}
                  className="font-semibold whitespace-nowrap text-primary underline underline-offset-2"
                >
                  {t.howSafetyLink}
                </Link>
              </span>
            </p>
          </div>
        </section>

        {/* Curiosity: the headline raises a question and the method card
            hides its answer (step 2), so the guide is the only way to close
            the gap. Keep the copy short and never reveal the method here. */}
        <section
          id="side-hustle"
          aria-labelledby="side-hustle-title"
          className="bg-landing-surface px-5 py-16 md:px-8 md:py-24"
        >
          <div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-2 md:gap-16">
            <div className="max-w-lg">
              <p className="mb-3 text-sm font-semibold text-primary">
                {t.hookEyebrow}
              </p>
              <h2
                id="side-hustle-title"
                className="font-display text-[2rem] font-semibold leading-tight md:text-[3.25rem]"
              >
                {t.hookTitle}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-landing-body md:text-lg">
                {t.hookBody}
              </p>
              <TrackedHomepageLink
                href={`/${lang}/blog/dropshipping-in-kenya`}
                buttonId="side_hustle_guide"
                placement="curiosity_section"
                className="mt-7 inline-flex items-center gap-2 border-b-2 border-primary pb-1 font-semibold text-landing-ink no-underline"
              >
                {t.hookLink}
                <ArrowUpRight size={18} aria-hidden />
              </TrackedHomepageLink>
            </div>
            <div className="relative aspect-4/3 overflow-hidden rounded-md bg-landing-tint">
              <Image
                src="/assets/blog/budget-phone.jpg"
                alt={t.hookImageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 rounded-xl border border-landing-line bg-landing-card p-4 shadow-lg sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-72">
                <p className="text-xs font-bold uppercase tracking-wide text-landing-muted">
                  {t.hookCard}
                </p>
                <ol className="mt-3 grid list-none gap-2.5 p-0 text-sm font-semibold text-landing-ink">
                  <li className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white" aria-hidden>
                      1
                    </span>
                    {t.hookSteps[0]}
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white" aria-hidden>
                      2
                    </span>
                    {/* Blurred bars, not blurred text: nothing to read or copy. */}
                    <span className="flex flex-1 items-center gap-1.5" aria-hidden>
                      <span className="h-2.5 w-14 rounded-full bg-landing-line-strong/70 blur-[2px]" />
                      <span className="h-2.5 w-20 rounded-full bg-landing-line-strong/70 blur-[2px]" />
                    </span>
                    <Lock className="size-4 shrink-0 text-landing-muted" aria-hidden />
                    <span className="sr-only">{t.hookHidden}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white" aria-hidden>
                      3
                    </span>
                    {t.hookSteps[1]}
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Social proof: live counts of sellers and of listings buyers can
            open, compact and rounded down. Hidden when the API is down or the
            seller count is too small to persuade. */}
        {showSocialProof && (
          <section
            id="sellers"
            aria-labelledby="sellers-title"
            className="border-b border-landing-line px-5 py-16 md:px-8 md:py-24"
          >
            <div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-2 md:gap-16">
              <SellersIllustration className="order-2 md:order-1" />
              <div className="order-1 max-w-lg md:order-2">
                <h2
                  id="sellers-title"
                  className="font-display text-[2rem] font-semibold leading-tight md:text-[3.25rem]"
                >
                  {t.sellersTitle}
                </h2>
                <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 md:mt-8 md:gap-x-14">
                  {stats.map(({ label, value }) => (
                    <div key={label} className="flex flex-col-reverse">
                      <dt className="mt-1 text-sm font-semibold text-landing-body md:text-base">
                        {label}
                      </dt>
                      <dd className="m-0 font-display text-[3rem] font-semibold leading-none text-primary tabular-nums md:text-[4.5rem]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 text-base leading-relaxed text-landing-body md:text-lg">
                  {t.sellersBody}
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
                  <TrackedHomepageLink
                    href={pathHrefs.resell}
                    buttonId="join_sellers"
                    placement="sellers_section"
                    className="inline-flex items-center gap-2 border-b-2 border-primary pb-1 font-semibold text-landing-ink no-underline"
                  >
                    {t.sellersCta}
                    <ArrowUpRight size={18} aria-hidden />
                  </TrackedHomepageLink>
                  <TrackedHomepageLink
                    href={`/${lang}/stores`}
                    buttonId="browse_stores"
                    placement="sellers_section"
                    className="font-semibold text-landing-body underline underline-offset-4"
                  >
                    {t.sellersLink}
                  </TrackedHomepageLink>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Three paths, with the one we most want sellers on highlighted in
            the middle (and first on phones, where there is no middle). */}
        <section
          id="paths"
          aria-labelledby="paths-title"
          className="px-5 py-16 md:px-8 md:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <h2
              id="paths-title"
              className="font-display text-[2rem] font-semibold leading-tight md:text-center md:text-[3.25rem]"
            >
              {t.pathsTitle}
            </h2>
            <ul className="mt-8 grid list-none gap-5 p-0 md:mt-12 md:grid-cols-3 md:items-center md:gap-6">
              {t.paths.map((path) => {
                const featured = path.key === "resell";
                const Icon = PATH_ICONS[path.key];
                return (
                  <li key={path.key} className={featured ? "max-md:order-first" : undefined}>
                    <article
                      className={
                        featured
                          ? "relative rounded-md bg-[#18282a] p-6 text-white shadow-xl md:px-8 md:py-12"
                          : "rounded-md border border-landing-line bg-landing-surface p-6 md:p-8"
                      }
                    >
                      {featured && (
                        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                          {t.pathsBadge}
                        </span>
                      )}
                      <span
                        className={`flex size-11 items-center justify-center rounded-xl ${
                          featured ? "bg-white/10 text-white" : "bg-landing-card text-primary"
                        }`}
                      >
                        <Icon className="size-6" aria-hidden />
                      </span>
                      <h3 className="mt-4 font-display text-xl font-semibold md:text-2xl">
                        {path.title}
                      </h3>
                      <p
                        className={`mt-2 leading-relaxed ${
                          featured ? "text-white/80" : "text-landing-body"
                        }`}
                      >
                        {path.body}
                      </p>
                      <TrackedHomepageLink
                        href={pathHrefs[path.key]}
                        buttonId={pathButtonIds[path.key]}
                        placement="paths_section"
                        className={
                          featured
                            ? "mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white no-underline hover:opacity-90"
                            : "mt-6 inline-flex items-center gap-2 border-b-2 border-primary pb-1 font-semibold text-landing-ink no-underline"
                        }
                      >
                        {path.cta}
                        <ArrowUpRight size={18} aria-hidden />
                      </TrackedHomepageLink>
                    </article>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          id="sell-a-car"
          aria-labelledby="sell-a-car-title"
          className="px-5 py-14 md:px-8 md:py-20"
        >
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {t.carsEyebrow}
            </p>
            <h2
              id="sell-a-car-title"
              className="mt-2 max-w-3xl font-display text-[1.8rem] font-semibold leading-tight md:text-[2.75rem]"
            >
              {t.carsSectionTitle}
            </h2>
            <div className="mt-7 grid gap-5">
              <article className="rounded-md border border-landing-line bg-landing-surface p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-landing-card text-primary">
                    <Car className="size-6" aria-hidden />
                  </span>
                  <h3 className="font-display text-xl font-semibold md:text-2xl">
                    {t.carsTitle}
                  </h3>
                </div>
                <p className="mt-4 max-w-2xl leading-relaxed text-landing-body">
                  {t.carsBody}
                </p>
                <p className="mt-5 text-sm font-semibold text-landing-body">
                  {t.carExamplesLabel}
                </p>
                {/* Each model has a "sell my …" page with live asking prices. */}
                <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
                  {CAR_MODELS.map((model) => (
                    <li key={model.slug}>
                      <Link
                        href={`/${lang}/sell/${model.slug}`}
                        className="inline-flex rounded-full border border-landing-line bg-landing-card px-3 py-1.5 text-sm font-medium text-landing-ink no-underline hover:border-landing-line-strong"
                      >
                        {model.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <TrackedHomepageLink href={`/${lang}/upload`} buttonId="post_car" placement="car_seller_section" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white no-underline">
                    {t.carsSell}<ArrowUpRight size={17} aria-hidden />
                  </TrackedHomepageLink>
                  <TrackedHomepageLink href={`/${lang}/for-sale/cars`} buttonId="browse_cars" placement="car_seller_section" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-landing-line-strong px-5 py-2.5 text-sm font-semibold text-landing-ink no-underline hover:bg-landing-card">
                    {t.carsBrowse}<ArrowUpRight size={17} aria-hidden />
                  </TrackedHomepageLink>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          id="shopi-agent"
          aria-labelledby="shopi-agent-title"
          className="bg-landing-surface px-5 py-16 md:px-8 md:py-24"
        >
          <div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-2 md:gap-16">
            <div className="max-w-lg md:order-1">
              <p className="mb-3 text-sm font-semibold text-primary">
                Shopi Agent
              </p>
              <h2
                id="shopi-agent-title"
                className="font-display text-[2rem] font-semibold leading-tight md:text-[3.25rem]"
              >
                {t.agentTitle}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-landing-body md:text-lg">
                {t.agentBody}
              </p>
              <TrackedHomepageLink
                href={`/${lang}/shopi-agent`}
                buttonId="shopi_agent"
                placement="agent_section"
                className="mt-7 inline-flex items-center gap-2 border-b-2 border-primary pb-1 font-semibold text-landing-ink no-underline"
              >
                {t.agentLink}
                <ArrowUpRight size={18} aria-hidden />
              </TrackedHomepageLink>
            </div>
            <div className="relative aspect-4/3 overflow-hidden rounded-md bg-landing-tint md:order-2">
              <Image
                src="/assets/blog/iphone-13.jpg"
                alt={t.agentImageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <section
          id="bulk-upload"
          aria-labelledby="bulk-upload-title"
          className="bg-landing-page px-5 py-16 md:px-8 md:py-24"
        >
          <div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-2 md:gap-16">
            <div className="relative order-2 aspect-4/3 overflow-hidden rounded-md bg-landing-surface p-5 sm:p-8 md:order-1">
              <div className="flex h-full flex-col justify-center rounded-xl border border-landing-line bg-landing-card p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileSpreadsheet className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-landing-ink">shopi-listings.xlsx</p>
                      <p className="text-xs text-landing-muted">Excel spreadsheet</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary-strong">Preview</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-landing-line">
                  <div className="grid grid-cols-[1.2fr_1fr_0.7fr] gap-2 border-b border-landing-line bg-landing-surface px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-landing-muted">
                    <span>Item</span><span>Category</span><span>Price</span>
                  </div>
                  {[
                    ["Leather handbag", "Fashion", "KES 2,500"],
                    ["Samsung phone", "Electronics", "KES 18,000"],
                    ["Office chair", "Home", "KES 7,500"],
                  ].map(([item, category, price]) => (
                    <div key={item} className="grid grid-cols-[1.2fr_1fr_0.7fr] gap-2 border-b border-landing-line px-3 py-2.5 text-[10px] text-landing-body last:border-b-0 sm:text-xs">
                      <span className="truncate font-medium">{item}</span><span className="truncate">{category}</span><span className="truncate">{price}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-landing-muted">
                  <Check className="size-3.5 text-primary" aria-hidden /> Category and specs filled by Shopi Agent
                </p>
              </div>
              <span className="absolute right-3 top-3 rounded-full bg-landing-card px-3 py-1 text-[10px] font-bold text-primary-strong shadow-sm sm:right-5 sm:top-5">{t.bulkPreview}</span>
            </div>
            <div className="order-1 max-w-lg md:order-2">
              <p className="mb-3 hidden text-sm font-semibold text-primary md:block">{t.bulkEyebrowDesktop}</p>
              <p className="mb-3 text-sm font-semibold text-primary md:hidden">{t.bulkEyebrowMobile}</p>
              <h2 id="bulk-upload-title" className="font-display text-[2rem] font-semibold leading-tight md:text-[3.25rem]">
                {t.bulkTitle}
              </h2>
              <p className="mt-5 hidden text-base leading-relaxed text-landing-body md:block md:text-lg">
                {t.bulkBodyDesktop}
              </p>
              <p className="mt-5 text-base leading-relaxed text-landing-body md:hidden">
                {t.bulkBodyMobile}
              </p>
              <TrackedHomepageLink
                href={`/${lang}/dashboard?tab=listings&bulk=1`}
                buttonId="sell_item"
                placement="bulk_upload_section"
                className="mt-7 hidden items-center gap-2 border-b-2 border-primary pb-1 font-semibold text-landing-ink no-underline md:inline-flex"
              >
                {t.bulkCta}
                <ArrowUpRight size={18} aria-hidden />
              </TrackedHomepageLink>
            </div>
          </div>
        </section>

        {/* Scarcity, kept true: verification is free "for now" (the promise
            in features/verification/copy.ts) and only open to registered
            businesses. Don't add counts or deadlines the product doesn't
            enforce. */}
        <section
          id="verified-shops"
          aria-labelledby="verified-title"
          className="bg-landing-surface px-5 py-16 md:px-8 md:py-24"
        >
          <div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-2 md:gap-16">
            <div className="max-w-lg">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                <VerifiedTick size={18} label={null} />
                {t.verifiedEyebrow}
              </p>
              <h2
                id="verified-title"
                className="font-display text-[2rem] font-semibold leading-tight md:text-[3.25rem]"
              >
                {t.verifiedTitle}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-landing-body md:text-lg">
                {t.verifiedBody}
              </p>
              <TrackedHomepageLink
                href={`/${lang}/profile/verification`}
                buttonId="get_verified"
                placement="verified_section"
                className="mt-7 inline-flex items-center gap-2 border-b-2 border-primary pb-1 font-semibold text-landing-ink no-underline"
              >
                {t.verifiedCta}
                <ArrowUpRight size={18} aria-hidden />
              </TrackedHomepageLink>
            </div>
            <div
              className="flex aspect-4/3 items-center justify-center overflow-hidden rounded-md bg-landing-tint p-5 sm:p-8"
              aria-hidden
            >
              <div className="w-full max-w-sm rounded-xl border border-landing-line bg-landing-card p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-white">
                    S
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold text-landing-ink">
                      {t.verifiedShop}
                      <VerifiedTick size={18} label={null} />
                    </p>
                    <p className="text-sm text-landing-muted">{t.verifiedHandle}</p>
                  </div>
                  <VerifiedIdBadge className="ml-auto" />
                </div>
                <ul className="mt-5 grid list-none gap-2.5 border-t border-landing-line p-0 pt-4">
                  {t.verifiedChecks.map((check) => (
                    <li
                      key={check}
                      className="flex items-center gap-2.5 text-sm font-medium text-landing-body"
                    >
                      <Check className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
                      {check}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-22"
        >
          <h2
            id="faq-title"
            className="font-display text-[1.9rem] font-semibold md:text-[2.6rem]"
          >
            {t.faqTitle}
          </h2>
          <div className="mt-6 border-t border-landing-line">
            {t.faq.map(({ q, a }) => (
              <details key={q} className="group border-b border-landing-line py-5">
                <summary className="cursor-pointer pr-5 text-base font-semibold marker:text-primary md:text-lg">
                  {q}
                </summary>
                <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-landing-body md:text-base">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="closing-title"
          className="bg-tertiary px-5 py-16 text-center dark:bg-landing-surface md:px-8 md:py-22"
        >
          <h2
            id="closing-title"
            className="font-display text-[2rem] font-semibold leading-tight text-landing-ink md:text-[3.25rem]"
          >
            {t.closingTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-landing-body md:text-lg">
            {t.closingBody}
          </p>
          <div className="mx-auto mt-7 grid max-w-sm gap-3 sm:flex sm:max-w-none sm:justify-center">
            <TrackedHomepageLink
              href={`/${lang}/for-you`}
              buttonId="browse_for_you"
              placement="closing_section"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-white no-underline hover:opacity-90"
            >
              <Compass size={19} aria-hidden />
              {t.heroBrowse}
            </TrackedHomepageLink>
            <TrackedHomepageLink
              href={`/${lang}/upload`}
              buttonId="sell_item"
              placement="closing_section"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-landing-line-strong bg-landing-card px-7 py-3 text-base font-semibold text-landing-ink no-underline hover:bg-landing-surface"
            >
              <Plus size={19} aria-hidden />
              {t.heroSell}
            </TrackedHomepageLink>
          </div>
        </section>
      </main>
      <LandingFooter lang={lang} homeOnly />
      <HomepageSupportChat lang={lang} />
    </div>
  );
}
