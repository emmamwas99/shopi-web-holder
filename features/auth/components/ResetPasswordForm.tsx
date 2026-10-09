"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";

import {
  ResetPasswordDocument,
  type ResetPasswordMutation,
} from "@/types/__generated__/graphql";
import { useAuthStore } from "@/stores/auth";
import { navigateAfterAuth } from "@/features/auth/lib/postAuthNavigate";

interface FormValues {
  newPassword: string;
  confirmPassword: string;
}

interface ResetPasswordFormProps {
  token?: string;
  lang: string;
}

function inputCls(hasError: boolean) {
  return [
    "h-12 w-full rounded-xl border px-4 pr-12 text-base bg-elevated text-default",
    "placeholder:text-placeholder outline-none transition-all",
    "focus:border-primary focus:ring-2 focus:ring-primary/20",
    hasError ? "border-error" : "border-border",
  ].join(" ");
}

export function ResetPasswordForm({ token, lang }: ResetPasswordFormProps) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ mode: "onBlur" });

  const newPassword = useWatch({ control, name: "newPassword" });

  const [resetMutation, { loading }] = useMutation(ResetPasswordDocument, {
    errorPolicy: "all",
  });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    setServerError(null);
    try {
      const { data, error } = await resetMutation({
        variables: { input: { token, newPassword: values.newPassword } },
      });

      if (error) {
        setServerError(
          CombinedGraphQLErrors.is(error)
            ? (error.errors[0]?.message ?? "Something went wrong.")
            : (error.message ?? "Something went wrong."),
        );
        return;
      }

      const payload = (data as ResetPasswordMutation | null | undefined)
        ?.resetPassword;
      if (!payload) {
        setServerError("Something went wrong. Please try again.");
        return;
      }

      // Password reset succeeded — the API signs us in and revokes other sessions.
      setAuth(payload);
      navigateAfterAuth(router, `/${lang}/for-you`);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }

  const isBusy = isSubmitting || loading;

  // ── Missing token: link was malformed or opened directly ─────────────────────
  if (!token) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-4 text-sm text-error leading-relaxed">
          This reset link is invalid or incomplete. Please request a new one.
        </div>
        <Link
          href={`/${lang}/auth/forgot-password`}
          className="h-12 rounded-xl bg-primary text-white font-semibold text-base flex items-center justify-center transition-opacity active:opacity-80"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      {/* New password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-default">
          New password
        </label>
        <div className="relative">
          <input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={inputCls(!!errors.newPassword)}
            {...register("newPassword", {
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
              maxLength: { value: 72, message: "Password too long" },
            })}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted p-1 active:opacity-60"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="text-xs text-error">{errors.newPassword.message}</p>
        )}
        <PasswordStrength password={newPassword} />
      </div>

      {/* Confirm password */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-default"
        >
          Confirm password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            className={inputCls(!!errors.confirmPassword)}
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (value) =>
                value === newPassword || "Passwords don't match",
            })}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-error">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error leading-relaxed">
          {serverError}{" "}
          <Link
            href={`/${lang}/auth/forgot-password`}
            className="font-semibold underline underline-offset-2"
          >
            Request a new link
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={isBusy}
        className="h-12 rounded-xl bg-primary text-white font-semibold text-base transition-opacity disabled:opacity-60 active:opacity-80"
      >
        {isBusy ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> Updating password…
          </span>
        ) : (
          "Reset password"
        )}
      </button>
    </form>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-error", "bg-warning", "bg-highlight", "bg-success"];
  const textColors = [
    "",
    "text-error",
    "text-warning",
    "text-highlight-strong",
    "text-success",
  ];

  return (
    <div className="flex flex-col gap-1.5 mt-0.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : "bg-border"
            }`}
          />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs font-medium ${textColors[score]}`}>
          {labels[score]}
          {score < 4 && (
            <span className="text-placeholder font-normal">
              {score === 1 && " — add uppercase, numbers & symbols"}
              {score === 2 && " — add numbers & symbols"}
              {score === 3 && " — add a symbol for extra strength"}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Spinner() {
  return <InterlockingBalls size={18} />;
}
