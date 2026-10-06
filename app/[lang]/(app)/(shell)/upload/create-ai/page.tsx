import type { Metadata } from "next";
import { GuidedCreateFlow } from "@/features/create/components/GuidedCreateFlow";

export const metadata: Metadata = {
  title: "Post with Shopi Agent",
};

type Props = { params: Promise<{ lang: string }> };

export default async function CreateAIPage({ params }: Props) {
  const { lang } = await params;
  return <GuidedCreateFlow lang={lang} />;
}
