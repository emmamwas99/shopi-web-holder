import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Edit Profile");

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { EditProfileScreen } from "@/features/profile/components/EditProfileScreen";
import { isValidLocale } from "@/i18n/config";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  // EditProfileScreen reads useSearchParams() to know which profile tab to
  // return to. Without a boundary the prerender of /en/profile/edit and
  // /sw/profile/edit fails outright rather than degrading, which is what broke
  // the build.
  return (
    <Suspense fallback={null}>
      <EditProfileScreen lang={lang} />
    </Suspense>
  );
}
