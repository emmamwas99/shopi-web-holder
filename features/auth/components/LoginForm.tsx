"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";

import { useAuthStore } from "@/stores/auth";
import {
  LoginWithEmailDocument,
  type LoginWithEmailMutation,
} from "@/types/__generated__/graphql";
import { getSuspendedAccountMessage } from "@/lib/apollo/suspended-account";
import {
  authDestination,
  navigateAfterAuth,
} from "@/features/auth/lib/postAuthNavigate";
import {
  authInputClass,
  authPasswordToggleClass,
  authPrimaryButtonClass,
} from "@/features/auth/components/authStyles";

interface FormValues {
  email: string;
  password: string;
}

interface LoginFormProps {
  from?: string;
  lang: string;
}

export function LoginForm({ from, lang }: LoginFormProps) {
  const router = useRouter();

  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ mode: "onBlur" });

  const [loginMutation, { loading: mutationLoading }] = useMutation(
    LoginWithEmailDocument,
    { errorPolicy: "all" },
  );

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const { data, error } = await loginMutation({
        variables: {
          input: { email: values.email, password: values.password },
        },
      });

      if (error) {
        if (CombinedGraphQLErrors.is(error)) {
          setServerError(error.errors[0]?.message ?? "Something went wrong.");
        } else {
          setServerError(error.message ?? "Something went wrong.");
        }
        return;
      }

      const payload = (data as LoginWithEmailMutation | null | undefined)
        ?.loginWithEmail;
      if (!payload) {
        setServerError("Something went wrong. Please try again.");
        return;
      }

      setAuth(payload);

      navigateAfterAuth(router, authDestination(from, lang));
    } catch (err: unknown) {
      if (getSuspendedAccountMessage(err)) {
        useAuthStore.getState().clearAuth();
      }
      setServerError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }

  const isSubmittingForm = isSubmitting || mutationLoading;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      {/* Email */}
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
          className={authInputClass(!!errors.email)}
          {...register("email", {
            required: "Email is required",
            pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" },
          })}
        />
        {errors.email && (
          <p className="text-xs text-error">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-sm font-medium text-default"
          >
            Password
          </label>
          <Link
            href={`/${lang}/auth/forgot-password`}
            className="text-xs text-primary font-medium"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className={`${authInputClass(!!errors.password)} pr-12`}
            {...register("password", { required: "Password is required" })}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className={authPasswordToggleClass}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-error">{errors.password.message}</p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
          {serverError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmittingForm}
        className={authPrimaryButtonClass}
      >
        {isSubmittingForm ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> Signing in…
          </span>
        ) : (
          "Sign in"
        )}
      </button>

    </form>
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
