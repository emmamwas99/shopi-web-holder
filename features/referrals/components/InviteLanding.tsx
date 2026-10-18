"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Check, Gift, PlusCircle } from "lucide-react";
import type { ReferralInviteQuery } from "@/types/__generated__/graphql";
import { Logo } from "@/components/ui/Logo";
import { useAuthSession } from "@/hooks/useAuthSession";
import { captureReferral } from "@/lib/referral";
import { homeHref } from "@/lib/home-url";

type Invite = NonNullable<ReferralInviteQuery["referralInvite"]>;

const PERKS = [
  "Free to post — no listing fees",
  "0% commission on what you sell",
  "Buyers message you directly",
];

/**
 * The page behind an invite link. Its one job is to turn "a friend sent me
 * this" into a seller account, so it leads with the friend, not with Shopi,
 * and hands straight off to signup with seller intent (`from=/upload` gives
 * the welcome screen its "your listing is one photo away" copy).
 */
export function InviteLanding({ lang, invite }: { lang: string; invite: Invite | null }) {
  // Signed out until the auth store has rehydrated — which is also what nearly
  // everyone opening an invite is.
  const { isAuthenticated: signedIn } = useAuthSession();

  useEffect(() => {
    if (invite) captureReferral(invite.code);
  }, [invite]);

  const sellHref = `/${lang}/auth/auth-welcome?from=${encodeURIComponent(`/${lang}/upload`)}`;
  const inviterFirstName = invite?.inviter.displayName.replace(/^@/, "").split(" ")[0];

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
        ) : invite ? (
          <>
            <InviterAvatar invite={invite} />
            <h1 className="mt-6 text-[28px] font-black leading-[1.15] text-main">
              {invite.inviter.displayName} invited you to sell on Shopi
            </h1>
            <p className="mt-2 text-base leading-snug text-muted">
              Post what you’re selling and reach buyers near you.
            </p>
          </>
        ) : (
          <>
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Gift className="h-8 w-8" strokeWidth={1.8} aria-hidden />
            </span>
            <h1 className="mt-6 text-[28px] font-black leading-[1.15] text-main">
              This invite link isn’t active
            </h1>
            <p className="mt-2 text-base leading-snug text-muted">
              You can still start selling on Shopi — it only takes a minute.
            </p>
          </>
        )}

        {!signedIn && (
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
          {invite && (
            <p className="text-center text-xs leading-relaxed text-muted">
              Post {invite.minListings} listings after you join and you’ll help{" "}
              {inviterFirstName} earn a Shopi reward.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function InviterAvatar({ invite }: { invite: Invite }) {
  const { inviter } = invite;
  const initials =
    inviter.displayName
      .replace(/^@/, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S";

  return (
    <div className="relative h-22 w-22">
      <span className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgb(var(--brand-primary)),rgb(var(--brand-highlight)))] p-0.75">
        <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-app">
          {inviter.avatar ? (
            <Image src={inviter.avatar} alt="" fill sizes="88px" className="object-cover" />
          ) : (
            <span className="text-2xl font-black text-primary">{initials}</span>
          )}
        </span>
      </span>
      <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[rgb(var(--color-bg))] bg-primary text-white">
        <Gift className="h-4 w-4" strokeWidth={2.2} aria-hidden />
      </span>
    </div>
  );
}

function SignedIn({ lang }: { lang: string }) {
  return (
    <>
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Gift className="h-8 w-8" strokeWidth={1.8} aria-hidden />
      </span>
      <h1 className="mt-6 text-[28px] font-black leading-[1.15] text-main">
        You’re already on Shopi
      </h1>
      <p className="mt-2 text-base leading-snug text-muted">
        Invite links are for new sellers. You can earn too — invite sellers you know from your
        own link.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href={`/${lang}/profile?tab=invite`}
          className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-white transition-opacity active:opacity-80"
        >
          <Gift className="h-5 w-5" aria-hidden />
          Invite sellers & earn
        </Link>
        <Link
          href={`/${lang}/upload`}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border text-sm font-semibold text-main active:opacity-70"
        >
          <PlusCircle className="h-4.5 w-4.5" aria-hidden />
          Post a listing
        </Link>
      </div>
    </>
  );
}
