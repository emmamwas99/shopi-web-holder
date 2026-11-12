"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import type { TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import type { ContentCardFieldsFragment } from "@/types/__generated__/graphql";
import { contentPath } from "@/lib/content-url";
import { fmtCompact, listingPriceText } from "@/lib/format";
import { shouldUnoptimize } from "@/lib/imageUtils";
import { useAppBack } from "@/lib/useAppBack";
import { ContentDetailDocument } from "../queries/contentDetail";
import { CommentComposer, CommentList, useCommentThread } from "./CommentThread";

/** A full comments screen, matching the mobile app's back/header/list/composer layout. */
export function ListingCommentsScreen({
  id,
  lang,
  compose,
}: {
  id: string;
  lang: string;
  compose: boolean;
}) {
  const { data, loading } = useQuery(
    ContentDetailDocument as TypedDocumentNode<
      { content: ContentCardFieldsFragment | null },
      { id: string }
    >,
    { variables: { id }, fetchPolicy: "cache-first" },
  );
  const post = (data?.content ?? null) as ContentCardFieldsFragment | null;
  const contentId = post?.id ?? "";
  const thread = useCommentThread({ contentId, lang });
  const goBack = useAppBack(post ? contentPath(lang, post) : `/${lang}/content/${id}`);
  const cover = post?.media?.[0];
  const thumbnail = cover?.r2Variants?.find((variant) => variant.variant === "small")?.url
    ?? cover?.thumbnailUrl
    ?? cover?.imageUrl
    ?? null;

  useEffect(() => {
    if (!compose || !thread.isAuthenticated || !contentId) return;
    const frame = requestAnimationFrame(() => thread.inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [compose, contentId, thread.inputRef, thread.isAuthenticated]);

  return (
    <main className="mx-auto flex h-svh min-h-0 w-full max-w-[720px] flex-col bg-elevated md:h-[calc(100svh-var(--desktop-top-nav-height,68px))] md:border-x md:border-default">
      <header className="flex min-h-15 shrink-0 items-center gap-2 border-b border-default px-1.5 py-2 sm:px-4">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back to the listing"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-main active:bg-surface"
        >
          <ChevronLeft size={26} strokeWidth={2.2} aria-hidden />
        </button>
        {thumbnail && (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
            <Image src={thumbnail} alt="Listing photo" fill sizes="40px" unoptimized={shouldUnoptimize(thumbnail)} className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[16px] font-semibold text-main">
            {post?.stats?.comments ? `Comments · ${fmtCompact(post.stats.comments)}` : "Comments"}
          </h1>
          {post && (
            <p className="truncate text-xs text-muted">
              {[post.title, listingPriceText(post.price)].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </header>

      {post ? (
        <>
          <CommentList thread={thread} contentCreatorId={post.creatorId} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" />
          <CommentComposer thread={thread} keyboardAvoiding />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted">
          <p>{loading ? "Loading comments…" : "This listing isn't available."}</p>
          {!loading && <button type="button" onClick={goBack} className="font-semibold text-primary">Go back</button>}
        </div>
      )}
    </main>
  );
}
