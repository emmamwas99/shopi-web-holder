import type { Metadata } from "next";
import { NotFoundView } from "@/components/layout/NotFoundView";
import { NOT_FOUND_METADATA } from "@/components/layout/notFoundMetadata";

export const metadata: Metadata = NOT_FOUND_METADATA;

/**
 * A /explore/{category}/{subcategory} URL that isn't a real subcategory — a
 * typo or an old link. Served as a 404 so engines drop it, with the same
 * screen as every other 404 ("Browse listings" leads back to the categories).
 */
export default function ExploreSubcategoryNotFound() {
  return <NotFoundView inShell />;
}
