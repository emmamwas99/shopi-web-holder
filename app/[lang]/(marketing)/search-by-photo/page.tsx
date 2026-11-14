import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LegalNav } from "@/components/legal/LegalNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PhotoSearchButton } from "@/components/landing/PhotoSearchButton";
import { PhotoSearchIllustration } from "@/components/landing/PhotoSearchIllustration";
import { CategoryCrossLinks } from "@/components/seo/CategoryCrossLinks";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema, faqSchema, jsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string }> };

/**
 * /search-by-photo — the page that answers "search by photo / image /
 * picture" questions about Shopi, for people and answer engines alike.
 *
 * Keep every claim true to the feature (image-search.resolver.ts and
 * lib/imageSearch.ts): it searches live Shopi listings only, finds items that
 * LOOK similar (not guaranteed identical), takes JPG/PNG/WebP up to 8 MB,
 * needs no account, is rate-limited per hour, and Shopi never stores the
 * photo. English only; /sw canonicalises here (lib/metadata.ts).
 */
const PATH = "/search-by-photo";
const TITLE = "Search by Photo: Find Items for Sale in Kenya";
const META_DESCRIPTION =
  "Saw something you like? Search Shopi with a photo or screenshot and see similar items for sale in Kenya. Free, no account needed, and your photo isn't kept.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata({ lang, path: PATH, title: TITLE, description: META_DESCRIPTION });
}

const STEPS = [
  {
    title: "Tap the camera in the search bar",
    body: "It sits at the end of the search box at the top of Shopi, on a phone and on a computer.",
  },
  {
    title: "Take a photo or choose one",
    body: "Your phone offers the camera or your gallery. A screenshot works too: crop it to the item first if you can.",
  },
  {
    title: "Browse similar items and message the seller",
    body: "Shopi reads the photo and lists items for sale that look similar. Open one to see the price and location, then chat with the seller on Shopi.",
  },
];

const GOOD_FOR = [
  "Shoes and sneakers",
  "Bags and handbags",
  "Clothes and fashion",
  "Phones and accessories",
  "Sofas, tables and furniture",
  "Electronics and home appliances",
];

const TIPS = [
  "One item per photo. A crowded photo gives mixed results.",
  "Fill the frame with the item, in good light, on a plain background if you can.",
  "Crop screenshots to just the item, without captions or stickers.",
  "No luck? Try a second photo from another angle.",
];

const FAQ = [
  {
    q: "How do I search for an item using a photo on Shopi?",
    a: "Tap the camera in the search bar at the top of Shopi, then take a photo or choose one from your gallery. Shopi shows items for sale that look similar. Open one to see the price and location, and message the seller on Shopi.",
  },
  {
    q: "Can I use a screenshot from WhatsApp, TikTok or Instagram?",
    a: "Yes. Save the screenshot to your phone, tap the camera in Shopi's search bar and choose it. Cropping it to just the item gives better matches.",
  },
  {
    q: "Is photo search free? Do I need an account?",
    a: "It's free, and you don't need an account to search. You only sign in when you want to message a seller.",
  },
  {
    q: "Does Shopi keep my photo?",
    a: "No. Your photo is used only to find similar items for sale. Shopi doesn't save it, doesn't add it to your account and doesn't show it to sellers or other users.",
  },
  {
    q: "Will it find the exact same item?",
    a: "Sometimes. Photo search finds items that look similar, so you may see the same product or close alternatives. Check the brand, model, size and condition with the seller before you pay.",
  },
  {
    q: "Which photos can I use?",
    a: "JPG, PNG and WebP images up to 8 MB, including photos straight from your phone's camera. A clear photo of a single item works best.",
  },
  {
    q: "What if there are no matches?",
    a: "Nothing similar is for sale on Shopi right now. Try a clearer photo, search with words, or describe what you want to Shopi Agent.",
  },
  {
    q: "Is Shopi photo search the same as Google Lens?",
    a: "No. Google Lens searches the whole web. Shopi photo search looks only at items for sale on Shopi in Kenya, so every result is something you can message a seller about.",
  },
];

export default async function SearchByPhotoPage({ params }: Props) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const canonical = `${siteConfig.url}/en${PATH}`;

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: TITLE,
    description: META_DESCRIPTION,
    inLanguage: "en-KE",
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    about: { "@id": `${siteConfig.url}/#app` },
  };
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to search for items for sale by photo on Shopi",
    description:
      "Use a photo or screenshot to find similar items for sale on Shopi, Kenya's free online marketplace.",
    totalTime: "PT1M",
    tool: [{ "@type": "HowToTool", name: "A phone or computer with a web browser" }],
    step: STEPS.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.body,
      url: `${canonical}#how-it-works`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            webPage,
            howTo,
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/${lang}` },
              { name: "Search by photo", url: canonical },
            ]),
            faqSchema(FAQ),
          ),
        }}
      />

      <LegalNav lang={lang} />

      <main className="px-5 pt-20 pb-16">
        <div className="mx-auto max-w-190">
          <p className="mb-3 text-[0.8rem] font-bold uppercase tracking-widest text-primary">
            Search by photo
          </p>
          <h1 className="mb-5 font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
            Seen it somewhere? Find it on Shopi with a photo.
          </h1>
          <p className="mb-8 max-w-184 text-[1.1rem] leading-[1.7] text-muted">
            Saw shoes, a bag or a sofa you liked but don&apos;t know what it&apos;s called? Take a
            photo of it, or use a screenshot from WhatsApp, TikTok, Instagram or Facebook. Shopi
            shows you similar items for sale on Shopi. It&apos;s free and works in any phone or
            computer browser, with no app or account needed.
          </p>

          <div className="mb-10 flex flex-wrap items-center gap-3">
            <PhotoSearchButton lang={lang} label="Search with a photo" placement="search_by_photo_page" />
            <Link
              href={`/${lang}/explore`}
              className="inline-flex min-h-12 items-center rounded-full border border-border px-6 py-3 text-[0.9375rem] font-semibold text-foreground"
            >
              Browse listings instead
            </Link>
          </div>

          <div className="mb-14">
            <PhotoSearchIllustration
              searchPlaceholder="Search Shopi"
              resultsTitle="Results for your photo"
              resultsBody="Similar items for sale"
            />
          </div>

          <section id="how-it-works" className="mb-14 scroll-mt-24">
            <h2 className="mb-6 font-display text-[1.5rem] font-bold text-foreground">
              How to search by photo
            </h2>
            <ol className="flex flex-col gap-5">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">{step.title}</h3>
                    <p className="text-[0.98rem] leading-[1.7] text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-14">
            <h2 className="mb-2 font-display text-[1.5rem] font-bold text-foreground">
              What you can find
            </h2>
            <p className="mb-5 max-w-176 text-[1rem] leading-[1.7] text-muted">
              Photo search works best on things you recognise by how they look, especially when
              you don&apos;t know the brand or the right words to type.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {GOOD_FOR.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-border bg-elevated px-4 py-3 text-[0.98rem] font-medium text-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-14">
            <h2 className="mb-4 font-display text-[1.5rem] font-bold text-foreground">
              Tips for better matches
            </h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[0.98rem] leading-[1.7] text-muted">
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>

          <section className="mb-14">
            <h2 className="mb-3 font-display text-[1.5rem] font-bold text-foreground">
              What happens to your photo
            </h2>
            <p className="max-w-176 text-[0.98rem] leading-[1.7] text-muted">
              Your phone makes the photo smaller, then Shopi compares it with photos of items for
              sale, using an AI provider (Google) that processes it only on Shopi&apos;s behalf.
              That is all it&apos;s used for. Shopi doesn&apos;t save your photo, doesn&apos;t add it
              to your account and doesn&apos;t show it to sellers or other users. Read more in the{" "}
              <Link href={`/${lang}/privacy-policy`} className="text-primary underline">
                privacy policy
              </Link>
              .
            </p>
          </section>

          {/* Stating the limits plainly is what stops answer engines inventing
              capabilities photo search doesn't have. */}
          <section className="mb-14 rounded-2xl border border-border bg-elevated p-6">
            <h2 className="mb-3 font-display text-[1.2rem] font-bold text-foreground">
              What photo search does not do
            </h2>
            <ul className="flex flex-col gap-2 text-[0.98rem] leading-[1.7] text-muted">
              <li>It only searches items for sale on Shopi, not the web, other marketplaces or shops.</li>
              <li>
                It finds items that look similar. It can&apos;t promise the same brand, model or
                size, so check the details with the seller.
              </li>
              <li>It doesn&apos;t buy, pay or message anyone for you. Every deal is between you and the seller.</li>
              <li>
                There is a limit on how many photo searches you can run in a short time. If you
                reach it, wait a little and try again.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="mb-5 font-display text-[1.5rem] font-bold text-foreground">
              Photo search questions
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
            Prefer words? Describe what you want to{" "}
            <Link href={`/${lang}/shopi-agent`} className="text-primary underline">
              Shopi Agent
            </Link>
            , browse{" "}
            <Link href={`/${lang}/explore`} className="text-primary underline">
              listings by category
            </Link>
            , or see more answers on the{" "}
            <Link href={`/${lang}/faq`} className="text-primary underline">
              Shopi FAQ
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
