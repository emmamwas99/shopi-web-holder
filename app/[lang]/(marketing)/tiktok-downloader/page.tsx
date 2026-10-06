import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalNav } from "@/components/legal/LegalNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { TiktokSaverTool } from "@/components/tools/TiktokSaverTool";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema, faqSchema, jsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string }> };

const PATH = "/tiktok-downloader";
// Bump when the copy or the tool's behaviour changes. Feeds dateModified and
// the visible "Updated" line — see README "Blog content: SEO checks".
const LAST_UPDATED = "2026-09-15";

// The title and H1 carry the head terms people type ("TikTok downloader",
// "download TikTok videos", "without watermark"). Every capability claimed on
// this page is what /api/tiktok-save actually does: public videos only, MP4
// only (no MP3), HD when TikTok serves an HD file, nothing stored.
const TITLE = "TikTok Downloader — Save Videos Without Watermark";
const DESCRIPTION =
  "Free TikTok downloader: paste a link to save a public TikTok video as an MP4 without the watermark, in HD where available. No app or sign-up needed.";

const STEPS = [
  {
    title: "Copy the TikTok link",
    body: "In the TikTok app, open the video, tap Share, then Copy link. On a computer, copy the video's address from your browser bar.",
  },
  {
    title: "Paste it and tap Get video",
    body: "Paste the link into the box above. The video's cover, caption and creator appear, so you can check it's the right one before saving.",
  },
  {
    title: "Tap Save video",
    body: "The MP4 downloads straight to your device, with no TikTok watermark on it.",
  },
];

const DEVICES = [
  {
    title: "On iPhone or iPad",
    body: "Safari saves it to the Downloads folder in the Files app. Open Files, go to Downloads, tap the video, then tap Share and Save Video to add it to your Photos.",
  },
  {
    title: "On Android",
    body: "Chrome saves it to your Downloads folder. Open your Files app, or look for the Downloads album in your gallery, and it's ready to post to WhatsApp status.",
  },
  {
    title: "On a computer",
    body: "It lands in your usual Downloads folder as an MP4, which plays in any video player and uploads to any site that takes video.",
  },
];

const USES = [
  "Post your product video to WhatsApp status for the customers who already have your number",
  "Reuse the same clip on Instagram Reels, Facebook or YouTube Shorts",
  "Add it to a Shopi listing so buyers near you can message you about the item",
  "Keep a backup of the videos you've made, in case you ever lose access to your account",
];

const FAQ = [
  {
    q: "Is this TikTok downloader free?",
    a: "Yes. It's free to use, with no sign-up and no app to install. Shopi doesn't add its own watermark or logo to the video either.",
  },
  {
    q: "How do I download a TikTok video without the watermark?",
    a: "Copy the video's link from TikTok (tap Share, then Copy link), paste it into the box on this page, tap Get video, then tap Save video. The MP4 saves to your device without the TikTok watermark.",
  },
  {
    q: "Can I download TikTok videos on iPhone?",
    a: "Yes. Use Safari on your iPhone or iPad. The video saves to the Downloads folder in the Files app; open it there and tap Share, then Save Video, to move it into Photos.",
  },
  {
    q: "How do I save a TikTok video to my gallery on Android?",
    a: "Download it with this tool in Chrome and it goes to your Downloads folder. Most Android phones show it in the gallery under Downloads, or you can find it in the Files app.",
  },
  {
    q: "What quality are the downloads?",
    a: "Videos save as MP4 files. When TikTok has an HD version of the video, that's the one you get; otherwise you get the standard quality TikTok serves.",
  },
  {
    q: "Do I need a TikTok account to download a video?",
    a: "No. You only need the link to a public TikTok video. You don't sign in to TikTok or to Shopi.",
  },
  {
    q: "Can I download private TikTok videos?",
    a: "No. The tool only works with public videos. Private videos, and videos that have been deleted, can't be fetched.",
  },
  {
    q: "Can I download just the sound as an MP3?",
    a: "No. The tool saves the full video as an MP4. It doesn't extract the audio on its own.",
  },
  {
    q: "Is it legal to download TikTok videos?",
    a: "Saving your own videos is fine. Downloading someone else's video and reposting it without their permission can infringe their copyright and goes against TikTok's terms, so only save videos you made or have permission to use.",
  },
  {
    q: "Does Shopi keep a copy of the videos I download?",
    a: "No. The video passes straight through to your device and isn't stored on Shopi.",
  },
  {
    q: "Why won't my TikTok link work?",
    a: "Check that you copied the full link from TikTok and that the video is public and still up, then try again. Occasionally a video can't be fetched at all; if one keeps failing, try again later.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    ...publicPageMetadata({
      lang,
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      // The card in ./opengraph-image.tsx says what this page does; the
      // site-wide one sells buying and selling.
      ownImage: true,
    }),
    // The root layout files every page under "marketplace", which is wrong for
    // a video tool.
    category: "multimedia",
    keywords: [
      "TikTok downloader",
      "TikTok video downloader",
      "download TikTok video",
      "download TikTok without watermark",
      "TikTok no watermark",
      "save TikTok video",
      "TikTok MP4 download",
      "TikTok downloader HD",
      "download TikTok video on iPhone",
      "save TikTok video to gallery",
      "TikTok video for WhatsApp status",
      "TikTok downloader Kenya",
    ],
  };
}

export default async function TiktokDownloaderPage({ params }: Props) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const canonical = `${siteConfig.url}/${lang}${PATH}`;
  const updatedLabel = new Date(LAST_UPDATED).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "en-KE",
    dateModified: LAST_UPDATED,
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    mainEntity: { "@id": `${canonical}#app` },
  };

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${canonical}#app`,
    name: "Shopi TikTok Video Downloader",
    url: canonical,
    description: DESCRIPTION,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (runs in a web browser)",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "KES" },
    featureList: [
      "Download public TikTok videos as MP4",
      "No TikTok watermark",
      "HD when TikTok provides an HD version",
      "Works on iPhone, Android and computer browsers",
      "No app install or sign-up",
    ],
    provider: { "@id": `${siteConfig.url}/#organization` },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${canonical}#howto`,
    name: "How to download a TikTok video without the watermark",
    step: STEPS.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.body,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            webPageSchema,
            appSchema,
            howToSchema,
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/${lang}` },
              { name: "TikTok Downloader", url: canonical },
            ]),
            faqSchema(FAQ),
          ),
        }}
      />

      <LegalNav lang={lang} />

      <main className="px-5 pt-20 pb-16">
        <div className="mx-auto max-w-190">
          {/* ── Tool first: the searcher came to download, not to read ── */}
          <p className="mb-3 text-[0.8rem] font-bold uppercase tracking-widest text-primary">
            Free TikTok downloader
          </p>
          <h1 className="mb-5 font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
            Download TikTok videos without the watermark
          </h1>
          {/* Answer-first intro: the one paragraph an answer engine quotes. */}
          <p className="mb-8 max-w-176 text-[1.1rem] leading-[1.7] text-muted">
            Paste a TikTok link below to save the video to your phone or
            computer as an MP4, without the TikTok watermark and in HD when the
            original is HD. It&apos;s free, it runs in your browser, and there
            is no app to install or account to create.
          </p>

          <TiktokSaverTool t={dict.tiktokSaver} />

          <p className="mt-4 text-xs text-muted">
            Updated <time dateTime={LAST_UPDATED}>{updatedLabel}</time>
          </p>

          {/* ── How to ─────────────────────────────────────────────── */}
          <section className="mt-14 mb-14">
            <h2 className="mb-6 font-display text-[1.5rem] font-bold text-foreground">
              How to download a TikTok video without the watermark
            </h2>
            <ol className="flex flex-col gap-5">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-[0.98rem] leading-[1.7] text-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ── Per-device: "download tiktok video on iphone" etc. ──── */}
          <section className="mb-14">
            <h2 className="mb-2 font-display text-[1.5rem] font-bold text-foreground">
              Where your downloaded TikTok video goes
            </h2>
            <p className="mb-6 max-w-176 text-[1rem] leading-[1.7] text-muted">
              The file is named shopi-tiktok- followed by the video&apos;s
              number, so it&apos;s easy to find.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {DEVICES.map((device) => (
                <div
                  key={device.title}
                  className="rounded-lg border border-border bg-elevated p-5"
                >
                  <h3 className="mb-2 font-semibold text-foreground">
                    {device.title}
                  </h3>
                  <p className="text-[0.95rem] leading-[1.65] text-muted">
                    {device.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Seller angle, and the bridge back into Shopi ─────────── */}
          <section className="mb-14">
            <h2 className="mb-2 font-display text-[1.5rem] font-bold text-foreground">
              What sellers use a clean copy for
            </h2>
            <p className="mb-5 max-w-176 text-[1rem] leading-[1.7] text-muted">
              Most people who use this tool are reposting their own content. A
              video without another app&apos;s logo on it looks at home wherever
              you share it.
            </p>
            <ul className="mb-8 flex flex-col gap-2.5 pl-5 text-[0.98rem] leading-[1.7] text-muted [&>li]:list-disc">
              {USES.map((use) => (
                <li key={use}>{use}</li>
              ))}
            </ul>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <h3 className="mb-2 font-display text-[1.15rem] font-bold text-foreground">
                Selling on TikTok already? Skip the download.
              </h3>
              <p className="mb-5 text-[0.98rem] leading-[1.7] text-muted">
                Shopi imports your TikTok videos straight into a listing, and
                buyers near you message you directly. It&apos;s free to post and
                there&apos;s no commission on the sale.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/${lang}/upload/tiktok`}
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white no-underline"
                >
                  Import from TikTok
                </Link>
                <Link
                  href={`/${lang}/sell-in-kenya`}
                  className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground no-underline"
                >
                  How selling on Shopi works
                </Link>
              </div>
            </div>
          </section>

          {/* ── Responsible use — stated plainly, not buried ─────────── */}
          <section className="mb-14 rounded-2xl border border-border bg-elevated p-6">
            <h2 className="mb-3 font-display text-[1.2rem] font-bold text-foreground">
              Only save videos you have the right to use
            </h2>
            <p className="mb-3 text-[0.98rem] leading-[1.7] text-muted">
              This tool is meant for your own videos, and for videos a creator
              has said you can use. Downloading someone else&apos;s video and
              reposting it as your own can infringe their copyright and goes
              against TikTok&apos;s terms. On Shopi, using photos or videos that
              aren&apos;t yours without permission breaks our{" "}
              <Link
                href={`/${lang}/community-guidelines`}
                className="text-primary underline"
              >
                Community Guidelines
              </Link>
              .
            </p>
            <p className="text-[0.98rem] leading-[1.7] text-muted">
              If your content is being used on Shopi without permission, send a
              copyright complaint through our{" "}
              <Link href={`/${lang}/contact`} className="text-primary underline">
                contact page
              </Link>
              .
            </p>
          </section>

          {/* ── FAQ — visible answers, mirrored in FAQPage schema ────── */}
          <section className="mb-12">
            <h2 className="mb-5 font-display text-[1.5rem] font-bold text-foreground">
              TikTok downloader questions
            </h2>
            <div className="flex flex-col gap-6">
              {FAQ.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="mb-1.5 font-semibold text-foreground">{q}</h3>
                  <p className="text-[0.98rem] leading-[1.7] text-muted">{a}</p>
                </div>
              ))}
            </div>
          </section>

          <p className="text-[0.98rem] text-muted">
            Want tips on filming product videos that sell? Read{" "}
            <Link
              href={`/${lang}/blog/how-nairobi-local-sellers-are-winning-online-with-short-videos`}
              className="text-primary underline"
            >
              how Nairobi sellers win online with short videos
            </Link>
            .
          </p>
        </div>

        <CategoryCrossLinks lang={lang} currentPath={PATH} />
      </main>

      <LandingFooter dict={dict} lang={lang} />
    </>
  );
}
