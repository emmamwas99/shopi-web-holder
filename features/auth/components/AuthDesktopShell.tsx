// Server component — no "use client" needed

import Link from "next/link";
import { ShopiLogo } from "./AuthIcons";
import { AuthExitButton } from "./AuthExitButton";

/** Floating social-product card stack — shared between welcome & desktop panel */
export function CardStack() {
  return (
    <div className="relative w-72 h-60">
      {/* Back-left — primary */}
      <div className="absolute left-0 top-6 w-36 h-44 rounded-3xl rotate-[-10deg] shadow-xl overflow-hidden bg-linear-145 from-primary to-primary/55">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="text-white/70 text-xs font-semibold tracking-wide uppercase">
            Trending
          </span>
        </div>
        <div className="absolute bottom-4 left-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
            <span className="text-white text-xs font-bold">K</span>
          </div>
          <span className="text-white/80 text-xs font-medium">@kali</span>
        </div>
      </div>

      {/* Back-right — accent */}
      <div className="absolute right-0 top-2 w-32 h-40 rounded-3xl rotate-[9deg] shadow-xl overflow-hidden bg-linear-145 from-accent to-accent/55">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
        <div className="absolute top-3 right-3 bg-white/20  rounded-full px-2 py-0.5">
          <span className="text-white text-xs font-bold">New</span>
        </div>
        <div className="absolute bottom-4 left-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="text-white/80 text-xs font-medium">@marco.s</span>
        </div>
      </div>

      {/* Front center — secondary */}
      <div className="absolute left-14 top-6 w-44 h-48 rounded-3xl shadow-2xl overflow-hidden bg-linear-145 from-highlight to-highlight/65">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
        <div className="absolute top-4 left-4 bg-black/20  rounded-full px-2.5 py-0.5">
          <span className="text-white text-xs font-bold">🔥 Trending</span>
        </div>
        <div className="absolute top-4 right-4 bg-white/20  rounded-full px-2 py-0.5 flex items-center gap-1">
          <span className="text-white text-xs">♥</span>
          <span className="text-white text-xs font-bold">42K</span>
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center ring-2 ring-white/30">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="text-white/90 text-xs font-semibold block">
            @nia
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop split-screen shell for auth pages.
 *
 * Mobile  (<lg): renders children directly — each page owns its own mobile layout.
 * Desktop (≥lg): left branded panel + right form card.
 */
export function AuthDesktopShell({
  lang,
  from,
  children,
}: {
  lang: string;
  /** Passed through to the back control; see AuthExitButton. */
  from?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ── Mobile: just pass through — pages handle their own layout ── */}
      <div className="lg:hidden">{children}</div>

      {/* ── Desktop split ── */}
      <div className="hidden min-h-svh lg:flex">
        {/* Left panel — branded.
            Gradient + glows use Tailwind theme utilities (from-primary / to-highlight
            map to the @theme color tokens). Inline-style gradients are NOT used here —
            they don't reach the DOM in this build, leaving the panel transparent. */}
        <div className="relative flex w-[52%] flex-col overflow-hidden bg-linear-150 from-primary from-10% via-primary via-45% to-highlight px-12 py-10 text-white xl:w-[55%]">
          {/* Logo — top */}
          <div className="relative z-10 flex justify-center">
            <Link href={`/${lang}`} className="inline-block">
              <ShopiLogo className="h-16 w-auto" />
            </Link>
          </div>

          {/* Center content — vertically + horizontally centered */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-9 text-center">
            {/* CardStack is internally left-biased; nudge to optically center it */}
            <div className="pl-6">
              <CardStack />
            </div>

            <div className="max-w-md flex flex-col items-center">
              <h2 className="mt-6 text-[40px] font-bold leading-[1.05] tracking-tight text-balance font-display xl:text-[50px]">
                Everything for sale near you, in one feed.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-white/80 text-pretty">
                Scroll your local feed, message the seller, agree on a price —
                done. No checkout, no fees, no middleman.
              </p>
            </div>

            {/* Loop steps — the whole product in three beats */}
            <div className="flex items-center gap-3 text-sm font-medium text-white/90">
              <span className="rounded-full bg-white/15 px-3.5 py-1.5">
                Scroll
              </span>
              <span aria-hidden className="text-white/40">
                →
              </span>
              <span className="rounded-full bg-white/15 px-3.5 py-1.5">
                Message
              </span>
              <span aria-hidden className="text-white/40">
                →
              </span>
              <span className="rounded-full bg-white/15 px-3.5 py-1.5">
                Agree
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 flex justify-center gap-6 text-sm font-medium text-white/70">
            <Link
              href={`/${lang}/terms-and-conditions`}
              className="hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link
              href={`/${lang}/privacy-policy`}
              className="hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              href={`/${lang}/about`}
              className="hover:text-white transition-colors"
            >
              About
            </Link>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto bg-app p-8 xl:p-16">
          {/* Card container — lifted surface on large screens */}
          <div className="relative w-full max-w-110 rounded-2xl border border-border bg-elevated p-8 shadow-(--shadow-lg) xl:p-10">
            {/* Back, not Home — see AuthExitButton. Left-aligned to match. */}
            <div className="mb-6 flex justify-start">
              <AuthExitButton
                lang={lang}
                from={from}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-app px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-default"
              />
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
