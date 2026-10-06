import type { Metadata } from "next";
import { UploadPickerPage } from "@/features/create/components/UploadPickerPage";

export const metadata: Metadata = {
  title: "Create",
};

export default async function UploadPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return <UploadPickerPage lang={lang} />;
}
