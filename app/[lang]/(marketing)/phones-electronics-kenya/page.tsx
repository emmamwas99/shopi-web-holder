import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import { faqSchema, jsonLd, marketplaceSchema } from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string }> };

const faq = [
  {
    q: "Where can I find phones for sale in Kenya?",
    a: "You can search Shopi for phones for sale in Kenya, including Samsung phones, iPhones, Tecno, Infinix, Oppo, Xiaomi and other brands. Open a listing, check the price and location, then message the seller directly.",
  },
  {
    q: "Can I buy Samsung phones or iPhones on Shopi?",
    a: "Yes. Shopi is built for local phone and electronics listings, including Samsung Galaxy phones, iPhones, used phones, new phones and accessories from sellers across Kenya.",
  },
  {
    q: "Can I sell a phone, TV or electronics item on Shopi?",
    a: "Yes. You can post phones, televisions, laptops, speakers, cameras, consoles and other electronics for free. Add photos or video, price, condition, location and specs so buyers can message you directly.",
  },
  {
    q: "Does Shopi handle payment or delivery for electronics?",
    a: "No. Shopi does not process payments, hold money, arrange delivery or take commission. Buyers and sellers agree on price, inspection, payment and pickup or delivery directly.",
  },
  {
    q: "How do I buy used electronics safely?",
    a: "Inspect the item before paying, test key features, confirm IMEI or serial details where relevant, check charger and accessories, meet safely and avoid sending money before you are satisfied.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/phones-electronics-kenya",
    title: "Phones, Samsung, iPhone, TVs and Electronics for Sale in Kenya",
    description:
      "Find or sell phones, Samsung Galaxy, iPhone, TVs, laptops and electronics in Kenya on Shopi. Compare listings and message sellers directly.",
  });
}

export default async function PhonesElectronicsKenyaPage({ params }: Props) {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const pageUrl = `${siteConfig.url}/${safeLang}/phones-electronics-kenya`;
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    url: pageUrl,
    name: "Phones and electronics for sale in Kenya",
    description:
      "A Shopi marketplace page for phones, Samsung, iPhone, TVs, laptops and electronics listings in Kenya.",
    inLanguage: safeLang === "sw" ? "sw-KE" : "en-KE",
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    about: [
      { "@type": "Thing", name: "Phones for sale in Kenya" },
      { "@type": "Brand", name: "Samsung" },
      { "@type": "Brand", name: "Apple iPhone" },
      { "@type": "Thing", name: "Televisions for sale in Kenya" },
      { "@type": "Thing", name: "Electronics marketplace Kenya" },
    ],
    mainEntity: {
      "@type": "ItemList",
      name: "Popular phone and electronics searches on Shopi",
      itemListElement: [
        "Samsung phones for sale in Kenya",
        "iPhone for sale in Kenya",
        "Used phones for sale in Kenya",
        "Televisions for sale in Kenya",
        "Laptops for sale in Kenya",
        "Electronics for sale in Kenya",
      ].map((name, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name,
        url: `${siteConfig.url}/${safeLang}/search?q=${encodeURIComponent(
          name,
        )}`,
      })),
    },
  };
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${pageUrl}#howto`,
    name: "How to sell a phone or electronics item in Kenya on Shopi",
    description:
      "Create a free listing for a phone, TV, laptop or electronics item with photos, price, condition and location.",
    step: [
      {
        "@type": "HowToStep",
        name: "Prepare the device details",
        text: "Collect brand, model, storage or screen size, condition, accessories, warranty status, price and location.",
      },
      {
        "@type": "HowToStep",
        name: "Create a Shopi listing",
        text: "Upload clear photos or video showing the actual phone, TV, laptop or electronics item.",
      },
      {
        "@type": "HowToStep",
        name: "Answer buyer questions",
        text: "Use Shopi chat to confirm availability, specs, condition, inspection and pickup or delivery options.",
      },
      {
        "@type": "HowToStep",
        name: "Complete the deal directly",
        text: "Buyer and seller agree on inspection, price, payment and handover directly. Shopi does not take commission.",
      },
    ],
  };

  const categories = [
    {
      title: "Samsung phones",
      body: "Find Samsung Galaxy phones for sale in Kenya, from budget models to flagship devices. Sellers can list model, storage, condition, price and location.",
    },
    {
      title: "iPhone listings",
      body: "Search iPhone for sale in Kenya, including used and new iPhones. Check storage, battery health, condition, accessories and seller location before chatting.",
    },
    {
      title: "TVs and home electronics",
      body: "Browse televisions, sound systems, speakers, decoders, gaming consoles and home electronics from local sellers you can message directly.",
    },
  ];

  const searches = [
    "Samsung phones for sale in Kenya",
    "Samsung Galaxy for sale",
    "iPhone for sale in Kenya",
    "Used phones for sale",
    "Phones for sale in Nairobi",
    "Televisions for sale in Kenya",
    "Smart TVs for sale",
    "Laptops for sale in Kenya",
    "Electronics for sale in Kenya",
    "Phone accessories Kenya",
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            marketplaceSchema,
            collectionSchema,
            howToSchema,
            faqSchema(faq),
          ),
        }}
      />
      <LegalNav lang={safeLang} />
      <BreadcrumbJsonLd
        lang={safeLang}
        trail={[
          { name: "Phones and Electronics", path: "/phones-electronics-kenya" },
        ]}
      />

      <main>
        <section className="px-5 pt-24 pb-14">
          <div className="mx-auto max-w-190">
            <p className="mb-4 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Phones and electronics in Kenya
            </p>
            <h1 className="max-w-180 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold tracking-normal leading-[1.08] text-foreground">
              Find Samsung phones, iPhones, TVs, laptops and electronics for
              sale in Kenya.
            </h1>
            <p className="mt-5 max-w-150 text-[1.05rem] leading-[1.75] text-muted">
              Shopi helps buyers discover phones and electronics from local
              sellers across Kenya. Search Samsung for sale, iPhone for sale,
              used phones, smart TVs, laptops, speakers and accessories, then
              message the seller directly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${safeLang}/search?q=phones%20for%20sale`}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline"
              >
                Search phones
              </Link>
              <Link
                href={`/${safeLang}/search?q=samsung%20for%20sale`}
                className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground no-underline"
              >
                Search Samsung
              </Link>
              <Link
                href={`/${safeLang}/upload`}
                className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground no-underline"
              >
                Sell electronics
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-surface px-5 py-14">
          <div className="mx-auto grid max-w-190 gap-5 md:grid-cols-3">
            {categories.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-border bg-elevated p-6"
              >
                <h2 className="font-display text-[1.15rem] font-bold text-foreground">
                  {item.title}
                </h2>
                <p className="mt-3 text-[0.95rem] leading-[1.7] text-muted">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-190 px-5 py-16">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
                Popular searches
              </p>
              <h2 className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-bold tracking-normal leading-tight text-foreground">
                Built for how Kenyans search for phones and electronics.
              </h2>
              <p className="mt-4 text-[0.95rem] leading-[1.7] text-muted">
                This page gives Google and answer engines a clear category hub
                for Shopi electronics, with direct links into matching Shopi
                searches.
              </p>
            </div>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
              {searches.map((item) => (
                <li key={item}>
                  <Link
                    href={`/${safeLang}/search?q=${encodeURIComponent(item)}`}
                    className="block rounded-md border border-border bg-elevated px-4 py-3 text-sm font-semibold text-foreground no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-170">
            <h2 className="mb-7 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
              What to include when selling phones or electronics
            </h2>
            <ol className="grid gap-4 p-0 md:grid-cols-4">
              {[
                "Brand, model, storage, screen size or key specs.",
                "Actual photos or video of the device powered on.",
                "Condition, battery health, warranty and accessories.",
                "Price in KES, location and pickup or delivery option.",
              ].map((step, index) => (
                <li
                  key={step}
                  className="list-none rounded-lg border border-border bg-elevated p-5"
                >
                  <span className="text-xs font-bold uppercase text-primary">
                    Step {index + 1}
                  </span>
                  <p className="mt-3 text-sm leading-[1.65] text-muted">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-170 px-5 py-16">
          <h2 className="mb-8 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Questions about phones and electronics on Shopi
          </h2>
          <div className="flex flex-col gap-3">
            {faq.map(({ q, a }) => (
              <details
                key={q}
                className="rounded-lg border border-border bg-elevated p-5"
              >
                <summary className="cursor-pointer text-base font-bold text-foreground">
                  {q}
                </summary>
                <p className="mt-3 text-[0.95rem] leading-[1.7] text-muted">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>
        <CategoryCrossLinks
          lang={safeLang}
          currentPath="/phones-electronics-kenya"
        />
      </main>
      <LandingFooter lang={safeLang} />
    </>
  );
}
