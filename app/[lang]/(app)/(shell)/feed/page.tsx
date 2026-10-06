import { redirect } from "next/navigation";
import { isValidLocale } from "@/i18n/config";

export default async function LegacyFeedRedirect({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";
  redirect(`/${safeLang}/for-you`);
}
