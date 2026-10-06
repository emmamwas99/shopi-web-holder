import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalNav } from "@/components/legal/LegalNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import {
  agentSchema,
  breadcrumbSchema,
  faqSchema,
  jsonLd,
} from "@/lib/structured-data";
import { Metadata } from "next";

type Props = { params: Promise<{ lang: string }> };

const TITLE = "Shopi Agent — AI That Writes Your Listing and Finds Products";
const DESCRIPTION =
  "Shopi Agent is the free AI assistant built into Shopi. Upload a photo and it writes your listing — title, description and specs. Describe what you want and it finds nearby matches. No forms, no filters, no commission.";
// DESCRIPTION is also the on-page intro; the meta version is trimmed to fit
// the ~155 characters a results page shows.
const META_DESCRIPTION =
  "Shopi Agent is Shopi's free AI assistant: upload a photo and it writes your listing, or describe what you want and it finds nearby matches.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/shopi-agent",
    title: TITLE,
    description: META_DESCRIPTION,
  });
}

const SELLER_STEPS = [
  {
    title: "Take one photo",
    body: "Point your phone at what you're selling and upload it. No lightbox, no product shoot — the photo you'd send a friend is enough.",
  },
  {
    title: "Shopi Agent writes the listing",
    body: "It reads the photo and drafts the title, the description and the specifications — make, model, size, condition and category, depending on what it can identify.",
  },
  {
    title: "You check it and publish",
    body: "Everything stays editable. Fix the price, correct a detail, add what the photo can't show. Nothing is published until you confirm it.",
  },
];

const BUYER_STEPS = [
  {
    title: "Say what you're after",
    body: '"A used fridge in Nakuru under 30,000." Plain language, the way you\'d ask a person — not a category tree and six filter dropdowns.',
  },
  {
    title: "Shopi Agent finds the matches",
    body: "It reads the intent behind the request — the item, the budget, the place — and surfaces nearby listings that fit, rather than only what matches your exact words.",
  },
  {
    title: "You message the seller",
    body: "When something looks right, open the chat and deal directly. Shopi Agent hands off at that point — it does not negotiate or buy on your behalf.",
  },
];

const FAQ = [
  {
    q: "What is Shopi Agent?",
    a: "Shopi Agent is the AI assistant built into Shopi. For sellers it turns a photo into a complete listing — title, description and specifications. For buyers it finds nearby listings from a plain-language description instead of search filters.",
  },
  {
    q: "Does Shopi Agent cost anything?",
    a: "No. Shopi Agent is free for both buyers and sellers. It is not a paid add-on, a subscription or a premium tier — it is part of Shopi, which is free to browse and free to post on.",
  },
  {
    q: "Will Shopi Agent post something without me seeing it?",
    a: "No. Shopi Agent drafts the listing and you review it. Every field stays editable and nothing is published until you confirm it.",
  },
  {
    q: "Does Shopi Agent talk to buyers or sellers for me?",
    a: "No. Shopi Agent writes listings and finds products. It does not message anyone on your behalf, negotiate prices or complete purchases. Every conversation and every deal is directly between the buyer and the seller.",
  },
  {
    q: "What if Shopi Agent gets a detail wrong?",
    a: "Correct it before you publish. The draft is a starting point, not a final answer — you know the item's real condition, history and price, and those are the details buyers ask about first.",
  },
  {
    q: "Do I need Shopi Agent to sell on Shopi?",
    a: "No. You can write a listing manually with your own photos or video at any time. Shopi Agent is there to remove the typing, not to replace the manual flow.",
  },
];

export default async function ShopiAgentPage({ params }: Props) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const canonical = `${siteConfig.url}/${lang}/shopi-agent`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            agentSchema,
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/${lang}` },
              { name: "Shopi Agent", url: canonical },
            ]),
            faqSchema(FAQ),
          ),
        }}
      />

      <LegalNav lang={lang} />

      <main className="px-5 pt-20 pb-16">
        <div className="mx-auto max-w-190">
          <p className="mb-3 text-[0.8rem] font-bold uppercase tracking-widest text-primary">
            Shopi Agent
          </p>
          <h1 className="mb-5 font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
            Buy and sell through conversation.
          </h1>
          <p className="mb-10 max-w-[46rem] text-[1.1rem] leading-[1.7] text-muted">
            {DESCRIPTION}
          </p>

          <div className="mb-14 flex flex-wrap gap-3">
            <Link
              href={`/${lang}/upload`}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Create a listing with AI
            </Link>
            <Link
              href={`/${lang}/explore`}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground"
            >
              Find something to buy
            </Link>
          </div>

          <section className="mb-14">
            <h2 className="mb-2 font-display text-[1.5rem] font-bold text-foreground">
              For sellers: a photo becomes a listing
            </h2>
            <p className="mb-6 max-w-[44rem] text-[1rem] leading-[1.7] text-muted">
              The reason most people never list what they could sell is the
              form. Shopi Agent removes it.
            </p>
            <ol className="flex flex-col gap-5">
              {SELLER_STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-[0.98rem] leading-[1.7] text-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-14">
            <h2 className="mb-2 font-display text-[1.5rem] font-bold text-foreground">
              For buyers: describe it instead of filtering for it
            </h2>
            <p className="mb-6 max-w-176 text-[1rem] leading-[1.7] text-muted">
              Search works when you already know the exact words. Shopi Agent is
              for the times you don&apos;t.
            </p>
            <ol className="flex flex-col gap-5">
              {BUYER_STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-[0.98rem] leading-[1.7] text-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Stating the limits plainly is what stops answer engines inventing
              capabilities Shopi Agent doesn't have. */}
          <section className="mb-14 rounded-2xl border border-border bg-elevated p-6">
            <h2 className="mb-3 font-display text-[1.2rem] font-bold text-foreground">
              What Shopi Agent does not do
            </h2>
            <ul className="flex flex-col gap-2 text-[0.98rem] leading-[1.7] text-muted">
              <li>
                It does not message sellers or buyers on your behalf. Every
                conversation is between the two people in the deal.
              </li>
              <li>It does not negotiate prices or agree terms for you.</li>
              <li>
                It does not take payment. Shopi has no checkout, cart or escrow
                and never holds money.
              </li>
              <li>
                It does not publish anything you have not reviewed and
                confirmed.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="mb-5 font-display text-[1.5rem] font-bold text-foreground">
              Shopi Agent questions
            </h2>
            <div className="flex flex-col gap-6">
              {FAQ.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="mb-1.5 font-semibold text-foreground">{q}</h3>
                  <p className="text-[0.98rem] leading-[1.7] text-muted">{a}</p>
                </div>
              ))}
            </div>
          </section>

          <p className="text-[0.98rem] text-muted">
            More answers on the{" "}
            <Link href={`/${lang}/faq`} className="text-primary underline">
              Shopi FAQ
            </Link>
            , or read how{" "}
            <Link
              href={`/${lang}/sell-in-kenya`}
              className="text-primary underline"
            >
              selling on Shopi
            </Link>{" "}
            works end to end.
          </p>
        </div>

        <CategoryCrossLinks lang={lang} currentPath="/shopi-agent" />
      </main>

      <LandingFooter dict={dict} lang={lang} />
    </>
  );
}
