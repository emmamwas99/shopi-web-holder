import type { Metadata } from "next";
import { TikTokImportPage } from "@/features/create/components/TikTokImportPage";

export const metadata: Metadata = {
  title: "TikTok Import",
  description: "Import your TikTok videos to Shopi",
};

interface Props {
  params: Promise<{ lang: string }>;
}

export default async function TikTokImportRoute({ params }: Props) {
  const { lang } = await params;
  return <TikTokImportPage lang={lang} />;
}
