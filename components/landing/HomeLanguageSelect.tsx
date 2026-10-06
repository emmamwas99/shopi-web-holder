"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

export function HomeLanguageSelect({ current }: { current: Locale }) {
  const router = useRouter();
  return <label className="flex items-center gap-3 text-sm text-white">
    <span>{current === "sw" ? "Lugha" : "Language"}</span>
    <select aria-label={current === "sw" ? "Chagua lugha" : "Choose language"} value={current} onChange={(event) => router.push(`/${event.target.value}#top`)} className="rounded-md border border-white/50 bg-secondary px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-white">
      <option value="en">English</option>
      <option value="sw">Kiswahili</option>
    </select>
  </label>;
}
