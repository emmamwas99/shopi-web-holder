import Link from "next/link";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { publicPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/prohibited-items",
    title: "Prohibited Items Policy",
    description: "What cannot be listed, sold, or promoted on Shopi.",
  });
}

const LAST_UPDATED = "14 July 2026";

type Props = { params: Promise<{ lang: string }> };

export default async function ProhibitedItemsPage({ params }: Props) {
  const { lang } = await params;
  const base = `/${lang}`;
  return (
    <>
      <LegalNav lang={lang} />
      <BreadcrumbJsonLd
        lang={lang}
        trail={[{ name: "Prohibited Items", path: "/prohibited-items" }]}
      />
      <main className="mx-auto max-w-215 px-5 pt-20 pb-24">
        <div className="mb-10">
          <p className="mb-3 text-[0.8rem] md:text-[0.875rem] font-semibold tracking-[0.08em] uppercase text-primary">
            Legal
          </p>
          <h1 className="mb-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.03em] text-foreground">
            Prohibited Items Policy
          </h1>
          <p className="text-[0.875rem] md:text-[1rem] text-muted">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <LegalSection>
          <p>
            Shopi connects buyers and sellers, but that doesn&apos;t mean
            anything can be listed. This policy sets out what you cannot post,
            sell, or promote on Shopi. It&apos;s based on Kenyan law and general
            marketplace safety standards.
          </p>
          <p>
            Listing a prohibited item may result in content removal and account
            suspension or termination. Some violations may also be reported to
            law enforcement.
          </p>
        </LegalSection>

        <LegalSection title="Absolutely Prohibited">
          <p>
            The following can never be listed on Shopi, regardless of licensing
            or intent:
          </p>
          <ul>
            <li>
              <strong>Illegal drugs and controlled substances</strong> —
              narcotics, psychotropic substances, and drug paraphernalia
              intended for illegal drug use
            </li>
            <li>
              <strong>Weapons</strong> — firearms, ammunition, explosives, and
              weapons whose sale is restricted or banned under Kenyan law (e.g.
              the Firearms Act)
            </li>
            <li>
              <strong>Counterfeit goods</strong> — fake or unauthorised replicas
              of branded products
            </li>
            <li>
              <strong>Stolen property</strong> — any item you don&apos;t have
              the legal right to sell
            </li>
            <li>
              <strong>Human remains or body parts</strong>
            </li>
            <li>
              <strong>Wildlife and endangered species products</strong> — ivory,
              bushmeat, or any item prohibited under the Wildlife Conservation
              and Management Act
            </li>
            <li>
              <strong>Dangerous chemicals and hazardous materials</strong> —
              substances that pose a safety risk if mishandled, including
              unlicensed pesticides and industrial chemicals
            </li>
            <li>
              <strong>Fraudulent documents</strong> — fake IDs, forged
              certificates, counterfeit currency, or academic credentials
            </li>
            <li>
              <strong>Financial scams and pyramid/Ponzi schemes</strong> —
              including &quot;quick money&quot; investment schemes and
              unregistered multi-level marketing that relies on recruitment
              rather than product sales
            </li>
            <li>
              <strong>Recalled products</strong> — items officially recalled for
              safety reasons
            </li>
            <li>
              <strong>Content sexually exploiting minors</strong> — reported
              immediately to relevant authorities
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Restricted — Allowed Only With Conditions">
          <p>
            Some categories are not banned outright but come with restrictions:
          </p>
          <ul>
            <li>
              <strong>Prescription medicines:</strong> Cannot be sold by
              unlicensed individuals. Only listable by licensed pharmacies or
              medical suppliers who comply with the Pharmacy and Poisons
              Board&apos;s requirements.
            </li>
            <li>
              <strong>Alcohol and tobacco products:</strong> Sellers must comply
              with Kenyan licensing requirements and age-verification
              obligations; listings must not target minors.
            </li>
            <li>
              <strong>Live animals:</strong> Must comply with the Prevention of
              Cruelty to Animals Act and any relevant transport/welfare
              regulations. No listing of animals obtained illegally or through
              poaching.
            </li>
            <li>
              <strong>Adult content and services:</strong> Sexual services and
              pornographic content are not permitted on Shopi.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Why We Restrict These Categories">
          <p>
            Kenyan law regulates many of these categories directly, and some can
            cause real harm if traded without proper oversight. Where a category
            is restricted rather than banned, sellers are responsible for
            holding any required licences and following the applicable law —
            Shopi does not verify licences before a listing goes live, so buyers
            should always ask a seller for proof where it matters (for example,
            with medicines).
          </p>
        </LegalSection>

        <LegalSection title="Reporting a Prohibited Listing">
          <p>
            If you see a listing you believe violates this policy, please report
            it — see our <Link href={`${base}/contact`}>Contact Us</Link> page
            or use the in-app reporting tools where available. We review reports
            and remove violating content.
          </p>
        </LegalSection>

        <LegalSection title="Changes to This Policy">
          <p>
            We may update this list as Kenyan law changes or as we learn more
            about how the platform is used. Check back periodically for updates.
          </p>
        </LegalSection>

        <div className="mt-12 flex flex-wrap gap-6 border-t border-border pt-8">
          <Link
            href={`${base}/community-guidelines`}
            className="text-[0.875rem] text-primary"
          >
            Community Guidelines
          </Link>
          <Link href={`${base}/terms`} className="text-[0.875rem] text-primary">
            Terms of Service
          </Link>
        </div>
      </main>
    </>
  );
}

function LegalSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-9">
      {title && (
        <h2 className="mb-3.5 border-b border-border pb-2 font-display text-[1.15rem] md:text-[1.4rem] font-bold text-foreground">
          {title}
        </h2>
      )}
      <div className="flex flex-col gap-3 text-[0.9rem] md:text-[1.0625rem] leading-[1.8] md:leading-[1.85] text-muted [&_a]:text-primary [&_a]:underline [&_h3]:mt-4 [&_h3]:mb-[0.4rem] [&_h3]:text-[0.875rem] md:[&_h3]:text-[1.05rem] [&_h3]:font-bold [&_h3]:text-foreground [&_ul]:m-0 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-[0.4rem] [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
