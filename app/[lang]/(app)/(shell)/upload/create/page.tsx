import type { Metadata } from "next";
import { CreateFlow } from "@/features/create/components/CreateFlow";

export const metadata: Metadata = {
  title: "New Post",
};

type Props = { params: Promise<{ lang: string }> };

export default async function CreatePage({ params }: Props) {
  const { lang } = await params;
  return <CreateFlow lang={lang} />;
}
