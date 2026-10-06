import Link from "next/link";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { publicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/config/site";

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/privacy",
    title: "Privacy Policy",
    description: "How Shopi collects, uses, and protects your personal data.",
  });
}

const LAST_UPDATED = "14 July 2026";

type Props = { params: Promise<{ lang: string }> };

export default async function PrivacyPage({ params }: Props) {
  const { lang } = await params;
  const base = `/${lang}`;
  return (
    <>
      <LegalNav lang={lang} />
      <BreadcrumbJsonLd
        lang={lang}
        trail={[{ name: "Privacy Policy", path: "/privacy" }]}
      />
      <main className="mx-auto max-w-215 px-5 pt-20 pb-24">
        <div className="mb-10">
          <p className="mb-3 text-[0.8rem] md:text-[0.875rem] font-semibold tracking-[0.08em] uppercase text-primary">
            Legal
          </p>
          <h1 className="mb-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.03em] text-foreground">
            Privacy Policy
          </h1>
          <p className="text-[0.875rem] md:text-[1rem] text-muted">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <LegalSection>
          <p>
            Shopi Limited (&quot;Shopi&quot;, &quot;we&quot;, &quot;us&quot;)
            operates Shopi, Kenya&apos;s social discovery classifieds
            marketplace. This policy explains what personal information we
            collect, why we collect it, and the choices you have.
          </p>
          <p>
            Shopi is a platform that helps buyers and sellers find each other.
            We do not process payments, hold money, arrange delivery, or take a
            commission on any sale. This affects the kind of information we
            collect — for example, we never ask for your card details or M-Pesa
            PIN.
          </p>
          <p>
            By using Shopi, you agree to the collection and use of information
            as described in this policy.
          </p>
        </LegalSection>

        <LegalSection title="1. Information You Give Us">
          <h3>Account information</h3>
          <p>
            When you register, we collect your email address and a password (if
            you sign up with email), or basic profile details shared by Google,
            Apple, or Facebook when you sign up using one of those services.
          </p>
          <h3>Profile information</h3>
          <p>
            You can add a username, first name, last name, avatar, bio, and
            website link. Some of this is visible to other users on your public
            profile.
          </p>
          <h3>Listings you create</h3>
          <p>
            When you post a listing, we collect the title, caption, hashtags,
            price and currency, whether the price is negotiable, any custom
            specifications you add, and the location you choose (county,
            sub-county, ward, and place details). You choose what location
            detail to share on each listing.
          </p>
          <h3>Media you upload</h3>
          <p>
            Photos and videos you upload to create listings, including videos
            imported from TikTok if you use that feature.
          </p>
          <h3>Messages</h3>
          <p>
            When you message another user, we store the content of that
            conversation so both people can see their message history. If you
            choose to share your location in a message, we store the coordinates
            and label you provided.
          </p>
          <h3>Reports and blocks</h3>
          <p>
            If you report a conversation or block another user, we store the
            reason and any details you provide so we can review the report.
          </p>
        </LegalSection>

        <LegalSection title="2. Information Collected Automatically">
          <h3>Device and usage information</h3>
          <p>
            We automatically receive some technical information when you use
            Shopi, such as your browser type, general usage patterns within the
            app, and information needed to keep your session secure.
          </p>
          <h3>Location information</h3>
          <p>
            If you allow it, we use your browser&apos;s location permission to
            show you listings near you and to help you set an accurate location
            when creating a listing. You can decline this permission —
            location-based features simply won&apos;t work as well.
          </p>
          <h3>Push notification data</h3>
          <p>
            If you enable push notifications, we store the technical
            subscription details needed to deliver them (such as the
            notification endpoint and encryption keys), along with your locale
            and browser/device type.
          </p>
          <h3>Local and session storage</h3>
          <p>
            We use your browser&apos;s local storage to keep you signed in and
            to remember your theme preference (light/dark mode). We use session
            storage for things like restoring your scroll position when you
            navigate back to a feed, and to remember short-lived states such as
            where to send you after signing in.
          </p>
          <p>
            We do not use tracking or analytics cookies. As of this
            policy&apos;s last update, Shopi does not run any third-party
            analytics, advertising, or tracking scripts. See our{" "}
            <Link href={`${base}/cookies`}>Cookie Policy</Link> for full detail.
          </p>
        </LegalSection>

        <LegalSection title="3. How We Use Your Information">
          <ul>
            <li>Create and manage your account</li>
            <li>
              Show your listings to other users and let them find you through
              search and nearby browsing
            </li>
            <li>Enable direct messaging between buyers and sellers</li>
            <li>
              Auto-suggest a category for your listing using automated
              classification, so it&apos;s easier to find
            </li>
            <li>
              Send you push notifications you&apos;ve opted into (like new
              messages)
            </li>
            <li>
              Investigate reports of abuse, harassment, or fraud, and enforce
              our Community Guidelines
            </li>
            <li>Keep the platform secure and prevent misuse</li>
          </ul>
        </LegalSection>

        <LegalSection title="4. AI-Assisted Features">
          <p>
            Shopi uses an automated system to suggest a category for listings
            based on the content you provide (title, photos, description). This
            helps buyers find your listing more easily. This classification is
            generated automatically and may occasionally be inaccurate — it does
            not affect your ownership of the listing content and you can always
            edit your listing details.
          </p>
        </LegalSection>

        <LegalSection title="5. Who We Share Information With">
          <p>
            <strong>Other users:</strong> Your public profile, listings, and any
            messages you send are visible to the people you&apos;re interacting
            with. Think of Shopi as a public marketplace — don&apos;t include
            sensitive personal information in a public listing that you
            don&apos;t want strangers to see.
          </p>
          <p>
            <strong>Service providers:</strong> We work with infrastructure
            providers that help us run Shopi, including cloud storage providers
            for hosting your photos, a video hosting and streaming provider for
            your videos, and mapping and location providers to resolve addresses
            and coordinates. These providers only process data on our behalf and
            are not permitted to use it for their own purposes.
          </p>
          <p>
            <strong>Legal reasons:</strong> We may disclose information if
            required by Kenyan law, to respond to a valid legal process, or to
            protect the rights, safety, or property of Shopi, our users, or the
            public.
          </p>
          <p>We do not sell your personal information.</p>
        </LegalSection>

        <LegalSection title="6. Data Retention">
          <p>
            We keep your account and listing information for as long as your
            account is active. If you delete your account, we will remove or
            anonymise your personal information within a reasonable period,
            except where we&apos;re required to keep certain records for legal
            or fraud-prevention purposes.
          </p>
          <p>
            Messages are retained as part of your conversation history until you
            or the other participant deletes the conversation, or your account
            is deleted.
          </p>
        </LegalSection>

        <LegalSection title="7. Security">
          <p>
            We take reasonable technical and organisational measures to protect
            your information, including secure transmission of data and access
            controls on our systems. No online service is 100% secure, so we
            encourage you to use a strong, unique password and to be cautious
            about the information you share with other users.
          </p>
        </LegalSection>

        <LegalSection title="8. Your Rights">
          <p>
            Under Kenya&apos;s Data Protection Act, 2019, you have the right to:
          </p>
          <ul>
            <li>Know what personal data we hold about you</li>
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to certain processing</li>
            <li>
              Withdraw consent where processing is based on consent (such as
              location access or push notifications) — you can do this at any
              time through your device or browser settings, or by contacting us
            </li>
          </ul>
          <p>
            You can update most of your profile information directly in the app.
            To exercise other rights, contact us using the details below.
          </p>
        </LegalSection>

        <LegalSection title="9. Children's Privacy">
          <p>
            Shopi is not intended for children under 18. We do not knowingly
            collect personal information from children. If you believe a child
            has created an account or provided us with personal information,
            please contact us so we can remove it.
          </p>
        </LegalSection>

        <LegalSection title="10. International Data Transfers">
          <p>
            Some of our service providers (such as cloud storage and video
            hosting) may process data outside Kenya. Where this happens, we take
            steps to ensure your information continues to receive an appropriate
            level of protection, consistent with the requirements of the Data
            Protection Act, 2019.
          </p>
        </LegalSection>

        <LegalSection title="11. Changes to This Policy">
          <p>
            We may update this policy from time to time as Shopi evolves. If we
            make material changes, we&apos;ll notify you through the app or by
            other reasonable means. The &quot;Last updated&quot; date at the top
            of this page shows when the policy last changed.
          </p>
        </LegalSection>

        <LegalSection title="12. Contact Us">
          <p>
            If you have questions about this policy or want to exercise your
            data protection rights, contact us:
          </p>
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
          <Link href={`${base}/terms`} className="text-[0.875rem] text-primary">
            Terms of Service
          </Link>
          <Link
            href={`${base}/cookies`}
            className="text-[0.875rem] text-primary"
          >
            Cookie Policy
          </Link>
          <Link
            href={`${base}/safety-centre`}
            className="text-[0.875rem] text-primary"
          >
            Safety Centre
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
