"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { ShopiLogo } from "@/features/auth/components/AuthIcons";
import { useAuthSession } from "@/hooks/useAuthSession";
import { usePathname } from "next/navigation";
import { trackHomepageButtonClick } from "@/lib/analytics";

export function LandingNav({ lang }: { lang: Locale }) {
  const [open, setOpen] = useState(false);
  const { hydrated, isAuthenticated } = useAuthSession();
  const pathname = usePathname();
  const sw = lang === "sw";
  const trackSellClick = () => {
    if (pathname === `/${lang}`) {
      trackHomepageButtonClick("sell_item", "navigation", "/en/upload");
    }
  };
  const accountHref = isAuthenticated ? `/${lang}/explore` : `/${lang}/auth/login`;
  const accountLabel = isAuthenticated
    ? (sw ? "Vinjari matangazo" : "Browse listings")
    : (sw ? "Ingia" : "Sign in");
  const links = [
    { href: "#how-it-works", label: sw ? "Jinsi inavyofanya kazi" : "How it works" },
    { href: "/en/shopi-agent", label: "Shopi Agent" },
    { href: `/${lang}/explore`, label: sw ? "Angalia bidhaa" : "Browse" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white text-[#172226]">
      <nav aria-label={sw ? "Menyu kuu" : "Main navigation"} className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-5 md:h-22 md:px-8">
        <Link href={`/${lang}`} aria-label="Shopi home" className="flex items-center gap-2 no-underline">
          <ShopiLogo className="h-9 w-9" />
          <span className="text-xl font-bold text-[#172226]">Shopi</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {links.map((item) => <Link key={item.href} href={item.href} className="text-sm font-medium text-[#273237] no-underline hover:text-primary">{item.label}</Link>)}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {hydrated && <Link href={accountHref} className="rounded-full border border-[#172226] px-5 py-2.5 text-sm font-semibold text-[#172226] no-underline">{accountLabel}</Link>}
          <Link href="/en/upload" onClick={trackSellClick} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white no-underline hover:opacity-90">{sw ? "Uza bidhaa" : "Sell an item"}<ArrowUpRight size={17} aria-hidden /></Link>
        </div>
        <button type="button" className="inline-flex size-11 items-center justify-center rounded-full border border-[#d8dfe0] md:hidden" aria-label={open ? (sw ? "Funga menyu" : "Close menu") : (sw ? "Fungua menyu" : "Open menu")} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>
      {open && <div className="absolute inset-x-0 top-full border-t border-[#e5e9e9] bg-white px-5 py-4 shadow-lg md:hidden">
        {links.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block border-b border-[#e5e9e9] py-3 font-medium text-[#172226] no-underline">{item.label}</Link>)}
        <div className="mt-5 flex gap-3">
          {hydrated && <Link href={accountHref} onClick={() => setOpen(false)} className="flex-1 rounded-full border border-[#172226] px-4 py-3 text-center text-sm font-semibold text-[#172226] no-underline">{accountLabel}</Link>}
          <Link href="/en/upload" onClick={trackSellClick} className="flex-1 rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-white no-underline">{sw ? "Uza bidhaa" : "Sell an item"}</Link>
        </div>
      </div>}
    </header>
  );
}
