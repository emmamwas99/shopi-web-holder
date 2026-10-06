import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, Check, MessageSquare, Sparkles, Wallet } from "lucide-react";
import { LegalNav } from "@/components/legal/LegalNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import { faqSchema, jsonLd, marketplaceSchema } from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string }> };

const TITLE = "Online Selling Jobs in Kenya - Start Free With Shopi";
const DESCRIPTION =
  "Looking for online jobs in Kenya? Learn how to start selling products online with Shopi, post free listings, use Shopi Agent, and earn from direct buyers.";

const faq = [
  {
    q: "Are there online selling jobs in Kenya?",
    a: "Yes. Many Kenyans earn by selling products online: second-hand phones, clothes, furniture, beauty products, farm produce, cars and small-business stock. Shopi helps you start by posting listings for free and chatting directly with buyers.",
  },
  {
    q: "Can I make money online in Kenya without applying for a job?",
    a: "Yes. Instead of applying for a role, you can start with items you already own or products you can source locally, list them on Shopi, and sell directly to buyers. Shopi does not charge listing fees or commission.",
  },
  {
    q: "Do I need capital to start selling on Shopi?",
    a: "Not necessarily. You can start by selling used items you already have, helping family list items, or posting stock from a small existing business. As you learn what buyers ask for, you can reinvest profits into faster-moving items.",
  },
  {
    q: "How does Shopi Agent help me sell?",
    a: "Shopi Agent can turn a product photo into a listing draft with a title, description, category and specifications. You review and edit the details before publishing.",
  },
  {
    q: "Is Shopi hiring right now?",
    a: "Shopi is not collecting public job applications on this page. You can earn through Shopi today in two ways: sell directly to buyers, or invite sellers you know. When a seller you invite posts 5 listings, you get KSh 200 on M-Pesa.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/online-selling-jobs-kenya",
    title: TITLE,
    description: DESCRIPTION,
  });
}

export default async function OnlineSellingJobsKenyaPage({ params }: Props) {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  const pageUrl = `${siteConfig.url}/${safeLang}/online-selling-jobs-kenya`;

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${pageUrl}#howto`,
    name: "How to start an online selling job in Kenya with Shopi",
    description:
      "Choose something to sell, create a free Shopi listing, use Shopi Agent to draft details, then chat directly with buyers.",
    step: [
      {
        "@type": "HowToStep",
        name: "Choose what to sell",
        text: "Start with used items, products from your shop, or stock you can source locally.",
      },
      {
        "@type": "HowToStep",
        name: "Create a Shopi listing",
        text: "Upload photos or video, add a price and location, and publish your listing for free.",
      },
      {
        "@type": "HowToStep",
        name: "Use Shopi Agent",
        text: "Let Shopi Agent help draft your title, description, category and specifications from a product photo.",
      },
      {
        "@type": "HowToStep",
        name: "Reply to buyers",
        text: "Answer questions quickly, agree price and arrange pickup, delivery and payment directly.",
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
          { name: "Online Selling Jobs Kenya", path: "/online-selling-jobs-kenya" },
        ]}
      />

      <main>
        <section className="border-b border-border bg-surface px-5 pt-24 pb-16">
          <div className="mx-auto max-w-190">
            <p className="mb-4 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Online jobs in Kenya
            </p>
            <h1 className="max-w-170 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold tracking-normal leading-[1.08] text-foreground">
              Looking for online selling jobs in Kenya? Start by selling on Shopi.
            </h1>
            <p className="mt-5 max-w-150 text-[1.05rem] leading-[1.75] text-muted">
              If you came looking for work, here is the practical route: turn
              products around you into listings, reach local buyers, and build
              income through direct selling. Shopi is free to use, free to post
              on, and takes no commission.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${safeLang}/upload`}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline"
              >
                Start selling free
              </Link>
              <Link
                href={`/${safeLang}/profile?tab=invite`}
                className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground no-underline"
              >
                Earn KSh 200 per seller you invite
              </Link>
            </div>
            <p className="mt-3 text-sm text-muted">
              Paid on M-Pesa once a seller you invite posts 5 listings.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-195 gap-5 px-5 py-14 md:grid-cols-3">
          {[
            {
              icon: Wallet,
              title: "No application needed",
              body: "Create an account and start with an item you already have, a product from your shop, or stock you can source nearby.",
            },
            {
              icon: Sparkles,
              title: "AI helps with listings",
              body: "Shopi Agent can draft product details from a photo, so you spend less time typing and more time talking to buyers.",
            },
            {
              icon: MessageSquare,
              title: "Direct buyer chat",
              body: "Buyers message you inside Shopi. You agree price, payment, pickup or delivery directly.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-lg border border-border bg-elevated p-6"
            >
              <span className="mb-4 flex size-10 items-center justify-center rounded-md border border-border bg-surface text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="font-display text-[1.15rem] font-bold text-foreground">
                {title}
              </h2>
              <p className="mt-3 text-[0.95rem] leading-[1.7] text-muted">
                {body}
              </p>
            </article>
          ))}
        </section>

        <section className="bg-surface px-5 py-16">
          <div className="mx-auto grid max-w-190 gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="mb-3 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
                What can you sell?
              </p>
              <h2 className="font-display text-[clamp(1.55rem,3vw,2.25rem)] font-bold tracking-normal leading-tight text-foreground">
                Start with real demand, not guesswork.
              </h2>
              <p className="mt-4 text-[0.98rem] leading-[1.75] text-muted">
                The easiest online selling job is one where buyers already know
                the product and can make a decision from clear photos, price,
                condition and location.
              </p>
            </div>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
              {[
                "Used phones and accessories",
                "Clothes, shoes and handbags",
                "Furniture and home items",
                "Beauty and skincare products",
                "Farm produce and livestock",
                "Cars, spare parts and electronics",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-md border border-border bg-elevated px-4 py-3 text-sm font-semibold text-foreground"
                >
                  <Check className="mt-[0.1rem] size-4 shrink-0 text-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-190 px-5 py-16">
          <h2 className="mb-8 font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-normal text-foreground">
            How to turn Shopi into daily online work
          </h2>
          <ol className="grid gap-4 p-0 md:grid-cols-4">
            {[
              "Pick one product category you understand.",
              "Post clear photos or short videos with real prices.",
              "Use Shopi Agent to improve your listing details.",
              "Reply fast and build repeat buyers.",
            ].map((step, index) => (
              <li
                key={step}
                className="list-none rounded-lg border border-border bg-elevated p-5"
              >
                <span className="text-xs font-bold uppercase text-primary">
                  Step {index + 1}
                </span>
                <p className="mt-3 text-[0.92rem] leading-[1.65] text-muted">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-190 px-5 pb-16">
          <h2 className="mb-6 font-display text-[clamp(1.35rem,2.6vw,1.9rem)] font-bold tracking-normal text-foreground">
            More ways to earn
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                href: "/blog/how-to-make-money-online-in-kenya-without-investment",
                title: "How to make money online in Kenya without investment",
                body: "Selling what you own, selling for others, product videos, freelancing — and the scams to avoid.",
              },
              {
                href: "/blog/refer-and-earn-in-kenya",
                title: "Refer and earn in Kenya",
                body: "Invite a seller, and when they post 5 listings you get KSh 200 on M-Pesa.",
              },
            ].map(({ href, title, body }) => (
              <Link
                key={href}
                href={`/${safeLang}${href}`}
                className="rounded-lg border border-border bg-elevated p-5 no-underline transition-colors hover:border-primary/40"
              >
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-[0.92rem] leading-[1.65] text-muted">{body}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-170">
            <div className="mb-7 flex items-center gap-3">
              <BriefcaseBusiness className="size-6 text-primary" aria-hidden />
              <h2 className="font-display text-[clamp(1.5rem,3vw,2.1rem)] font-bold tracking-normal text-foreground">
                Frequently asked questions
              </h2>
            </div>
            <div className="grid gap-4">
              {faq.map(({ q, a }) => (
                <article
                  key={q}
                  className="rounded-lg border border-border bg-elevated p-5"
                >
                  <h3 className="font-semibold text-foreground">{q}</h3>
                  <p className="mt-2 text-[0.95rem] leading-[1.7] text-muted">
                    {a}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16">
          <div className="mx-auto max-w-170 rounded-lg border border-border bg-elevated p-8 text-center">
            <h2 className="font-display text-[1.5rem] font-bold text-foreground">
              Build your own opportunity on Shopi.
            </h2>
            <p className="mx-auto mt-3 max-w-125 text-[0.95rem] leading-[1.7] text-muted">
              Post one useful item today. Learn what buyers ask for. Improve the
              next listing. That is how online selling becomes steady work.
            </p>
            <Link
              href={`/${safeLang}/upload`}
              className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-white no-underline"
            >
              Post your first item
            </Link>
          </div>
        </section>

        <CategoryCrossLinks
          lang={safeLang}
          currentPath="/online-selling-jobs-kenya"
        />
      </main>

      <LandingFooter lang={safeLang} />
    </>
  );
}
