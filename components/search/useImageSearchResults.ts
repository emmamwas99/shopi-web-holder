"use client";

import { gql, type TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { concatAST } from "graphql";
import { useCallback } from "react";
import {
  ContentCardFieldsFragmentDoc,
  type ContentCardFieldsFragment,
} from "@/types/__generated__/graphql";
import {
  useImageSearchStore,
  type ImageSearchSession,
  type ImageSearchTarget,
} from "@/stores/imageSearch";

/**
 * The matches as full listing cards, so photo results render with the same
 * tiles (save, price, place, seller) as a typed search instead of a thinner
 * one-off card. Kept out of lib/imageSearch.ts: the homepage's camera button
 * imports that, and the homepage ships without Apollo.
 */
const CONTENT_BY_IDS = concatAST([
  gql`
    query ImageSearchListings($ids: [String!]!) {
      contentByIds(ids: $ids) {
        ...ContentCardFields
      }
    }
  `,
  ContentCardFieldsFragmentDoc,
]) as unknown as TypedDocumentNode<
  { contentByIds: ContentCardFieldsFragment[] },
  { ids: string[] }
>;

/**
 * - `analyzing`: the photo is being resized, uploaded and matched.
 * - `searching`: matches are known; their cards are loading.
 * - `done` / `error`: settled.
 */
export type ImageSearchPhase = "analyzing" | "searching" | "done" | "error";

const NO_IDS: string[] = [];

export function useImageSearchResults(target: ImageSearchTarget): {
  session: ImageSearchSession | null;
  phase: ImageSearchPhase | null;
  items: ContentCardFieldsFragment[];
  error: string | null;
  clear: () => void;
} {
  const session = useImageSearchStore((s) =>
    s.session?.target === target ? s.session : null,
  );
  const clearStore = useImageSearchStore((s) => s.clear);
  const clear = useCallback(() => clearStore(target), [clearStore, target]);
  const ids = session?.status === "ready" ? session.ids : NO_IDS;

  const listings = useQuery(CONTENT_BY_IDS, {
    variables: { ids },
    skip: ids.length === 0,
    fetchPolicy: "cache-first",
  });
  const items = ids.length ? (listings.data?.contentByIds ?? []) : [];

  let phase: ImageSearchPhase | null = null;
  let error: string | null = null;
  if (session) {
    if (session.status === "analyzing") phase = "analyzing";
    else if (session.status === "error") {
      phase = "error";
      error = session.error;
    } else if (ids.length && !listings.data && listings.error) {
      phase = "error";
      error = "Couldn't load the matching listings. Try again.";
    } else if (ids.length && !listings.data) phase = "searching";
    else phase = "done";
  }

  return { session, phase, items, error, clear };
}
