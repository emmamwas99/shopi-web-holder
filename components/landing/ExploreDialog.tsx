"use client";

import { useEffect, useState } from "react";

const APP_STORE_URL = "https://apps.apple.com/app/shopi";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.shopi";

export function ExploreDialog({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setError("Please enter a valid Kenyan phone number.");
      return;
    }
    setError("");
    setSending(true);

    const fullNumber = `254${digits.replace(/^0/, "")}`;
    const message = encodeURIComponent(
      `Hey! Here are the Shopi app download links 📱\n\niOS: ${APP_STORE_URL}\nAndroid: ${PLAY_STORE_URL}\n\nDiscover what's selling near you 🛍️`,
    );
    window.open(`https://wa.me/${fullNumber}?text=${message}`, "_blank");
    setSending(false);
    setSent(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Explore Shopi"
      onClick={onClose}
      className="animate-in fade-in fixed inset-0 z-200 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[6px] duration-180"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-in fade-in slide-in-from-bottom-6 max-h-[90vh] w-full max-w-120 overflow-hidden rounded-lg border border-border bg-elevated shadow-[0_32px_80px_rgba(0,0,0,0.35)] duration-220"
      >
        {/* Top gradient bar */}
        <div className="h-1 bg-[linear-gradient(90deg,rgb(var(--brand-primary)),rgb(var(--brand-accent)),rgb(var(--brand-highlight)))]" />

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div className="mb-2 text-[2.5rem] leading-none">📱</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-[1.1rem] text-muted"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6">
          <h2 className="mb-2 font-display text-[clamp(1.2rem,3vw,1.5rem)] font-bold tracking-tight leading-[1.2] text-foreground">
            Built for your phone — by design.
          </h2>
          <p className="mb-6 text-[0.9rem] leading-[1.65] text-muted">
            Scrolling a live feed, messaging sellers, and discovering products
            nearby is a hands-on experience — the kind that just works better on
            mobile.{" "}
            <b className="inline-flex">
              Open this page on your phone to jump straight into the web app,
            </b>
            or download the native app for the full experience.
          </p>

          {/* App store buttons */}
          <div className="mb-6 flex flex-col gap-3">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 rounded-[14px] bg-foreground px-5 py-3.5 font-semibold text-background no-underline transition-opacity duration-150 hover:opacity-[0.88]"
            >
              {/* Apple icon */}
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
              </svg>
              <div className="leading-[1.3]">
                <div className="text-[0.7rem] opacity-70">Download on the</div>
                <div className="text-[1rem]">App Store</div>
              </div>
            </a>

            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 rounded-[14px] border border-border bg-surface px-5 py-3.5 font-semibold text-foreground no-underline transition-colors duration-150 hover:border-[rgb(var(--color-border-strong))]"
            >
              {/* Google Play icon */}
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3.18 23.76c.36.2.78.22 1.16.06L15.86 12 12.1 8.24 3.18 23.76Z"
                  fill="#EA4335"
                />
                <path
                  d="M20.54 10.27 17.3 8.45l-3.76 3.55 3.76 3.55 3.27-1.85c.93-.53.93-1.9-.03-2.43Z"
                  fill="#FBBC05"
                />
                <path
                  d="M3.18.24C2.82.48 2.58.9 2.58 1.42v21.16L12.1 12 3.18.24Z"
                  fill="#4285F4"
                />
                <path
                  d="M3.18 23.76 12.1 12 17.3 15.55l-12.96 8.27c-.4.25-.84.27-1.16-.06Z"
                  fill="#34A853"
                />
              </svg>
              <div className="leading-[1.3]">
                <div className="text-[0.7rem] text-muted">Get it on</div>
                <div className="text-[1rem]">Google Play</div>
              </div>
            </a>
          </div>

          {/* Divider with label */}
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[0.75rem] font-semibold whitespace-nowrap text-muted">
              Send link to your phone via WhatsApp
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* WhatsApp send section */}
          {!sent ? (
            <form onSubmit={handleSend}>
              <p className="mb-3 text-[0.8rem] leading-[1.5] text-muted">
                Enter your phone number and we&apos;ll open WhatsApp with the
                download links pre-filled — ready to send to yourself.
              </p>
              <div
                className={`flex items-stretch overflow-hidden rounded-md border-[1.5px] bg-surface transition-colors duration-150 focus-within:border-primary ${
                  error ? "border-[#ef4444]" : "border-border"
                }`}
              >
                {/* Country code prefix */}
                <div className="flex shrink-0 items-center gap-1.5 border-r border-border bg-elevated px-3.5">
                  <span className="text-[1rem]">🇰🇪</span>
                  <span className="text-[0.875rem] font-bold tracking-[0.02em] text-foreground">
                    +254
                  </span>
                </div>
                <input
                  type="tel"
                  placeholder="7XX XXX XXX"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError("");
                  }}
                  className="min-w-0 flex-1 border-none bg-transparent px-4 py-3.5 text-[0.95rem] text-foreground outline-none placeholder:text-[rgb(var(--color-text-placeholder))]"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className={`flex shrink-0 items-center justify-center gap-1.5 border-none bg-[#25D366] px-[1.1rem] py-3.5 transition-opacity duration-150 ${
                    sending ? "cursor-default opacity-70" : "cursor-pointer"
                  }`}
                >
                  {/* WhatsApp icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span className="text-[0.82rem] font-bold text-white">
                    Send
                  </span>
                </button>
              </div>
              {error && (
                <p className="mt-2 text-[0.78rem] text-[#ef4444]">{error}</p>
              )}
            </form>
          ) : (
            <div className="rounded-md border border-[rgba(37,211,102,0.3)] bg-[rgba(37,211,102,0.1)] p-5 text-center">
              <div className="mb-1.5 text-[1.5rem]">✅</div>
              <p className="mb-1 text-[0.875rem] font-semibold text-foreground">
                WhatsApp opened!
              </p>
              <p className="text-[0.8rem] text-muted">
                Just hit send in WhatsApp to deliver the links to your phone.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
