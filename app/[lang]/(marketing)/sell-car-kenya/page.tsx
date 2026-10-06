import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { GuideLinks } from "@/components/seo/GuideLinks";
import { siteConfig } from "@/config/site";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import { faqSchema, jsonLd, marketplaceSchema } from "@/lib/structured-data";
import { sellCarPages, sellCarPath } from "@/lib/seo/sell-car-pages";
import {
  sellCarLocationPath,
  sellCarLocations,
} from "@/lib/seo/sell-car-locations";

type Props = { params: Promise<{ lang: string }> };

const faq = [
  {
    q: "How do I sell my car in Kenya?",
    a: "Price it against comparable live listings, gather your logbook, ID and KRA PIN, then post a free listing with clear photos or a walkaround video, the price in KES and your location. Buyers message you on Shopi, you arrange inspection, and you complete ownership transfer through the NTSA TIMS portal.",
  },
  {
    q: "How much is my car worth in Kenya?",
    a: "The most reliable guide is what comparable cars are being advertised for right now — same make, model, year, grade and mileage. Condition, accident history, logbook status and service records move the figure more than mileage alone. Price inside the range for a fast sale, at the top of it if you can wait.",
  },
  {
    q: "Can I sell my car without a broker in Kenya?",
    a: "Yes. Brokers take a commission or add a markup, and they sit between you and the buyer. Listing directly on Shopi is free, buyers message you themselves, and you keep the full sale price. The trade-off is that you handle viewings and the NTSA transfer yourself.",
  },
  {
    q: "What documents do I need to sell a car in Kenya?",
    a: "The logbook in your name with no outstanding financing, your national ID and KRA PIN, an active NTSA TIMS account, and a signed sale agreement. At transfer you also need copies of the buyer's ID and KRA PIN. Confirm current requirements on the NTSA TIMS portal, since fees and steps change.",
  },
  {
    q: "How fast can I sell my car in Kenya?",
    a: "Presentation and price decide it. A listing with a walkaround video, honest photos including any wear, a clear asking price and a stated logbook status gets more genuine enquiries and far fewer time-wasters than a two-photo listing with no price.",
  },
  {
    q: "Can I sell a car on Shopi in Kenya?",
    a: "Yes. You can post a car for sale on Shopi with photos or video, price, location, make, model, condition and other important details, then interested buyers message you directly.",
  },
  {
    q: "Does Shopi charge commission when I sell my car?",
    a: "No. Shopi does not take commission or process payment. You and the buyer negotiate and complete the sale directly.",
  },
  {
    q: "What should I include in a car listing?",
    a: "Include clear photos or video, make, model, year, mileage, price in Kenyan Shillings, location, ownership documents status, service history and any known issues.",
  },
  {
    q: "How do I avoid unsafe car deals?",
    a: "Meet in a public place, verify documents, avoid sending money before inspection, and complete ownership transfer through the proper official process.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/sell-car-kenya",
    title: "Sell My Car in Kenya — Free, No Broker, No Commission",
    description:
      "Want to sell your car in Kenya? List free on Shopi, price it against live listings and deal with buyers directly. No broker, no commission.",
  });
}

export default async function SellCarKenyaPage({ params }: Props) {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const pageUrl = `${siteConfig.url}/${safeLang}/sell-car-kenya`;
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${pageUrl}#howto`,
    name: "How to sell a car in Kenya on Shopi",
    description:
      "Post your car on Shopi for free, show price and location, then chat directly with buyers.",
    step: [
      {
        "@type": "HowToStep",
        name: "Prepare your car details",
        text: "Collect make, model, year, mileage, condition, location, price and ownership details.",
      },
      {
        "@type": "HowToStep",
        name: "Create your Shopi listing",
        text: "Upload clear photos or video and write a direct description of the car.",
      },
      {
        "@type": "HowToStep",
        name: "Chat with buyers",
        text: "Answer questions, share extra details and arrange inspection directly.",
      },
      {
        "@type": "HowToStep",
        name: "Complete the sale safely",
        text: "Meet safely, verify payment and documents, then complete transfer through the official process.",
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
        trail={[{ name: "Sell a Car in Kenya", path: "/sell-car-kenya" }]}
      />

      <main>
        <section className="px-5 pt-24 pb-14">
          <div className="mx-auto max-w-190">
            <p className="mb-4 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Sell your car in Kenya
            </p>
            {/* H1 carries the seller's actual query ("sell my car in Kenya").
                The old one opened with "Need to sell a car?" — a question no
                one types into Google. */}
            <h1 className="max-w-165 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold tracking-normal leading-[1.08] text-foreground">
              Sell my car in Kenya — free, and without a broker.
            </h1>
            <p className="mt-5 max-w-145 text-[1.05rem] leading-[1.75] text-muted">
              List your car free on Shopi with photos or a walkaround video,
              price and location. Buyers searching for cars in Kenya find your
              post and message you directly — no broker taking a cut, no
              commission, and you keep the full sale price.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${safeLang}/upload`}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline"
              >
                Post your car free
              </Link>
              <Link
                href={`/${safeLang}/for-sale/cars`}
                className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground no-underline"
              >
                Browse cars
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-surface px-5 py-14">
          <div className="mx-auto grid max-w-190 gap-5 md:grid-cols-3">
            {[
              {
                title: "Show the real condition",
                body: "Use clear photos or video of the exterior, interior, engine bay, tyres and dashboard so serious buyers know what they are seeing.",
              },
              {
                title: "Add the details buyers search for",
                body: "Mention make, model, year, mileage, transmission, fuel type, price, location and whether the price is negotiable.",
              },
              {
                title: "Keep the deal direct",
                body: "Shopi connects you to buyers. You arrange inspection, negotiation, payment and transfer directly with the buyer.",
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
                Car listing checklist
              </p>
              <h2 className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-bold tracking-normal leading-tight text-foreground">
                Give buyers enough information to decide whether to message.
              </h2>
            </div>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
              {[
                "Make, model and year",
                "Mileage and condition",
                "Price in KES",
                "Town or estate location",
                "Clear photos or walkaround video",
                "Logbook and transfer readiness",
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
              How to sell a car on Shopi
            </h2>
            <ol className="grid gap-4 p-0 md:grid-cols-4">
              {[
                "Clean the car and take clear photos or video.",
                "Post the listing with price, location and specs.",
                "Reply to interested buyers inside Shopi chat.",
                "Arrange inspection, payment and transfer directly.",
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

        {/* ── Broker vs direct ─────────────────────────────────────────
            "Should I use a car broker in Kenya" is a high-intent seller query
            and the honest comparison is our strongest conversion argument. */}
        <section className="mx-auto max-w-190 px-5 py-16">
          <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
            Broker or direct
          </p>
          <h2 className="mb-7 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Do you actually need a car broker?
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-elevated p-6">
              <h3 className="font-display text-[1.1rem] font-bold text-foreground">
                Going through a broker
              </h3>
              <ul className="mt-4 grid gap-2.5 p-0 pl-5 text-sm leading-[1.7] text-muted [&>li]:list-disc">
                <li>A commission or markup comes out of your sale price.</li>
                <li>
                  The broker controls the conversation, so you hear the buyer&apos;s
                  questions second-hand.
                </li>
                <li>
                  Your car may be shown alongside cars the broker earns more on.
                </li>
                <li>Useful if you have no time to handle viewings yourself.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
              <h3 className="font-display text-[1.1rem] font-bold text-foreground">
                Selling direct on Shopi
              </h3>
              <ul className="mt-4 grid gap-2.5 p-0 pl-5 text-sm leading-[1.7] text-muted [&>li]:list-disc">
                <li>Free to list, and no commission on the sale.</li>
                <li>
                  Buyers message you directly, so you answer questions yourself.
                </li>
                <li>You set the price and decide what to accept.</li>
                <li>
                  You handle viewings and the NTSA transfer — which is the
                  trade-off.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Paperwork ────────────────────────────────────────────────
            "What documents do I need to sell a car in Kenya" is one of the
            highest-intent seller queries there is — someone asking it has
            already decided to sell. */}
        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-190">
            <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Paperwork
            </p>
            <h2 className="mb-5 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
              What you need to transfer ownership
            </h2>
            <p className="mb-7 max-w-150 text-[0.95rem] leading-[1.75] text-muted">
              Ownership transfer in Kenya is done by the seller and buyer
              through the NTSA TIMS portal — both of you need an active TIMS
              account linked to your KRA PIN. Have this ready before you
              advertise, because buyers ask about it in the first message.
            </p>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
              {[
                "Logbook in your name, with no outstanding financing",
                "Your national ID and KRA PIN certificate",
                "An active NTSA TIMS account",
                "A signed sale agreement, with both parties' details",
                "Copies of the buyer's ID and KRA PIN at transfer",
                "Valid inspection certificate, where the class requires one",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-border bg-elevated px-4 py-3 text-sm font-semibold text-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[0.85rem] leading-[1.7] text-muted">
              Requirements and fees change — confirm the current process on the
              NTSA TIMS portal before you transfer. Shopi does not handle
              payment, transfer or escrow.
            </p>
          </div>
        </section>

        {/* ── Model hub — distributes link equity to the /sell/* pages ── */}
        <section className="mx-auto max-w-190 px-5 py-16">
          <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
            By model
          </p>
          <h2 className="mb-5 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Selling a specific model?
          </h2>
          <p className="mb-7 max-w-150 text-[0.95rem] leading-[1.75] text-muted">
            What a buyer looks for differs sharply by model. These guides cover
            who buys each car in Kenya, what moves its price, and what to put in
            the listing.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {sellCarPages.map((page) => (
              <Link
                key={page.slug}
                href={`/${safeLang}${sellCarPath(page.slug)}`}
                className="rounded-lg border border-border bg-elevated p-5 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
              >
                <h3 className="font-display text-[1.05rem] font-bold text-foreground">
                  Sell my {page.model}
                </h3>
                <p className="mt-2 text-[0.875rem] leading-[1.6] text-muted">
                  {page.intro}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Location hub ─────────────────────────────────────────────
            "Sell my car in Nairobi" is a different query from "sell my car in
            Kenya" and this page cannot rank for both. Cars are also the most
            location-bound category we have — a buyer will cross a county to
            inspect one but almost never the country — so the town genuinely
            changes who sees the listing. */}
        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-190">
            <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              By town
            </p>
            <h2 className="mb-5 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
              Where are you selling from?
            </h2>
            <p className="mb-7 max-w-150 text-[0.95rem] leading-[1.75] text-muted">
              Who buys, what they pay and what they ask about all change between
              towns. These guides cover the local market, where to meet buyers
              safely, and what sellers in that county are currently asking.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sellCarLocations.map((location) => (
                <Link
                  key={location.slug}
                  href={`/${safeLang}${sellCarLocationPath(location.slug)}`}
                  className="rounded-lg border border-border bg-elevated p-5 no-underline transition-colors hover:border-[rgb(var(--color-border-strong))]"
                >
                  <h3 className="font-display text-[1.05rem] font-bold text-foreground">
                    Sell my car in {location.town}
                  </h3>
                  <p className="mt-2 text-[0.875rem] leading-[1.6] text-muted">
                    {location.county} County
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <GuideLinks
          lang={safeLang}
          heading="Car selling guides"
          intro="The long-form answers: pricing your car honestly, running a private sale from listing to NTSA transfer, and how buyers differ from town to town."
          slugs={[
            "how-much-is-my-car-worth-in-kenya",
            "how-to-sell-your-car-in-kenya-without-a-broker",
            "where-to-sell-your-car-in-kenya-city-by-city",
          ]}
        />

        <section className="mx-auto max-w-170 px-5 py-16">
          <h2 className="mb-8 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            Questions about selling a car
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
        <CategoryCrossLinks lang={safeLang} currentPath="/sell-car-kenya" />
      </main>
      <LandingFooter lang={safeLang} />
    </>
  );
}
