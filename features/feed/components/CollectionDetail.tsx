"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import Image from "next/image";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { contentPath } from "@/lib/content-url";

const GET_COLLECTION_CONTENT = gql`
  query CollectionDetailContent($collectionId: String!) {
    collectionContent(collectionId: $collectionId) {
      id
      slug
      title
      type
      media {
        imageUrl
        thumbnailUrl
        muxMeta { playbackId thumbnailUrl }
        r2Variants { url variant }
      }
      price { amount currency }
      stats { saves }
      isSavedByMe
    }
  }
`;

const GET_MY_COLLECTIONS = gql`
  query CollectionDetailMyCols {
    myCollections { id name color itemCount }
  }
`;

const TOGGLE_SAVE = gql`
  mutation CollectionDetailToggleSave($contentId: String!, $collectionId: String) {
    toggleSave(contentId: $contentId, collectionId: $collectionId) {
      saved saveCount collectionId
    }
  }
`;

type Item = Pick<ContentCardFieldsFragment, "id" | "title" | "type" | "media" | "price" | "stats" | "isSavedByMe"> & {
  slug?: string | null;
};
type Collection = { id: string; name: string; color?: string | null; itemCount: number };

function thumbUrl(item: Item): string | null {
  const m = item.media?.[0];
  if (!m) return null;
  return (
    m.r2Variants?.find((v) => v.variant === "thumbnail")?.url ??
    m.r2Variants?.[0]?.url ??
    m.thumbnailUrl ??
    m.imageUrl ??
    (m.muxMeta?.playbackId
      ? `https://image.mux.com/${m.muxMeta.playbackId}/thumbnail.jpg?time=0&width=400`
      : null)
  );
}

export function CollectionDetail({ lang, collectionId, from }: { lang: string; collectionId: string; from?: string }) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data, refetch } = (useQuery as any)(GET_COLLECTION_CONTENT, {
    variables: { collectionId },
    fetchPolicy: "cache-and-network",
  }) as { data?: { collectionContent: Item[] }; refetch: () => Promise<unknown> };

  const { data: colData } = (useQuery as any)(GET_MY_COLLECTIONS, {
    fetchPolicy: "cache-first",
  }) as { data?: { myCollections: Collection[] } };

  const [toggleSave] = useMutation(TOGGLE_SAVE) as any;

  const items: Item[] = data?.collectionContent ?? [];
  const collection = colData?.myCollections?.find((c: Collection) => c.id === collectionId);

  async function handleRemove(item: Item) {
    setRemovingId(item.id);
    try {
      await toggleSave({ variables: { contentId: item.id, collectionId } });
      await refetch();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => from ? router.push(from) : router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base truncate">{collection?.name ?? "Collection"}</h1>
          <p className="text-xs text-muted-foreground">{items.length} saved items</p>
        </div>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="text-4xl mb-3">🗂️</div>
          <p className="font-semibold text-default">Nothing saved here yet</p>
          <p className="text-sm text-muted-foreground mt-1">Go browse and save items to this collection</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-0.5 p-0.5">
          {items.map((item) => {
            const thumb = thumbUrl(item);
            const isRemoving = removingId === item.id;
            return (
              <div key={item.id} className="relative aspect-square bg-surface overflow-hidden">
                {/* Thumbnail */}
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={item.title}
                    fill
                    sizes="50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                    No image
                  </div>
                )}

                {/* Tap to open PDP */}
                <Link
                  href={contentPath(lang, item)}
                  scroll={false}
                  aria-label={item.title ?? "Open listing"}
                  className="absolute inset-0"
                />

                {/* Price badge */}
                {item.price && item.price.amount > 0 && (
                  <div className="absolute bottom-8 left-1.5 bg-black/60 rounded-md px-1.5 py-0.5 text-white text-xs font-semibold">
                    {item.price.currency} {item.price.amount.toLocaleString()}
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(item); }}
                  disabled={isRemoving}
                  className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 z-10"
                >
                  {isRemoving ? (
                    <InterlockingBalls size={14} />
                  ) : (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
