import { Suspense } from "react";
import { privatePageMetadata } from "@/lib/metadata";
import { TeamThreadScreen } from "@/features/team-messages/components/TeamThreadScreen";

export const metadata = privatePageMetadata("Shopi team");

// Static segment — takes precedence over the sibling [id] conversation route.
export default async function ShopiTeamThreadPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  // The screen reads useSearchParams() to know where back should go.
  return (
    <Suspense fallback={null}>
      <TeamThreadScreen lang={lang} />
    </Suspense>
  );
}
