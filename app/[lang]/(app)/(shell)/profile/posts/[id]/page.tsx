import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Post insights");

import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { ManagedPostInsightsPage } from "@/features/profile/components/ManagedPostInsightsPage";

export default async function ProfilePostInsightsRoute({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isValidLocale(lang)) notFound();

  return <ManagedPostInsightsPage lang={lang} contentId={id} />;
}
