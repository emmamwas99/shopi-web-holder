import type { Metadata } from "next";
import { NotFoundView } from "@/components/layout/NotFoundView";
import { NOT_FOUND_METADATA } from "@/components/layout/notFoundMetadata";

export const metadata: Metadata = NOT_FOUND_METADATA;

/**
 * Shown when a shell page calls notFound() — a deleted listing or a bad link.
 * Rendered inside the shell so a buyer following an old shared link keeps the
 * nav, and served with a real 404 so engines drop the URL instead of
 * recrawling a noindexed 200. Same screen as every other 404.
 */
export default function ShellNotFound() {
  return <NotFoundView inShell />;
}
