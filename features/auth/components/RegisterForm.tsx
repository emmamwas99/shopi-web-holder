"use client";

import { InterlockingBalls } from "@/components/ui/drawer-loading-indicator";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import {
  RegisterWithEmailDocument,
  VerifyEmailAndLinkPasswordDocument,
  type RegisterWithEmailMutation,
  type VerifyEmailAndLinkPasswordMutation,
} from "@/types/__generated__/graphql";
import { useAuthStore } from "@/stores/auth";
import { trackSignup, trackAuthSuccess } from "@/lib/analytics";
import { attributionInput } from "@/lib/attribution";
import { clearReferral, referralCodeInput } from "@/lib/referral";
import {
  authDestination,
  navigateAfterAuth,
} from "@/features/auth/lib/postAuthNavigate";

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface LinkFormValues {
  otp: string;
  newPassword: string;
}

interface RegisterFormProps {
  from?: string;
  lang: string;
  /** Rendered below the form only on step 1 (hidden during the OTP verification step) */
  footer?: React.ReactNode;
}

function inputCls(hasError: boolean) {
  return [
    "h-12 w-full rounded-xl border bg-app px-4 text-base text-default",
    "placeholder:text-placeholder outline-none transition-all",
    "focus:border-primary focus:ring-2 focus:ring-primary/20",
    hasError ? "border-error" : "border-border",
  ].join(" ");
}

// ─── Step 1: Register ─────────────────────────────────────────────────────────

export function RegisterForm({ from, lang, footer }: RegisterFormProps) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [registerMutation, { loading: registerLoading }] = useMutation(
    RegisterWithEmailDocument,
    { errorPolicy: "all" },
  );
  const [linkMutation, { loading: linkLoading }] = useMutation(
    VerifyEmailAndLinkPasswordDocument,
    { errorPolicy: "all" },
  );

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // When backend returns PendingAccountLink we switch to the OTP step
  const [pendingLink, setPendingLink] = useState<{
    email: string;
    existingProviders: string[];
  } | null>(null);

  // ── Step 1 form ──────────────────────────────────────────────────────────────
  const registerForm = useForm<RegisterFormValues>({ mode: "onBlur" });
  const password = useWatch({
    control: registerForm.control,
    name: "password",
  });
  const isStep1Loading = registerForm.formState.isSubmitting || registerLoading;

  async function onRegisterSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      const { data, error } = await registerMutation({
        variables: {
          input: {
            email: values.email,
            password: values.password,
            firstName: values.firstName || undefined,
            lastName: values.lastName || undefined,
            // First-touch source, replayed from the visitor's first page load.
            // Persisted server-side only if this call creates the account.
            attribution: attributionInput("register"),
            // The invite link this visitor arrived through, if any.
            referralCode: referralCodeInput(),
          },
        },
      });

      if (error) {
        setServerError(
          CombinedGraphQLErrors.is(error)
            ? (error.errors[0]?.message ?? "Something went wrong.")
            : (error.message ?? "Something went wrong."),
        );
        return;
      }

      const payload = (data as RegisterWithEmailMutation | null | undefined)
        ?.registerWithEmail;
      if (!payload) {
        setServerError("Something went wrong. Please try again.");
        return;
      }

      // Backend says this email is already linked to an OAuth account
      if ("status" in payload && payload.status === "PENDING_LINK") {
        setPendingLink({
          email: payload.email,
          existingProviders: payload.existingProviders,
        });
        return;
      }

      // Normal registration success
      if ("accessToken" in payload) {
        trackSignup("email");
        clearReferral();
        setAuth(payload);
        navigateAfterAuth(router, authDestination(from, lang));
      }
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }

  // ── Step 2 form ──────────────────────────────────────────────────────────────
  const linkForm = useForm<LinkFormValues>({ mode: "onBlur" });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const newPassword = useWatch({
    control: linkForm.control,
    name: "newPassword",
  });
  const isStep2Loading = linkForm.formState.isSubmitting || linkLoading;

  async function onLinkSubmit(values: LinkFormValues) {
    if (!pendingLink) return;
    setServerError(null);
    try {
      const { data, error } = await linkMutation({
        variables: {
          input: {
            email: pendingLink.email,
            otp: values.otp,
            newPassword: values.newPassword,
          },
        },
      });

      if (error) {
        setServerError(
          CombinedGraphQLErrors.is(error)
            ? (error.errors[0]?.message ?? "Something went wrong.")
            : (error.message ?? "Something went wrong."),
        );
        return;
      }

      const payload = (
        data as VerifyEmailAndLinkPasswordMutation | null | undefined
      )?.verifyEmailAndLinkPassword;
      if (!payload) {
        setServerError("Something went wrong. Please try again.");
        return;
      }

      // Not a new account — this email already existed under an OAuth provider
      // and just gained a password, so it's an auth, not a signup.
      trackAuthSuccess("email", "register");
      setAuth(payload);
      navigateAfterAuth(router, authDestination(from, lang));
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }

  // ── Render step 2 (OTP + new password) ───────────────────────────────────────
  if (pendingLink) {
    const providerLabels: Record<string, string> = {
      google: "Google",
      facebook: "Facebook",
      apple: "Apple",
      tiktok: "TikTok",
    };
    const existingList = pendingLink.existingProviders
      .map((p) => providerLabels[p] ?? p)
      .join(" & ");

    return (
      <form
        onSubmit={linkForm.handleSubmit(onLinkSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        {/* Info banner */}
        <div className="flex flex-col gap-1 rounded-xl border border-primary/20 bg-primary/8 px-4 py-3">
          <p className="text-sm font-semibold text-primary">
            This email is linked to {existingList}
          </p>
          <p className="text-xs text-muted leading-relaxed">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-default">
              {pendingLink.email}
            </span>
            . Enter it below to verify ownership and add a password to your
            account.
          </p>
        </div>

        {/* OTP */}
        <Field
          label="Verification code"
          error={linkForm.formState.errors.otp?.message}
        >
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className={
              inputCls(!!linkForm.formState.errors.otp) +
              " tracking-[0.35em] text-center text-lg font-semibold"
            }
            {...linkForm.register("otp", {
              required: "Enter the 6-digit code",
              pattern: { value: /^\d{6}$/, message: "Must be 6 digits" },
            })}
          />
        </Field>

        {/* New password */}
        <Field
          label="Create a password"
          error={linkForm.formState.errors.newPassword?.message}
        >
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-placeholder">
              <LockIcon />
            </span>
            <input
              type={showNewPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={
                inputCls(!!linkForm.formState.errors.newPassword) +
                " pl-10 pr-12"
              }
              {...linkForm.register("newPassword", {
                required: "Password is required",
                minLength: { value: 8, message: "At least 8 characters" },
              })}
            />
            <button
              type="button"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-placeholder p-1 active:opacity-60"
              onClick={() => setShowNewPassword((v) => !v)}
            >
              {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <PasswordStrength password={newPassword} />
        </Field>

        {/* Server error */}
        {serverError && (
          <div className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
            {serverError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isStep2Loading}
          className="h-12 rounded-xl bg-primary text-base font-semibold text-white transition-all disabled:opacity-60 active:scale-[0.98]"
        >
          {isStep2Loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Linking account…
            </span>
          ) : (
            "Verify & link account"
          )}
        </button>

        {/* Back link */}
        <button
          type="button"
          className="text-sm text-muted underline-offset-2 hover:underline text-center"
          onClick={() => {
            setPendingLink(null);
            setServerError(null);
          }}
        >
          Use a different email
        </button>
      </form>
    );
  }

  // ── Render step 1 (register) ──────────────────────────────────────────────────
  return (
    <form
      onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      {/* Full name */}
      <Field
        label="Full name"
        error={
          registerForm.formState.errors.firstName?.message ??
          registerForm.formState.errors.lastName?.message
        }
      >
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-placeholder">
            <PersonIcon />
          </span>
          <input
            id="firstName"
            type="text"
            autoComplete="name"
            //placeholder="Kalani Rivera"
            className={
              inputCls(
                !!(
                  registerForm.formState.errors.firstName ||
                  registerForm.formState.errors.lastName
                ),
              ) + " pl-10"
            }
            {...registerForm.register("firstName", {
              required: "Full name is required",
            })}
          />
        </div>
      </Field>

      {/* Email */}
      <Field label="Email" error={registerForm.formState.errors.email?.message}>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-placeholder">
            <MailIcon />
          </span>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            inputMode="email"
            //placeholder="you@example.com"
            className={
              inputCls(!!registerForm.formState.errors.email) + " pl-10"
            }
            {...registerForm.register("email", {
              required: "Email is required",
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: "Enter a valid email",
              },
            })}
          />
        </div>
      </Field>

      {/* Password */}
      <Field
        label="Password"
        error={registerForm.formState.errors.password?.message}
      >
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-placeholder">
            <LockIcon />
          </span>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={
              inputCls(!!registerForm.formState.errors.password) +
              " pl-10 pr-12"
            }
            {...registerForm.register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
            })}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-placeholder p-1 active:opacity-60"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <PasswordStrength password={password} />
      </Field>

      {/* Server error */}
      {serverError && (
        <div className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
          {serverError}
        </div>
      )}

      {/* Terms */}
      <p className="text-xs text-muted text-center leading-relaxed">
        By creating an account you agree to our{" "}
        <Link
          href={`/${lang}/terms`}
          className="text-primary underline-offset-2 underline"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href={`/${lang}/privacy`}
          className="text-primary underline-offset-2 underline"
        >
          Privacy Policy
        </Link>
        .
      </p>

      {/* Submit */}
      <button
        type="submit"
        disabled={isStep1Loading}
        className="h-12 rounded-xl bg-primary text-base font-semibold text-white transition-all disabled:opacity-60 active:scale-[0.98]"
      >
        {isStep1Loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> Creating account…
          </span>
        ) : (
          "Create account"
        )}
      </button>

      {footer}
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-default">{label}</label>
      {children}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
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

function PersonIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
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
      width="18"
      height="18"
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
