import type { Metadata } from "next";
import { UploadPickerPage } from "@/features/create/components/UploadPickerPage";

export const metadata: Metadata = {
  title: "Create a listing",
};

type Props = { params: Promise<{ lang: string }> };

export default async function CreateManualPage({ params }: Props) {
  const { lang } = await params;
  return <UploadPickerPage lang={lang} manualRoute />;
}
