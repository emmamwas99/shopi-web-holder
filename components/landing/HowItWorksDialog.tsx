"use client";

import { useEffect } from "react";

export function HowItWorksDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const steps = [
    {
      number: "01",
      emoji: "📲",
      title: "Sign up in 30 seconds",
      body: "No credit card. No long forms. Pick your interests — phones, fashion, food, whatever — and your local feed is ready instantly.",
    },
    {
      number: "02",
      emoji: "🎬",
      title: "Scroll your local feed",
      body: "Watch videos and photos posted by real sellers near you. Think TikTok, but every post is something actually for sale — with a seller you can message directly.",
    },
    {
      number: "03",
      emoji: "💬",
      title: "Like it? Message the seller.",
      body: "Tap to open a direct chat with any seller. Negotiate, ask questions, arrange pickup or delivery — completely on your terms. No checkout, no middleman.",
    },
    {
      number: "04",
      emoji: "📦",
      title: "Sell. Post. Build your audience.",
      body: "Sellers post content, grow followers, and build trust over time. The more you post, the more people discover what you're selling — even while you sleep.",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How Shopi works"
      onClick={onClose}
      className="animate-in fade-in fixed inset-0 z-200 flex items-center justify-center bg-black/55 p-4  duration-180"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-in fade-in slide-in-from-bottom-6 max-h-[90vh] w-full max-w-140 overflow-y-auto rounded-lg border border-border bg-elevated shadow-[0_32px_80px_rgba(0,0,0,0.35)] duration-220"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div>
            <p className="mb-1 text-[0.7rem] font-bold tracking-widest uppercase text-accent">
              How it works
            </p>
            <h2 className="font-display text-[clamp(1.2rem,3vw,1.6rem)] font-bold tracking-tight leading-[1.2] text-foreground">
              Discover locally. Connect directly.
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-4 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-[1.1rem] text-muted"
          >
            ✕
          </button>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4 p-6">
          {steps.map(({ number, emoji, title, body }) => (
            <div
              key={number}
              className="flex items-start gap-4 rounded-[14px] border border-border bg-surface p-5"
            >
              {/* Number badge */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgb(var(--brand-primary)),rgb(var(--brand-accent)))] font-display text-[0.8rem] font-bold text-white">
                {number}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[1.1rem]">{emoji}</span>
                  <h3 className="font-display text-[0.95rem] font-bold leading-[1.3] text-foreground">
                    {title}
                  </h3>
                </div>
                <p className="text-[0.85rem] leading-[1.65] text-muted">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="flex flex-wrap gap-3 px-6 pb-6">
          <a
            href="#download"
            onClick={onClose}
            className="btn-primary flex min-w-40 flex-1 items-center justify-center gap-2 px-5 py-[0.8rem] text-[0.9rem] no-underline"
          >
            Download Shopi →
          </a>
          <button
            onClick={onClose}
            className="min-w-30 flex-1 cursor-pointer rounded-full border border-border bg-elevated px-5 py-[0.8rem] text-[0.9rem] font-semibold text-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
