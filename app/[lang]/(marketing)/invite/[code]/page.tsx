import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { isValidLocale } from "@/i18n/config";
import { query } from "@/lib/apollo/ApolloClient";
import { normalizeReferralCode } from "@/lib/referral";
import {
  ReferralInviteDocument,
  type ReferralInviteQuery,
} from "@/types/__generated__/graphql";
import { InviteLanding } from "@/features/referrals/components/InviteLanding";
import { InviteLandingPaused } from "@/features/referrals/components/InviteLandingPaused";
import {
  REFERRALS_PAUSED,
  REFERRALS_PAUSED_BODY,
  REFERRALS_PAUSED_TITLE,
} from "@/features/referrals/paused";

/**
 * Where an invite link lands: shopi.co.ke/invite/K7M2QX (the proxy adds the
 * locale). Says who sent it, keeps the code for signup, and sends the visitor
 * on to create an account with seller intent.
 *
 * Kept out of the index — it is one person's invitation, not a page anyone
 * searches for — but its preview card matters: it is what WhatsApp shows when
 * the link is shared (see opengraph-image.tsx beside this file).
 */

interface Props {
  params: Promise<{ lang: string; code: string }>;
}

type Invite = NonNullable<ReferralInviteQuery["referralInvite"]>;

// Metadata and the page both need the invite; fetch it once per request.
const getInvite = cache(async (rawCode: string): Promise<Invite | null> => {
  const code = normalizeReferralCode(rawCode);
  if (!code) return null;
  try {
    const { data } = await query({ query: ReferralInviteDocument, variables: { code } });
    return data?.referralInvite ?? null;
  } catch {
    // API unreachable: still render the page as a plain invitation to sell.
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  // Paused: the title and description are what WhatsApp prints under the link,
  // so they say so too — and the inviter is not looked up at all.
  const invite = REFERRALS_PAUSED ? null : await getInvite(code);
  const title = REFERRALS_PAUSED
    ? REFERRALS_PAUSED_TITLE
    : invite
      ? `${invite.inviter.displayName} invited you to sell on Shopi`
      : "You’re invited to sell on Shopi";
  const description = REFERRALS_PAUSED
    ? REFERRALS_PAUSED_BODY
    : "Post what you’re selling for free. No commission — buyers message you directly.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function InvitePage({ params }: Props) {
  const { lang, code } = await params;
  if (!isValidLocale(lang)) notFound();

  const invite = await getInvite(code);
  return REFERRALS_PAUSED ? (
    <InviteLandingPaused lang={lang} invite={invite} />
  ) : (
    <InviteLanding lang={lang} invite={invite} />
  );
}
