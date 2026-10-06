import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Profile Visitors");

import { notFound } from "next/navigation";
import { ProfileVisitorsView } from "@/features/profile/components/ProfileVisitorsView";
import { isValidLocale } from "@/i18n/config";

export default async function ProfileVisitorsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  return <ProfileVisitorsView lang={lang} />;
}
