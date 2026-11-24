"use client";

import { useLandingViewer } from "./useLandingViewer";

/**
 * A button label that changes once we know the visitor is signed in, e.g.
 * "Browse For You" → "Back to For You". The cached homepage renders the
 * signed-out text; this swaps it after hydration. Keep the two about the same
 * length so the button doesn't jump.
 */
export function SignedInLabel({ signedOut, signedIn }: { signedOut: string; signedIn: string }) {
  return <>{useLandingViewer() ? signedIn : signedOut}</>;
}
