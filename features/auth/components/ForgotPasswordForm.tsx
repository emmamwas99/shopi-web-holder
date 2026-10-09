"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";

import {
  RequestPasswordResetDocument,
  type RequestPasswordResetMutation,
} from "@/types/__generated__/graphql";

interface FormValues {
  email: string;
}

interface ForgotPasswordFormProps {
  lang: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  apple: "Apple",
  tiktok: "TikTok",
};

export function ForgotPasswordForm({ lang }: ForgotPasswordFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Set when the email belongs to a social-login account with no password.
  const [socialProviders, setSocialProviders] = useState<string[] | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ mode: "onBlur" });

  const [requestReset, { loading }] = useMutation(RequestPasswordResetDocument, {
    errorPolicy: "all",
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const { data, error } = await requestReset({
        variables: { input: { email: values.email } },
      });

      if (error) {
        setServerError(
          CombinedGraphQLErrors.is(error)
            ? (error.errors[0]?.message ?? "Something went wrong.")
            : (error.message ?? "Something went wrong."),
        );
        return;
      }

      const result = (data as RequestPasswordResetMutation | null | undefined)
        ?.requestPasswordReset;

      // The account exists but signed up with a social provider — no password
      // to reset. Tell the user to use that provider instead of waiting for an
      // email that will never arrive.
      if (result?.status === "USE_SOCIAL_LOGIN") {
        setSocialProviders(result.existingProviders);
        return;
      }

      // EMAIL_SENT — also returned for unknown emails, so we stay vague.
      setSentTo(values.email);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }

  const isBusy = isSubmitting || loading;

  // ── Social-login account: no password to reset ───────────────────────────────
  if (socialProviders) {
    const list =
      socialProviders.length > 0
        ? socialProviders.map((p) => PROVIDER_LABELS[p] ?? p).join(" or ")
        : "a social account";

    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl bg-primary/8 border border-primary/20 px-4 py-4 flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-primary">
            This account uses {list} sign-in
          </p>
          <p className="text-xs text-muted leading-relaxed">
            You signed up with {list}, so there&rsquo;s no password to reset. Just
            sign in with {list} instead.
          </p>
        </div>

        <Link
          href={`/${lang}/auth/login`}
          className="h-12 rounded-xl bg-primary text-white font-semibold text-base flex items-center justify-center transition-opacity active:opacity-80"
        >
          Back to sign in
        </Link>

        <p className="text-xs text-muted leading-relaxed text-center">
          Wrong email?{" "}
          <button
            type="button"
            className="font-semibold text-primary"
            onClick={() => {
              setSocialProviders(null);
              setServerError(null);
            }}
          >
            Try another
          </button>
          .
        </p>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (sentTo) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl bg-primary/8 border border-primary/20 px-4 py-4 flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-primary">Check your inbox</p>
          <p className="text-xs text-muted leading-relaxed">
            If an account exists for{" "}
            <span className="font-medium text-default">{sentTo}</span>, we&rsquo;ve
            sent a link to reset your password. It expires in 1 hour.
          </p>
        </div>

        <p className="text-xs text-muted leading-relaxed text-center">
          Didn&rsquo;t get it? Check your spam folder, or{" "}
          <button
            type="button"
            className="font-semibold text-primary"
            onClick={() => {
              setSentTo(null);
              setServerError(null);
            }}
          >
            try again
          </button>
          .
        </p>

        <Link
          href={`/${lang}/auth/login`}
          className="h-12 rounded-xl border border-border text-default font-semibold text-base flex items-center justify-center transition-opacity active:opacity-80"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  // ── Request state ──────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-default">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          placeholder="you@example.com"
          className={`h-12 rounded-xl border px-4 text-base bg-elevated text-default placeholder:text-placeholder outline-none transition-all
            focus:border-primary focus:ring-2 focus:ring-primary/20
            ${errors.email ? "border-error" : "border-border"}`}
          {...register("email", {
            required: "Email is required",
            pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" },
          })}
        />
        {errors.email && (
          <p className="text-xs text-error">{errors.email.message}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isBusy}
        className="h-12 rounded-xl bg-primary text-white font-semibold text-base transition-opacity disabled:opacity-60 active:opacity-80"
      >
        {isBusy ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> Sending link…
          </span>
        ) : (
          "Send reset link"
        )}
      </button>

      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href={`/${lang}/auth/login`} className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}

function Spinner() {
  return <InterlockingBalls size={18} />;
}
