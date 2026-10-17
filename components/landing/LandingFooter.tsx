import Link from "next/link";
import { HomeLanguageSelect } from "./HomeLanguageSelect";
import { CookieSettingsButton } from "@/components/layout/CookieConsent";
//import { siteConfig } from "@/config/site";
import type { Dictionary } from "@/i18n/getDictionary";
import { ShopiLogo } from "@/features/auth/components/AuthIcons";
import { COUNTIES } from "@/lib/counties";

export function LandingFooter({
  dict,
  lang = "en",
  homeOnly = false,
}: {
  dict?: Dictionary;
  lang?: string;
  homeOnly?: boolean;
}) {
  if (homeOnly) {
    const sw = lang === "sw";
    const label = (en: string, kiswahili: string) => sw ? kiswahili : en;
    const homeLinks = [
      {
        heading: label("Product", "Bidhaa"),
        links: [
          { label: label("Features", "Faida"), href: `/${lang}#features` },
          { label: label("How it works", "Jinsi inavyofanya kazi"), href: `/${lang}#how-it-works` },
          { label: label("The feed", "Bidhaa zinazouzwa"), href: "/en/for-you" },
          { label: "Shopi Agent", href: "/en/shopi-agent" },
          { label: label("Sell on Shopi", "Uza kwenye Shopi"), href: "/en/upload" },
          { label: label("TikTok video downloader", "Pakua video za TikTok"), href: "/en/tiktok-downloader" },
        ],
      },
      {
        heading: label("Marketplace", "Soko"),
        links: [
          { label: label("Open For You", "Angalia For You"), href: "/en/for-you" },
          { label: label("Explore listings", "Vinjari matangazo"), href: "/en/explore" },
          { label: label("Search", "Tafuta"), href: "/en/search" },
          { label: label("Sell in Kenya", "Uza Kenya"), href: "/en/sell-in-kenya" },
          { label: label("Sell a car", "Uza gari"), href: "/en/sell-car-kenya" },
          { label: label("Property", "Ardhi na nyumba"), href: "/en/property-for-sale-kenya" },
          { label: label("Beauty & cosmetics", "Urembo"), href: "/en/beauty-cosmetics-kenya" },
          { label: label("Phones & electronics", "Simu na vifaa vya elektroniki"), href: "/en/phones-electronics-kenya" },
          { label: label("Start selling", "Anza kuuza"), href: "/en/upload" },
        ],
      },
      {
        heading: label("Counties", "Kaunti"),
        links: COUNTIES.slice(0, 6).map((county) => ({ label: county.name, href: `/en/marketplace/${county.slug}` })),
      },
      {
        heading: label("Company", "Kampuni"),
        links: [
          { label: label("About", "Kutuhusu"), href: "/en/about" },
          { label: label("FAQ", "Maswali"), href: "/en/faq" },
          { label: label("Compare marketplaces", "Linganisha masoko"), href: "/en/marketplace-alternatives-kenya" },
          { label: "Jiji alternative", href: "/en/jiji-alternative-kenya" },
          { label: "PigiaMe alternative", href: "/en/pigiame-alternative-kenya" },
          { label: "Blog", href: "/en/blog" },
          { label: label("Online selling jobs", "Kazi za kuuza mtandaoni"), href: "/en/online-selling-jobs-kenya" },
        ],
      },
      {
        heading: label("Legal", "Sheria"),
        links: [
          { label: label("Privacy Policy", "Sera ya faragha"), href: "/en/privacy-policy" },
          { label: label("Terms of Service", "Masharti ya huduma"), href: "/en/terms-and-conditions" },
          { label: label("Cookie Policy", "Sera ya kuki"), href: "/en/cookies" },
          { label: label("Community Guidelines", "Kanuni za jamii"), href: "/en/community-guidelines" },
          { label: label("Prohibited Items", "Bidhaa zilizopigwa marufuku"), href: "/en/prohibited-items" },
          { label: label("Safety Centre", "Kituo cha usalama"), href: "/en/safety-centre" },
          { label: label("Contact", "Wasiliana nasi"), href: "/en/contact" },
        ],
      },
    ];
    return (
      <footer className="bg-secondary text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-18">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-b border-white/20 pb-12 sm:grid-cols-3 lg:grid-cols-[1.6fr_repeat(5,minmax(0,1fr))] lg:gap-7">
            <div className="col-span-2 sm:col-span-3 lg:col-span-1">
              <Link href={`/${lang}`} className="inline-flex items-center gap-2 text-white no-underline"><ShopiLogo className="h-9 w-9" /><span className="text-xl font-bold">Shopi</span></Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/75">{sw ? "Gundua, nunua na uuze karibu nawe kwa msaada wa Shopi Agent." : "Discover, buy and sell locally with help from Shopi Agent."}</p>
              <Link href="/en/upload" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white no-underline">{sw ? "Uza bidhaa" : "Sell an item"}</Link>
            </div>
            {homeLinks.map(({ heading, links }) => <div key={heading} className="min-w-0">
              <h3 className="mb-4 text-sm font-semibold text-white">{heading}</h3>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {links.map((item) => <li key={item.href + item.label}><Link href={item.href} className="text-sm leading-snug text-white/75 no-underline hover:text-white">{item.label}</Link></li>)}
              </ul>
            </div>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-5 pt-7 text-sm text-white/70"><span>© {new Date().getFullYear()} Shopi · {sw ? "Imetengenezwa Kenya" : "Made in Kenya"}</span><div className="flex flex-wrap items-center gap-5"><CookieSettingsButton className="cursor-pointer text-sm text-white/75 underline-offset-2 hover:text-white hover:underline">{sw ? "Mipangilio ya kuki" : "Cookie settings"}</CookieSettingsButton><HomeLanguageSelect current={sw ? "sw" : "en"} /></div></div>
        </div>
      </footer>
    );
  }
  return (
    // Self-contained landing shell: pages that render the footer outside the
    // landing wrapper still get the same inset and --landing-page-* values.
    <div className="lg:px-30 [--landing-page-max:1400px] [--landing-page-x:1rem] md:[--landing-page-x:clamp(0.875rem,1.2vw,1.25rem)]">
      <footer className="rounded-md border-t border-border bg-surface px-(--landing-page-x) pt-8 pb-6 md:mb-8 md:pt-12 md:pb-8">
        {/* Brand column + five link columns. Keep the track count in step with
            the array below — adding a column without widening this template
            silently wraps it onto a second row. */}
        {/* Phones: two compact link columns under the brand, not one long list. */}
        <div className="mx-auto mb-8 grid max-w-(--landing-page-max) grid-cols-2 gap-x-4 gap-y-7 md:mb-12 md:gap-8 lg:grid-cols-[1.7fr_1fr_1fr_1fr_1fr_1fr] lg:gap-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-7.5  font-display text-[0.875rem]">
                <ShopiLogo height={56} />
              </div>
            </div>
            <p className="max-w-65 text-sm leading-normal text-muted">
              {dict?.footer.tagline ??
                "Kenya's social marketplace. Discover it, message the seller, done."}
            </p>
          </div>

          {/* Links */}
          {[
            {
              // Locale-prefixed hashes so these work from every page that
              // renders the footer (about, blog, legal…), not just the landing.
              heading: "Product",
              links: [
                { label: "Features", href: `/${lang}#features` },
                { label: "How It Works", href: `/${lang}#how-it-works` },
                { label: "The Feed", href: `/${lang}#dive-feed` },
                { label: "Shopi Agent", href: `/${lang}/shopi-agent` },
                { label: "Sell on Shopi", href: `/${lang}#creators` },
                {
                  label: "TikTok video downloader",
                  href: `/${lang}/tiktok-downloader`,
                },
              ],
            },
            {
              heading: "Marketplace",
              links: [
                { label: "Open For You", href: `/${lang}/for-you` },
                { label: "Explore listings", href: `/${lang}/explore` },
                { label: "Search", href: `/${lang}/search` },
                { label: "Sell in Kenya", href: `/${lang}/sell-in-kenya` },
                { label: "Sell a car", href: `/${lang}/sell-car-kenya` },
                {
                  label: "Property",
                  href: `/${lang}/property-for-sale-kenya`,
                },
                {
                  label: "Beauty & cosmetics",
                  href: `/${lang}/beauty-cosmetics-kenya`,
                },
                {
                  label: "Phones & electronics",
                  href: `/${lang}/phones-electronics-kenya`,
                },
                { label: "Start selling", href: `/${lang}/upload` },
              ],
            },
            {
              // County pages earn local-intent traffic ("… for sale in
              // Nakuru"), but a page reachable only from the sitemap is treated
              // as low-importance and passes no link equity. The footer is the
              // one block that appears on every page, so it's where they go.
              heading: "Counties",
              links: COUNTIES.slice(0, 6).map((county) => ({
                label: county.name,
                href: `/${lang}/marketplace/${county.slug}`,
              })),
            },
            {
              heading: "Company",
              links: [
                { label: "About", href: `/${lang}/about` },
                { label: "FAQ", href: `/${lang}/faq` },
                {
                  label: "Compare marketplaces",
                  href: `/${lang}/marketplace-alternatives-kenya`,
                },
                {
                  label: "Jiji alternative",
                  href: `/${lang}/jiji-alternative-kenya`,
                },
                {
                  label: "PigiaMe alternative",
                  href: `/${lang}/pigiame-alternative-kenya`,
                },
                { label: "Blog", href: `/${lang}/blog` },
                {
                  label: "Online selling jobs",
                  href: `/${lang}/online-selling-jobs-kenya`,
                },
              ],
            },
            {
              heading: "Legal",
              links: [
                { label: "Privacy Policy", href: `/${lang}/privacy-policy` },
                { label: "Terms of Service", href: `/${lang}/terms-and-conditions` },
                { label: "Cookie Policy", href: `/${lang}/cookies` },
                {
                  label: "Community Guidelines",
                  href: `/${lang}/community-guidelines`,
                },
                {
                  label: "Prohibited Items",
                  href: `/${lang}/prohibited-items`,
                },
                { label: "Safety Centre", href: `/${lang}/safety-centre` },
                { label: "Contact", href: `/${lang}/contact` },
              ],
            },
          ].map(({ heading, links }) => (
            <div key={heading}>
              {/* h3, not h4: the section above the footer ends at h2, so h3 keeps
                the page heading outline sequential (WCAG / Lighthouse). */}
              <h3 className="mb-2 text-[0.8125rem] font-bold tracking-[0.02em] text-foreground md:mb-4 md:text-sm">
                {heading}
              </h3>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 md:gap-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="inline-block py-1 text-[0.8125rem] text-muted no-underline transition-colors duration-150 hover:text-foreground md:py-0 md:text-sm"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mx-auto flex max-w-(--landing-page-max) items-center justify-between border-t border-border pt-6 text-xs text-muted">
          <span>
            {dict?.footer.copyright.replace(
              "{year}",
              String(new Date().getFullYear()),
            ) ??
              `© ${new Date().getFullYear()} Shopi Limited. All rights reserved.`}
          </span>
          <span className="flex items-center gap-4">
            <CookieSettingsButton className="cursor-pointer text-xs text-muted underline-offset-2 hover:text-main hover:underline" />
            <span>Made in Kenya</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
