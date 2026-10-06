import Link from "next/link";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { publicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/config/site";

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/terms",
    title: "Terms of Service",
    description:
      "The rules and agreements that govern your use of the Shopi platform.",
  });
}

const LAST_UPDATED = "14 July 2026";

type Props = { params: Promise<{ lang: string }> };

export default async function TermsPage({ params }: Props) {
  const { lang } = await params;
  const base = `/${lang}`;
  return (
    <>
      <LegalNav lang={lang} />
      <BreadcrumbJsonLd
        lang={lang}
        trail={[{ name: "Terms of Service", path: "/terms" }]}
      />
      <main className="mx-auto max-w-215 px-5 pt-20 pb-24">
        <div className="mb-10">
          <p className="mb-3 text-[0.8rem] md:text-[0.875rem] font-semibold tracking-[0.08em] uppercase text-primary">
            Legal
          </p>
          <h1 className="mb-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.03em] text-foreground">
            Terms of Service
          </h1>
          <p className="text-[0.875rem] md:text-[1rem] text-muted">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <LegalSection>
          <p>
            Welcome to Shopi. These Terms of Service (&quot;Terms&quot;) govern
            your use of the Shopi platform, operated by Shopi Limited
            (&quot;Shopi&quot;, &quot;we&quot;, &quot;us&quot;). By creating an
            account or using Shopi, you agree to these Terms.
          </p>
          <p>
            Please read them carefully. If you don&apos;t agree, please
            don&apos;t use Shopi.
          </p>
        </LegalSection>

        <LegalSection title="1. What Shopi Is">
          <p>
            Shopi is a social discovery classifieds marketplace. We help buyers
            and sellers in Kenya find each other through content-driven
            listings, search, and direct messaging.
          </p>
          <p>
            <strong>
              Shopi is not an online store, and we are not a party to
              transactions between users.
            </strong>{" "}
            We do not process payments, hold money, arrange delivery, or take a
            commission on any sale. Any deal, payment, or delivery arrangement
            is made directly between the buyer and seller, entirely outside of
            Shopi. We are not responsible for the outcome of any transaction.
          </p>
        </LegalSection>

        <LegalSection title="2. Eligibility">
          <p>
            You must be at least 18 years old to create a Shopi account. By
            registering, you confirm that you meet this requirement and that the
            information you provide is accurate.
          </p>
        </LegalSection>

        <LegalSection title="3. Your Account">
          <p>
            You can create an account using an email address and password, or by
            signing in with Google, Apple, or Facebook.
          </p>
          <p>You&apos;re responsible for:</p>
          <ul>
            <li>Keeping your login credentials secure</li>
            <li>All activity that happens under your account</li>
            <li>Notifying us promptly if you suspect unauthorised access</li>
          </ul>
          <p>
            We may suspend or terminate accounts that violate these Terms or our{" "}
            <Link href={`${base}/community-guidelines`}>
              Community Guidelines
            </Link>
            .
          </p>
        </LegalSection>

        <LegalSection title="4. Marketplace Rules">
          <h3>Sellers are responsible for:</h3>
          <ul>
            <li>
              Posting accurate, honest listings — correct price, condition, and
              description
            </li>
            <li>
              Only listing items or services they&apos;re actually able to sell
            </li>
            <li>
              Not listing anything on our{" "}
              <Link href={`${base}/prohibited-items`}>
                Prohibited Items Policy
              </Link>
            </li>
            <li>Responding to buyers in good faith</li>
          </ul>
          <h3>Buyers are responsible for:</h3>
          <ul>
            <li>Doing their own due diligence before agreeing to a purchase</li>
            <li>Verifying items and sellers before handing over money</li>
            <li>Arranging safe payment and meetup independently of Shopi</li>
          </ul>
          <p>
            Shopi does not guarantee the quality, safety, legality, or accuracy
            of any listing, and we do not vet sellers or buyers beyond the
            moderation tools described in our Community Guidelines.
          </p>
        </LegalSection>

        <LegalSection title="5. Content You Post">
          <h3>Ownership</h3>
          <p>
            You own the photos, videos, descriptions, and other content you post
            to Shopi (&quot;Your Content&quot;).
          </p>
          <h3>License to us</h3>
          <p>
            By posting Your Content, you grant Shopi a non-exclusive, worldwide,
            royalty-free licence to host, store, display, reproduce, and
            distribute it on the platform, solely for the purpose of operating
            and promoting Shopi (for example, showing your listing in feeds and
            search results). This licence ends when you delete Your Content or
            your account, except for copies retained for legal, safety, or
            backup purposes for a reasonable period.
          </p>
          <h3>Your responsibility</h3>
          <p>
            You confirm that you have the right to post Your Content and that it
            doesn&apos;t infringe anyone else&apos;s rights (including
            copyright) or violate any law.
          </p>
          <h3>TikTok imports</h3>
          <p>
            If you import a video from TikTok, you confirm you have the right to
            use and repost that content.
          </p>
        </LegalSection>

        <LegalSection title="6. AI-Assisted Features">
          <p>
            Shopi may use automated tools — for example, to suggest a category
            for your listing based on its content. These tools are a convenience
            feature and don&apos;t replace your responsibility to describe your
            listing accurately.
          </p>
        </LegalSection>

        <LegalSection title="7. Prohibited Behaviour">
          <p>You agree not to:</p>
          <ul>
            <li>Post false, misleading, or fraudulent listings</li>
            <li>
              Impersonate another person or misrepresent your affiliation with
              anyone
            </li>
            <li>Harass, threaten, or abuse other users</li>
            <li>
              List anything covered by our{" "}
              <Link href={`${base}/prohibited-items`}>
                Prohibited Items Policy
              </Link>
            </li>
            <li>
              Attempt to circumvent, disable, or interfere with Shopi&apos;s
              security or functionality
            </li>
            <li>
              Use bots, scrapers, or automated tools to access Shopi without our
              permission
            </li>
            <li>
              Create multiple accounts to evade a suspension or manipulate stats
              (likes, followers, views)
            </li>
            <li>Use Shopi for any unlawful purpose</li>
          </ul>
          <p>
            See our{" "}
            <Link href={`${base}/community-guidelines`}>
              Community Guidelines
            </Link>{" "}
            for more detail and examples.
          </p>
        </LegalSection>

        <LegalSection title="8. Reporting, Blocking, and Moderation">
          <p>
            You can block another user or report a conversation directly within
            the app if you experience abuse, harassment, or a scam attempt. We
            review reports and may warn, restrict, or permanently remove
            accounts that violate these Terms.
          </p>
          <p>
            We reserve the right to remove listings or content that violate
            these Terms, our Community Guidelines, or applicable law, at our
            discretion and without prior notice.
          </p>
        </LegalSection>

        <LegalSection title="9. Platform Availability">
          <p>
            We work to keep Shopi available and reliable, but we don&apos;t
            guarantee uninterrupted access. We may modify, suspend, or
            discontinue any part of Shopi at any time, including for
            maintenance, updates, or legal reasons.
          </p>
        </LegalSection>

        <LegalSection title="10. Suspension and Termination">
          <p>
            We may suspend or terminate your account if you violate these Terms,
            our Community Guidelines, or applicable law, or if we reasonably
            believe your account poses a risk to Shopi or other users.
          </p>
          <p>
            You can stop using Shopi and request deletion of your account at any
            time by contacting us.
          </p>
        </LegalSection>

        <LegalSection title="11. Intellectual Property">
          <p>
            The Shopi name, logo, app design, and underlying software are owned
            by Shopi Limited and protected by intellectual property laws.
            Nothing in these Terms grants you rights to our branding or platform
            beyond what&apos;s necessary to use Shopi as intended.
          </p>
        </LegalSection>

        <LegalSection title="12. Disclaimers and Limitation of Liability">
          <p>
            Shopi is provided &quot;as is.&quot; We do not guarantee that
            listings are accurate, that sellers or buyers will act honestly, or
            that any transaction will be completed successfully.
          </p>
          <p>
            To the fullest extent permitted by Kenyan law, Shopi Limited is not
            liable for any loss or damage arising from transactions between
            buyers and sellers (including scams, non-delivery, or disputes over
            item condition), content posted by users, or interruptions, errors,
            or unavailability of the platform.
          </p>
          <p>
            Nothing in these Terms limits liability that cannot be limited under
            Kenyan law, including liability for fraud or wilful misconduct.
          </p>
        </LegalSection>

        <LegalSection title="13. Governing Law and Disputes">
          <p>
            These Terms are governed by the laws of Kenya. Any dispute arising
            from these Terms or your use of Shopi will be subject to the
            exclusive jurisdiction of the courts of Kenya. We encourage you to
            contact us first so we can try to resolve any issue informally.
          </p>
        </LegalSection>

        <LegalSection title="14. Changes to These Terms">
          <p>
            We may update these Terms from time to time as Shopi evolves. If we
            make material changes, we&apos;ll notify you through the app or by
            other reasonable means. Continuing to use Shopi after changes take
            effect means you accept the updated Terms.
          </p>
        </LegalSection>

        <LegalSection title="15. Contact Us">
          <address className="not-italic leading-[1.8]">
            <strong>Shopi Limited</strong>
            <br />
            Nairobi, Kenya
            <br />
            Email:{" "}
            <a href={`mailto:${siteConfig.supportEmail}`}>
              {siteConfig.supportEmail}
            </a>
          </address>
        </LegalSection>

        <div className="mt-12 flex flex-wrap gap-6 border-t border-border pt-8">
          <Link
            href={`${base}/privacy`}
            className="text-[0.875rem] text-primary"
          >
            Privacy Policy
          </Link>
          <Link
            href={`${base}/cookies`}
            className="text-[0.875rem] text-primary"
          >
            Cookie Policy
          </Link>
          <Link
            href={`${base}/community-guidelines`}
            className="text-[0.875rem] text-primary"
          >
            Community Guidelines
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
