import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompetitorAlternativePage } from "@/components/seo/CompetitorAlternativePage";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import { getCompetitorAlternative } from "@/lib/seo/competitor-alternatives";

type Props = { params: Promise<{ lang: string }> };

const page = getCompetitorAlternative("jiji-alternative-kenya");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    ...publicPageMetadata({
      lang,
      path: `/${page.slug}`,
      title: page.title,
      description: page.metaDescription,
    }),
    keywords: page.keywords,
  };
}

export default async function JijiAlternativePage({ params }: Props) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return <CompetitorAlternativePage page={page} lang={lang} dict={dict} />;
}
