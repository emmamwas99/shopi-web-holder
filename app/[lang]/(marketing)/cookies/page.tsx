import Link from "next/link";
import { LegalNav } from "@/components/legal/LegalNav";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { publicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/config/site";

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return publicPageMetadata({
    lang,
    path: "/cookies",
    title: "Cookie Policy",
    description:
      "How Shopi uses cookies and similar browser storage technologies.",
  });
}

const LAST_UPDATED = "14 July 2026";

const storageItems = [
  {
    name: "shopi-auth-hint",
    type: "Cookie — essential",
    purpose:
      "A flag indicating you're signed in, used to decide whether to show signed-in or signed-out pages. Does not contain your password or session token.",
    expiry: "1 year or until sign out",
  },
  {
    name: "shopi-auth (local storage)",
    type: "Local storage — essential",
    purpose:
      "Keeps you signed in across visits so you don't have to log in every time.",
    expiry: "Until sign out or cleared",
  },
  {
    name: "shopi-theme (local storage)",
    type: "Local storage — preference",
    purpose: "Remembers whether you're using light or dark mode.",
    expiry: "Until cleared",
  },
  {
    name: "Auth-intent redirect (session storage)",
    type: "Session storage — essential",
    purpose:
      "Temporarily remembers where to send you after signing in (e.g. back to a seller's chat).",
    expiry: "Until tab is closed",
  },
  {
    name: "Scroll position (session storage)",
    type: "Session storage — functional",
    purpose: "Restores your scroll position when navigating back to a feed.",
    expiry: "Until tab is closed",
  },
];

type Props = { params: Promise<{ lang: string }> };

export default async function CookiesPage({ params }: Props) {
  const { lang } = await params;
  const base = `/${lang}`;
  return (
    <>
      <LegalNav lang={lang} />
      <BreadcrumbJsonLd
        lang={lang}
        trail={[{ name: "Cookie Policy", path: "/cookies" }]}
      />
      <main className="mx-auto max-w-215 px-5 pt-20 pb-24">
        <div className="mb-10">
          <p className="mb-3 text-[0.8rem] md:text-[0.875rem] font-semibold tracking-[0.08em] uppercase text-primary">
            Legal
          </p>
          <h1 className="mb-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.03em] text-foreground">
            Cookie Policy
          </h1>
          <p className="text-[0.875rem] md:text-[1rem] text-muted">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <LegalSection>
          <p>
            This policy explains how Shopi uses cookies and similar technologies
            (like local storage and session storage) in your browser.
          </p>
          <p>
            Shopi keeps this simple: we only use what&apos;s needed to make the
            app work. We don&apos;t run advertising or analytics tracking
            scripts.
          </p>
        </LegalSection>

        <LegalSection title="1. What We Use, and Why">
          <h3>Essential cookies</h3>
          <p>
            <code className="font-mono text-[0.85rem]">shopi-auth-hint</code> —
            a small cookie we set when you&apos;re signed in. It doesn&apos;t
            contain your password or session token — it&apos;s a flag our system
            uses to decide whether to show you signed-in or signed-out pages. It
            lasts up to one year or until you sign out.
          </p>
          <h3>Local storage</h3>
          <p>
            We use your browser&apos;s local storage (not a cookie, but a
            similar browser technology) to:
          </p>
          <ul>
            <li>
              <strong>Keep you signed in</strong> — we store your session
              information locally so you don&apos;t have to log in every time
              you open Shopi
            </li>
            <li>
              <strong>Remember your theme preference</strong> — whether
              you&apos;re using light or dark mode
            </li>
          </ul>
          <h3>Session storage</h3>
          <p>
            We use session storage, which clears automatically when you close
            your browser tab, to:
          </p>
          <ul>
            <li>
              Restore your scroll position when you navigate back to a feed
            </li>
            <li>
              Temporarily remember where to send you after you sign in (for
              example, if you tried to message a seller before logging in)
            </li>
            <li>
              Remember if you&apos;ve dismissed certain in-app prompts during
              your visit
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="2. Storage Details">
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-[0.825rem]">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Purpose</Th>
                  <Th>Expiry</Th>
                </tr>
              </thead>
              <tbody>
                {storageItems.map((c, i) => (
                  <tr
                    key={c.name}
                    className={`border-b border-border ${i % 2 === 0 ? "bg-transparent" : "bg-surface"}`}
                  >
                    <Td>
                      <code className="font-mono text-[0.8rem]">{c.name}</code>
                    </Td>
                    <Td>{c.type}</Td>
                    <Td>{c.purpose}</Td>
                    <Td className="whitespace-nowrap">{c.expiry}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LegalSection>

        <LegalSection title="3. What We Don't Use">
          <p>As of this policy&apos;s last update, Shopi does not use:</p>
          <ul>
            <li>Advertising cookies or ad-tracking pixels</li>
            <li>Third-party analytics cookies (like Google Analytics)</li>
            <li>Cross-site tracking technologies</li>
          </ul>
          <p>
            If this changes in the future, we&apos;ll update this policy and,
            where required, ask for your consent first.
          </p>
        </LegalSection>

        <LegalSection title="4. Push Notifications">
          <p>
            If you opt in to push notifications, your browser stores a
            subscription on your device that lets us send you alerts (like new
            messages). This isn&apos;t a cookie, but it&apos;s a similar
            browser-level permission. You can turn this off any time in your
            browser or device notification settings.
          </p>
        </LegalSection>

        <LegalSection title="5. Managing Local Storage and Cookies">
          <p>
            You can clear cookies and local storage through your browser
            settings at any time. Note that doing so will sign you out of Shopi
            and reset your saved preferences.
          </p>
          <p>
            Because we don&apos;t use tracking cookies, you generally don&apos;t
            need to take any action for privacy reasons — the technologies above
            exist to make Shopi function properly, not to track you across the
            web.
          </p>
        </LegalSection>

        <LegalSection title="6. Changes to This Policy">
          <p>
            If the cookies and storage technologies we use change, we&apos;ll
            update this page and, where the law requires it, ask for your
            consent.
          </p>
        </LegalSection>

        <LegalSection title="7. Contact">
          <p>Questions about this policy?</p>
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
          <Link href={`${base}/terms`} className="text-[0.875rem] text-primary">
            Terms of Service
          </Link>
        </div>
      </main>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-[0.6rem] font-bold whitespace-nowrap text-foreground">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-3 py-[0.6rem] align-top text-muted ${className}`}>
      {children}
    </td>
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
