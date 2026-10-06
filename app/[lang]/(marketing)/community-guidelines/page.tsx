import Link from "next/link";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { publicPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/community-guidelines",
    title: "Community Guidelines",
    description:
      "What we expect from everyone on Shopi so the platform stays safe and trustworthy.",
  });
}

const LAST_UPDATED = "14 July 2026";

type Props = { params: Promise<{ lang: string }> };

export default async function CommunityGuidelinesPage({ params }: Props) {
  const { lang } = await params;
  const base = `/${lang}`;
  return (
    <>
      <LegalNav lang={lang} />
      <BreadcrumbJsonLd
        lang={lang}
        trail={[
          { name: "Community Guidelines", path: "/community-guidelines" },
        ]}
      />
      <main className="mx-auto max-w-215 px-5 pt-20 pb-24">
        <div className="mb-10">
          <p className="mb-3 text-[0.8rem] md:text-[0.875rem] font-semibold tracking-[0.08em] uppercase text-primary">
            Legal
          </p>
          <h1 className="mb-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.03em] text-foreground">
            Community Guidelines
          </h1>
          <p className="text-[0.875rem] md:text-[1rem] text-muted">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <LegalSection>
          <p>
            Shopi works because people trust each other. These guidelines
            explain what we expect from everyone on the platform — buyers,
            sellers, and browsers alike — so Shopi stays a safe, useful place to
            discover and sell things.
          </p>
          <p>
            These guidelines work alongside our{" "}
            <Link href={`${base}/terms`}>Terms of Service</Link> and{" "}
            <Link href={`${base}/prohibited-items`}>
              Prohibited Items Policy
            </Link>
            . Breaking them can lead to content removal, account restrictions,
            or a permanent ban.
          </p>
        </LegalSection>

        <LegalSection title="1. Be Honest in Your Listings">
          <p>Your listing should describe what you&apos;re actually selling.</p>
          <h3>Do</h3>
          <ul>
            <li>
              Use real photos of the actual item (or clearly representative
              photos for made-to-order items)
            </li>
            <li>State the true condition, price, and any flaws</li>
            <li>Update or remove your listing once an item is sold</li>
          </ul>
          <h3>Don&apos;t</h3>
          <ul>
            <li>Post photos of items you don&apos;t actually have</li>
            <li>
              Use misleading pricing (e.g. listing at a fake
              &quot;discount&quot;)
            </li>
            <li>
              Use AI-generated images or descriptions that misrepresent what a
              buyer will actually receive
            </li>
            <li>Repost the same listing repeatedly to spam feeds</li>
          </ul>
        </LegalSection>

        <LegalSection title="2. Communicate Respectfully">
          <p>Messaging is at the heart of buying and selling on Shopi.</p>
          <h3>Do</h3>
          <ul>
            <li>Respond to genuine buyer/seller enquiries in good faith</li>
            <li>Disagree or decline a deal politely</li>
            <li>Report a conversation if someone is abusive or suspicious</li>
          </ul>
          <h3>Don&apos;t</h3>
          <ul>
            <li>
              Harass, threaten, or send unwanted sexual messages to another user
            </li>
            <li>
              Use hate speech or discriminatory language based on someone&apos;s
              ethnicity, tribe, religion, gender, disability, or other protected
              characteristic
            </li>
            <li>Spam users with unsolicited promotional messages</li>
          </ul>
        </LegalSection>

        <LegalSection title="3. No Scams or Fraud">
          <p>
            Shopi doesn&apos;t process payments, which means trust between
            buyers and sellers matters even more.
          </p>
          <ul>
            <li>
              Don&apos;t ask a buyer to pay before showing or verifying the item
            </li>
            <li>
              Don&apos;t impersonate a courier, delivery service, or &quot;Shopi
              support&quot; to request payment or personal details
            </li>
            <li>
              Don&apos;t run advance-fee schemes (&quot;pay a deposit to secure
              the item&quot; scams)
            </li>
            <li>
              Don&apos;t promote pyramid schemes, get-rich-quick schemes, or
              unregistered investment opportunities
            </li>
            <li>
              Don&apos;t use stolen payment details or facilitate fraud in any
              way
            </li>
          </ul>
          <p>
            If something feels off — unusually low prices, pressure to pay
            quickly, refusal to meet or show the item — report it.
          </p>
        </LegalSection>

        <LegalSection title="4. No Dangerous or Illegal Content">
          <p>Don&apos;t post or promote:</p>
          <ul>
            <li>Content that threatens or incites violence</li>
            <li>
              Instructions for making weapons, explosives, or dangerous
              substances
            </li>
            <li>
              Content sexually exploiting or endangering minors — this is
              reported to relevant authorities immediately
            </li>
            <li>
              Items or services covered by our{" "}
              <Link href={`${base}/prohibited-items`}>
                Prohibited Items Policy
              </Link>
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Respect Intellectual Property">
          <ul>
            <li>
              Don&apos;t post counterfeit goods or knock-offs presented as
              genuine branded products
            </li>
            <li>
              Don&apos;t use copyrighted photos, videos, or designs that
              aren&apos;t yours without permission
            </li>
            <li>Don&apos;t copy another seller&apos;s listing content</li>
          </ul>
          <p>
            If you believe your copyright has been infringed, see our{" "}
            <Link href={`${base}/contact`}>Contact Us</Link> page for how to
            file a complaint.
          </p>
        </LegalSection>

        <LegalSection title="6. One Person, One Account">
          <p>Use a single account that represents you honestly.</p>
          <ul>
            <li>
              Don&apos;t create multiple accounts to get around a suspension
            </li>
            <li>
              Don&apos;t use fake accounts to inflate your own likes, followers,
              or views
            </li>
            <li>Don&apos;t buy or sell followers, likes, or engagement</li>
          </ul>
        </LegalSection>

        <LegalSection title="7. AI-Generated Content">
          <p>
            If you use AI tools to help create a listing (for example,
            generating a description), make sure the final listing still
            accurately reflects the real item. Misleading AI-generated content —
            such as images that don&apos;t represent what&apos;s actually for
            sale — is treated the same as any other misleading listing.
          </p>
        </LegalSection>

        <LegalSection title="8. Reporting Abuse">
          <p>If you see something that breaks these guidelines, you can:</p>
          <ul>
            <li>Report a conversation directly from the chat</li>
            <li>Block a user to stop them contacting you</li>
            <li>
              Contact us for anything that needs closer review — see{" "}
              <Link href={`${base}/contact`}>Contact Us</Link>
            </li>
          </ul>
          <p>
            We review reports and take action ranging from a warning to
            permanent account removal, depending on severity.
          </p>
        </LegalSection>

        <LegalSection title="9. What Happens If You Break These Rules">
          <p>
            Depending on the seriousness and frequency of the issue, we may:
          </p>
          <ul>
            <li>Remove the specific listing or message</li>
            <li>Issue a warning</li>
            <li>Temporarily restrict your account</li>
            <li>Permanently ban your account</li>
          </ul>
          <p>
            Serious violations — fraud, threats, or content endangering minors —
            may result in immediate permanent removal and, where required by
            law, a report to the relevant authorities.
          </p>
        </LegalSection>

        <div className="mt-12 flex flex-wrap gap-6 border-t border-border pt-8">
          <Link href={`${base}/terms`} className="text-[0.875rem] text-primary">
            Terms of Service
          </Link>
          <Link
            href={`${base}/prohibited-items`}
            className="text-[0.875rem] text-primary"
          >
            Prohibited Items Policy
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
