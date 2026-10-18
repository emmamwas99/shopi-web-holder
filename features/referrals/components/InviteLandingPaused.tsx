"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Check, PlusCircle } from "lucide-react";
import type { ReferralInviteQuery } from "@/types/__generated__/graphql";
import { Logo } from "@/components/ui/Logo";
import { useAuthSession } from "@/hooks/useAuthSession";
import { captureReferral } from "@/lib/referral";
import { REFERRALS_PAUSED_BODY, REFERRALS_PAUSED_TITLE } from "../paused";
import { ReferralPausedBanner } from "./ReferralPausedBanner";
import { homeHref } from "@/lib/home-url";

type Invite = NonNullable<ReferralInviteQuery["referralInvite"]>;

const PERKS = [
  "Free to post — no listing fees",
  "0% commission on what you sell",
  "Buyers message you directly",
];

/**
 * InviteLanding while referral rewards are paused (see REFERRALS_PAUSED). It
 * says referrals are paused rather than "X invited you", and still hands the
 * visitor on to sell, since posting is unaffected.
 *
 * The code is still captured on signup, so a referral made now is on record.
 */
export function InviteLandingPaused({ lang, invite }: { lang: string; invite: Invite | null }) {
  // Signed out until the auth store has rehydrated — which is also what nearly
  // everyone opening an invite is.
  const { isAuthenticated: signedIn } = useAuthSession();

  useEffect(() => {
    if (invite) captureReferral(invite.code);
  }, [invite]);

  const sellHref = `/${lang}/auth/auth-welcome?from=${encodeURIComponent(`/${lang}/upload`)}`;

  return (
    <main className="relative mx-auto flex min-h-svh w-full max-w-md flex-col overflow-hidden bg-app px-6 pb-8 pt-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--brand-primary)/0.1)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-64 h-56 w-56 rounded-full bg-[rgb(var(--brand-highlight)/0.1)] blur-3xl"
      />

      <Link href={homeHref(lang)} aria-label="Shopi home" className="relative self-start">
        <Logo variant="lockup" size={34} />
      </Link>

      <div className="relative flex flex-1 flex-col justify-center py-8">
        {signedIn ? (
          <SignedIn lang={lang} />
        ) : (
          <>
            <h1 className="text-[28px] font-black leading-[1.15] text-main">
              {REFERRALS_PAUSED_TITLE}
            </h1>
            <p className="mt-2 text-base leading-snug text-muted">{REFERRALS_PAUSED_BODY}</p>

            <ul className="mt-7 flex flex-col gap-3">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-3 text-[15px] font-medium text-main">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-success)/0.14)] text-success">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {!signedIn && (
        <div className="relative flex flex-col gap-3">
          <Link
            href={sellHref}
            className="flex h-13 items-center justify-center rounded-2xl bg-primary text-base font-bold text-white transition-opacity active:opacity-80"
          >
            Start selling — it’s free
          </Link>
          <Link
            href={`/${lang}/for-you`}
            className="flex h-12 items-center justify-center rounded-2xl text-sm font-semibold text-muted active:opacity-70"
          >
            Look around first
          </Link>
        </div>
      )}
    </main>
  );
}

function SignedIn({ lang }: { lang: string }) {
  return (
    <>
      <h1 className="text-[28px] font-black leading-[1.15] text-main">
        You’re already on Shopi
      </h1>
      <p className="mt-2 text-base leading-snug text-muted">
        Invite links are for new sellers.
      </p>
      <ReferralPausedBanner
        compact
        href={`/${lang}/profile?tab=invite`}
        className="mt-6"
      />
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={`/${lang}/upload`}
          className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-white transition-opacity active:opacity-80"
        >
          <PlusCircle className="h-5 w-5" aria-hidden />
          Post a listing
        </Link>
      </div>
    </>
  );
}
