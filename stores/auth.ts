"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUserFieldsFragment } from "@/types/__generated__/graphql";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUserFieldsFragment | null;

  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: AuthUserFieldsFragment) => void;
  setAuth: (payload: {
    accessToken: string;
    refreshToken: string;
    user: AuthUserFieldsFragment;
  }) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

function setAuthHintCookie(authenticated: boolean) {
  if (typeof document === "undefined") return;
  if (authenticated) {
    document.cookie = "shopi-auth-hint=1; path=/; max-age=31536000; samesite=lax";
  } else {
    document.cookie = "shopi-auth-hint=; path=/; max-age=0; samesite=lax";
  }
}

/** A sign-out is under way and this page is about to be replaced. */
let leaving = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setTokens({ accessToken, refreshToken }) {
        if (leaving) return;
        set({ accessToken, refreshToken });
        setAuthHintCookie(true);
      },

      setUser(user) {
        if (leaving) return;
        set({ user });
      },

      setAuth({ accessToken, refreshToken, user }) {
        if (leaving) return;
        set({ accessToken, refreshToken, user });
        setAuthHintCookie(true);
      },

      clearAuth() {
        if (leaving) return;
        set({ accessToken: null, refreshToken: null, user: null });
        setAuthHintCookie(false);
      },

      isAuthenticated() {
        return !!get().accessToken;
      },
    }),
    {
      name: "shopi-auth",
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
      onRehydrateStorage: () => (state) => {
        // Sync the hint cookie whenever the store is rehydrated from localStorage
        if (state) setAuthHintCookie(!!state.accessToken);
      },
    },
  ),
);

/**
 * Sign this device out on the way to a full page load of `href`.
 *
 * The stored session and the hint cookie go now, so the next page and every
 * other open tab start signed out. The screen still showing keeps its session
 * until the browser replaces it: clearing it first, as clearAuth does,
 * re-rendered that screen signed out and refetched everything on it without a
 * token, which flashed "Couldn't load your profile" and other errors in the
 * second or two before the new page arrived. Nothing can write the session
 * back after this (see `leaving`).
 */
export function signOutAndLeave(href: string) {
  leaving = true;
  const { name, storage, version } = useAuthStore.persist.getOptions();
  if (name && storage) {
    storage.setItem(name, {
      state: { accessToken: null, refreshToken: null, user: null } as AuthState,
      version: version ?? 0,
    });
  }
  setAuthHintCookie(false);
  // A full load on purpose: no cached query or socket from the session survives it.
  window.location.href = href;
}

// Keep every open tab on the latest tokens. Refresh tokens rotate, so a tab
// still holding an old one would eventually be refused — and could write the
// old one back over the new one on its next store update.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "shopi-auth" || event.key === null) {
      void useAuthStore.persist.rehydrate();
    }
  });
}
