import type { Article } from "../types.ts";

/** Current status and historical rules for Shopi's paused referral programme. */
export const article: Article = {
  slug: "refer-and-earn-in-kenya",
  status: "published",
  intent: "insight",
  title: "Shopi Refer and Earn in Kenya: Referral Programme Paused",
  seoTitle: "Shopi Refer and Earn in Kenya: Referrals Paused",
  seoDescription:
    "Looking to refer and earn in Kenya with Shopi? The programme is paused and referral links are disabled. Check what counted and view existing records.",
  excerpt:
    "Looking to refer and earn in Kenya with Shopi? The programme is paused. Referral links are disabled, and sharing your seller profile or posting listings does not create a referral reward. Existing records remain available in your profile.",
  primaryKeyword: "refer and earn in Kenya",
  keywords: [
    "referral programs in Kenya",
    "Shopi referral",
    "Shopi referral link",
  ],
  category: "earn",
  tags: ["earn-online", "referral", "selling"],
  author: "shopi-team",
  publishedAt: "2026-09-26",
  updatedAt: "2026-11-14",
  sections: [
    {
      id: "current-status",
      heading: "Shopi's referral programme is paused",
      blocks: [
        {
          type: "p",
          text: "If you came here to refer and earn in Kenya with Shopi, the programme is paused. Personal referral links are disabled. New accounts and listings do not create referral rewards during the pause. Selling on Shopi remains free.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "A seller profile link is not a referral link",
          text: "A link such as shopi.co.ke/en/@yourname takes someone to your shop. Sharing it can help buyers find your listings, but it does not record a referral. Creating an account or posting products does not count as referring another seller either.",
        },
      ],
    },
    {
      id: "how-it-worked",
      heading: "What counted when referrals were active",
      blocks: [
        {
          type: "p",
          text: "When the programme was active, a referral started when a new seller joined through your personal invite link or used your invite code. The invite link came from the Invite & earn section of your profile; it was different from your public seller profile link.",
        },
        {
          type: "p",
          text: "The seller then had to post five real, live listings and meet the programme rules before a reward could qualify. Posting five listings on your own account, or having a friend post five listings after visiting your seller profile, did not create a referral.",
        },
        {
          type: "p",
          text: "Older descriptions of a KSh 200 reward after five listings described the programme when it was active. They are not an offer for new referrals during the pause.",
        },
      ],
    },
    {
      id: "existing-referrals",
      heading: "How to check an existing referral",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            "Open the **Referrals** section in your [profile](/profile?tab=invite) to see referrals already recorded on your account and their reward status.",
            "If a referral you made while the programme was active is missing, [contact support](/profile) and include the personal invite link or code you shared and when the seller joined.",
          ],
        },
        {
          type: "p",
          text: "If no seller appears in your referral records, a seller profile link or a friend's listings alone cannot establish a referral. Support can check the invite details you provide.",
        },
      ],
    },
    {
      id: "keep-selling",
      heading: "You can still sell on Shopi",
      blocks: [
        {
          type: "p",
          text: "The referral pause does not affect your shop. [Post an item for free](/upload), share your seller profile with potential buyers, and message buyers directly. Shopi takes no commission on your sales.",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Can I earn a new Shopi referral reward now?",
      a: "No. Shopi's referral programme is paused and personal referral links are disabled. New signups and listings do not create referral rewards during the pause.",
    },
    {
      q: "Is my Shopi seller profile link a referral link?",
      a: "No. Your seller profile link shows people your shop and listings. It does not record a seller referral.",
    },
    {
      q: "Does my friend posting five listings mean I referred them?",
      a: "No. When the programme was active, the friend first had to join through your personal invite link or use your invite code. Five eligible listings were a further qualification step.",
    },
    {
      q: "Where can I check an earlier referral?",
      a: "Open Referrals in your Shopi profile to see the sellers and rewards recorded on your account. If you believe an earlier referral is missing, contact support with the invite link or code you used.",
    },
  ],
  marketplaceLinks: [
    { kind: "page", path: "/upload", label: "Post an item for free" },
    { kind: "hub", path: "/sell-in-kenya" },
    { kind: "page", path: "/online-selling-jobs-kenya", label: "Online selling jobs in Kenya" },
  ],
  related: [
    "how-to-make-money-online-in-kenya-without-investment",
    "how-to-sell-on-shopi-complete-guide-for-kenyan-sellers",
    "where-to-sell-used-items-in-kenya",
  ],
  cta: {
    label: "Start selling for free",
    to: { kind: "page", path: "/upload", label: "Post an item for free" },
    text: "The referral programme is paused, but you can still list items and reach buyers on Shopi.",
  },
};
