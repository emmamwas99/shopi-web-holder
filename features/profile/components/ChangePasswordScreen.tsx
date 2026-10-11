"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { ChangePasswordDocument } from "@/types/__generated__/graphql";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { profileReturnHref } from "../lib/settingsReturn";
import { goBackOr } from "@/lib/useAppBack";
import { BackLink } from "@/components/layout/BackLink";

/** Matches the server's rule, so the form fails before the round trip. */
const MIN_LENGTH = 8;

export function ChangePasswordScreen({ lang }: { lang: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backHref = profileReturnHref(lang, searchParams.get("from"));
  const setTokens = useAuthStore((s) => s.setTokens);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [changePassword, { loading }] = useMutation(ChangePasswordDocument);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit =
    current.length > 0 &&
    next.length >= MIN_LENGTH &&
    confirm === next &&
    !loading;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);

    try {
      const { data } = await changePassword({
        variables: { input: { currentPassword: current, newPassword: next } },
      });

      // The server revokes every session on a password change, this one
      // included. Swapping in the returned pair is what keeps the user signed
      // in instead of being logged out by their own action.
      const payload = data?.changePassword;
      if (payload?.accessToken && payload.refreshToken) {
        setTokens({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
        });
      }

      toast.success("Password changed. Other devices have been signed out.");
      goBackOr(router, backHref);
    } catch (caught) {
      // The server's message is the useful one here — wrong current password,
      // reused password, social-only account all read differently.
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not change your password. Try again.",
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
        <h1 className="text-base font-bold text-default">Change password</h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-6 sm:px-6"
      >
        <p className="text-sm text-muted-foreground">
          You will stay signed in on this device. Every other device will be
          signed out.
        </p>

        <Field
          id="current-password"
          label="Current password"
          value={current}
          onChange={setCurrent}
          reveal={reveal}
          autoComplete="current-password"
        />

        <div className="flex flex-col gap-1.5">
          <Field
            id="new-password"
            label="New password"
            value={next}
            onChange={setNext}
            reveal={reveal}
            autoComplete="new-password"
            invalid={tooShort}
          />
          <p
            className={cn(
              "text-xs",
              tooShort ? "text-[rgb(var(--color-error))]" : "text-muted-foreground",
            )}
          >
            At least {MIN_LENGTH} characters.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Field
            id="confirm-password"
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            reveal={reveal}
            autoComplete="new-password"
            invalid={mismatch}
          />
          {mismatch && (
            <p className="text-xs text-[rgb(var(--color-error))]">
              These do not match.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground"
        >
          {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          {reveal ? "Hide passwords" : "Show passwords"}
        </button>

        {error && (
          <p
            role="alert"
            className="rounded-xl px-3 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: "rgb(var(--color-error) / 0.1)",
              color: "rgb(var(--color-error))",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {loading && <InterlockingBalls size={16} />}
          {loading ? "Changing…" : "Change password"}
        </button>

        <Link
          href={`/${lang}/auth/forgot-password`}
          className="text-center text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
        >
          Forgot your current password?
        </Link>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  reveal,
  autoComplete,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  reveal: boolean;
  autoComplete: string;
  invalid?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-default">
        {label}
      </label>
      <input
        id={id}
        type={reveal ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border px-3 font-medium outline-none transition-colors"
        style={{
          backgroundColor: "rgb(var(--color-bg-elevated))",
          borderColor: invalid
            ? "rgb(var(--color-error))"
            : "rgb(var(--color-border))",
          color: "rgb(var(--color-text))",
        }}
      />
    </div>
  );
}
