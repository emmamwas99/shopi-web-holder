import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LegalNav } from "@/components/legal/LegalNav";
import { siteConfig } from "@/config/site";
import { ArticleCard } from "@/features/blog/components/ArticleCard";
import { Breadcrumbs } from "@/features/blog/components/Breadcrumbs";
import { LinkList } from "@/features/blog/components/LinkList";
import { blogPageMetadata } from "@/features/blog/metadata";
import {
  articlePath,
  categoryPath,
  getActiveCategories,
  getArticlesInCategory,
  getCategory,
} from "@/lib/articles";
import {
  breadcrumbSchema,
  collectionPageSchema,
  jsonLd,
} from "@/lib/structured-data";

type Props = { params: Promise<{ lang: string; category: string }> };

// Rebuilt with the articles; daily picks up scheduled articles within a day of
// their publish date (a deploy publishes them immediately).
export const revalidate = 86400;

// Only categories with a live article get a hub: an empty hub is a thin page.
export function generateStaticParams() {
  return getActiveCategories().map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category || getArticlesInCategory(slug).length === 0) return {};
  return blogPageMetadata({
    path: categoryPath(category.slug),
    title: category.title,
    description: category.description,
  });
}

export default async function BlogCategoryPage({ params }: Props) {
  const { lang, category: slug } = await params;
  const category = getCategory(slug);
  const articles = getArticlesInCategory(slug);
  if (!category || articles.length === 0) notFound();

  const url = `${siteConfig.url}/en${categoryPath(category.slug)}`;
  const others = getActiveCategories().filter((c) => c.slug !== category.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            collectionPageSchema({
              url,
              name: category.title,
              description: category.description,
              items: articles.map((article) => ({
                name: article.title,
                url: `${siteConfig.url}/en${articlePath(article.slug)}`,
              })),
            }),
            breadcrumbSchema([
              { name: "Home", url: `${siteConfig.url}/en` },
              { name: "Blog", url: `${siteConfig.url}/en/blog` },
              { name: category.name, url },
            ]),
          ),
        }}
      />
      <LegalNav lang={lang} />

      <main className="mx-auto max-w-275 px-4 pt-8 pb-12 sm:px-5 sm:pt-12 sm:pb-16">
        <Breadcrumbs
          trail={[
            { name: "Home", href: `/${lang}` },
            { name: "Blog", href: `/${lang}/blog` },
            { name: category.name, href: `/${lang}${categoryPath(category.slug)}` },
          ]}
        />
        <h1 className="max-w-3xl font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.1] font-bold tracking-[-0.02em] text-foreground">
          {category.title}
        </h1>
        <p className="mt-4 max-w-2xl text-[1.1rem] leading-relaxed text-muted">
          {category.intro}
        </p>

        <ul className="m-0 mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, i) => (
            <li key={article.slug}>
              <ArticleCard article={article} lang={lang} headingLevel="h2" priority={i < 2} />
            </li>
          ))}
        </ul>

        <div className="mt-10 max-w-xl">
          <LinkList
            title="Browse on Shopi"
            links={category.marketplace}
            lang={lang}
            headingLevel="h2"
          />
        </div>

        {others.length > 0 && (
          <nav aria-label="Other topics" className="mt-10">
            <h2 className="mb-3 text-sm font-bold text-foreground">More guides</h2>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/${lang}${categoryPath(other.slug)}`}
                    className="inline-block rounded-full border border-border bg-elevated px-4 py-2 text-sm font-semibold text-foreground no-underline hover:border-[rgb(var(--color-border-strong))]"
                  >
                    {other.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>

      <LandingFooter lang={lang} />
    </>
  );
}
