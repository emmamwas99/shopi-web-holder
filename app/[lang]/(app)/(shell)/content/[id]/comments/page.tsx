import type { Metadata } from "next";
import { ListingCommentsScreen } from "@/features/feed/components/ListingCommentsScreen";

// A thread under a listing: a dozen words without JavaScript, and the
// listing page is the one that should rank. Google crawled
// /comments?compose=1 and listed it as "Crawled - currently not indexed";
// noindex says that on purpose, and follow keeps the links counting.
export const metadata: Metadata = {
  title: "Listing comments",
  robots: { index: false, follow: true },
};

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
