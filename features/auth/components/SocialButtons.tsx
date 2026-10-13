"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useOAuthMutation } from "@/features/auth/hooks/useOAuthMutation";

interface Props {
  lang: string;
  from?: string;
  /** Label prefix: "Continue" (default) or "Sign in" or "Sign up" */
  verb?: string;
  /** Which auth screen this is, for signup-source analytics. */
  surface?: "register" | "welcome" | "login";
}

/** Google's own wording for the button, matched to this screen's verb. */
function googleButtonText(verb: string): "signin_with" | "signup_with" | "continue_with" {
  if (/^sign\s*in/i.test(verb)) return "signin_with";
  if (/^sign\s*up/i.test(verb)) return "signup_with";
  return "continue_with";
}

/**
 * "Sign in with Google", drawn by Google.
 *
 * It used to be Google's button made invisible under a Shopi-styled one.
 * Google deliberately ignores clicks on its button when it isn't visible
 * (clickjacking protection) — in browsers that can report that, tapping the
 * styled button did nothing at all, which is why Google sign-in "sometimes
 * didn't fire". The visible official button is also what Google's branding
 * rules ask for.
 */
export function SocialButtons({
  lang,
  from,
  verb = "Continue",
  surface = "welcome",
}: Props) {
  const { mountGoogleButton, loading } = useOAuthMutation(lang, from, surface);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const text = googleButtonText(verb);
  const [error, setError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  /** Bumped by "Try again" to mount the button afresh after a failed load. */
  const [attempt, setAttempt] = useState(0);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = googleButtonRef.current;
    if (!container) return;
    const unmount = mountGoogleButton(container, {
      text,
      dark,
      onError: setError,
      onReady: () => {
        setError(null);
        setGoogleReady(true);
      },
    });
    return () => {
      unmount();
      setGoogleReady(false);
    };
    // Re-drawn when the theme flips, so the button matches it.
  }, [mountGoogleButton, attempt, text, dark]);

  const failedToLoad = !!error && !googleReady;

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-xl border border-error/20 bg-error/10 px-3 py-2 text-center text-xs font-medium text-error">
          <p>{error}</p>
          {failedToLoad && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setAttempt((n) => n + 1);
              }}
              className="mt-1 font-bold underline underline-offset-2"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {/* The same pill Google draws, as a placeholder while its script loads,
          so the form doesn't jump when the button appears. Inert while a
          sign-in is completing. */}
      <div
        aria-busy={loading || !googleReady}
        className={`relative flex min-h-11 w-full items-center justify-center ${loading ? "pointer-events-none opacity-60" : ""}`}
      >
        {!googleReady && !failedToLoad && (
          <div
            className="absolute inset-x-0 top-1/2 mx-auto h-10 max-w-100 -translate-y-1/2 animate-pulse rounded-full border border-border bg-subtle"
            aria-hidden
          />
        )}
        <div
          ref={googleButtonRef}
          className="relative flex w-full items-center justify-center"
        />
      </div>
    </div>
  );
}
