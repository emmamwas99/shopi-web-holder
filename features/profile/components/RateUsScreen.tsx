"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Star } from "lucide-react";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import {
  MyAppRatingDocument,
  SubmitAppRatingDocument,
} from "@/types/__generated__/graphql";
import { cn } from "@/lib/utils";
import { profileReturnHref } from "../lib/settingsReturn";
import { goBackOr } from "@/lib/useAppBack";
import { BackLink } from "@/components/layout/BackLink";

const MAX_STARS = 5;
const COMMENT_MAX = 1000;

/** The word next to the stars, so the scale is not left to interpretation. */
const STAR_LABELS = [
  "Not good",
  "Could be better",
  "Okay",
  "Good",
  "Love it",
] as const;

type ExistingRating = { id: string; stars: number; comment?: string | null };

export function RateUsScreen({ lang }: { lang: string }) {
  // Pre-filled from any previous rating: this screen edits an opinion rather
  // than collecting a new one each visit, which is also how the server stores
  // it (one row per user).
  const { data, loading } = useQuery(MyAppRatingDocument, {
    fetchPolicy: "cache-and-network",
  });

  // Wait for the first response before mounting the form, then key it on what
  // came back. The form owns its fields from its own initial state, so a
  // background refetch landing mid-sentence cannot overwrite what is being
  // typed — the same shape EditProfileScreen uses.
  if (loading && !data) return <RateUsSkeleton lang={lang} />;

  const existing = (data?.myAppRating ?? null) as ExistingRating | null;
  return <RateUsForm key={existing?.id ?? "new"} lang={lang} existing={existing} />;
}

function RateUsForm({
  lang,
  existing,
}: {
  lang: string;
  existing: ExistingRating | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backHref = profileReturnHref(lang, searchParams.get("from"));
  const [submitRating, { loading: saving }] = useMutation(SubmitAppRatingDocument);

  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? "");

  const shown = hovered || stars;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (stars < 1 || saving) return;

    try {
      await submitRating({
        variables: { input: { stars, comment: comment.trim() || undefined } },
        // The screen can be reopened straight away, so keep the cached copy
        // truthful rather than waiting for a refetch.
        refetchQueries: [{ query: MyAppRatingDocument }],
      });
      toast.success("Thanks for the feedback.");
      goBackOr(router, backHref);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Could not send your rating.",
      );
    }
  }

  return (
    <div className="min-h-svh bg-app">
      <header
        className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b px-3"
        style={{
          backgroundColor: "rgb(var(--color-bg) / 0.94)",
          borderColor: "rgb(var(--color-border))",
          backdropFilter: "blur(14px) saturate(150%)",
          WebkitBackdropFilter: "blur(14px) saturate(150%)",
        }}
      >
        <BackLink
          href={backHref}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-md"
        >
          <ChevronLeft size={30} strokeWidth={2.5} aria-hidden />
        </BackLink>
        <h1 className="text-base font-bold text-default">Rate us</h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8 sm:px-6"
      >
        <div className="text-center">
          <h2 className="text-lg font-bold text-default">
            How is Shopi working for you?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {existing
              ? "You rated us before. Change it any time."
              : "Your rating helps us decide what to build next."}
          </p>
        </div>

        {/* Radios rather than buttons: a rating is one choice out of five, and
            this gives arrow-key selection and a screen-reader group for free. */}
        <fieldset className="flex flex-col items-center gap-2">
          <legend className="sr-only">Stars out of {MAX_STARS}</legend>
          <div
            className="flex items-center gap-1.5"
            onMouseLeave={() => setHovered(0)}
          >
            {Array.from({ length: MAX_STARS }, (_, index) => {
              const value = index + 1;
              const filled = value <= shown;
              return (
                <label
                  key={value}
                  onMouseEnter={() => setHovered(value)}
                  className="cursor-pointer p-1"
                  title={STAR_LABELS[index]}
                >
                  <input
                    type="radio"
                    name="stars"
                    value={value}
                    checked={stars === value}
                    onChange={() => setStars(value)}
                    className="sr-only"
                  />
                  <Star
                    size={40}
                    strokeWidth={1.8}
                    className={cn(
                      "transition-transform",
                      filled
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/40",
                      stars === value && "scale-110",
                    )}
                    aria-hidden
                  />
                  <span className="sr-only">
                    {value} {value === 1 ? "star" : "stars"} — {STAR_LABELS[index]}
                  </span>
                </label>
              );
            })}
          </div>
          <p
            className="h-5 text-sm font-semibold text-default"
            aria-live="polite"
          >
            {shown > 0 ? STAR_LABELS[shown - 1] : ""}
          </p>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="rating-comment"
            className="text-sm font-semibold text-default"
          >
            Anything you would like to add?{" "}
            <span className="font-normal text-muted-foreground">Optional</span>
          </label>
          <textarea
            id="rating-comment"
            rows={5}
            value={comment}
            maxLength={COMMENT_MAX}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What works well, what gets in your way…"
            className="w-full resize-none rounded-xl border px-3 py-2.5 font-medium leading-relaxed outline-none transition-colors placeholder:opacity-40"
            style={{
              backgroundColor: "rgb(var(--color-bg-elevated))",
              borderColor: "rgb(var(--color-border))",
              color: "rgb(var(--color-text))",
            }}
          />
          <p className="text-right text-xs text-muted-foreground">
            {comment.length}/{COMMENT_MAX}
          </p>
        </div>

        <button
          type="submit"
          disabled={stars < 1 || saving}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {saving && <InterlockingBalls size={16} />}
          {saving ? "Sending…" : existing ? "Update rating" : "Send rating"}
        </button>
      </form>
    </div>
  );
}

function RateUsSkeleton({ lang }: { lang: string }) {
  return (
    <div className="min-h-svh bg-app">
      <header
        className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b px-3"
        style={{
          backgroundColor: "rgb(var(--color-bg) / 0.94)",
          borderColor: "rgb(var(--color-border))",
        }}
      >
        <BackLink
          href={`/${lang}/profile?tab=settings`}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-md"
        >
          <ChevronLeft size={30} strokeWidth={2.5} aria-hidden />
        </BackLink>
        <h1 className="text-base font-bold text-default">Rate us</h1>
      </header>
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-4 py-8">
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_STARS }, (_, index) => (
            <Star
              key={index}
              size={40}
              strokeWidth={1.8}
              className="animate-pulse text-muted-foreground/25"
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}
