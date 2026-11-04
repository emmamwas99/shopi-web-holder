import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TiktokToolPage } from "@/components/tools/TiktokToolPage";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import { getTiktokToolPage, tiktokToolPath } from "@/lib/seo/tiktok-tools";

type Props = { params: Promise<{ lang: string }> };

// Copy, keywords and the research behind them: lib/seo/tiktok-tools.ts.
const page = getTiktokToolPage("tiktok-downloader");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    ...publicPageMetadata({
      lang,
      path: tiktokToolPath(page.slug),
      title: page.title,
      description: page.description,
      // The card in ./opengraph-image.tsx says what this page does; the
      // site-wide one sells buying and selling.
      ownImage: true,
    }),
    // The root layout files every page under "marketplace", which is wrong for
    // a video tool.
    category: "multimedia",
    keywords: page.keywords,
  };
}

export default async function TiktokDownloaderPage({ params }: Props) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return <TiktokToolPage page={page} lang={lang} dict={dict} />;
}
