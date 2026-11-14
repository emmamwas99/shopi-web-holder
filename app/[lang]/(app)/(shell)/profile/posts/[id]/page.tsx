import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Your listing");

import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { ManagedPostPage } from "@/features/profile/components/ManagedPostPage";

export default async function ProfilePostRoute({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isValidLocale(lang)) notFound();

  return <ManagedPostPage lang={lang} contentId={id} />;
}
