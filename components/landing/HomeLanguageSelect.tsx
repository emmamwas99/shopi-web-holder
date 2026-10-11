"use client";

import { useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";

/**
 * The current URL with only its locale prefix swapped, so changing language
 * keeps the visitor on the same page. On the homepage it adds `?view=home`:
 * signed-in visitors to a bare `/{lang}` are otherwise redirected into the app
 * (proxy.ts), which is what used to bounce this switch to Explore.
 */
function localizedCurrentUrl(next: Locale) {
  const { pathname, search, hash } = window.location;
  const prefix = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  const rest = prefix ? pathname.slice(prefix.length + 1) : pathname;
  const params = new URLSearchParams(search);
  if (!rest || rest === "/") params.set("view", "home");
  const query = params.toString();
  return `/${next}${rest === "/" ? "" : rest}${query ? `?${query}` : ""}${hash}`;
}

export function HomeLanguageSelect({ current }: { current: Locale }) {
  const router = useRouter();
  return <label className="flex items-center gap-3 text-sm text-white">
    <span>{current === "sw" ? "Lugha" : "Language"}</span>
    <select aria-label={current === "sw" ? "Chagua lugha" : "Choose language"} value={current} onChange={(event) => router.push(localizedCurrentUrl(event.target.value as Locale), { scroll: false })} className="rounded-md border border-white/50 bg-secondary px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-white">
      <option value="en">English</option>
      <option value="sw">Kiswahili</option>
    </select>
  </label>;
}
