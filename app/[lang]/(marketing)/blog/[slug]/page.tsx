import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { siteConfig } from "@/config/site";
import { ArticleBlocks } from "@/features/blog/components/ArticleBlocks";
import {
  ArticleCard,
  formatArticleDate,
} from "@/features/blog/components/ArticleCard";
import { ArticleCta } from "@/features/blog/components/ArticleCta";
import { Breadcrumbs } from "@/features/blog/components/Breadcrumbs";
import { LinkList } from "@/features/blog/components/LinkList";
import { blogCanonical, blogPageMetadata } from "@/features/blog/metadata";
import {
  fetchArticleListings,
  type ArticleListingsResult,
} from "@/features/blog/queries/articleListings";
import { withCoversFirst } from "@/features/social-proof/queries/socialProofSellers";
import {
  articlePath,
  categoryPath,
  getArticle,
  getArticles,
  getAuthor,
  getCategory,
  getRelatedArticles,
  isLive,
  lastModified,
  readingTime,
  wordCount,
  type Article,
} from "@/lib/articles";
import { contentPath } from "@/lib/content-url";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  jsonLd,
  listingItemListSchema,
} from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string; slug: string }> };

// Daily, including articles with live listings: their listing fetch is set
// to the same interval (features/blog/queries/articleListings.ts), overriding
// the Apollo client's hourly default that would otherwise win.
export const revalidate = 86400;

// Drafts render locally (noindexed) so writers can preview them.
const PREVIEW_DRAFTS = process.env.NODE_ENV !== "production";

export function generateStaticParams() {
  return getArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug, { includeDrafts: PREVIEW_DRAFTS });
  if (!article) return {};
  const author = getAuthor(article.author);

  return blogPageMetadata({
    path: articlePath(article.slug),
    title: article.seoTitle ?? article.title,
    description: article.seoDescription,
    canonicalUrl: article.canonicalUrl,
    keywords: [article.primaryKeyword, ...(article.keywords ?? [])],
    noindex: !isLive(article),
    article: {
      publishedTime: article.publishedAt,
      modifiedTime: lastModified(article),
      authors: [author?.name ?? siteConfig.name],
      section: getCategory(article.category)?.name ?? "Guides",
      tags: article.tags,
    },
  });
}

/** Data-first intents put the photo after the first section, not before the answer. */
const DATA_FIRST = new Set<Article["intent"]>([
  "price-guide",
  "budget-guide",
  "location-guide",
]);

function FeaturedImage({
  article,
  priority,
}: {
  article: Article;
  /** Only when the photo is above the fold. */
  priority: boolean;
}) {
  const image = article.featuredImage;
  if (!image) return null;
  return (
    <figure className="my-8">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-surface">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 92vw, 720px"
          className="object-cover"
        />
      </div>
      {image.credit && (
        <figcaption className="mt-2 text-xs text-muted">
          Photo:{" "}
          <a
            href={image.credit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted underline"
          >
            {image.credit.name}
          </a>
        </figcaption>
      )}
    </figure>
  );
}

export default async function ArticlePage({ params }: Props) {
  const { lang, slug } = await params;
  const article = getArticle(slug, { includeDrafts: PREVIEW_DRAFTS });
  if (!article) notFound();

  const category = getCategory(article.category);
  const author = getAuthor(article.author);
  const related = getRelatedArticles(article, 3);
  const listings: ArticleListingsResult | null = article.listings
    ? await fetchArticleListings(article.listings)
    : null;

  const url = blogCanonical(articlePath(article.slug), article.canonicalUrl);
  const blogUrl = `${siteConfig.url}/en/blog`;
  // One trail, two uses: links in the reader's locale, schema on the
  // canonical English URLs.
  const trailFor = (prefix: string) => [
    { name: "Home", href: prefix },
    { name: "Blog", href: `${prefix}/blog` },
    ...(category
      ? [{ name: category.name, href: `${prefix}${categoryPath(category.slug)}` }]
      : []),
    { name: article.title, href: `${prefix}${articlePath(article.slug)}` },
  ];
  const trail = trailFor(`/${lang}`);
  // The listings the grid actually shows — the ItemList may only describe those.
  const shownListings =
    listings?.ok && article.listings
      ? withCoversFirst(listings.listings).slice(0, article.listings.show ?? 6)
      : [];
  const marketplaceLinks = article.marketplaceLinks.length
    ? article.marketplaceLinks
    : (category?.marketplace ?? []);
  const imageFirst = !DATA_FIRST.has(article.intent);

  const schemas: object[] = [
    articleSchema({
      url,
      headline: article.title,
      description: article.seoDescription,
      datePublished: article.publishedAt,
      dateModified: lastModified(article),
      section: category?.name ?? "Guides",
      keywords: [article.primaryKeyword, ...(article.keywords ?? [])],
      image: article.featuredImage
        ? `${siteConfig.url}${article.featuredImage.src}`
        : `${siteConfig.url}${siteConfig.ogImage}`,
      wordCount: wordCount(article),
      author: {
        name: author?.name ?? siteConfig.name,
        kind: author?.kind ?? "Organization",
        url: author?.url,
      },
      blogUrl,
    }),
    breadcrumbSchema(
      trailFor(`${siteConfig.url}/en`).map((item, i, all) => ({
        name: item.name,
        url: i === all.length - 1 ? url : item.href,
      })),
    ),
    ...(article.faq?.length ? [faqSchema(article.faq)] : []),
    ...(shownListings.length
      ? [
          listingItemListSchema({
            id: `${url}#listings`,
            name: `${article.listings?.label ?? article.title} listings on Shopi`,
            items: shownListings.map((listing) => ({
              name: listing.title ?? article.title,
              url: `${siteConfig.url}${contentPath("en", listing)}`,
            })),
          }),
        ]
      : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(...schemas) }}
      />
      <LegalNav lang={lang} />

      <main className="mx-auto max-w-275 px-4 pt-8 pb-12 sm:px-5 sm:pt-12 sm:pb-16">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,720px)_260px] lg:justify-between">
          <article className="min-w-0">
            <Breadcrumbs trail={trail} />

            <header>
              <h1 className="font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.1] font-bold tracking-[-0.02em] text-foreground">
                {article.title}
              </h1>
              <p className="mt-4 text-[0.85rem] text-muted">
                {author?.name ?? siteConfig.name} ·{" "}
                {article.updatedAt && article.updatedAt !== article.publishedAt
                  ? "Updated "
                  : ""}
                <time dateTime={lastModified(article)}>
                  {formatArticleDate(lastModified(article))}
                </time>{" "}
                · {readingTime(article)}
              </p>
              <p className="mt-5 text-[1.15rem] leading-[1.65] text-foreground">
                {article.excerpt}
              </p>
            </header>

            {imageFirst && <FeaturedImage article={article} priority />}

            {article.sections.map((section, i) => (
              <section key={section.id} id={section.id} className="mt-10 scroll-mt-20">
                <h2 className="mb-3 font-display text-[clamp(1.35rem,3vw,1.7rem)] leading-tight font-bold tracking-[-0.01em] text-foreground">
                  {section.heading}
                </h2>
                <ArticleBlocks
                  blocks={section.blocks}
                  article={article}
                  listings={listings}
                  lang={lang}
                />
                {!imageFirst && i === 0 && (
                  <FeaturedImage article={article} priority={false} />
                )}
              </section>
            ))}

            <ArticleCta article={article} lang={lang} />

            {article.faq && article.faq.length > 0 && (
              <section aria-labelledby="faq" className="mt-12">
                <h2
                  id="faq"
                  className="mb-4 font-display text-[clamp(1.35rem,3vw,1.7rem)] font-bold text-foreground"
                >
                  Questions
                </h2>
                <div className="flex flex-col gap-3">
                  {article.faq.map(({ q, a }) => (
                    <details
                      key={q}
                      className="group overflow-hidden rounded-xl border border-border bg-elevated"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[0.975rem] font-semibold text-foreground select-none">
                        {q}
                        <span className="shrink-0 text-lg text-primary transition-transform group-open:rotate-45" aria-hidden>
                          +
                        </span>
                      </summary>
                      <p className="border-t border-border px-4 py-3.5 text-[0.95rem] leading-relaxed text-muted">
                        {a}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            <LinkList
              title="Browse on Shopi"
              links={marketplaceLinks}
              lang={lang}
              headingLevel="h2"
            />
          </article>

          {/* Desktop only: on a phone the answer comes first, not a contents list. */}
          <aside className="sticky top-20 hidden lg:block">
            <nav aria-label="In this guide" className="rounded-2xl border border-border bg-elevated p-5">
              <p className="mb-3 text-xs font-bold tracking-wide text-muted uppercase">
                In this guide
              </p>
              <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
                {article.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-[0.85rem] leading-snug text-muted no-underline hover:text-foreground"
                    >
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related" className="mt-14 border-t border-border pt-10">
            <h2 id="related" className="mb-5 font-display text-[1.4rem] font-bold text-foreground">
              Related guides
            </h2>
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((other) => (
                <li key={other.slug}>
                  <ArticleCard article={other} lang={lang} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <LandingFooter lang={lang} />
    </>
  );
}
