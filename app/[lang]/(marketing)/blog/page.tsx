import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { siteConfig } from "@/config/site";
import { ArticleCard } from "@/features/blog/components/ArticleCard";
import { blogPageMetadata } from "@/features/blog/metadata";
import {
  articlePath,
  categoryPath,
  getActiveCategories,
  getArticles,
  getArticlesInCategory,
} from "@/lib/articles";
import { breadcrumbSchema, collectionPageSchema, jsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string }> };

// Rebuilt with the articles; daily picks up scheduled articles within a day of
// their publish date (a deploy publishes them immediately).
export const revalidate = 86400;

const TITLE = "Price Guides and Buying Tips for Kenya";
const DESCRIPTION =
  "What things cost in Kenya right now, from real Shopi listings — cars, phones, rentals, electronics and furniture — and what to check before you pay.";

/** Guides from these intents lead the page; the Shopi-focused posts follow. */
const SEARCH_INTENTS = new Set([
  "price-guide",
  "buying-guide",
  "location-guide",
  "budget-guide",
  "category-guide",
  "comparison",
]);

export async function generateMetadata(): Promise<Metadata> {
  return blogPageMetadata({ path: "/blog", title: TITLE, description: DESCRIPTION });
}

export default async function BlogIndexPage({ params }: Props) {
  const { lang } = await params;
  const articles = getArticles();
  const latest = articles.filter((a) => SEARCH_INTENTS.has(a.intent)).slice(0, 3);
  const categories = getActiveCategories();
  const url = `${siteConfig.url}/en/blog`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            collectionPageSchema({
              url,
              name: TITLE,
              description: DESCRIPTION,
              blog: true,
              items: articles.map((article) => ({
                name: article.title,
                url: `${siteConfig.url}/en${articlePath(article.slug)}`,
              })),
            }),
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/en` },
              { name: "Blog", url },
            ]),
          ),
        }}
      />
      <LegalNav lang={lang} />

      <main className="mx-auto max-w-275 px-4 pt-10 pb-12 sm:px-5 sm:pt-14 sm:pb-16">
        <header className="max-w-3xl">
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[1.08] font-bold tracking-[-0.02em] text-foreground">
            Prices and buying guides for Kenya
          </h1>
          <p className="mt-4 text-[1.1rem] leading-relaxed text-muted">
            What things cost right now, what to check before you pay, and where
            to find them near you.
          </p>
        </header>

        <nav aria-label="Topics" className="mt-6">
          <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1 scrollbar-none">
            {categories.map((category) => (
              <li key={category.slug} className="shrink-0">
                <Link
                  href={`/${lang}${categoryPath(category.slug)}`}
                  className="inline-block rounded-full border border-border bg-elevated px-4 py-2 text-sm font-semibold text-foreground no-underline hover:border-[rgb(var(--color-border-strong))]"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {latest.length > 0 && (
          <section aria-labelledby="latest" className="mt-10">
            <h2 id="latest" className="mb-4 font-display text-[1.45rem] font-bold text-foreground">
              Latest guides
            </h2>
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((article, i) => (
                <li key={article.slug}>
                  <ArticleCard article={article} lang={lang} priority={i === 0} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {categories.map((category) => {
          const inCategory = getArticlesInCategory(category.slug);
          return (
            <section
              key={category.slug}
              aria-labelledby={`topic-${category.slug}`}
              className="mt-12"
            >
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2
                  id={`topic-${category.slug}`}
                  className="font-display text-[1.45rem] font-bold text-foreground"
                >
                  {category.name}
                </h2>
                <Link
                  href={`/${lang}${categoryPath(category.slug)}`}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-primary no-underline hover:underline"
                >
                  See all<span className="sr-only"> {category.name}</span>
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
              <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {inCategory.slice(0, 3).map((article) => (
                  <li key={article.slug}>
                    <ArticleCard article={article} lang={lang} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>

      <LandingFooter lang={lang} />
    </>
  );
}
