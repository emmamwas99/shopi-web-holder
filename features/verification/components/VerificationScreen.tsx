"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BackLink } from "@/components/layout/BackLink";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { profileReturnHref } from "@/features/profile/lib/settingsReturn";
import { useMyShopVerification } from "../hooks/useShopVerification";
import type { MyShopVerification } from "../api";
import { VerificationIntro } from "./VerificationIntro";
import { VerificationForm } from "./VerificationForm";
import { VerificationApproved, VerificationPending } from "./VerificationOutcome";

type View = "intro" | "form" | "pending" | "approved";

function viewFor(verification: MyShopVerification, started: boolean): View {
  const status = verification.application?.status;
  if (status === "PENDING") return "pending";
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED" || status === "REVOKED" || status === "DRAFT") return "form";
  // A tick from before applications existed is still a verified shop.
  if (verification.isVerified) return "approved";
  return started ? "form" : "intro";
}

/**
 * Shop verification, from first look to the blue tick. One screen that moves
 * through the seller's stages — what you get, the form, in review, verified —
 * so the URL a notification opens always shows where they stand now.
 *
 * `embedded` drops the back header for the desktop dashboard, which has its own.
 */
export function VerificationScreen({ lang, embedded = false }: { lang: string; embedded?: boolean }) {
  const searchParams = useSearchParams();
  const backHref = profileReturnHref(lang, searchParams.get("from"));
  const [started, setStarted] = useState(false);
  const { verification, loading, error, refetch } = useMyShopVerification({ fetchPolicy: "cache-and-network" });

  const view = verification ? viewFor(verification, started) : null;
  const title = view === "approved" ? "Verified shop" : "Shop verification";

  return (
    <div className={cn("bg-app", embedded ? "h-full min-h-0 overflow-y-auto" : "min-h-svh")}>
      {embedded ? (
        <header className="border-b border-border px-5 pb-4 pt-5 md:px-8 md:pb-5 md:pt-6">
          <h1 className="text-lg font-extrabold tracking-tight text-main">{title}</h1>
          <p className="mt-1 text-xs text-muted">
            Show buyers you&rsquo;re a real, registered business.
          </p>
        </header>
      ) : (
        <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-border bg-app px-3">
          <BackLink
            href={backHref}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-md text-main"
          >
            <ChevronLeft size={30} strokeWidth={2.5} aria-hidden />
          </BackLink>
          <h1 className="text-base font-bold text-main">{title}</h1>
        </header>
      )}

      <div
        className={cn(
          "mx-auto w-full max-w-[640px] px-4 pt-5 md:px-6 md:pt-8",
          embedded ? "pb-10" : "pb-[calc(var(--safe-bottom,0px)+2.5rem)]",
        )}
      >
        {!verification ? (
          error ? (
            <div role="alert" className="rounded-2xl border border-border bg-elevated p-6 text-center">
              <p className="text-[15px] font-semibold text-main">We couldn&rsquo;t load your verification</p>
              <p className="mt-1 text-[13px] text-muted">Check your connection and try again.</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white active:opacity-80"
              >
                Try again
              </button>
            </div>
          ) : (
            <ScreenSkeleton />
          )
        ) : view === "intro" ? (
          <VerificationIntro onStart={() => setStarted(true)} />
        ) : view === "pending" ? (
          <VerificationPending verification={verification} />
        ) : view === "approved" ? (
          <VerificationApproved lang={lang} verification={verification} />
        ) : (
          <VerificationForm
            // Remount when the application moves to a new round, so the form
            // starts from what the server now holds.
            key={`${verification.application?.id ?? "new"}-${verification.application?.status ?? "none"}`}
            verification={verification}
            embedded={embedded}
          />
        )}
        {loading && !verification ? <span className="sr-only">Loading</span> : null}
      </div>
    </div>
  );
}

function ScreenSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="mx-auto h-14 w-14 rounded-full" />
      <Skeleton className="mx-auto h-6 w-56" />
      <Skeleton className="mx-auto h-4 w-72" />
      <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
