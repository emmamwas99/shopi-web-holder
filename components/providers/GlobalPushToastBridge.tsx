"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type PushBridgeMessage = {
  type?: string;
  payload?: {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  };
};

export function GlobalPushToastBridge() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !navigator.serviceWorker
    ) {
      return;
    }

    const onMessage = (event: MessageEvent<PushBridgeMessage>) => {
      const data = event.data;
      if (data?.type !== "shopi:push") return;
      if (
        document.visibilityState !== "visible" ||
        (typeof document.hasFocus === "function" && !document.hasFocus())
      ) {
        return;
      }

      const title = data.payload?.title || "Shopi";
      const body = data.payload?.body || "You have a new notification";
      const url = data.payload?.url;

      toast.custom(
        () => (
          <button
            type="button"
            onClick={() => {
              if (url) window.location.href = url;
            }}
            className="group flex w-full max-w-[min(92vw,380px)] items-start gap-3 rounded-3xl border border-border bg-elevated px-4 py-3 text-left shadow-[0_20px_60px_rgba(15,23,42,0.18)] transition hover:bg-surface"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E0005C] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(224,0,92,0.28)]">
              S
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-[15px] font-semibold leading-5 text-slate-950">
                  {title}
                </p>
                <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  now
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-600">
                {body}
              </p>
              {url ? (
                <span className="mt-2 inline-flex text-[12px] font-semibold text-[#E0005C]">
                  Open
                </span>
              ) : null}
            </div>
          </button>
        ),
        {
          id: data.payload?.tag || `${title}:${body}`,
          duration: 5000,
        },
      );
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
