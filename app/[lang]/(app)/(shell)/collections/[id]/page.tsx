import { privatePageMetadata } from "@/lib/metadata";

export const metadata = privatePageMetadata("Collection");

import { CollectionDetail } from "@/features/feed/components/CollectionDetail";

type Props = {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function CollectionDetailPage({
  params,
  searchParams,
}: Props) {
  const { lang, id } = await params;
  const { from } = await searchParams;
  return <CollectionDetail lang={lang} collectionId={id} from={from} />;
}
