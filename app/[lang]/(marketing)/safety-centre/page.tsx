import Link from "next/link";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { publicPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/safety-centre",
    title: "Safety Centre",
    description: "Practical safety guidance for buying and selling on Shopi.",
  });
}

const LAST_UPDATED = "14 July 2026";

type Props = { params: Promise<{ lang: string }> };

export default async function SafetyCentrePage({ params }: Props) {
  const { lang } = await params;
  const base = `/${lang}`;
  return (
    <>
      <LegalNav lang={lang} />
      <BreadcrumbJsonLd
        lang={lang}
        trail={[{ name: "Safety Centre", path: "/safety-centre" }]}
      />
      <main className="mx-auto max-w-215 px-5 pt-20 pb-24">
        <div className="mb-10">
          <p className="mb-3 text-[0.8rem] md:text-[0.875rem] font-semibold tracking-[0.08em] uppercase text-primary">
            Legal
          </p>
          <h1 className="mb-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.03em] text-foreground">
            Safety Centre
          </h1>
          <p className="text-[0.875rem] md:text-[1rem] text-muted">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <LegalSection>
          <p>
            Shopi helps you discover and connect with buyers and sellers — but
            because we don&apos;t process payments or arrange delivery, staying
            safe is a shared responsibility between you and the person
            you&apos;re dealing with. Here&apos;s how to do it well.
          </p>
        </LegalSection>

        <LegalSection title="For Buyers">
          <h3>Inspect before you commit</h3>
          <p>
            Ask for extra photos or a short video call if something feels
            unclear. Check the item in person before paying whenever possible.
          </p>
          <h3>Meet safely</h3>
          <p>
            If you&apos;re meeting in person to view or collect an item, choose
            a public, well-lit location — a shopping centre, police station
            vicinity, or busy public space. Avoid isolated locations, and
            consider bringing a friend.
          </p>
          <h3>Verify the seller</h3>
          <p>
            Look at their profile — how long they&apos;ve been active, their
            listing history, and their follower/rating signals. A brand-new
            account with no history and unrealistically low prices is worth
            extra caution.
          </p>
          <h3>Avoid common scams</h3>
          <ul>
            <li>
              Be wary of sellers who pressure you to pay a deposit before
              you&apos;ve seen the item
            </li>
            <li>
              Never pay through untraceable or unfamiliar payment methods at a
              stranger&apos;s request
            </li>
            <li>
              If a deal feels rushed or &quot;too good to be true,&quot; slow
              down
            </li>
          </ul>
          <h3>Report suspicious behaviour</h3>
          <p>
            If a seller behaves suspiciously, block them and report the
            conversation from within the app.
          </p>
        </LegalSection>

        <LegalSection title="For Sellers">
          <h3>Protect your personal information</h3>
          <p>
            Only share the details a buyer actually needs (like a general
            meeting location). Avoid sharing your home address, ID number, or
            financial details in chat.
          </p>
          <h3>Verify buyers where it matters</h3>
          <p>
            For higher-value items, treat the transaction with the same caution
            you&apos;d expect a buyer to use — check the buyer&apos;s profile
            history and be cautious of first-time accounts asking for unusual
            arrangements.
          </p>
          <h3>Meet in safe locations</h3>
          <p>
            Choose public places to hand over items, especially for high-value
            transactions. Daytime, populated locations are best.
          </p>
          <h3>Watch for fraudulent payment claims</h3>
          <p>
            Be cautious of buyers who claim to have &quot;already paid&quot; and
            ask you to check a suspicious link, or who send a fake payment
            confirmation screenshot. Always confirm funds have actually landed
            in your account before handing over an item.
          </p>
        </LegalSection>

        <LegalSection title="General Account and Online Safety">
          <h3>Use a strong, unique password</h3>
          <p>
            Don&apos;t reuse passwords from other sites. If you signed up with
            Google, Apple, or Facebook, make sure that account itself is secured
            with a strong password and two-factor authentication where
            available.
          </p>
          <h3>Watch for phishing</h3>
          <p>
            Shopi will never ask you for your password over chat or email. Be
            suspicious of messages or emails claiming to be from &quot;Shopi
            Support&quot; that ask you to click a link or share login details
            outside the app.
          </p>
          <h3>Keep your app and browser updated</h3>
          <p>This helps protect you against known security issues.</p>
          <h3>Report abuse promptly</h3>
          <p>
            Use the block and report tools in messaging as soon as you notice
            harassment, a scam attempt, or a prohibited listing. Reports help us
            take action and keep other users safe.
          </p>
        </LegalSection>

        <LegalSection title="If Something Goes Wrong">
          <p>
            If you believe you&apos;ve been scammed or are in a dispute with
            another user, Shopi is not able to reverse payments or recover
            funds, since we don&apos;t process transactions. We recommend:
          </p>
          <ul>
            <li>
              Reporting the user on Shopi immediately so we can review the
              account
            </li>
            <li>
              Reporting the incident to the relevant Kenyan authorities (for
              example, the Directorate of Criminal Investigations for fraud) if
              money or property was involved
            </li>
          </ul>
          <p>
            <strong>In an emergency</strong>, contact local emergency services
            directly — Shopi is not a substitute for emergency assistance and
            cannot respond to real-time safety threats.
          </p>
        </LegalSection>

        <div className="mt-12 flex flex-wrap gap-6 border-t border-border pt-8">
          <Link
            href={`${base}/community-guidelines`}
            className="text-[0.875rem] text-primary"
          >
            Community Guidelines
          </Link>
          <Link
            href={`${base}/contact`}
            className="text-[0.875rem] text-primary"
          >
            Contact Us
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
