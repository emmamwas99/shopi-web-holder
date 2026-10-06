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
    q: "Can I find land and plots for sale on Shopi?",
    a: "Yes. Shopi supports listings for land, plots, houses and other property. Sellers can post location, price, photos or video, and key details so buyers can message them directly.",
  },
  {
    q: "Can I search for plots for sale in Nyahururu or Nyandarua?",
    a: "Yes. Buyers can search by location and keywords such as plots for sale in Nyahururu, plots for sale in Nyandarua, plots in Nairobi, land for sale in Kenya or property for sale in Kenya.",
  },
  {
    q: "Can I list houses for sale or houses for rent?",
    a: "Yes. Sellers, landlords and agents can create posts for houses for sale, houses for rent, apartments, plots and land, then chat directly with interested buyers or tenants.",
  },
  {
    q: "Does Shopi verify property documents?",
    a: "Shopi helps buyers and sellers connect, but it does not verify title deeds, ownership, agents or payments. Always confirm documents with the relevant authorities and use proper legal advice before paying.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/property-for-sale-kenya",
    title: "Land, Plots and Property for Sale in Kenya",
    description:
      "Find or list land, plots, houses for sale and houses for rent in Kenya, including Nyahururu, Nyandarua and Nairobi. Message sellers directly on Shopi.",
  });
}

export default async function PropertyForSaleKenyaPage({ params }: Props) {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const pageUrl = `${siteConfig.url}/${safeLang}/property-for-sale-kenya`;
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${pageUrl}#howto`,
    name: "How to list property for sale or rent in Kenya on Shopi",
    description:
      "Post land, plots, houses or rentals on Shopi with location, price, media and important property details.",
    step: [
      {
        "@type": "HowToStep",
        name: "Prepare property details",
        text: "Collect the location, size, price, tenure, title or ownership details, nearby landmarks and contact preferences.",
      },
      {
        "@type": "HowToStep",
        name: "Create the listing",
        text: "Upload photos or video and describe the plot, land, house or rental clearly.",
      },
      {
        "@type": "HowToStep",
        name: "Chat with interested buyers or tenants",
        text: "Reply to questions, share more details and arrange viewing directly inside Shopi chat.",
      },
      {
        "@type": "HowToStep",
        name: "Verify before payment",
        text: "Confirm documents, ownership and legal requirements before any deposit, rent or purchase payment.",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(marketplaceSchema, howToSchema, faqSchema(faq)),
        }}
      />
      <LegalNav lang={safeLang} />
      <BreadcrumbJsonLd
        lang={safeLang}
        trail={[
          { name: "Property in Kenya", path: "/property-for-sale-kenya" },
        ]}
      />

      <main>
        <section className="px-5 pt-24 pb-14">
          <div className="mx-auto max-w-190">
            <p className="mb-4 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Property for sale and rent in Kenya
            </p>
            <h1 className="max-w-175 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold tracking-normal leading-[1.08] text-foreground">
              Find land, plots, houses for sale and houses for rent across
              Kenya.
            </h1>
            <p className="mt-5 max-w-150 text-[1.05rem] leading-[1.75] text-muted">
              Search or list property on Shopi: plots for sale in Nyahururu,
              land in Nyandarua, houses in Nairobi, rentals, farms and property
              listings from sellers you can message directly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${safeLang}/search?q=plots%20for%20sale`}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline"
              >
                Search plots
              </Link>
              <Link
                href={`/${safeLang}/upload`}
                className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground no-underline"
              >
                List property
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-surface px-5 py-14">
          <div className="mx-auto grid max-w-190 gap-5 md:grid-cols-3">
            {[
              {
                title: "Land and plots",
                body: "List quarter-acre plots, town plots, farms and land for sale with price, size, location and nearby landmarks.",
              },
              {
                title: "Homes for sale",
                body: "Post houses, apartments, maisonettes and unfinished homes with photos, video, price and viewing details.",
              },
              {
                title: "Rentals",
                body: "Advertise houses for rent, apartments, bedsitters and commercial spaces so tenants can message you directly.",
              },
            ].map((item) => (
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
                Built around the property searches Kenyans actually make.
              </h2>
            </div>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
              {[
                "Land for sale in Kenya",
                "Plots for sale in Kenya",
                "Plots for sale in Nyahururu",
                "Plots for sale in Nyandarua",
                "Property for sale in Nairobi",
                "Houses for sale and rent",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-border bg-elevated px-4 py-3 text-sm font-semibold text-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-170">
            <h2 className="mb-7 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
              What to include in a property listing
            </h2>
            <ol className="grid gap-4 p-0 md:grid-cols-4">
              {[
                "Exact location, town, estate or landmark.",
                "Price, size, tenure and title or ownership status.",
                "Clear photos or video of the property and access road.",
                "Viewing details and direct chat for serious buyers.",
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
            Questions about property on Shopi
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
          currentPath="/property-for-sale-kenya"
        />
      </main>
      <LandingFooter lang={safeLang} />
    </>
  );
}
