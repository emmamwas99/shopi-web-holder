"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";

/**
 * Popup landing page for the TikTok login OAuth redirect.
 * Reads accessToken + refreshToken from URL params, posts them to the opener,
 * then closes. The `next` param carries the post-login destination so it
 * survives the full OAuth round-trip without relying on the opener's closure.
 */
export default function TikTokCallbackPage() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const next = params.get("next") ?? "/";
    const error = params.get("error") ?? params.get("reason");

    if (accessToken && refreshToken) {
      if (window.opener) {
        window.opener.postMessage(
          { type: "TIKTOK_AUTH_SUCCESS", accessToken, refreshToken, next },
          window.location.origin,
        );
        window.close();
      } else {
        // Mobile / no-popup fallback — we are the main window
        setTokens({ accessToken, refreshToken });
        router.replace(next);
      }
    } else {
      if (window.opener) {
        window.opener.postMessage(
          { type: "TIKTOK_AUTH_ERROR", error: error ?? "unknown" },
          window.location.origin,
        );
        window.close();
      } else {
        router.replace(`/auth/login?error=${encodeURIComponent(error ?? "tiktok_failed")}`);
      }
    }
  }, [setTokens, router]);

  return (
    <div className="flex items-center justify-center min-h-svh bg-app">
      <p className="text-muted text-sm">Signing you in…</p>
    </div>
  );
}
