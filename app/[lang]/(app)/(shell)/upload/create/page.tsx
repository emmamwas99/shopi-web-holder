import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "New Post",
};

type Props = { params: Promise<{ lang: string }> };

export default async function CreatePage({ params }: Props) {
  const { lang } = await params;
  redirect(`/${lang}/upload/create-manual`);
}
