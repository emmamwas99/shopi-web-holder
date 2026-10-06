import Link from "next/link";
import {
  BadgeCheckIcon,
  BriefcaseIcon,
  CopyrightIcon,
  LifeBuoyIcon,
  MailIcon,
  ScaleIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { publicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/config/site";
import { contactPageSchema, jsonLd } from "@/lib/structured-data";

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/contact",
    title: "Contact Us",
    description:
      "How to reach Shopi for support, business, legal, privacy, and abuse-report enquiries.",
  });
}

type Props = { params: Promise<{ lang: string }> };

const { supportEmail } = siteConfig;

/**
 * Build a mailto with a prefilled subject prefix.
 *
 * Every enquiry type lands in the same inbox, so the subject prefix is what
 * makes the mail sortable — a filter on "[Privacy]" is the replacement for a
 * dedicated privacy@ address.
 */
function mailto(subjectPrefix: string) {
  return `mailto:${supportEmail}?subject=${encodeURIComponent(`[${subjectPrefix}] `)}`;
}

const TOPICS = [
  {
    icon: LifeBuoyIcon,
    title: "Customer Support",
    blurb:
      "Questions about using Shopi, your account, or how a feature works.",
    prefix: "Support",
  },
  {
    icon: BriefcaseIcon,
    title: "Business & Press",
    blurb: "Partnerships, media enquiries, or general business questions.",
    prefix: "Business",
  },
  {
    icon: ScaleIcon,
    title: "Legal Requests",
    blurb: "Terms of Service questions, legal notices, or law enforcement requests.",
    prefix: "Legal",
  },
  {
    icon: ShieldCheckIcon,
    title: "Privacy Requests",
    blurb:
      "Ask what personal data we hold, or request a correction or deletion under Kenya's Data Protection Act, 2019.",
    prefix: "Privacy",
  },
  {
    icon: CopyrightIcon,
    title: "Copyright Complaints",
    blurb:
      "Report content that infringes your copyright or intellectual property rights.",
    prefix: "Copyright",
  },
  {
    icon: BadgeCheckIcon,
    title: "Careers",
    blurb: "Applying for an open role, or sending a speculative application.",
    prefix: "Application",
  },
] as const;

export default async function ContactPage({ params }: Props) {
  const { lang } = await params;
  const base = `/${lang}`;

  return (
    <>
      <LegalNav lang={lang} />
      <BreadcrumbJsonLd
        lang={lang}
        trail={[{ name: "Contact", path: "/contact" }]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(contactPageSchema(lang)) }}
      />

      <main className="mx-auto max-w-215 px-5 pt-16 pb-24">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <p className="mb-3 text-[0.8rem] md:text-[0.875rem] font-semibold tracking-[0.08em] uppercase text-primary">
            Get in touch
          </p>
          <h1 className="mb-4 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.03em] text-foreground">
            Contact Us
          </h1>
          <p className="max-w-155 text-[0.95rem] md:text-[1.0625rem] leading-[1.75] text-muted">
            We&apos;re a small team in Kenya and we read every message. One
            inbox handles everything — add the subject tag below so your
            enquiry reaches the right person faster.
          </p>
        </div>

        {/* ── Primary email card ───────────────────────────────────────── */}
        <section className="mb-12 rounded-2xl border border-border bg-elevated p-6 md:p-8">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MailIcon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="mb-1 font-display text-[1.15rem] md:text-[1.3rem] font-bold text-foreground">
                  Email us
                </h2>
                <p className="text-[0.875rem] md:text-[0.95rem] leading-[1.7] text-muted">
                  We aim to reply within 2 business days.
                </p>
              </div>
            </div>
            <a
              href={`mailto:${supportEmail}`}
              className="inline-block w-full rounded-full bg-primary px-7 py-3 text-center text-[0.9rem] font-bold text-white no-underline transition-opacity active:opacity-80 md:w-auto"
            >
              {supportEmail}
            </a>
          </div>
        </section>

        {/* ── Report abuse — deliberately above the topic grid ──────────── */}
        {/* Safety reports are the one case where email is the slower path, so
            the in-app tools are surfaced before the generic contact options. */}
        <section className="mb-12 rounded-2xl border border-error/25 bg-error/8 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-error/12 text-error">
              <ShieldAlertIcon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="mb-2 font-display text-[1.15rem] md:text-[1.3rem] font-bold text-foreground">
                Reporting a scam or unsafe behaviour?
              </h2>
              <p className="mb-4 text-[0.9rem] md:text-[1rem] leading-[1.75] text-muted">
                Use the block and report tools inside messaging first — those
                reports are reviewed fastest because they carry the conversation
                and listing with them. Email us only if a report needs extra
                attention.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <a
                  href={mailto("Abuse")}
                  className="text-[0.875rem] font-semibold text-primary underline underline-offset-2"
                >
                  Email an abuse report
                </a>
                <Link
                  href={`${base}/safety-centre`}
                  className="text-[0.875rem] font-semibold text-primary underline underline-offset-2"
                >
                  Visit the Safety Centre
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Topic grid ───────────────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-2 font-display text-[1.3rem] md:text-[1.5rem] font-bold tracking-[-0.02em] text-foreground">
            What can we help with?
          </h2>
          <p className="mb-6 max-w-155 text-[0.9rem] md:text-[1rem] leading-[1.75] text-muted">
            Pick the closest match — it opens your mail app with the subject tag
            already filled in.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {TOPICS.map(({ icon: Icon, title, blurb, prefix }) => (
              <a
                key={prefix}
                href={mailto(prefix)}
                className="group flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-5 no-underline transition-colors hover:border-primary/35 hover:bg-elevated"
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4.5 w-4.5 shrink-0 text-primary" aria-hidden />
                  <span className="font-display text-[1rem] font-bold text-foreground">
                    {title}
                  </span>
                </span>
                <span className="text-[0.875rem] leading-[1.7] text-muted">
                  {blurb}
                </span>
                <span className="mt-0.5 text-[0.8rem] font-semibold text-primary">
                  Subject: [{prefix}]
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* ── What to include ──────────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-3.5 border-b border-border pb-2 font-display text-[1.15rem] md:text-[1.4rem] font-bold text-foreground">
            Help us reply faster
          </h2>
          <ul className="flex flex-col gap-2 pl-5 text-[0.9rem] md:text-[1.0625rem] leading-[1.8] text-muted [&>li]:list-disc">
            <li>The email address or username on your Shopi account.</li>
            <li>
              A link to the listing, profile, or conversation you&apos;re
              writing about.
            </li>
            <li>
              Screenshots, if something looks wrong or isn&apos;t working.
            </li>
            <li>
              For copyright claims: the infringing content, proof of your
              ownership, and your contact details.
            </li>
          </ul>
        </section>

        {/* ── Related links ────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-8">
          {[
            { href: `${base}/faq`, label: "FAQ" },
            { href: `${base}/safety-centre`, label: "Safety Centre" },
            {
              href: `${base}/community-guidelines`,
              label: "Community Guidelines",
            },
            { href: `${base}/terms`, label: "Terms of Service" },
            { href: `${base}/privacy`, label: "Privacy Policy" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-[0.875rem] text-primary"
            >
              {label}
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
