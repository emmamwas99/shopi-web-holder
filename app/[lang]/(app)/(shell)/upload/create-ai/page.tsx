import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GuidedCreateFlow } from "@/features/create/components/GuidedCreateFlow";
import { SHOPI_AGENT_AVAILABLE } from "@/features/create/utils/agentAvailability";

export const metadata: Metadata = {
  title: "Post with Shopi Agent",
};

type Props = { params: Promise<{ lang: string }> };

export default async function CreateAIPage({ params }: Props) {
  const { lang } = await params;
  // Paused: /upload shows the chooser, or moves an in-progress guided draft
  // into the manual composer.
  if (!SHOPI_AGENT_AVAILABLE) redirect(`/${lang}/upload`);
  return <GuidedCreateFlow lang={lang} />;
}
