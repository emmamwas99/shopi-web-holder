import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Followers");

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProfileFollowersView } from "@/features/profile/components/ProfileFollowersView";
import { isValidLocale } from "@/i18n/config";

export default async function ProfileFollowersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  return (
    <Suspense fallback={<div className="min-h-svh bg-app" />}>
      <ProfileFollowersView lang={lang} />
    </Suspense>
  );
}
