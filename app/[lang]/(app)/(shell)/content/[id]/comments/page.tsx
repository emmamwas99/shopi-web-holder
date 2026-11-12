import type { Metadata } from "next";
import { ListingCommentsScreen } from "@/features/feed/components/ListingCommentsScreen";

export const metadata: Metadata = { title: "Listing comments" };

export default async function CommentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{ compose?: string }>;
}) {
  const [{ lang, id }, { compose }] = await Promise.all([params, searchParams]);
  return <ListingCommentsScreen id={id} lang={lang} compose={compose === "1"} />;
}
