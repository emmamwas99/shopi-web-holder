"use client";

import { useState } from "react";
import Link from "next/link";
import { FileCheck2, MapPin, ShieldAlert, Store } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { cn } from "@/lib/utils";
import { VerifiedTick } from "./VerifiedTick";
import { VerifiedIdBadge } from "./VerifiedIdBadge";

const CHECKS = [
  {
    icon: FileCheck2,
    title: "Business permit",
    body: "A county business permit in the seller's business name.",
  },
  {
    icon: Store,
    title: "A real shop",
    body: "A photo of their storefront, stall or premises.",
  },
  {
    icon: MapPin,
    title: "Shop location",
    body: "Where the business actually operates.",
  },
];

/** What the badge means, in the buyer's terms — including what it doesn't. */
function ExplainerBody({ lang, sellerName }: { lang: string; sellerName?: string | null }) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center px-5 pt-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1D9BF0]/10">
          <VerifiedTick size={32} label={null} />
        </span>
        <p className="mt-3 text-[13px] font-medium text-muted">
          {sellerName ? `${sellerName} is a verified shop` : "Verified shop"}
        </p>
      </div>

      <ul className="mt-4 flex flex-col gap-3.5 px-5">
        {CHECKS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle text-main">
              <Icon size={16} strokeWidth={1.9} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-5 text-main">{title}</p>
              <p className="text-[13px] leading-5 text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mx-5 mt-5 flex items-start gap-2.5 rounded-xl bg-subtle px-3.5 py-3">
        <ShieldAlert size={16} strokeWidth={1.9} className="mt-0.5 shrink-0 text-main" aria-hidden />
        <p className="text-[13px] leading-5 text-main">
          Verification tells you who you&rsquo;re dealing with. It isn&rsquo;t a
          guarantee on every item — inspect before you pay, and meet in a safe,
          public place.{" "}
          <Link
            href={`/${lang}/safety-centre`}
            className="font-semibold underline underline-offset-2"
          >
            Safety tips
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Explains the blue tick and the Verified ID badge. A sheet from the bottom on
 * a phone, a small dialog on desktop — the same body either way.
 */
export function VerifiedExplainer({
  open,
  onOpenChange,
  lang,
  sellerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: string;
  sellerName?: string | null;
}) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          overlayClassName="z-[90]"
          className="z-[90] max-w-sm gap-0 rounded-2xl border-border bg-elevated px-0 pb-5 pt-6"
        >
          <DialogTitle className="flex items-center justify-center gap-2 px-5 text-center text-[16px] font-semibold text-main">
            What Verified ID means
          </DialogTitle>
          <DialogDescription className="sr-only">
            Shopi checked this seller&rsquo;s business permit, shop and location.
          </DialogDescription>
          <div className="mt-3">
            <ExplainerBody lang={lang} sellerName={sellerName} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="z-[90] bg-elevated pb-[max(env(safe-area-inset-bottom),20px)]">
        <DrawerTitle className="px-5 pt-3 text-center text-[16px] font-semibold text-main">
          What Verified ID means
        </DrawerTitle>
        <DrawerDescription className="sr-only">
          Shopi checked this seller&rsquo;s business permit, shop and location.
        </DrawerDescription>
        <div className="mt-3">
          <ExplainerBody lang={lang} sellerName={sellerName} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * A tick or badge that explains itself when tapped. Used where a buyer is
 * deciding whether to trust a seller — the listing page and the shop page —
 * not on feed cards, where the whole card is already a tap target.
 */
export function VerifiedButton({
  lang,
  sellerName,
  variant = "tick",
  tickSize = 16,
  className,
}: {
  lang: string;
  sellerName?: string | null;
  variant?: "tick" | "badge";
  tickSize?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label="Verified shop — what this means"
        className={cn(
          "inline-flex shrink-0 items-center rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#1D9BF0]/50 lg:cursor-pointer",
          className,
        )}
      >
        {variant === "badge" ? <VerifiedIdBadge /> : <VerifiedTick size={tickSize} label={null} />}
      </button>
      <VerifiedExplainer open={open} onOpenChange={setOpen} lang={lang} sellerName={sellerName} />
    </>
  );
}

/**
 * The trust line under a listing's seller: what the tick stands for, said once
 * in plain words, with the full explanation a tap away.
 */
export function VerifiedSellerNote({
  lang,
  sellerName,
  className,
}: {
  lang: string;
  sellerName?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl bg-[#1D9BF0]/8 px-3.5 py-3 text-left transition-opacity active:opacity-70 dark:bg-[#1D9BF0]/12 lg:cursor-pointer",
          className,
        )}
      >
        <VerifiedTick size={20} label={null} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold leading-5 text-main">Verified shop</span>
          <span className="block text-[12px] leading-4 text-muted">
            Shopi checked their business permit, shop and location.
          </span>
        </span>
        <span className="shrink-0 text-[12px] font-semibold text-[#0F6FB8] dark:text-[#6CC3FF]">What this means</span>
      </button>
      <VerifiedExplainer open={open} onOpenChange={setOpen} lang={lang} sellerName={sellerName} />
    </>
  );
}
