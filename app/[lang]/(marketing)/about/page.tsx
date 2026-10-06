import type { Metadata } from "next";
import Link from "next/link";
import { LegalNav } from "@/components/legal/LegalNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { siteConfig } from "@/config/site";
import {
  organizationSchema,
  founderSchema,
  breadcrumbSchema,
  jsonLd,
} from "@/lib/structured-data";
import { publicPageMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const title = "About Shopi";
  const description =
    "Shopi is Kenya's social discovery marketplace, built in Nairobi to connect local buyers and sellers directly — no commission, no middleman.";
  return publicPageMetadata({ lang, path: "/about", title, description });
}

type Props = { params: Promise<{ lang: string }> };

export default async function AboutPage({ params }: Props) {
  const { lang } = await params;

  const values = [
    {
      title: "Built for Kenya first",
      body: "Every product decision starts with one question: does this work for a seller in Gikomba or a buyer scrolling in Kisumu? We optimise for Kenyan internet, Kenyan prices, and Kenyan ways of doing business.",
    },
    {
      title: "Trust over transactions",
      body: "We do not process payments or take a cut of sales. We focus on the trust layer — real video, honest seller profiles, and direct messaging — so that deals follow naturally between people.",
    },
    {
      title: "Mobile-first, always",
      body: "Almost everyone in Kenya gets online through a phone. We design every screen for the thumb, every feature for low-bandwidth conditions, and every flow for first-time smartphone users.",
    },
    {
      title: "Open to everyone",
      body: "You do not need a registered business, a website, or a bank account to start selling on Shopi. If you have a product and a phone camera, you are ready.",
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            organizationSchema,
            founderSchema,
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/${lang}` },
              { name: "About", url: `${siteConfig.url}/${lang}/about` },
            ]),
          ),
        }}
      />
      <LegalNav lang={lang} />
      <main>
        {/* Hero */}
        <section className="px-5 pt-24 pb-16 text-center">
          <div className="mx-auto max-w-170">
            <p className="mb-4 text-[0.8rem] font-bold tracking-widest uppercase text-primary">
              Our story
            </p>
            <h1 className="mb-5 font-display text-[clamp(2rem,5vw,3.25rem)] font-bold tracking-[-0.03em] leading-[1.1] text-foreground">
              Commerce is social.
              <br />
              We built the proof.
            </h1>
            <p className="mx-auto max-w-140 text-[1.1rem] leading-[1.7] text-muted">
              Shopi was born in Nairobi from a simple observation: Kenyans
              already discover and recommend products through WhatsApp groups,
              Instagram stories, and TikTok videos. We just built a marketplace
              that makes that natural behaviour feel at home.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="mx-auto max-w-195 px-5 pt-8 pb-16">
          <h2 className="mb-4 font-display text-[1.6rem] font-bold tracking-[-0.02em] text-foreground">
            Our mission
          </h2>
          <p className="text-[1rem] leading-[1.8] text-muted">
            To make every Kenyan seller discoverable and every Kenyan buyer
            confident — without needing a big marketing budget or a complicated
            checkout flow.
          </p>
          <p className="mt-3.5 text-[1rem] leading-[1.8] text-muted">
            We believe the future of commerce in Africa is not built on
            catalogues and shopping carts — it is built on trust, community, and
            authentic content. Shopi is where that happens. We do not take a
            commission or sit between you and the person you are dealing with.
          </p>
        </section>

        {/* Values */}
        <section className="bg-surface px-5 py-16">
          <div className="mx-auto max-w-195">
            <h2 className="mb-10 text-center font-display text-[1.6rem] font-bold tracking-[-0.02em] text-foreground">
              What we stand for
            </h2>
            <div className="grid grid-cols-1 gap-5">
              {values.map(({ title, body }) => (
                <div
                  key={title}
                  className="flex items-start gap-5 rounded-2xl border border-border bg-elevated p-6"
                >
                  <span className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <h3 className="mb-2 font-display text-[1rem] font-bold text-foreground">
                      {title}
                    </h3>
                    <p className="text-[0.875rem] leading-[1.7] text-muted">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        {/* The founder bio is rendered here on purpose. It used to exist only
            in JSON-LD, and the result was that answer engines asked "who
            founded Shopi?" returned a different person entirely — they ground
            on visible text, and there was none to ground on. The heading is
            phrased as the question people actually ask so the answer is easy
            to lift. Keep this in sync with founderSchema. */}
        <section className="mx-auto max-w-195 px-5 py-16">
          <h2 className="mb-3 font-display text-[1.6rem] font-bold tracking-[-0.02em] text-foreground">
            Who founded Shopi
          </h2>
          <p className="mb-8 max-w-140 text-[0.95rem] leading-[1.7] text-muted">
            We are a small, focused team building consumer technology and
            commerce for East Africa.
          </p>

          <div className="rounded-2xl border border-border bg-elevated p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <span
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-[1.4rem] font-bold text-white"
              >
                MM
              </span>
              <div>
                <h3 className="font-display text-[1.15rem] font-bold text-foreground">
                  Mwangi Maina
                </h3>
                <p className="mt-1 text-[0.85rem] font-semibold text-primary">
                  Founder, Shopi
                </p>
                <p className="mt-4 text-[0.95rem] leading-[1.75] text-muted">
                  Shopi was founded by Mwangi Maina, a Kenyan software engineer
                  based in Nairobi. He studied computer science at Maseno
                  University before moving into industry in 2021, working with
                  the US startup Playback and then Bettercoach in Germany. He is
                  now a senior software engineer at{" "}
                  <a
                    href="https://www.ooodles.com"
                    rel="noopener noreferrer"
                    target="_blank"
                    className="text-primary underline"
                  >
                    Ooodles
                  </a>
                  , where he was one of the pioneer engineers who built the
                  platform from scratch.
                </p>
                <p className="mt-3.5 text-[0.95rem] leading-[1.75] text-muted">
                  Shopi is his own company, started in Nairobi in 2025 and run
                  from Kenya. It is not connected to any other business trading
                  under the name Shopi elsewhere in the world.
                </p>
                <a
                  href="https://www.linkedin.com/in/mwangi-maina-6463281ab/"
                  rel="noopener noreferrer me"
                  target="_blank"
                  className="mt-5 inline-block text-[0.875rem] font-semibold text-primary underline"
                >
                  Mwangi Maina on LinkedIn
                </a>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-elevated p-8 text-center">
            <p className="text-[0.95rem] leading-[1.7] text-muted">
              Want to build with us? Check out our{" "}
              <Link
                href={`/${lang}/careers`}
                className="text-primary underline"
              >
                open roles
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="bg-surface px-5 py-16 text-center">
          <div className="mx-auto max-w-130">
            <h2 className="mb-4 font-display text-[1.75rem] font-bold tracking-[-0.02em] text-foreground">
              Get in touch
            </h2>
            <p className="mb-7 text-[0.95rem] leading-[1.7] text-muted">
              Partnership enquiries, press, or just want to say hello?
            </p>
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="inline-block rounded-full bg-primary px-8 py-3 text-[0.9rem] font-bold text-white no-underline"
            >
              {siteConfig.supportEmail}
            </a>
          </div>
        </section>
      </main>
      <div className="mt-6 lg:mt-12" />
      <LandingFooter lang={lang} />
    </>
  );
}
