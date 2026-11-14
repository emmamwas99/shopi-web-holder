"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { ChevronDown, ChevronLeft, Receipt, Zap } from "lucide-react";
import { BackLink } from "@/components/layout/BackLink";
import { profileReturnHref } from "@/features/profile/lib/settingsReturn";
import { cn } from "@/lib/utils";
import { MY_PAYMENTS, type BillingPayment, type PaymentStatus } from "../api";
import { dateTime, kes } from "../lib/money";

const PAGE_SIZE = 20;

const STATUS: Record<PaymentStatus, { label: string; className: string }> = {
  INITIATED: { label: "Waiting", className: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
  PENDING: { label: "Waiting", className: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
  PAID: { label: "Paid", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  COMPLETED: { label: "Paid", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  FAILED: { label: "Failed", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  NEEDS_REVIEW: { label: "Being checked", className: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
  REFUNDED: { label: "Refunded", className: "bg-surface text-muted" },
};

/** Every payment the seller has made, newest first, with its M-Pesa receipt. */
export function BillingHistoryScreen({ lang }: { lang: string }) {
  const searchParams = useSearchParams();
  const backHref = profileReturnHref(lang, searchParams.get("from"));
  const [pages, setPages] = useState(1);
  const { data, loading, error, refetch } = useQuery(MY_PAYMENTS, {
    variables: { page: 1, limit: PAGE_SIZE * pages },
    fetchPolicy: "cache-and-network",
  });
  const payments = data?.myPayments.data ?? [];
  const hasMore = data?.myPayments.meta.hasNextPage ?? false;

  return (
    <div className="min-h-svh bg-app">
      <header
        className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b px-3"
        style={{ backgroundColor: "rgb(var(--color-bg))", borderColor: "rgb(var(--color-border))" }}
      >
        <BackLink href={backHref} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-md">
          <ChevronLeft size={30} strokeWidth={2.5} aria-hidden />
        </BackLink>
        <h1 className="text-base font-bold text-default">Payments</h1>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 pb-10 pt-4 sm:px-6">
        {error && !data ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted">Couldn&apos;t load your payments.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="h-10 rounded-full border border-default px-4 text-sm font-semibold text-main"
            >
              Try again
            </button>
          </div>
        ) : loading && !data ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-[68px] animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Receipt className="size-6" />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-main">No payments yet</p>
            <p className="mt-1 text-[13.5px] text-muted">
              Boost a post to show it to more buyers. Your M-Pesa receipts will appear here.
            </p>
            <Link
              href={`/${lang}/profile?tab=posts`}
              className="mt-5 inline-flex h-10 items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-white"
            >
              Go to my posts
            </Link>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-default">
              {payments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </ul>
            {hasMore && (
              <button
                type="button"
                onClick={() => setPages((value) => value + 1)}
                disabled={loading}
                className="mt-4 h-11 w-full rounded-full border border-default text-sm font-semibold text-main disabled:opacity-50"
              >
                {loading ? "Loading…" : "Show more"}
              </button>
            )}
            <p className="mt-5 text-center text-[12px] text-muted">
              Questions about a payment? Contact support with its reference.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function PaymentRow({ payment }: { payment: BillingPayment }) {
  const [open, setOpen] = useState(false);
  const status = STATUS[payment.status];
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-surface"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Zap className="size-4" fill="currentColor" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-main">{payment.itemLabel}</span>
          <span className="block text-[12px] text-muted">{dateTime(payment.createdAt)}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[14px] font-semibold tabular-nums text-main">{kes(payment.amount)}</span>
          <span className={cn("mt-0.5 inline-block rounded-full px-2 py-[2px] text-[11px] font-semibold", status.className)}>
            {status.label}
          </span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <dl className="space-y-1.5 bg-surface px-3.5 py-3 text-[13px]">
          {payment.receipt && <Detail label="M-Pesa receipt" value={payment.receipt} mono />}
          <Detail label="Reference" value={payment.reference} mono />
          <Detail label="Phone" value={payment.phone} />
          {payment.failureReason && payment.status === "FAILED" && (
            <Detail label="Why it failed" value={payment.failureReason} />
          )}
          {payment.status === "NEEDS_REVIEW" && (
            <Detail
              label="Status"
              value={
                payment.moneyReceived
                  ? "Payment received — our team is finishing your boost."
                  : "Confirming with M-Pesa. Please don't pay again."
              }
            />
          )}
        </dl>
      )}
    </li>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={cn("min-w-0 text-right text-main", mono && "font-mono text-[12.5px]")}>{value}</dd>
    </div>
  );
}
