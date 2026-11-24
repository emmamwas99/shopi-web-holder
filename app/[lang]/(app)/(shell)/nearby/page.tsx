import { redirect } from "next/navigation";
import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Near Me");

/** Nearby is a filter of the feed, not a page of its own: send old links there. */
export default async function NearbyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  redirect(`/${lang}/for-you?tab=nearby`);
}
