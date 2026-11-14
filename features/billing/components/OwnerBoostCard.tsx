"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { ChevronRight, Zap } from "lucide-react";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { cn } from "@/lib/utils";
import { BOOST_CHECKOUT } from "../api";
import { daysLeft, kes, shortDay } from "../lib/money";
import { BoostSheet, type BoostSheetPost } from "./BoostSheet";

/**
 * On the seller's own listing: one tap to boost it, or to see the boost that
 * is running. Renders nothing until it knows the post can be boosted, so a
 * post in review (or payments not set up yet) shows no dead end.
 */
export function OwnerBoostCard({ post, className }: { post: BoostSheetPost; className?: string }) {
  const desktop = useIsDesktop({ ssrDefault: false });
  const [open, setOpen] = useState(false);
  const { data } = useQuery(BOOST_CHECKOUT, {
    variables: { contentId: post.id },
    fetchPolicy: "cache-and-network",
  });
  const checkout = data?.boostCheckout;
  if (!checkout || !checkout.paymentsEnabled || !checkout.canBoost) return null;

  const active = checkout.activeBoost;
  const cheapest = Math.min(...checkout.packages.map((pkg) => pkg.priceKes));
  const left = active ? daysLeft(active.endsAt) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-opacity active:opacity-80",
          active ? "border-transparent bg-primary-soft" : "border-default bg-app",
          className,
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <Zap className="size-[18px]" fill="currentColor" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-main">
            {active ? `${active.name} boost · ${left} day${left === 1 ? "" : "s"} left` : "Boost this listing"}
          </span>
          <span className="block text-[12.5px] text-muted">
            {active
              ? `Shown higher in feeds until ${shortDay(active.endsAt)}. Tap to add time.`
              : `Reach more buyers in For You, Nearby and Explore. From ${kes(cheapest)}.`}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted" />
      </button>
      <BoostSheet post={post} open={open} desktop={desktop} onClose={() => setOpen(false)} />
    </>
  );
}
