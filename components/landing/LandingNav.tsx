"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { ShopiLogo } from "@/features/auth/components/AuthIcons";
import { usePathname } from "next/navigation";
import { trackHomepageButtonClick } from "@/lib/analytics";
import { ThemeSelect } from "@/components/ui/ThemeSelect";
import { homeHref } from "@/lib/home-url";

export function LandingNav({ lang }: { lang: Locale }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const sw = lang === "sw";
  const trackSellClick = () => {
    if (pathname === `/${lang}`) {
      trackHomepageButtonClick("sell_item", "navigation", "/en/upload");
    }
  };
  const forYouLabel = sw ? "Kwa ajili yako" : "For you";
  const links = [
    { href: "#how-it-works", label: sw ? "Jinsi inavyofanya kazi" : "How it works" },
    { href: "/en/shopi-agent", label: "Shopi Agent" },
    { href: `/${lang}/explore`, label: sw ? "Angalia bidhaa" : "Browse" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-landing-page text-landing-ink">
      <nav aria-label={sw ? "Menyu kuu" : "Main navigation"} className="mx-auto flex h-18 w-[calc(100%-2.5rem)] max-w-[1500px] items-center justify-between gap-4 md:h-22 md:w-[calc(100%-4rem)]">
        <Link href={homeHref(lang)} aria-label="Shopi home" className="flex items-center gap-2 no-underline">
          <ShopiLogo className="h-9 w-9" />
          <span className="text-xl font-bold text-landing-ink">Shopi</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {links.map((item) => <Link key={item.href} href={item.href} className="text-sm font-medium text-landing-ink no-underline hover:text-primary">{item.label}</Link>)}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <ThemeSelect lang={lang} />
          <Link href={`/${lang}/explore`} className="rounded-full border border-landing-ink px-5 py-2.5 text-sm font-semibold text-landing-ink no-underline">{forYouLabel}</Link>
          <Link href="/en/upload" onClick={trackSellClick} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white no-underline hover:opacity-90">{sw ? "Uza bidhaa" : "Sell an item"}<ArrowUpRight size={17} aria-hidden /></Link>
        </div>
        <button type="button" className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-landing-line md:hidden" aria-label={open ? (sw ? "Funga menyu" : "Close menu") : (sw ? "Fungua menyu" : "Open menu")} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>
      {open && <div className="absolute inset-x-0 top-full border-t border-landing-line bg-landing-page px-5 py-4 shadow-lg md:hidden">
        {links.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block border-b border-landing-line py-3 font-medium text-landing-ink no-underline">{item.label}</Link>)}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-landing-muted">{sw ? "Mandhari" : "Theme"}</span>
          <ThemeSelect lang={lang} className="min-w-36" />
        </div>
        <div className="mt-5 flex gap-3">
          <Link href={`/${lang}/for-you`} onClick={() => setOpen(false)} className="flex-1 rounded-full border border-landing-ink px-4 py-3 text-center text-sm font-semibold text-landing-ink no-underline">{forYouLabel}</Link>
          <Link href="/en/upload" onClick={trackSellClick} className="flex-1 rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-white no-underline">{sw ? "Uza bidhaa" : "Sell an item"}</Link>
        </div>
      </div>}
    </header>
  );
}
