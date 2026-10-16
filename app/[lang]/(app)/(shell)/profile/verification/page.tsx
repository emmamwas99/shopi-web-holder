import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Shop verification");

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isValidLocale } from "@/i18n/config";
import { VerificationScreen } from "@/features/verification/components/VerificationScreen";

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
      <VerificationScreen lang={lang} />
    </Suspense>
  );
}
