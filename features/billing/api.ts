"use client";

import { gql, type TypedDocumentNode } from "@apollo/client";

/**
 * Billing over GraphQL. Types are written by hand, as elsewhere in features/.
 *
 * The server owns prices and payment state; the client only ever says which
 * package, which phone, and an idempotency key for the attempt.
 */

export type BoostTier = "SILVER" | "GOLD" | "PLATINUM";

export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "PAID"
  | "COMPLETED"
  | "FAILED"
  | "NEEDS_REVIEW"
  | "REFUNDED";

export type BillingPayment = {
  id: string;
  reference: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  /** e.g. "0712 345 678" */
  phone: string;
  itemLabel: string;
  targetId: string;
  itemCode: string;
  receipt?: string | null;
  failureReason?: string | null;
  moneyReceived: boolean;
  createdAt: string;
  paidAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  refundedAt?: string | null;
};

export type BoostCheckoutPackage = {
  tier: BoostTier;
  name: string;
  description: string;
  multiplier: number;
  priority: number;
  durationDays: number;
  priceKes: number;
  available: boolean;
  unavailableReason?: string | null;
  recommended: boolean;
};

export type BoostCheckout = {
  contentId: string;
  paymentsEnabled: boolean;
  canBoost: boolean;
  blockedReason?: string | null;
  activeBoost?: { tier: BoostTier; name: string; endsAt: string } | null;
  packages: BoostCheckoutPackage[];
  openPayment?: BillingPayment | null;
  paymentInReview?: BillingPayment | null;
  defaultPhone?: string | null;
};

const BILLING_PAYMENT_FIELDS = gql`
  fragment BillingPaymentFields on BillingPayment {
    id
    reference
    status
    amount
    currency
    phone
    itemLabel
    targetId
    itemCode
    receipt
    failureReason
    moneyReceived
    createdAt
    paidAt
    completedAt
    failedAt
    refundedAt
  }
`;

export const BOOST_CHECKOUT: TypedDocumentNode<{ boostCheckout: BoostCheckout }, { contentId: string }> = gql`
  query BoostCheckout($contentId: String!) {
    boostCheckout(contentId: $contentId) {
      contentId
      paymentsEnabled
      canBoost
      blockedReason
      activeBoost {
        tier
        name
        endsAt
      }
      packages {
        tier
        name
        description
        multiplier
        priority
        durationDays
        priceKes
        available
        unavailableReason
        recommended
      }
      openPayment {
        ...BillingPaymentFields
      }
      paymentInReview {
        ...BillingPaymentFields
      }
      defaultPhone
    }
  }
  ${BILLING_PAYMENT_FIELDS}
`;

export const START_BOOST_PAYMENT: TypedDocumentNode<
  { startBoostPayment: BillingPayment },
  { input: { contentId: string; tier: BoostTier; phone: string; idempotencyKey: string } }
> = gql`
  mutation StartBoostPayment($input: StartBoostPaymentInput!) {
    startBoostPayment(input: $input) {
      ...BillingPaymentFields
    }
  }
  ${BILLING_PAYMENT_FIELDS}
`;

export const BILLING_PAYMENT: TypedDocumentNode<{ billingPayment: BillingPayment }, { id: string }> = gql`
  query BillingPayment($id: String!) {
    billingPayment(id: $id) {
      ...BillingPaymentFields
    }
  }
  ${BILLING_PAYMENT_FIELDS}
`;

export const MY_PAYMENTS: TypedDocumentNode<
  {
    myPayments: {
      data: BillingPayment[];
      meta: { page: number; totalPages: number; total: number; hasNextPage: boolean };
    };
  },
  { page?: number; limit?: number }
> = gql`
  query MyPayments($page: Int, $limit: Int) {
    myPayments(page: $page, limit: $limit) {
      data {
        ...BillingPaymentFields
      }
      meta {
        page
        totalPages
        total
        hasNextPage
      }
    }
  }
  ${BILLING_PAYMENT_FIELDS}
`;

/** Statuses after which nothing changes without a person. */
export const SETTLED_STATUSES: PaymentStatus[] = ["COMPLETED", "FAILED", "REFUNDED"];

export function isSettled(status: PaymentStatus): boolean {
  return SETTLED_STATUSES.includes(status);
}
