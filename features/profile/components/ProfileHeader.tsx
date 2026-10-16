"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Check, Copy, ExternalLink, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SHIMMER_AVATAR } from "@/lib/shimmer";
import type { ProfileUserFieldsFragment } from "@/types/__generated__/graphql";
import { ProfileViewsCluster } from "./ProfileViewsCluster";
import { profileHref } from "@/lib/profile-url";
import { toast } from "sonner";
import { VerifiedTick } from "@/components/verification/VerifiedTick";
import {
  useMyShopVerification,
  verificationStage,
} from "@/features/verification/hooks/useShopVerification";
import { settingsSubPageHref } from "../lib/settingsReturn";

interface Props {
  user: ProfileUserFieldsFragment;
  editHref: string;
  lang: string;
}

function formatCompact(value: number | null | undefined) {
  if (value == null) return "--";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function getWebsiteHref(website: string) {
  return website.startsWith("http") ? website : `https://${website}`;
}

/**
 * The seller's own verification, in two places: the tick beside their name
 * once verified (tapping it shows their verification), otherwise a quiet pill
 * on the @handle line — never beside the name, where it would push a long
 * name into truncation on a phone.
 */
function useOwnVerification(lang: string, isVerified: boolean) {
  const { verification } = useMyShopVerification();
  const stage = verificationStage(verification);
  return {
    verified: isVerified || stage === "verified",
    loaded: Boolean(verification),
    stage,
    href: settingsSubPageHref(lang, "/profile/verification"),
  };
}

function OwnVerifiedTick({ lang, isVerified }: { lang: string; isVerified: boolean }) {
  const { verified, href } = useOwnVerification(lang, isVerified);
  if (!verified) return null;
  return (
    <Link href={href} aria-label="Verified shop — see your verification" className="shrink-0">
      <VerifiedTick size={18} label={null} />
    </Link>
  );
}

function OwnVerificationPill({ lang, isVerified }: { lang: string; isVerified: boolean }) {
  const { verified, loaded, stage, href } = useOwnVerification(lang, isVerified);
  // Until the query lands, show nothing rather than an invitation that may be wrong.
  if (verified || !loaded) return null;

  const chip =
    stage === "pending"
      ? { text: "In review", className: "bg-subtle text-muted" }
      : stage === "changes"
        ? { text: "Fix verification", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" }
        : { text: "Get verified", className: "bg-[#1D9BF0]/10 text-[#0F6FB8] dark:text-[#6CC3FF]" };

  return (
    <Link
      href={href}
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-semibold transition-opacity hover:opacity-80 ${chip.className}`}
    >
      <BadgeCheck size={13} strokeWidth={2.2} aria-hidden />
      {chip.text}
    </Link>
  );
}

/** Bio text, clamped to 3 lines with a "more"/"less" toggle. The toggle only
 * renders when the text actually overflows 3 lines — measured against the
 * DOM rather than guessed from character count, since a bio can wrap short
 * on a narrow phone and long on desktop at the same length. */
function ExpandableBio({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <div>
      <p
        ref={ref}
        className={`text-sm leading-6 text-main ${expanded ? "" : "line-clamp-3"}`}
      >
        {text}
      </p>
      {truncated ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-sm font-bold text-primary"
        >
          {expanded ? "less" : "more"}
        </button>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="text-sm font-black text-main">{value}</span>
      <span className="text-xs font-medium text-muted">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex min-w-0 items-baseline gap-1.5 rounded-md py-1 transition-colors hover:text-primary"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex min-w-0 items-baseline gap-1.5 py-1">{content}</div>;
}

export function ProfileHeader({ user, editHref, lang }: Props) {
  const [linkCopied, setLinkCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstName = user.profile?.firstName ?? "";
  const lastName = user.profile?.lastName ?? "";
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || "Your Name";
  const avatar = user.profile?.avatar;
  const initials =
    [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() || "?";

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  async function copyProfileLink() {
    const url = `${window.location.origin}${profileHref(lang, user)}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (!copied) {
        toast.error("Could not copy profile link");
        return;
      }
    }
    setLinkCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setLinkCopied(false), 1800);
  }

  return (
    <section className="border-b border-border bg-app">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex min-w-0 items-start gap-5 lg:gap-7">
          <div
            className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border sm:h-24 sm:w-24 lg:h-30 lg:w-30 ${
              avatar ? "bg-surface" : "bg-main"
            }`}
          >
            {avatar ? (
              <Image
                src={avatar}
                alt={displayName}
                fill
                sizes="(max-width: 640px) 80px, (max-width: 1023px) 96px, 120px"
                className="object-cover"
                placeholder="blur"
                blurDataURL={SHIMMER_AVATAR}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="select-none text-xl font-black text-elevated">
                  {initials}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-xl font-black leading-tight text-main lg:text-2xl">
                    {displayName}
                  </h1>
                  <OwnVerifiedTick lang={lang} isVerified={Boolean(user.isVerified)} />
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-2">
                  {user.username ? (
                    <p className="min-w-0 truncate text-sm font-medium text-muted">
                      @{user.username}
                    </p>
                  ) : null}
                  <OwnVerificationPill lang={lang} isVerified={Boolean(user.isVerified)} />
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-fit sm:shrink-0 sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyProfileLink()}
                  className="h-9 w-full min-w-0 rounded-full border-border px-2 text-[13px] font-bold text-main hover:bg-surface sm:w-fit sm:px-4 sm:text-sm"
                  aria-label={linkCopied ? "Profile link copied" : "Copy profile link"}
                >
                  {linkCopied ? (
                    <Check className="animate-in zoom-in-50 duration-200" size={15} strokeWidth={2.4} />
                  ) : (
                    <Copy size={15} strokeWidth={2.2} />
                  )}
                  {linkCopied ? "Copied" : "Copy link"}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 w-full min-w-0 rounded-full border-border px-2 text-[13px] font-bold text-main hover:bg-surface sm:w-fit sm:px-4 sm:text-sm"
                >
                  <Link href={editHref}>
                    <PenLine size={15} strokeWidth={2.2} />
                    Edit profile
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-x-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1">
              <Stat label="posts" value={formatCompact(user.postCount)} />
              <Stat
                label="followers"
                value={formatCompact(user.followerCount)}
                href={`/${lang}/profile/followers`}
              />
              <Stat label="following" value={formatCompact(user.followingCount)} />
            </div>

            <div className="mt-3">
              <ProfileViewsCluster lang={lang} />
            </div>
          </div>
        </div>

        {/* Its own full-width block below the avatar row, not squeezed into
            the column beside it — on a phone that column is only ~200px
            wide, which wrapped a multi-line bio into a narrow ribbon next to
            empty space under the avatar. */}
        {(user.profile?.bio || user.profile?.website) && (
          <div className="mt-4 flex max-w-3xl flex-col gap-2">
            {user.profile?.bio ? <ExpandableBio text={user.profile.bio} /> : null}

            {user.profile?.website ? (
              <a
                href={getWebsiteHref(user.profile.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-main underline-offset-4 hover:underline"
              >
                <ExternalLink size={14} strokeWidth={2.2} />
                {user.profile.website.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
