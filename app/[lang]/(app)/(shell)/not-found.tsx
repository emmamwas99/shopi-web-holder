"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

/**
 * Shown when a shell page calls notFound() — a deleted listing or a bad link.
 * Rendered inside the shell so a buyer following an old shared link keeps the
 * nav, and served with a real 404 so engines drop the URL instead of
 * recrawling a noindexed 200.
 */
export default function ShellNotFound() {
  const { lang } = useParams<{ lang: string }>();

  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-4xl">😕</div>
      <p className="text-default font-semibold">This listing is no longer available</p>
      <Link href={`/${lang}/for-you`} className="text-primary text-sm font-semibold">
        Browse what&apos;s for sale
      </Link>
    </div>
  );
}
