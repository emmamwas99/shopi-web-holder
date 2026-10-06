import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Profile");

import { Suspense } from "react";
import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { ProfileView } from "@/features/profile/components/ProfileView";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  // ProfileView reads useSearchParams() to restore its active sub-tab, which
  // needs a boundary or the whole route opts into a client-render bail.
  return (
    <Suspense fallback={null}>
      <ProfileView lang={lang} />
    </Suspense>
  );
}
