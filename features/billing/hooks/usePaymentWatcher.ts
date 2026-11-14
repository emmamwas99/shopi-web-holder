"use client";

import { useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { BILLING_PAYMENT, isSettled, type BillingPayment } from "../api";

/** Fast while the seller is looking at their phone, slower once a person is involved. */
const WAITING_POLL_MS = 2500;
const REVIEW_POLL_MS = 15000;

/**
 * Follows one payment until it settles. Every poll also nudges the server to
 * ask M-Pesa directly when the callback is late, so a lost callback resolves
 * while the seller is still watching. Refetches immediately when the tab
 * comes back into view — usually the moment they return from the PIN prompt.
 */
export function usePaymentWatcher(paymentId: string | null, initial?: BillingPayment | null) {
  const { data, error, refetch, startPolling, stopPolling } = useQuery(BILLING_PAYMENT, {
    variables: { id: paymentId ?? "" },
    skip: !paymentId,
    fetchPolicy: "network-only",
  });

  const payment = data?.billingPayment ?? (initial && initial.id === paymentId ? initial : null);
  const status = payment?.status;

  useEffect(() => {
    if (!paymentId || (status && isSettled(status))) {
      stopPolling();
      return;
    }
    startPolling(status === "NEEDS_REVIEW" ? REVIEW_POLL_MS : WAITING_POLL_MS);
    return () => stopPolling();
  }, [paymentId, status, startPolling, stopPolling]);

  useEffect(() => {
    if (!paymentId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [paymentId, refetch]);

  return { payment, error };
}
