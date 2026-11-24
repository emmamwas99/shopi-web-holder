import { redirect } from "next/navigation";
import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Following");

/** Following is a filter of the feed, not a page of its own: send old links there. */
export default async function FollowingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  redirect(`/${lang}/for-you?tab=following`);
}
