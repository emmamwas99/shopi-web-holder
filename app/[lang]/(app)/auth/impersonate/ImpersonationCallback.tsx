"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import type { AuthUserFieldsFragment } from "@/types/__generated__/graphql";

interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUserFieldsFragment;
}

async function exchangeImpersonationToken(token: string): Promise<AuthPayload> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        mutation ExchangeImpersonationToken($token: String!) {
          exchangeImpersonationToken(token: $token) {
            accessToken
            refreshToken
            user {
              id
              email
              role
              isVerified
              profile {
                firstName
                lastName
                avatar
              }
            }
          }
        }
      `,
      variables: { token },
    }),
  });

  const json = (await res.json()) as {
    data?: { exchangeImpersonationToken?: AuthPayload };
    errors?: Array<{ message?: string }>;
  };

  if (
    !res.ok ||
    json.errors?.length ||
    !json.data?.exchangeImpersonationToken
  ) {
    throw new Error(
      json.errors?.[0]?.message ?? "Unable to start impersonation session",
    );
  }

  return json.data.exchangeImpersonationToken;
}

export function ImpersonationCallback({
  lang,
  token,
}: {
  lang: string;
  token: string;
}) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Missing impersonation token.");
      return;
    }

    let cancelled = false;

    exchangeImpersonationToken(token)
      .then((payload) => {
        if (cancelled) return;
        setAuth(payload);
        router.replace(`/${lang}/for-you`);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to start impersonation session",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [lang, router, setAuth, token]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-app px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-elevated p-6 text-center shadow-lg">
        <p className="text-sm font-semibold text-default">
          {error ? "Impersonation failed" : "Starting impersonation session..."}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          {error ?? "You will be redirected to the Shopi feed in a moment."}
        </p>
        {error && (
          <Link
            href={`/${lang}/auth/login`}
            className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-on-brand"
          >
            Go to sign in
          </Link>
        )}
      </div>
    </main>
  );
}
