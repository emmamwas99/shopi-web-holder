import { isValidLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { ImpersonationCallback } from "./ImpersonationCallback";

export const metadata = { title: "Impersonating user" };

type ImpersonationPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ImpersonationPage({
  params,
  searchParams,
}: ImpersonationPageProps) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  const sp = await searchParams;
  const token = typeof sp?.["token"] === "string" ? sp["token"] : "";

  return <ImpersonationCallback lang={lang} token={token} />;
}
