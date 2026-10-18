import type { Metadata } from "next";
import { NotFoundView } from "@/components/layout/NotFoundView";
import { NOT_FOUND_METADATA } from "@/components/layout/notFoundMetadata";

/**
 * Any notFound() under a locale without a closer boundary: a deleted shop at
 * /{lang}/@{handle}, a listing whose metadata lookup 404s, a bad for-sale
 * slug. URLs that match no route at all are app/global-not-found.tsx's job.
 * Next serves both with a 404 status and a noindex tag.
 */
export const metadata: Metadata = NOT_FOUND_METADATA;

export default function NotFound() {
  return <NotFoundView />;
}
