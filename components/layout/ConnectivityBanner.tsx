"use client";

import { useEffect, useState } from "react";
import { useOffline } from "next/offline";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

const COPY = {
  en: { offline: "You're offline", retry: "We'll retry when you're back", online: "Back online" },
  sw: { offline: "Uko nje ya mtandao", retry: "Tutajaribu tena ukirudi", online: "Umerudi mtandaoni" },
};

/** How long "Back online" stays up once the connection returns. */
const BACK_ONLINE_MS = 2500;

/**
 * A small pill at the top of every page while the connection is down, and a
 * brief "Back online" when it returns.
 *
 * Reads useOffline() (experimental.useOffline), which is more reliable than
 * navigator.onLine: it also flips when a request actually fails — a phone on
 * Wi-Fi or data with no real internet still reports onLine === true. While
 * offline, Next keeps navigations pending and retries them on reconnect, so
 * the pill is what tells people why a tap seems to wait.
 *
 * Never blocks a tap (pointer-events-none), and sits above the full-screen
 * video viewer (z-100).
 */
export function ConnectivityBanner({ lang }: { lang: string }) {
  const isOffline = useOffline();
  const t = lang === "sw" ? COPY.sw : COPY.en;

  // Adjusted during render rather than in an effect: the "Back online" pill
  // follows directly from the offline flag changing.
  const [wasOffline, setWasOffline] = useState(isOffline);
  const [backOnline, setBackOnline] = useState(false);
  if (wasOffline !== isOffline) {
    setWasOffline(isOffline);
    setBackOnline(!isOffline);
  }

  useEffect(() => {
    if (!backOnline) return;
    const timer = setTimeout(() => setBackOnline(false), BACK_ONLINE_MS);
    return () => clearTimeout(timer);
  }, [backOnline]);

  const visible = isOffline || backOnline;

  // The live region is always mounted, so screen readers announce the change
  // when its text appears rather than missing a region that pops into being.
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[110] flex justify-center px-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]"
    >
      {visible && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2 text-[0.8125rem] font-semibold text-white shadow-lg ring-1 ring-white/10 animate-in fade-in slide-in-from-top-2",
            isOffline ? "bg-[#18282a]" : "bg-emerald-600",
          )}
        >
          {isOffline ? (
            <WifiOff className="size-4 shrink-0" aria-hidden />
          ) : (
            <Wifi className="size-4 shrink-0" aria-hidden />
          )}
          <span>{isOffline ? t.offline : t.online}</span>
          {isOffline && (
            <span className="hidden font-medium text-white/70 sm:inline">· {t.retry}</span>
          )}
        </div>
      )}
    </div>
  );
}
