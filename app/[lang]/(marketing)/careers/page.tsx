import { redirect } from "next/navigation";
import { isValidLocale } from "@/i18n/config";

type Props = { params: Promise<{ lang: string }> };

export default async function CareersPage({ params }: Props) {
  const { lang } = await params;
  const safeLang = isValidLocale(lang) ? lang : "en";

  redirect(`/${safeLang}/online-selling-jobs-kenya`);
}
