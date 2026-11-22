import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FacebookToolPage } from "@/components/tools/FacebookToolPage";
import { getDictionary } from "@/i18n/getDictionary";
import { isValidLocale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import { facebookToolPath, getFacebookToolPage } from "@/lib/seo/facebook-tools";

type Props = { params: Promise<{ lang: string }> };

// Copy, keywords and the research behind them: lib/seo/facebook-tools.ts.
const page = getFacebookToolPage("facebook-video-downloader");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    ...publicPageMetadata({
      lang,
      path: facebookToolPath(page.slug),
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

export default async function FacebookVideoDownloaderPage({ params }: Props) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return <FacebookToolPage page={page} lang={lang} dict={dict} />;
}
