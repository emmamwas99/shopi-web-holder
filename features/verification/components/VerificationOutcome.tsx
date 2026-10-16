"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, FileText, Hourglass, MapPin, MessageCircleQuestionMark } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VerifiedTick } from "@/components/verification/VerifiedTick";
import { VerifiedIdBadge } from "@/components/verification/VerifiedIdBadge";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { TEAM_THREAD_PATH } from "@/features/team-messages/types";
import { useShopVerificationActions } from "../hooks/useShopVerification";
import type { MyShopVerification, ShopVerificationDocument, ShopVerificationLocation } from "../api";
import { BENEFITS } from "../copy";

function formatDay(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function placeText(location?: ShopVerificationLocation | null): string {
  if (!location) return "";
  return [location.placeName, location.subregion, location.county]
    .filter((part, index, all) => part && all.indexOf(part) === index)
    .join(", ");
}

function DocumentThumb({ document, label }: { document?: ShopVerificationDocument | null; label: string }) {
  const [failed, setFailed] = useState(false);
  const isImage = document && !document.isPdf && document.contentType.startsWith("image/") && document.url && !failed;
  return (
    <a
      href={document?.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border p-2"
    >
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-subtle">
        {isImage ? (
          <img src={document.url} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted">
            <FileText size={18} strokeWidth={1.7} aria-hidden />
          </span>
        )}
      </span>
      <span className="min-w-0 text-[13px] font-medium leading-5 text-main">{label}</span>
    </a>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-b-0">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="text-[14px] leading-5 text-main">{children}</dd>
    </div>
  );
}

// ── In review ────────────────────────────────────────────────────────────────

/**
 * Submitted and waiting. Says what happens next and how they'll hear, shows
 * exactly what was sent, and leaves one way back in if something was wrong.
 */
export function VerificationPending({ verification }: { verification: MyShopVerification }) {
  const application = verification.application!;
  const { withdraw, withdrawing } = useShopVerificationActions();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submittedOn = formatDay(application.submittedAt);

  async function handleWithdraw() {
    try {
      await withdraw();
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't do that. Please try again.");
    }
  }

  const steps = [
    { label: "Details submitted", meta: submittedOn ?? "Done", state: "done" as const },
    { label: "Review by the Shopi team", meta: "In progress", state: "current" as const },
    { label: "Blue tick on your profile", meta: "Once approved", state: "next" as const },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <Hourglass size={28} strokeWidth={1.8} aria-hidden />
        </span>
        <h2 className="mt-4 text-[20px] font-bold leading-7 tracking-[-0.01em] text-main">
          We&rsquo;re reviewing your shop
        </h2>
        <p className="mt-1.5 max-w-[24rem] text-[14px] leading-5 text-muted">
          We check every permit, shop photo and location by hand. You&rsquo;ll get a notification as soon as
          we&rsquo;re done.
        </p>
      </div>

      <ol className="mt-7 rounded-2xl border border-border bg-elevated px-4 py-1">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                step.state === "done" && "bg-[#1D9BF0] text-white",
                step.state === "current" && "border-2 border-amber-500 bg-amber-50 dark:bg-amber-500/10",
                step.state === "next" && "border border-border bg-subtle",
              )}
              aria-hidden
            >
              {step.state === "done" ? <Check size={13} strokeWidth={3} /> : null}
              {step.state === "current" ? <span className="h-2 w-2 rounded-full bg-amber-500" /> : null}
            </span>
            <span className={cn("min-w-0 flex-1 text-[14px] leading-5", step.state === "next" ? "text-muted" : "text-main")}>
              {step.label}
            </span>
            <span className="shrink-0 text-[12px] text-muted">{step.meta}</span>
          </li>
        ))}
      </ol>

      <section className="mt-6" aria-labelledby="sent-details">
        <h3 id="sent-details" className="text-[15px] font-semibold text-main">
          What you sent
        </h3>
        <dl className="mt-2 rounded-2xl border border-border bg-elevated px-4">
          <SummaryRow label="Business name">{application.businessName}</SummaryRow>
          <SummaryRow label="Shop location">
            {placeText(application.location)}
            {application.location?.addressLine ? (
              <span className="block text-[13px] text-muted">{application.location.addressLine}</span>
            ) : null}
          </SummaryRow>
          <div className="flex gap-2 py-3">
            <DocumentThumb document={application.permit} label="Business permit" />
            <DocumentThumb document={application.shopPhoto} label="Shop photo" />
          </div>
        </dl>
      </section>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="mt-5 self-center text-[14px] font-semibold text-main underline-offset-4 hover:underline"
      >
        Need to change something?
      </button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit your details?</DialogTitle>
            <DialogDescription>
              Your shop leaves the review queue while you edit. Resubmit when you&rsquo;re done and we&rsquo;ll
              review it again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="h-10 rounded-full border border-border px-4 text-sm font-semibold text-main transition-colors hover:bg-surface"
            >
              Keep in review
            </button>
            <button
              type="button"
              onClick={() => void handleWithdraw()}
              disabled={withdrawing}
              className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-60"
            >
              {withdrawing ? "One moment…" : "Edit details"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Verified ─────────────────────────────────────────────────────────────────

/**
 * Verified. Shows the seller what buyers now see — their own name with the
 * tick, and a listing with the Verified ID badge — so the result is concrete,
 * not just a message.
 */
export function VerificationApproved({ lang, verification }: { lang: string; verification: MyShopVerification }) {
  const user = useAuthStore((state) => state.user);
  const application = verification.application;
  const name =
    [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(" ") ||
    application?.businessName ||
    "Your shop";
  const avatar = user?.profile?.avatar;
  const since = formatDay(application?.verifiedAt);
  const place = application?.location?.subregion || application?.location?.county || "Your area";

  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1D9BF0]/10">
          <VerifiedTick size={36} label={null} />
        </span>
        <h2 className="mt-4 text-[20px] font-bold leading-7 tracking-[-0.01em] text-main">Your shop is verified</h2>
        <p className="mt-1.5 text-[14px] leading-5 text-muted">
          {since ? `Verified since ${since}` : "Buyers see your blue tick across Shopi."}
        </p>
      </div>

      <section className="mt-7" aria-labelledby="buyers-see">
        <h3 id="buyers-see" className="text-[15px] font-semibold text-main">
          What buyers see
        </h3>
        {/* A miniature of a real feed card, built from the seller's own profile. */}
        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-elevated" aria-hidden>
          <div className="flex items-center gap-2.5 px-4 py-3">
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-subtle">
              {avatar ? (
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-muted">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[14px] font-semibold leading-5 text-main">
                <span className="truncate">{name}</span>
                <VerifiedTick size={15} label={null} />
              </p>
              <p className="text-[12px] leading-4 text-muted">{place} · Just now</p>
            </div>
          </div>
          <div className="h-24 bg-subtle" />
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[17px] font-bold leading-6 text-main">KES 2,500</span>
              <VerifiedIdBadge />
            </div>
            <p className="mt-0.5 text-[13px] leading-5 text-muted">Every item you list carries the badge</p>
          </div>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="your-benefits">
        <h3 id="your-benefits" className="text-[15px] font-semibold text-main">
          Your benefits
        </h3>
        <ul className="mt-2 rounded-2xl border border-border bg-elevated px-4 py-1">
          {BENEFITS.map(({ title }) => (
            <li key={title} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1D9BF0] text-white" aria-hidden>
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="text-[14px] leading-5 text-main">{title}</span>
            </li>
          ))}
        </ul>
      </section>

      {application?.businessName || application?.location ? (
        <section className="mt-6" aria-labelledby="verified-details">
          <h3 id="verified-details" className="text-[15px] font-semibold text-main">
            Verified details
          </h3>
          <dl className="mt-2 rounded-2xl border border-border bg-elevated px-4">
            {application?.businessName ? <SummaryRow label="Business name">{application.businessName}</SummaryRow> : null}
            {application?.location ? (
              <SummaryRow label="Shop location">
                <span className="flex items-start gap-1.5">
                  <MapPin size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                  <span>
                    {placeText(application.location)}
                    {application.location.addressLine ? (
                      <span className="block text-[13px] text-muted">{application.location.addressLine}</span>
                    ) : null}
                  </span>
                </span>
              </SummaryRow>
            ) : null}
          </dl>
        </section>
      ) : null}

      <Link
        href={`/${lang}${TEAM_THREAD_PATH}`}
        className="mt-6 flex items-center gap-3 rounded-2xl bg-subtle px-4 py-3.5 text-[13px] leading-5 text-main transition-opacity active:opacity-70"
      >
        <MessageCircleQuestionMark size={18} strokeWidth={1.9} className="shrink-0" aria-hidden />
        <span>
          <span className="font-semibold">Business details changed?</span>{" "}
          Message the Shopi team and we&rsquo;ll update your verification.
        </span>
      </Link>
    </div>
  );
}
