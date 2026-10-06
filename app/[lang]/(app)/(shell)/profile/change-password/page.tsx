import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Change Password");

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isValidLocale } from "@/i18n/config";
import { ChangePasswordScreen } from "@/features/profile/components/ChangePasswordScreen";

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  // The screen reads useSearchParams() to know which profile tab to return to.
  return (
    <Suspense fallback={null}>
      <ChangePasswordScreen lang={lang} />
    </Suspense>
  );
}
